import { useQuery } from '@tanstack/react-query';
import { isApiError } from '@vyde/auth-client';

import { authClient } from '@/lib/auth-client';

/** One address on an account. Mirrors `application/dto/email.rs`. */
export interface EmailView {
  readonly id: string;
  readonly account_id: string;
  readonly email: string;
  readonly primary: boolean;
  readonly verified: boolean;
  readonly verified_at: string | null;
  readonly created_at: string;
}

/** Mirrors `application/dto/account.rs`. */
export interface Account {
  readonly id: string;
  readonly name: string;
  readonly username?: string;
  readonly flags?: readonly ('verified' | 'beta' | 'support' | 'official')[];
  /** ISO 3166-1 alpha-2, uppercase. Enforced by a DB check constraint. */
  readonly country: string;
  /** ISO 639-1 alpha-2, lowercase. Enforced by a DB check constraint. */
  readonly language: string;
  /** `YYYY-MM-DD`. */
  readonly birthday: string;
  /** `active` | `suspended` | `closed`. */
  readonly status: string;
  /**
   * The primary address, or `null` for an account that has none.
   *
   * `null` is not "unverified" — it is "there is nothing to verify", and the two need to be told
   * apart on a settings screen or the user is told to check an address that does not exist.
   */
  readonly primary_email: EmailView | null;
  /** Absent means "no photo yet", which is distinct from an empty string. */
  readonly photo_url?: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export const SESSION_KEY = ['session'] as const;

/** Whether the user is signed in, and whose account that is. */
export interface Session {
  readonly authenticated: true;
  readonly account: Account;
}

/**
 * Read the account, or `null` when there is no session.
 *
 * # Why this exists separately from `useSession`
 *
 * A router's `beforeLoad` is not a component and not a hook context: it runs before React renders
 * anything, so calling `useSession()` there throws an invalid-hook-call at runtime. That call is the
 * only thing standing between a signed-out visitor and the authenticated screens, so it has to be
 * expressible outside React — and the *same* request must not exist twice, or the first navigation
 * pays for a fetch the second one immediately discards.
 *
 * `null` rather than a thrown error for the signed-out case, because "no session" is the expected
 * answer for every visitor who has not signed in and is not something to report as a failure.
 */
export async function fetchSession(): Promise<Account | null> {
  try {
    return await authClient.request<Account>('/v1/accounts/me', {
      redirectOnUnauthenticated: false,
    });
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      return null;
    }
    // Anything else is a real failure — a network error, a shape that no longer matches. Throwing it
    // is right: a router that treats an unreachable API as "signed out" would bounce a signed-in
    // user to the login form every time the network hiccuped.
    throw error;
  }
}

export function useSession() {
  const result = useQuery({
    queryKey: SESSION_KEY,
    queryFn: fetchSession,
    // A 401 is the signed-out signal, not an error to display, and retrying it is a loop against a
    // client that already gives up after one attempt by design.
    retry: false,
  });

  // `null` data is the signed-out signal, so `isSuccess` alone is the whole test. The earlier
  // version inspected `error.status`, which could not distinguish "signed out" from "the request
  // failed" — the two want opposite responses.
  return {
    ...result,
    authenticated: result.isSuccess && result.data !== null,
    data: result.data ?? undefined,
  };
}

/**
 * Every address on the account.
 *
 * `account.primary_email` carries only the primary one, so this is a separate call: managing
 * addresses needs the whole set.
 */
export interface EmailsResponse {
  readonly emails: readonly EmailView[];
}

export const EMAILS_KEY = ['emails'] as const;

export function useEmails() {
  return useQuery({
    queryKey: EMAILS_KEY,
    queryFn: () => authClient.request<EmailsResponse>('/v1/accounts/me/emails'),
  });
}

/** Whether an account has a confirmed primary address. */
export function isVerified(account: Account | undefined): boolean {
  return account?.primary_email?.verified === true;
}