import { createRoute } from '@tanstack/react-router';

import { PublicShell } from '@/components/ProtectedShell';
import { usePublicAccount, usePublicOrganization } from '@/features/queries';
import { Flags } from '@/components/Flags';

import { RootRoute } from './__root';

export const PublicAccountRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/u/$username',
  component: PublicAccountScreen,
});

export const PublicOrganizationRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/o/$slug',
  component: PublicOrganizationScreen,
});

function PublicAccountScreen() {
  const { username } = PublicAccountRoute.useParams();
  const query = usePublicAccount(username);
  return (
    <PublicShell>
      <main className="page">
        {query.isPending ? <p>Loading profile...</p> : query.error ? <p>Profile not found.</p> : query.data ? (
          <section className="panel">
            {query.data.photo_url ? <img className="avatar avatar--large" src={query.data.photo_url} alt="" /> : null}
            <p className="eyebrow">@{query.data.username}</p>
            <h1>{query.data.name} <Flags values={query.data.flags} /></h1>
            <p>Member since {new Date(query.data.created_at).toLocaleDateString()}</p>
          </section>
        ) : null}
      </main>
    </PublicShell>
  );
}

function PublicOrganizationScreen() {
  const { slug } = PublicOrganizationRoute.useParams();
  const query = usePublicOrganization(slug);
  return (
    <PublicShell>
      <main className="page">
        {query.isPending ? <p>Loading organization...</p> : query.error ? <p>Organization not found.</p> : query.data ? (
          <section className="panel">
            <p className="eyebrow">Organization</p>
            <h1>{query.data.name} <Flags values={query.data.flags} /></h1>
            <p>@{query.data.slug} · {query.data.member_count} members</p>
          </section>
        ) : null}
      </main>
    </PublicShell>
  );
}
