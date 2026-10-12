import { createRoute, Link, useSearch } from '@tanstack/react-router';
import { useState } from 'react';

import { LoginForm } from '@/features/auth/components/LoginForm';
import { PublicShell } from '@/components/ProtectedShell';
import { describeLoginFailure, useLogin } from '@/features/auth/useLogin';
import { isApiError } from '@/lib/api';
import { messages } from '@/lib/messages';

import { RootRoute } from './__root';

/**
 * The login screen.
 *
 * # It owns the `return_to`, and it does not decide where it goes
 *
 * The raw value is read from the query string here and handed to the mutation, which is where it is
 * validated against `VITE_ALLOWED_RETURN_ORIGINS`. That split matters: this file is the untrusted
 * edge, and the validator is the policy. A route that validated its own redirect would be one
 * refactor away from a redirect that skips the check.
 */
export const LoginRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: 'login',
  validateSearch: (search: Record<string, unknown>): { return_to?: string } => {
    // Narrowed here so the rest of the file deals in `string | undefined` rather than `unknown`.
    const value = search['return_to'];
    return typeof value === 'string' ? { return_to: value } : {};
  },
  component: LoginScreen,
});

function LoginScreen() {
  const search = useSearch({ from: '/login' });
  const [failure, setFailure] = useState<{ message: string; retryAfter: number | null } | null>(null);

  /**
   * The outstanding challenge, or `undefined` before the service issues one.
   *
   * Component state and nothing else — not the URL, not `sessionStorage`, not a cookie. A challenge
   * is "this password was already accepted", and storing it anywhere a script can read it later
   * reproduces, in miniature, the problem the `HttpOnly` refresh cookie exists to avoid. It also
   * means a reload mid-flow starts over, which is right: the challenge dies in five minutes anyway,
   * and a half-restored login is worse than a clean one.
   */
  const [challengeId, setChallengeId] = useState<string | undefined>(undefined);

  const login = useLogin({
    returnTo: search.return_to,
    challengeId,
    onSecondFactorRequired: (issued) => {
      // The password was right. Any refusal on screen is now about a *different* field, so it goes
      // before the form changes shape — otherwise "ACCESS DENIED" sits under a code box it has
      // nothing to do with.
      setFailure(null);
      setChallengeId(issued);
    },
    onSignedIn: (destination) => {
      // Cleared first: navigating while the failure is still mounted would show it for a frame on
      // the destination screen, which is a message about the wrong page.
      setFailure(null);
      setChallengeId(undefined);

      // A **browser** navigation, not `navigate({ to })`.
      //
      // Two reasons, either of which is sufficient. First, `destination` is a runtime string that
      // `safeReturnTo` returned after checking it against the allowlist — the typed router matches
      // `to` against routes known at build time, and handing it an arbitrary path raises
      // `Could not find an active match`, which the error boundary renders as a crashed app. Second
      // and more fundamentally, `return_to` is routinely a *different origin* (`console.vyde.dev`,
      // `research.vyde.dev`): a client-side router cannot cross an origin at all, so a full page
      // load is the only thing that does what the user asked.
      //
      // The value is already validated by `safeReturnTo`, which is what makes `assign` safe here
      // rather than an open redirect.
      window.location.assign(destination);
    },
  });

  const secondFactorRequired = challengeId !== undefined;

  return (
    <PublicShell>
      <main id="main" className="auth">
      <div className="auth__panel panel--bracketed">
        <h1 className="auth__brand">Vyde</h1>
        {/* Announces the step change to a screen reader, which a visual change alone would not. */}
        <p className="auth__sub" role="status">
          {secondFactorRequired ? messages.auth.secondFactorStep : messages.identity}
        </p>

        <LoginForm
          pending={login.isPending}
          error={failure?.message ?? null}
          retryAfter={failure?.retryAfter ?? null}
          secondFactorRequired={secondFactorRequired}
          onSubmit={async (values) => {
            // Cleared at the start of an attempt so the previous refusal does not sit next to the
            // new form looking like a fresh failure.
            setFailure(null);
            try {
              await login.mutateAsync(values);
            } catch (error) {
              // A dead challenge lands here. Restarting the flow is the only useful answer, so it
              // is done rather than offered — and the form goes back to its first shape with the
              // password still in `react-hook-form`'s state, so the address is not lost either.
              if (isApiError(error) && error.status === 401 && secondFactorRequired) {
                setChallengeId(undefined);
                return;
              }
              setFailure(describeLoginFailure(error));
            }
          }}
        />
        <p className="auth__switch">
          New operator? <Link to="/register">Create an account</Link>
        </p>
      </div>
      </main>
    </PublicShell>
  );
}
