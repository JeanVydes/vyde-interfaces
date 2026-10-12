/**
 * The login response discrimination.
 *
 * # Why this is tested at all
 *
 * Because the failure mode is silent and total. `toLoginResult` decides whether the user has signed
 * in or is being asked for a code, and it is the *only* thing standing between a malformed response
 * and a login screen that asks for a code forever — or, worse, one that navigates on the strength of
 * a body that never contained a session. Both are the kind of bug that shows up in production and
 * nowhere else.
 */

import { AuthClient } from '@vyde/auth-client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { API_URL } from '@/config';

interface FetchCall {
  readonly url: string;
  readonly init: RequestInit;
}

/**
 * A client whose transport is ours.
 *
 * A fresh `AuthClient` rather than the app's singleton with `fetch` stubbed globally: the client
 * binds its transport in the constructor (`globalThis.fetch.bind(globalThis)`), so a global stub
 * installed after module load is never called and the test would quietly be exercising the real
 * network. Passing `fetchImpl` is the seam the client provides for exactly this.
 */
function clientAnswering(body: unknown): { client: AuthClient; calls: FetchCall[] } {
  const calls: FetchCall[] = [];

  const client = new AuthClient({
    apiUrl: API_URL,
    onUnauthenticated: () => undefined,
    fetchImpl: ((url: string, init: RequestInit) => {
      calls.push({ url, init });
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    }) as typeof fetch,
  });
  return { client, calls };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the login response', () => {
  it('reads a session as signed in', async () => {
    const { client } = clientAnswering({ access_token: 'a', expires_in: 900 });

    await expect(client.login({ email: 'a@b.test', password: 'x' })).resolves.toEqual({
      signedIn: true,
    });

  });

  it('reads a challenge as not signed in, and keeps the handle', async () => {
    const { client } = clientAnswering({ challenge_id: 'abc-123', expires_in: 300 });

    await expect(client.login({ email: 'a@b.test', password: 'x' })).resolves.toEqual({
      signedIn: false,
      challengeId: 'abc-123',
      expiresInSeconds: 300,
    });

  });

  it('refuses to guess when the body is neither shape', async () => {
    // The important one. Returning `signedIn: false` here would put the form into an infinite
    // "enter your code" loop for a response nobody can satisfy; returning `true` would navigate on
    // the strength of nothing. Throwing says "we do not understand this", which is the truth and is
    // something the screen can act on.
    const { client } = clientAnswering({ unexpected: 'shape' });

    await expect(client.login({ email: 'a@b.test', password: 'x' })).rejects.toThrow(TypeError);
  });

  it('treats an empty challenge id as no challenge', async () => {
    const { client } = clientAnswering({ challenge_id: '', expires_in: 300 });

    await expect(client.login({ email: 'a@b.test', password: 'x' })).rejects.toThrow(TypeError);
  });

  it('sends the challenge and the code on step two', async () => {
    const { client, calls } = clientAnswering({ access_token: 'a' });

    await client.login({
      email: 'a@b.test',
      password: 'x',
      totpCode: '123456',
      challengeId: 'abc-123',
    });

    const body = JSON.parse(String(calls[0]?.init.body)) as Record<string, unknown>;
    expect(body['challenge_id']).toBe('abc-123');
    expect(body['totp_code']).toBe('123456');
  });

  it('omits both on step one, rather than sending empty strings', async () => {
    const { client, calls } = clientAnswering({ access_token: 'a' });

    await client.login({ email: 'a@b.test', password: 'x' });

    const body = JSON.parse(String(calls[0]?.init.body)) as Record<string, unknown>;
    // An empty `challenge_id` is treated as absent server-side, but sending the key at all means the
    // server's "absent or blank" branch has to stay correct forever. Not sending it is one fewer
    // thing to keep true.
    expect('challenge_id' in body).toBe(false);
    expect('totp_code' in body).toBe(false);
  });

  it('uses the access token for later requests', async () => {
    const calls: FetchCall[] = [];
    const client = new AuthClient({
      apiUrl: API_URL,
      onUnauthenticated: () => undefined,
      fetchImpl: ((url: string, init: RequestInit) => {
        calls.push({ url, init });
        const body = calls.length === 1
          ? { access_token: 'access', expires_in: 900 }
          : { id: 'account' };
        return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
      }) as typeof fetch,
    });

    await client.login({ email: 'a@b.test', password: 'x' });
    await client.request('/v1/accounts/me');

    expect(new Headers(calls[1]?.init.headers).get('authorization')).toBe('Bearer access');
  });

  it('refreshes once and retries after an expired access token', async () => {
    const calls: FetchCall[] = [];
    const client = new AuthClient({
      apiUrl: API_URL,
      onUnauthenticated: () => undefined,
      fetchImpl: ((url: string, init: RequestInit) => {
        calls.push({ url, init });
        const response = calls.length === 1
          ? { status: 200, body: { access_token: 'old' } }
          : calls.length === 2
            ? { status: 401, body: { error: 'expired' } }
            : calls.length === 3
              ? { status: 200, body: { access_token: 'new' } }
              : { status: 200, body: { id: 'account' } };
        return Promise.resolve(new Response(JSON.stringify(response.body), { status: response.status }));
      }) as typeof fetch,
    });

    await client.login({ email: 'a@b.test', password: 'x' });
    await expect(client.request('/v1/accounts/me')).resolves.toEqual({ id: 'account' });

    expect(calls.map(({ url }) => url)).toEqual([
      `${API_URL}/v1/auth/login?mode=cookie`,
      `${API_URL}/v1/accounts/me`,
      `${API_URL}/v1/auth/refresh`,
      `${API_URL}/v1/accounts/me`,
    ]);
    expect(new Headers(calls[3]?.init.headers).get('authorization')).toBe('Bearer new');
  });
});