/** Browser authentication client for the gateway. */

export interface AuthClientOptions {
  readonly apiUrl: string;
  readonly onUnauthenticated: (returnTo: string) => void;
  readonly fetchImpl?: typeof fetch;
}

export interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly body?: unknown | BodyInit;
  readonly headers?: Readonly<Record<string, string>>;
  readonly anonymous?: boolean;
  readonly signal?: AbortSignal;
  readonly redirectOnUnauthenticated?: boolean;
}

const SAFE_METHODS = new Set(['GET', 'HEAD']);

const CSRF_HEADER = 'x-csrf-token';
const CSRF_VALUE = '1';

import { ApiError, toApiError } from './errors';


export interface LoginInput {
  email: string;
  password: string;
  totpCode?: string | undefined;
  challengeId?: string | undefined;
}

export interface LoginSignedIn {
  readonly signedIn: true;
}

export interface LoginNeedsSecondFactor {
  readonly signedIn: false;
  readonly challengeId: string;
  readonly expiresInSeconds: number;
}

export type LoginResult = LoginSignedIn | LoginNeedsSecondFactor;

function toLoginResult(body: unknown): LoginResult {
  const record = (body ?? {}) as Record<string, unknown>;
  if (typeof record['access_token'] === 'string') {
    return { signedIn: true };
  }
  const challengeId = record['challenge_id'];
  if (typeof challengeId === 'string' && challengeId.length > 0) {
    const seconds = record['expires_in'];
    return {
      signedIn: false,
      challengeId,
      expiresInSeconds: typeof seconds === 'number' ? seconds : 0,
    };
  }
  throw new TypeError('the login response carried neither a session nor a challenge');
}

export class AuthClient {
  private readonly options: AuthClientOptions;
  private readonly doFetch: typeof fetch;
  private accessToken: string | null = null;
  private inFlightRefresh: Promise<void> | null = null;
  private authEpoch = 0;

  constructor(options: AuthClientOptions) {
    this.options = options;
    this.doFetch = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (
      options.anonymous !== true &&
      this.accessToken === null &&
      options.headers?.authorization === undefined
    ) {
      const epoch = this.authEpoch;
      try {
        await this.refresh();
      } catch (error) {
        if (this.authEpoch === epoch) {
          this.accessToken = null;
        }
        if (this.authEpoch === epoch && options.redirectOnUnauthenticated !== false) {
          this.options.onUnauthenticated(window.location.pathname + window.location.search);
        }
        throw error;
      }
    }

    const response = await this.send(path, options);
    if (response.status !== 401 || options.anonymous === true) {
      return this.read<T>(response);
    }

    const epoch = this.authEpoch;
    try {
      await this.refresh();
    } catch (error) {
      if (this.authEpoch === epoch) {
        this.accessToken = null;
      }
      if (this.authEpoch === epoch && options.redirectOnUnauthenticated !== false) {
        this.options.onUnauthenticated(window.location.pathname + window.location.search);
      }
      throw error;
    }

    const retried = await this.send(path, options);
    if (retried.status === 401) {
      if (options.redirectOnUnauthenticated !== false) {
        this.options.onUnauthenticated(window.location.pathname + window.location.search);
      }
      throw await this.errorFor(retried);
    }
    return this.read<T>(retried);
  }

  private refresh(): Promise<void> {
    if (this.inFlightRefresh === null) {
      const epoch = this.authEpoch;
      let flight: Promise<void>;
      flight = this.send('/v1/auth/refresh', { anonymous: true })
        .then(async (response) => {
          if (!response.ok) {
            throw await this.errorFor(response);
          }
          const body = (await response.json()) as { access_token?: unknown };
          if (typeof body.access_token !== 'string' || body.access_token.length === 0) {
            throw new TypeError('the refresh response carried no access token');
          }
          if (this.authEpoch === epoch) {
            this.accessToken = body.access_token;
          }
        })
        .finally(() => {
          if (this.inFlightRefresh === flight) {
            this.inFlightRefresh = null;
          }
        });
      this.inFlightRefresh = flight;
    }
    return this.inFlightRefresh;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const method = options.method ?? (options.body === undefined ? 'GET' : 'POST');
    const headers: Record<string, string> = { accept: 'application/json', ...options.headers };
    if (this.accessToken !== null && options.anonymous !== true && headers.authorization === undefined) {
      headers.authorization = ['Bearer', this.accessToken].join(' ');
    }
    const isFormData =
      (typeof FormData !== 'undefined' && options.body instanceof FormData) ||
      Object.prototype.toString.call(options.body) === '[object FormData]';
    const isUrlEncoded =
      typeof URLSearchParams !== 'undefined' && options.body instanceof URLSearchParams;
    if (isFormData) {
      delete headers['content-type'];
    } else if (isUrlEncoded) {
      headers['content-type'] = 'application/x-www-form-urlencoded';
    } else if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
    }
    if (!SAFE_METHODS.has(method)) {
      headers[CSRF_HEADER] = CSRF_VALUE;
    }

    const init: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };
    if (options.body !== undefined) {
      init.body = isFormData || isUrlEncoded ? (options.body as BodyInit) : JSON.stringify(options.body);
    }
    if (options.signal) init.signal = options.signal;
    return this.doFetch(`${this.options.apiUrl}${path}`, init);
  }

  private async read<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw await this.errorFor(response);
    }
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }
    const text = await response.text();
    return (text === '' ? undefined : JSON.parse(text)) as T;
  }

  private errorFor(response: Response): Promise<ApiError> {
    // Statically imported, not `await import()`. The dynamic form was an attempt to keep the error
    // path out of the main chunk and it achieved nothing: this module is already statically imported
    // by the re-exports at the bottom of the file, so the bundler had it either way and warned about
    // the contradiction.
    return Promise.resolve(toApiError(response));
  }

  /**
   * Sign in.
   *
   * `?mode=cookie` is what makes this a browser login: the gateway moves the refresh token into the
   * `HttpOnly` cookie and strips it from the body. Without the parameter the body would carry a
   * thirty-day credential in the browser's JavaScript heap, which is the thing the cookie exists to
   * prevent.
   *
   * `client_id` is `native`: first-party apps log in as the platform's own client, which has no
   * `oauth_clients` row and a grant fixed server-side (`identity/src/application/use_cases/login.rs`).
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const previousRefresh = this.inFlightRefresh;
    this.authEpoch += 1;
    this.accessToken = null;
    if (previousRefresh !== null) {
      await previousRefresh.catch(() => undefined);
    }
    return this.request<unknown>('/v1/auth/login?mode=cookie', {
      method: 'POST',
      anonymous: true,
      body: {
        email: input.email,
        password: input.password,
        client_id: 'native',
        ...(input.totpCode ? { totp_code: input.totpCode } : {}),
        ...(input.challengeId ? { challenge_id: input.challengeId } : {}),
      },
    }).then((body) => {
      const accessToken = (body as Record<string, unknown>)['access_token'];
      if (typeof accessToken === 'string' && accessToken.length > 0) {
        this.accessToken = accessToken;
      }
      return toLoginResult(body);
    });
  }

  /**
   * Sign out.
   *
   * No token in the body: the gateway reads the cookie and translates it into the body before it
   * reaches identity, then clears the cookie on the way back. A browser has nothing to revoke by hand.
   */
  logout(): Promise<unknown> {
    return this.request('/v1/auth/logout', { method: 'POST', anonymous: true, body: {} }).finally(() => {
      this.accessToken = null;
    });
  }
}

/**
 * Whether a retry may safely repeat a request.
 *
 * Exported because it is the rule a future caller will otherwise re-derive, and re-deriving it wrong
 * means duplicating a write.
 */
export function canRetry(method: string | undefined): boolean {
  return SAFE_METHODS.has(method ?? 'GET');
}
/* Re-exported so a consumer has one import for the whole surface. A package where `ApiError`
 * comes from the root and `safeReturnTo` comes from a subpath is two places to check before every
 * change to either. */
export { ApiError, isApiError, parseRetryAfter, type FieldError } from './errors';
export {
  safeReturnTo,
  parseAllowedOrigins,
  type SafeReturnTo,
  type ReturnToRejection,
} from './return-to';
