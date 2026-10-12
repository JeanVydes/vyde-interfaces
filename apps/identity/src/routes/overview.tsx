import { createRoute } from '@tanstack/react-router';

import { ProtectedShell } from '@/components/ProtectedShell';
import { useAccount, useOrganizations } from '@/features/queries';
import { Flags } from '@/components/Flags';
import { AppWindow, KeyRound, ShieldCheck, UsersRound } from 'lucide-react';

import { RootRoute } from './__root';

export const OverviewRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/overview',
  component: () => (
    <ProtectedShell>
      <OverviewScreen />
    </ProtectedShell>
  ),
});

/**
 * The overview: what this account is, and where to go next.
 *
 * # Why there is no `return_to` banner here
 *
 * There was one, and it was a mistake. It read `useSearch({ from: '/login' })` — asking the router
 * for the search params of a *different* route while rendering this one. On `/` there is no
 * `/login` match, so it raised `Could not find an active match from "/login"` and the error boundary
 * replaced the whole app with "Something went wrong".
 *
 * It was also redundant. `return_to` is handled where it belongs: `ProtectedShell` puts it in the
 * login URL, the login screen validates it through `safeReturnTo`, and `useLogin` navigates to it on
 * success. A visitor who was sent here by that flow has already arrived at the destination; showing
 * them a panel offering to go there again was noise.
 *
 * The general lesson is in the tests rather than here: `useSearch({ from })` throws rather than
 * returning nothing, so a route may only ask for its own params.
 */
function OverviewScreen() {
  const account = useAccount();
  const organizations = useOrganizations();

  return (
    <div className="page">
      <div className="hero">
        <IdentityMark />
        <div>
          <h1>{account.data?.name ?? 'Loading...'}{account.data ? <Flags values={account.data.flags} /> : null}</h1>
          <p className="lede mono">
            @{account.data?.primary_email?.email.split('@')[0] ?? 'identity'}
          </p>
        </div>
      </div>
      <div className="stats">
        <button className="stat" type="button" onClick={() => navigateTo('/organizations')}>
          <span className="mono"><BuildingIcon /> Organizations</span>
          <b>{organizations.data?.length ?? 0}</b>
        </button>
        <button className="stat" type="button" onClick={() => navigateTo('/organizations')}>
          <span className="mono"><AppWindow size={15} /> Applications</span>
          <b>—</b>
        </button>
        <button className="stat" type="button" onClick={() => navigateTo('/security')}>
          <span className="mono"><ShieldCheck size={15} /> MFA methods</span>
          <b>—</b>
        </button>
        <button className="stat" type="button" onClick={() => navigateTo('/security')}>
          <span className="mono"><KeyRound size={15} /> Sessions</span>
          <b>1</b>
        </button>
      </div>
    </div>
  );
}

function BuildingIcon() {
  return <UsersRound size={15} aria-hidden="true" />;
}

function IdentityMark() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g>
        <path d="M50 4 A46 46 0 0 1 95 50" />
        <path d="M50 4 A46 46 0 0 0 5 50" />
      </g>
      <g>
        <path d="M50 14 A36 36 0 0 1 85 50" />
        <path d="M50 14 A36 36 0 0 0 15 50" />
      </g>
      <circle cx="50" cy="50" r="3" />
    </svg>
  );
}

/** A full page load rather than a router navigation. See `ProtectedShell` for the frame. */
function navigateTo(path: string): void {
  window.location.assign(path);
}