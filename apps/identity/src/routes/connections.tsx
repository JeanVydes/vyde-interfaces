import { ProtectedShell } from '@/components/ProtectedShell';
import { Panel, Notice, Submit } from '@/components/ui';
import { messages } from '@/lib/messages';
import { useGrants, useRevokeGrant } from '@/features/queries';

import { RootRoute } from './__root';
import { createRoute } from '@tanstack/react-router';

export const ConnectionsRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/connections',
  component: () => (
    <ProtectedShell>
      <ConnectionsScreen />
    </ProtectedShell>
  ),
});

function ConnectionsScreen() {
  const { data: grants, isLoading, error } = useGrants();
  const revoke = useRevokeGrant();

  if (isLoading) {
    return (
      <Panel title={messages.nav.connected} bracketed={false}>
        <Notice tone="info">Loading connected apps...</Notice>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title={messages.nav.connected} bracketed={false}>
        <Notice tone="warning">Could not load connected apps.</Notice>
      </Panel>
    );
  }

  if (!grants || grants.length === 0) {
    return (
      <Panel title={messages.nav.connected} bracketed={false}>
        <Notice tone="info">No connected apps yet.</Notice>
      </Panel>
    );
  }

  return (
    <Panel title={messages.nav.connected} description="Applications with access to your account." bracketed>
      {grants.map((grant) => (
        <div key={grant.client_id} className="data" style={{ marginBottom: 'var(--vyde-space-3)' }}>
          <div>
            <span className="data__label">App</span>
            <span className="data__value">{grant.client_name || grant.client_id}</span>
            {grant.organization_name ? <span className="data__value">Organization: {grant.organization_name}</span> : null}
          </div>
          <div>
            <span className="data__label">Scopes</span>
            <span className="data__value">{grant.scopes}</span>
          </div>
          <div>
            <span className="data__label">Granted</span>
            <span className="data__value">{grant.granted_at}</span>
          </div>
          <div className="actions">
            <Submit
              variant="quiet"
              onPress={() => {
                if (window.confirm(`Revoke access for ${grant.client_name || grant.client_id}?`)) {
                  void revoke.mutateAsync(grant.client_id);
                }
              }}
              disabled={revoke.isPending}
            >
              Revoke
            </Submit>
          </div>
        </div>
      ))}
    </Panel>
  );
}
