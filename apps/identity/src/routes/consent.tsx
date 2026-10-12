import { createRoute, useSearch } from '@tanstack/react-router';
import { useState } from 'react';

import { ProtectedShell } from '@/components/ProtectedShell';
import { Notice, Panel, Submit } from '@/components/ui';
import { useConsentPreview } from '@/features/queries';
import { authClient } from '@/lib/auth-client';
import { ApiError } from '@/lib/api';

import { RootRoute } from './__root';

export const AuthorizationRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/oauth2/authorize',
  validateSearch: (search: Record<string, unknown>) => ({
    client_id: typeof search.client_id === 'string' ? search.client_id : '',
    redirect_uri: typeof search.redirect_uri === 'string' ? search.redirect_uri : '',
    scope: typeof search.scope === 'string' ? search.scope : '',
    response_type: typeof search.response_type === 'string' ? search.response_type : 'code',
    state: typeof search.state === 'string' ? search.state : undefined,
    nonce: typeof search.nonce === 'string' ? search.nonce : undefined,
    code_challenge: typeof search.code_challenge === 'string' ? search.code_challenge : undefined,
    code_challenge_method: typeof search.code_challenge_method === 'string' ? search.code_challenge_method : undefined,
    organization_id: typeof search.organization_id === 'string' ? search.organization_id : undefined,
  }),
  component: () => (
    <ProtectedShell>
      <ConsentScreen />
    </ProtectedShell>
  ),
});

function ConsentScreen() {
  const search = useSearch({ from: '/oauth2/authorize' });
  const preview = useConsentPreview();
  const [accepted, setAccepted] = useState<string[]>([]);

  const review = async () => {
    if (!search.client_id || !search.redirect_uri || !search.scope) return;
    const result = await preview.mutateAsync({ clientId: search.client_id, redirectUri: search.redirect_uri, requested: search.scope });
    setAccepted([...result.already_granted, ...result.askable]);
  };

  const approve = async () => {
    const form = new URLSearchParams();
    const fields = {
      response_type: search.response_type,
      client_id: search.client_id,
      redirect_uri: search.redirect_uri,
      scope: search.scope,
      state: search.state,
      nonce: search.nonce,
      code_challenge: search.code_challenge,
      code_challenge_method: search.code_challenge_method,
      organization_id: search.organization_id,
      accept: accepted.join(' '),
    };
    for (const [name, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      form.set(name, value);
    }
    const response = await authClient.request<{ location: string }>('/oauth2/authorize', {
      method: 'POST',
      body: form,
      headers: { accept: 'application/json' },
    });
    window.location.assign(response.location);
  };

  return (
    <Panel
      title="Authorization request"
      description="Review what this application will be allowed to access before continuing."
      bracketed
    >
      {!search.client_id || !search.redirect_uri || !search.scope ? (
        <Notice tone="warning">This authorization request is incomplete.</Notice>
      ) : null}
      {preview.error ? <Notice tone="warning">
        {preview.error instanceof ApiError && preview.error.code === 'invalid_scope'
          ? `This application has not enabled all requested scopes. Ask the application owner to enable: ${preview.error.fields.find((field) => field.field === 'scope')?.message ?? 'the requested scopes'}`
          : 'The application request could not be verified.'}
      </Notice> : null}
      {!preview.data ? (
        <Submit pending={preview.isPending} onPress={() => void review()}>Review requested access</Submit>
      ) : (
        <>
          <div className="data">
            <div><span className="data__label">Application</span><span className="data__value">{search.client_id}</span></div>
            <div><span className="data__label">New access</span><span className="data__value">{preview.data.askable.join(', ') || 'none'}</span></div>
            <div><span className="data__label">Already granted</span><span className="data__value">{preview.data.already_granted.join(', ') || 'none'}</span></div>
            <fieldset className="consent-scopes">
              <legend>Allow now</legend>
              {[...preview.data.already_granted, ...preview.data.askable].map((scope) => (
                <label key={scope}><input type="checkbox" checked={accepted.includes(scope)} onChange={(event) => setAccepted((current) => event.target.checked ? [...new Set([...current, scope])] : current.filter((value) => value !== scope))} /> {scope}</label>
              ))}
            </fieldset>
          </div>
          <div className="actions">
            <Submit pending={false} disabled={accepted.length === 0} onPress={() => void approve()}>
              Allow access
            </Submit>
            <Submit variant="quiet" onPress={() => window.location.assign('/overview')}>Cancel</Submit>
          </div>
        </>
      )}
    </Panel>
  );
}
