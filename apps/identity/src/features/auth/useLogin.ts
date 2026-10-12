import { useMutation } from '@tanstack/react-query';

import { safeReturnTo } from '@vyde/auth-client';

import { ALLOWED_RETURN_ORIGINS, DEFAULT_DESTINATION } from '@/config';
import { authClient } from '@/lib/auth-client';
import { isApiError } from '@/lib/api';
import { messages } from '@/lib/messages';

import type { LoginValues } from './schema';

/**
 * Signing in.
 *
 * # The one generic failure message, again
 *
 * Every refusal here becomes `messages.auth.denied`. Not because it is tidy — because the service
 * goes to real trouble to make "no such address" and "wrong password" indistinguishable, and this is
 * the last place that work can be thrown away.
 *
 * The two exceptions are both about *timing and volume*, not about identity:
 *
 *   - a 429 says when to come back, taken from `Retry-After`, and nothing else;
 *   - a 5xx says the platform is unreachable, because telling a user their password was rejected when
 *     the server is down sends them to reset a password they do not need to reset.
 *
 * # Why `return_to` is validated here and not in the route
 *
 * Because this is the last point at which the value is available. The route reads it out of the URL
 * search params; this is what decides where the user actually goes, and a validator that runs
 * somewhere else is a validator that can be forgotten.
 */
export function useLogin(options: {
  /** The untrusted `return_to`, straight off the query string. Validated inside the mutation. */
  returnTo: string | undefined;
  /**
   * The outstanding challenge, once one has been issued.
   *
   * Held here rather than in the URL: a challenge in a query string lands in history, in referrers,
   * and in server logs, and it is the one thing in this flow that should not outlive the tab. It
   * also means a reload mid-flow starts over, which is the correct outcome — the alternative is a
   * recovery path for a state that expires in five minutes anyway.
   */
  challengeId: string | undefined;
  onSignedIn: (destination: string) => void;
  /** The password was accepted; a second factor is now outstanding. */
  onSecondFactorRequired: (challengeId: string) => void;
}) {
  return useMutation({
    mutationFn: async (values: LoginValues) => {
      const result = await authClient.login({
        email: values.email,
        password: values.password,
        ...(values.totpCode ? { totpCode: values.totpCode } : {}),
        ...(options.challengeId ? { challengeId: options.challengeId } : {}),
      });

      // Not signed in. The password was right and there is a second factor outstanding, so the
      // caller is told to show the code field and keeps the password where it already is — the form
      // is never unmounted on this path, so the address is still there to submit with the code.
      if (!result.signedIn) {
        options.onSecondFactorRequired(result.challengeId);
        return;
      }

      // The destination is resolved **after** the login succeeds and not before, so a refused
      // `return_to` never blocks the sign-in itself — it only changes where the user lands.
      const destination = safeReturnTo(
        options.returnTo,
        ALLOWED_RETURN_ORIGINS,
        DEFAULT_DESTINATION,
      );

      options.onSignedIn(destination);
    },

    // `retry: false` is the client's default and is right here: retrying a wrong password three
    // times is how an account gets locked out by its own form.
    retry: false,
  });
}

/** The user-facing outcome of a login attempt. */
export interface LoginOutcome {
  readonly message: string;
  readonly retryAfter: number | null;
}

export function describeLoginFailure(error: unknown): LoginOutcome {
  if (isApiError(error)) {
    if (error.status === 429) {
      return {
        message:
          error.retryAfterSeconds === undefined
            ? messages.auth.rateLimitedUnknown
            : messages.auth.rateLimited(error.retryAfterSeconds),
        retryAfter: error.retryAfterSeconds ?? null,
      };
    }

    if (error.status >= 500) {
      return { message: messages.state.offline, retryAfter: null };
    }

    // 401 and 403 both land here, along with anything else the service refuses. One message for all
    // of them, and that is the point.
    //
    // A *wrong second factor* is a 401 too, and it lands here as well. That is deliberate: telling it
    // apart from a wrong password would tell an attacker which half of the login they had already
    // passed. The field the user is looking at says which field they should change.
    return { message: messages.auth.denied, retryAfter: null };
  }

  // Not an `ApiError` is a bug rather than a refusal: a TypeError in this app, or a `fetch` that
  // never resolved. Saying "ACCESS DENIED" would blame the user's password for our failure.
  console.error('[identity] the login request failed in an unexpected way', error);
  return { message: messages.state.error, retryAfter: null };
}
