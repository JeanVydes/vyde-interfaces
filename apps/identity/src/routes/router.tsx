import { createRouter } from '@tanstack/react-router';

import { ConnectionsRoute } from '@/routes/connections';
import { AuthorizationRoute } from '@/routes/consent';
import { EmailsRoute } from '@/routes/emails';
import { LandingRoute } from '@/routes/landing';
import { LoginRoute } from '@/routes/login';
import { AcceptOrganizationInvitationRoute, OrganizationsRoute } from '@/routes/organizations';
import { OverviewRoute } from '@/routes/overview';
import { PreferencesRoute } from '@/routes/preferences';
import { ProfileRoute } from '@/routes/profile';
import { PublicAccountRoute, PublicOrganizationRoute } from '@/routes/public-profiles';
import { RegisterRoute } from '@/routes/register';
import { RootRoute } from '@/routes/__root';
import { SecurityRoute } from '@/routes/security';
import { VerifyRoute } from '@/routes/verify';

/**
 * The route table.
 *
 * # Why every route hangs off the root, flat
 *
 * Because this router cannot express the nested shape and the flat shape cannot be wrong. A layout
 * route at `/` with an index beneath it is refused with `Duplicate routes found with id: /`; making
 * the layout pathless gets past that and produces a tree whose `routesById` reads correctly —
 * `/_shell/` → `/`, `/_shell/profile` → `profile` — while every navigation fails with
 * `Could not find an active match from "/login"`.
 *
 * Both errors are thrown while the router is constructed, before React renders, so both look
 * identical from outside: a blank page. That is worth more than the nesting, which bought nothing —
 * the screens share a frame and a gate, not a URL segment, and both of those are a component
 * (`components/ProtectedShell.tsx`) rather than a route.
 *
 * # What the flat shape costs
 *
 * The gate is per-screen rather than per-tree, so it is expressed once and applied seven times. A
 * new protected screen must wrap itself in `ProtectedShell` or it will render without a frame and
 * without a check. That is the trade this file makes, and it is the right way round: a mistake here
 * produces a visibly unstyled screen, not a silently unprotected one.
 */
export const routeTree = RootRoute.addChildren([
  LoginRoute,
  RegisterRoute,
  VerifyRoute,
  LandingRoute,
  OverviewRoute,
  ProfileRoute,
  EmailsRoute,
  SecurityRoute,
  PreferencesRoute,
  ConnectionsRoute,
  AuthorizationRoute,
  OrganizationsRoute,
  AcceptOrganizationInvitationRoute,
  PublicAccountRoute,
  PublicOrganizationRoute,
]);

export const router = createRouter({
  routeTree,
  // `intent` rather than `render`: a link is prefetched when the user shows intent to follow it,
  // which on this app means hovering or focusing it. That is the only moment the fetch is free.
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}