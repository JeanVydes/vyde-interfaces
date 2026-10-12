/**
 * The authenticated frame and its gate.
 *
 * # Why the shell is a component and not a layout route
 *
 * A layout route would be the obvious shape: one route at `/` with the screens as children. This
 * version of the router refuses it. `path: '/'` on a layout *and* a `'/'` index beneath it is
 * rejected as `Duplicate routes found with id: /`; making the layout pathless (`id: '/_shell'`) gets
 * past that and then builds a tree whose `routesById` looks correct — `/_shell/` → `/`,
 * `/_shell/profile` → `profile` — while failing every navigation with
 * `Could not find an active match from "/login"`. Both failures happen while the router is
 * constructed, before React renders, so both present as a blank page rather than as an error.
 *
 * Nesting is not what this app needs anyway. The screens share a frame and a gate; they do not share
 * a URL segment. So each screen is a direct child of the root with its own path, and this file is the
 * one thing that knows what "signed in, inside the frame" means. The alternative — a layout route
 * plus a duplicated auth check per screen — has one gate in the wrong place and one per screen in
 * the right one, which is strictly worse.
 */

import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';

import { useSession } from '@/lib/session';
import { Console } from './Console';

/**
 * Renders `children` only for a signed-in visitor, inside the navigation frame.
 *
 * # Why the gate is here and not in a route `beforeLoad`
 *
 * A `beforeLoad` would run before React, which is *good* — no flash of a protected frame to an
 * anonymous visitor. It is not usable here for a structural reason: putting the check on a route
 * means either every screen repeats it or they all live under one parent, and this router rejects
 * that parent (see above).
 *
 * The cost of checking in a component is one render of the loading state before the redirect, which
 * is why the frame renders *nothing* until the answer is known. An anonymous visitor sees a blank
 * panel for a few milliseconds and then the login form — not the navigation, not the screen, and not
 * any part of the interface they were not entitled to.
 *
 * # Why `replace` and not `push`
 *
 * The login form is where an anonymous visitor belongs, and pressing Back afterwards should not
 * return them to a protected URL that only bounces them here again. Replacing leaves one history
 * entry, which is what a person expects from being sent somewhere they could not stay.
 */
export function ProtectedShell(props: { children: ReactNode }) {
  const { authenticated, isPending } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // `isPending` is the whole guard, and it is load-bearing.
    //
    // `authenticated` is `false` for two quite different reasons: "the request has not come back
    // yet" and "the request came back 401". React Query reports the first as pending, and a naive
    // `if (!authenticated)` cannot tell them apart — so it fires on the very first render, before
    // the session is known, and bounces a signed-in user to the login form. Which is precisely what
    // happened: the network log showed `GET /v1/accounts/me` answering **200** and the browser still
    // ending up on `/login`, because the redirect had been issued while the answer was in flight.
    if (isPending || authenticated) {
      return;
    }
    // `location` rather than a constructed path: the destination is whatever was asked for, and it
    // is untrusted until the login screen runs it past `safeReturnTo`.
    const returnTo = window.location.pathname + window.location.search;
    void navigate({ to: '/login', search: { return_to: returnTo }, replace: true });
  }, [authenticated, isPending, navigate]);

  // Nothing at all until the answer is in. Rendering the frame first would flash the navigation at
  // somebody who is about to be redirected away from it.
  if (isPending) {
    return <div className="shell__main" />;
  }

  if (!authenticated) {
    return <div className="shell__main" />;
  }

  const sections: Record<string, string> = {
    '/overview': 'Overview',
    '/profile': 'Profile',
    '/emails': 'E-mail addresses',
    '/security': 'Security',
    '/preferences': 'Appearance',
    '/connections': 'Connected apps',
    '/organizations': 'Organizations',
  };
  const section = sections[location.pathname] ?? 'Overview';

  return (
    <Console
      section={section}
      onSectionChange={(nextSection) => {
        const paths: Record<string, string> = {
          Overview: '/overview',
          Profile: '/profile',
          'E-mail addresses': '/emails',
          Security: '/security',
          Appearance: '/preferences',
          'Connected apps': '/connections',
          Organizations: '/organizations',
        };
        void navigate({ to: paths[nextSection] ?? '/overview' });
      }}
    >
      {props.children}
    </Console>
  );
}
export function PublicShell(props: { children: ReactNode }) {
  return <>{props.children}</>;
}
