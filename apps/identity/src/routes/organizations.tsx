import { createRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, ImagePlus, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react';

import { ProtectedShell } from '@/components/ProtectedShell';
import { Flags } from '@/components/Flags';
import { Chip, Field, Notice, Panel, SelectField, Submit } from '@/components/ui';
import {
  useAcceptInvitation,
  useAccount,
  useChangeRole,
  useCreateInvitation,
  useCreateOrganization,
  useDeleteClient,
  useDeleteClientIcon,
  useInvitations,
  useLeaveOrganization,
  useMembers,
  useOrganizations,
  useOrganizationClients,
  usePreviewInvitation,
  useRegisterClient,
  useRegenerateClientSecret,
  useRemoveMember,
  useRevokeInvitation,
  useRegenerateInvitationLink,
  useUpdateClient,
  useUpdateOrganization,
  useUploadClientIcon,
} from '@/features/queries';
import type { ClientView, MemberView, Organization } from '@/lib/schemas';
import { API_URL } from '@/config';

import { RootRoute } from './__root';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function publicAssetUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_URL}/${value.replace(/^\/+/, '')}`;
}

function consentUrl(client: ClientView): string | null {
  const redirectUri = client.redirect_uris[0];
  if (!redirectUri) return null;
  const scopes = client.enabled_scopes
    .split(' ')
    .filter(Boolean);
  if (scopes.length === 0) return null;
  const url = new URL('/oauth2/authorize', window.location.origin);
  url.searchParams.set('client_id', client.client_id);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes.join(' '));
  return url.toString();
}

export const OrganizationsRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/organizations',
  component: () => (
    <ProtectedShell>
      <OrganizationsScreen />
    </ProtectedShell>
  ),
});

export const AcceptOrganizationInvitationRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/organizations/accept',
  component: () => (
    <ProtectedShell>
      <AcceptInvitationScreen />
    </ProtectedShell>
  ),
});

function AcceptInvitationScreen() {
  const preview = usePreviewInvitation();
  const accept = useAcceptInvitation();
  const started = useRef(false);
  const token = new URLSearchParams(window.location.search).get('token');
  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      void preview.mutateAsync(token);
    }
  }, [preview, token]);

  return (
    <Panel title="Organization invitation" bracketed={false}>
      {preview.isPending ? <Notice tone="info">Loading invitation...</Notice> : null}
      {preview.data ? <><div className="data"><div><span className="data__label">Organization</span><span className="data__value">{preview.data.organization_name}</span><small>@{preview.data.organization_slug}</small></div></div><div className="data"><div><span className="data__label">Role</span><span className="data__value">{preview.data.role}</span></div><div><span className="data__label">Members</span><span className="data__value">{preview.data.member_count}</span></div></div><div className="data"><div><span className="data__label">Invitation expires</span><span className="data__value">{formatDate(preview.data.expires_at)}</span></div></div><div className="actions"><Submit pending={accept.isPending} onPress={() => token && void accept.mutateAsync(token)}>Accept invitation</Submit><Submit variant="quiet" type="button" onPress={() => window.location.assign('/organizations')}>Reject</Submit></div></> : null}
      {accept.isSuccess ? <Notice tone="success">You joined the organization.</Notice> : null}
      {preview.error || accept.error ? <Notice tone="warning">{(preview.error ?? accept.error) instanceof Error ? (preview.error ?? accept.error)?.message : 'This invitation could not be processed.'}</Notice> : null}
    </Panel>
  );
}

function OrganizationsScreen() {
  const organizations = useOrganizations();
  const [selectedId, setSelectedId] = useState<string>();
  const [showCreate, setShowCreate] = useState(false);
  const selected = organizations.data?.find((organization) => organization.id === selectedId)
    ?? organizations.data?.[0];

  if (organizations.isLoading) {
    return <Panel title="Organizations" bracketed={false}><Notice tone="info">Loading organizations...</Notice></Panel>;
  }
  if (organizations.error) {
    return <Panel title="Organizations" bracketed={false}><Notice tone="warning">Organizations could not be loaded.</Notice></Panel>;
  }

  return (
    <>
      <Panel
        title="Organizations"
        description="Workspaces contain their members, invitations, and OAuth applications."
        bracketed={false}
        action={<Submit variant="primary" type="button" onPress={() => setShowCreate(true)}>New organization</Submit>}
      >
        {organizations.data?.length ? (
          <SelectField
            label="Workspace"
            name="organization"
            value={selected?.id ?? ''}
            options={organizations.data.map((organization) => ({ value: organization.id, label: `${organization.name} · @${organization.slug}` }))}
            onChange={setSelectedId}
          />
        ) : <Notice tone="info">You do not belong to an organization yet.</Notice>}
      </Panel>
      {showCreate ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-organization-title">
            <div className="modal__head">
              <h2 id="create-organization-title">New organization</h2>
              <Submit type="button" variant="quiet" onPress={() => setShowCreate(false)}>Close</Submit>
            </div>
            <CreateOrganization onCreated={(organization) => { setSelectedId(organization.id); setShowCreate(false); }} />
          </div>
        </div>
      ) : null}
      {selected ? <OrganizationWorkspace organization={selected} /> : null}
    </>
  );
}

function CreateOrganization(props: { onCreated: (organization: Organization) => void }) {
  const create = useCreateOrganization();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  return (
    <div className="panel__section">
      <Field label="Organization name" name="organization-name" value={name} onChange={setName} />
      <Field label="Slug" name="organization-slug" value={slug} onChange={(value) => setSlug(value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} />
      <Submit
        pending={create.isPending}
        disabled={!name.trim() || !slug.trim()}
        onPress={async () => props.onCreated(await create.mutateAsync({ name, slug }))}
      >
        Create organization
      </Submit>
      {create.error ? <Notice tone="warning">Could not create this organization.</Notice> : null}
    </div>
  );
}

function OrganizationWorkspace(props: { organization: Organization }) {
  const [section, setSection] = useState<'overview' | 'members' | 'invitations' | 'applications'>('overview');
  const members = useMembers(props.organization.id);
  const account = useAccount();
  const current = members.data?.find((member) => member.member.id === account.data?.id);
  const canManage = current?.role === 'owner' || current?.role === 'admin';
  const tabs = [
    ['overview', 'Overview'],
    ['members', 'Members'],
    ['invitations', 'Invitations'],
    ['applications', 'Applications'],
  ] as const;

  return (
    <Panel title={<>{props.organization.name} <Flags values={props.organization.flags} /></>} description={`@${props.organization.slug}`} bracketed>
      <nav className="tabs" aria-label="Organization sections">
        {tabs.map(([value, label]) => (
          <button key={value} type="button" className={section === value ? 'on' : ''} onClick={() => setSection(value)}>
            {label}
          </button>
        ))}
      </nav>
      {section === 'overview' ? <OrganizationOverview organization={props.organization} /> : null}
      {section === 'members' ? <MembersSection organizationId={props.organization.id} /> : null}
      {section === 'invitations' ? <InvitationsSection organizationId={props.organization.id} canManage={canManage} /> : null}
      {section === 'applications' ? <ApplicationsSection organizationId={props.organization.id} canManage={canManage} /> : null}
    </Panel>
  );
}

function OrganizationOverview(props: { organization: Organization }) {
  const update = useUpdateOrganization();
  const leave = useLeaveOrganization();
  const members = useMembers(props.organization.id);
  const account = useAccount();
  const [name, setName] = useState(props.organization.name);
  const [slug, setSlug] = useState(props.organization.slug);
  const [showEdit, setShowEdit] = useState(false);
  const current = members.data?.find((member) => member.member.id === account.data?.id);
  const owner = current?.role === 'owner';
  return (
    <div className="panel__section">
      <div className="data"><span className="data__label">Created</span><span className="data__value">{formatDate(props.organization.created_at)}</span></div>
      <div className="data"><span className="data__label">Your role</span><span className="data__value">{current?.role ?? 'Loading'}</span></div>
      {owner ? (
        <>
          <Submit type="button" onPress={() => setShowEdit(true)}>Edit organization</Submit>
          {showEdit ? <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-organization-title"><div className="modal__head"><h2 id="edit-organization-title">Edit organization</h2><Submit type="button" variant="quiet" onPress={() => setShowEdit(false)}>Close</Submit></div><Field label="Organization name" name="organization-edit-name" value={name} onChange={setName} /><Field label="Slug" name="organization-slug" value={slug} onChange={(value) => setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} /><Submit pending={update.isPending} disabled={!name.trim() || !slug.trim() || (name === props.organization.name && slug === props.organization.slug)} onPress={async () => { await update.mutateAsync({ organizationId: props.organization.id, name, slug }); setShowEdit(false); }}>Save changes</Submit></div></div> : null}
        </>
      ) : (
        <Submit variant="quiet" pending={leave.isPending} onPress={() => { if (window.confirm('Leave this organization?')) leave.mutate(props.organization.id); }}>Leave organization</Submit>
      )}
      {owner ? <Submit type="button" variant="quiet" disabled title="The owner cannot leave the organization">Leave organization</Submit> : null}
      {update.error || leave.error ? <Notice tone="warning">The organization change could not be completed.</Notice> : null}
    </div>
  );
}

function MembersSection(props: { organizationId: string }) {
  const members = useMembers(props.organizationId);
  const account = useAccount();
  const changeRole = useChangeRole();
  const remove = useRemoveMember();
  const current = members.data?.find((member) => member.member.id === account.data?.id);
  const canManage = current?.role === 'owner' || current?.role === 'admin';
  return (
    <div className="panel__section">
      <h3>Members</h3>
      <p className="panel__description">Manage access for every account in this organization.</p>
      {members.isLoading ? <Notice tone="info">Loading members...</Notice> : null}
      {members.error ? <Notice tone="warning">Members could not be loaded.</Notice> : null}
      {members.data?.map((member) => <MemberRow key={member.member.id} member={member} organizationId={props.organizationId} canManage={canManage} changeRole={changeRole} remove={remove} />)}
    </div>
  );
}

function MemberRow(props: {
  member: MemberView;
  organizationId: string;
  canManage: boolean;
  changeRole: ReturnType<typeof useChangeRole>;
  remove: ReturnType<typeof useRemoveMember>;
}) {
  const accountId = props.member.member.id;
  const [role, setRole] = useState<MemberView['role']>(props.member.role);
  return (
    <div className="data member-card">
      <div><span className="data__label">Account</span><span className="data__value">{props.member.name ?? 'Member'}</span><small>Joined {formatDate(props.member.joined_at)}</small></div>
      <Chip tone={props.member.role === 'owner' ? 'ok' : props.member.role === 'admin' ? 'warn' : 'idle'}>{props.member.role}</Chip>
      {props.canManage && props.member.role !== 'owner' ? (
        <div className="actions">
          <SelectField label="Role" name={`role-${accountId}`} value={role} options={[{ value: 'admin', label: 'Admin' }, { value: 'member', label: 'Member' }, { value: 'viewer', label: 'Viewer' }]} onChange={(value) => setRole(value as MemberView['role'])} />
          <Submit variant="quiet" disabled={role === props.member.role} pending={props.changeRole.isPending} onPress={() => props.changeRole.mutate({ organizationId: props.organizationId, accountId, role })}>Save role</Submit>
          <Submit variant="quiet" pending={props.remove.isPending} onPress={() => { if (window.confirm('Remove this member?')) props.remove.mutate({ organizationId: props.organizationId, accountId }); }}>Remove</Submit>
        </div>
      ) : null}
    </div>
  );
}

function InvitationsSection(props: { organizationId: string; canManage: boolean }) {
  const invitations = useInvitations(props.organizationId);
  const create = useCreateInvitation();
  const revoke = useRevokeInvitation();
  const regenerate = useRegenerateInvitationLink();
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [days, setDays] = useState('7');
  const [uses, setUses] = useState('1');
  const [link, setLink] = useState('');
  const [showForm, setShowForm] = useState(false);
  return (
    <div className="panel__section">
      <h3>Invitation links</h3>
      <p className="panel__description">Create links with a role, expiry, and usage limit. Anyone with the link can join.</p>
      {!props.canManage ? <Notice tone="info">Only owners and administrators can manage invitations.</Notice> : null}
      {props.canManage ? <Submit type="button" onPress={() => setShowForm(true)}>Create invitation</Submit> : null}
      {showForm ? <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true"><div className="modal__head"><h2>Create invitation</h2><Submit type="button" variant="quiet" onPress={() => setShowForm(false)}>Close</Submit></div><SelectField label="Role" name={`invite-role-${props.organizationId}`} value={role} options={[{ value: 'member', label: 'Member' }, { value: 'viewer', label: 'Viewer' }, { value: 'admin', label: 'Admin' }]} onChange={(value) => setRole(value as typeof role)} /><Field label="Expires in days" name={`invite-days-${props.organizationId}`} value={days} onChange={setDays} inputMode="numeric" /><Field label="Maximum uses" name={`invite-uses-${props.organizationId}`} value={uses} onChange={setUses} inputMode="numeric" /><Submit pending={create.isPending} onPress={async () => { const result = await create.mutateAsync({ organizationId: props.organizationId, role, maxUses: Number(uses), expiresInSeconds: Number(days) * 86400 }); const value = `${window.location.origin}/organizations/accept?token=${result.link_token}`; setLink(value); await navigator.clipboard?.writeText(value); setShowForm(false); }}>Create and copy link</Submit></div></div> : null}
      {link ? <Notice tone="success">Copied: <code>{link}</code></Notice> : null}
      {create.error ? <Notice tone="warning">Could not create the invitation.</Notice> : null}
      {invitations.data?.map((invitation) => (
        <div className="data" key={invitation.id}>
          <span className="data__label">{invitation.role} · {invitation.use_count}/{invitation.max_uses}</span>
          <span className="data__value">Expires {formatDate(invitation.expires_at)}</span>
          <div className="actions">
            {invitation.use_count < invitation.max_uses ? <Submit variant="quiet" pending={revoke.isPending} onPress={() => revoke.mutate({ organizationId: props.organizationId, invitationId: invitation.id })}>Revoke</Submit> : <Chip tone="idle">Exhausted</Chip>}
            {invitation.use_count < invitation.max_uses ? <Submit variant="quiet" pending={regenerate.isPending} onPress={async () => { const result = await regenerate.mutateAsync({ organizationId: props.organizationId, invitationId: invitation.id }); const value = `${window.location.origin}/organizations/accept?token=${result.link_token}`; await navigator.clipboard?.writeText(value); setLink(value); }}>Copy link</Submit> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ApplicationsSection(props: { organizationId: string; canManage: boolean }) {
  const clients = useOrganizationClients(props.organizationId);
  const register = useRegisterClient();
  const update = useUpdateClient();
  const remove = useDeleteClient();
  const regenerate = useRegenerateClientSecret();
  const [name, setName] = useState('');
  const [redirectUris, setRedirectUris] = useState<string[]>([]);
  const [claims, setClaims] = useState<string[]>([]);
  const [credentials, setCredentials] = useState<{ clientId: string; secret: string | null }>();
  const [isPublic, setIsPublic] = useState(true);
  const [showForm, setShowForm] = useState(false);
  return (
    <div className="panel__section">
      <h3>Applications</h3>
      <p className="panel__description">Public clients use PKCE and have no secret. Confidential clients are server-side applications and receive a secret once.</p>
      {!props.canManage ? <Notice tone="info">Only owners and administrators can manage applications.</Notice> : null}
      {props.canManage ? <Submit type="button" onPress={() => setShowForm(true)}>New application</Submit> : null}
      {showForm ? <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true"><div className="modal__head"><h2>New application</h2><Submit type="button" variant="quiet" onPress={() => setShowForm(false)}>Close</Submit></div><Field label="Application name" name={`app-name-${props.organizationId}`} value={name} onChange={setName} /><label><span>Client type</span><select value={isPublic ? 'public' : 'confidential'} onChange={(event) => setIsPublic(event.target.value === 'public')}><option value="public">Public (CLI, mobile, SPA)</option><option value="confidential">Confidential (server)</option></select></label>{redirectUris.map((uri, index) => <div className="actions" key={index}><Field label={`Redirect URI ${index + 1}`} name={`app-redirect-${props.organizationId}-${index}`} value={uri} onChange={(value) => setRedirectUris(redirectUris.map((item, itemIndex) => itemIndex === index ? value : item))} /><Submit type="button" variant="quiet" onPress={() => setRedirectUris(redirectUris.filter((_item, itemIndex) => itemIndex !== index))}>Remove</Submit></div>)}<Submit type="button" variant="quiet" onPress={() => setRedirectUris([...redirectUris, ''])}>Add redirect URI</Submit><p className="panel__description">Redirect URLs are required for authorization-code clients and must match exactly.</p><ClaimSelector values={claims} onChange={setClaims} name={`app-claims-${props.organizationId}`} /><Submit pending={register.isPending} disabled={!name.trim() || claims.length === 0} onPress={async () => { const result = await register.mutateAsync({ organizationId: props.organizationId, name, redirectUris: redirectUris.map((value) => value.trim()).filter(Boolean), enabledClaims: claims.join(' '), isPublic }); setCredentials({ clientId: result.client_id, secret: result.client_secret }); setName(''); setRedirectUris([]); setClaims([]); setIsPublic(true); setShowForm(false); }}>Register application</Submit></div></div> : null}
      {credentials ? (
        <Notice tone="success">
          <strong>Save the client ID now.{credentials.secret ? ' The secret will not be shown again.' : ' This public client has no secret.'}</strong>
          <div className="credential-list">
            <div><span>Client ID</span><code>{credentials.clientId}</code></div>
            {credentials.secret ? <div><span>Client secret</span><code>{credentials.secret}</code></div> : null}
          </div>
        </Notice>
      ) : null}
      {register.error ? <Notice tone="warning">Application registration failed.</Notice> : null}
      {clients.isLoading ? <Notice tone="info">Loading applications...</Notice> : null}
      {clients.error ? <Notice tone="warning">Applications could not be loaded.</Notice> : null}
      {clients.data?.map((client) => <ApplicationRow key={client.client_id} client={client} organizationId={props.organizationId} canManage={props.canManage} update={update} remove={remove} regenerate={regenerate} onSecret={setCredentials} />)}
    </div>
  );
}

function ApplicationRow(props: {
  client: ClientView;
  organizationId: string;
  canManage: boolean;
  update: ReturnType<typeof useUpdateClient>;
  remove: ReturnType<typeof useDeleteClient>;
  regenerate: ReturnType<typeof useRegenerateClientSecret>;
  onSecret: (value: { clientId: string; secret: string | null }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const uploadIcon = useUploadClientIcon();
  const deleteIcon = useDeleteClientIcon();
  const [name, setName] = useState(props.client.name);
  const [redirectUris, setRedirectUris] = useState(props.client.redirect_uris);
  const [claims, setClaims] = useState(props.client.enabled_scopes.split(' ').filter(Boolean));
  const [isPublic, setIsPublic] = useState(props.client.is_public);
  const [showLinkBuilder, setShowLinkBuilder] = useState(false);
  const [linkRedirect, setLinkRedirect] = useState(props.client.redirect_uris[0] ?? '');
  const [linkScopes, setLinkScopes] = useState(() => props.client.enabled_scopes
    .split(' ')
    .filter(Boolean));
  const [linkState, setLinkState] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string>();
  useEffect(() => {
    const scopes = props.client.enabled_scopes
      .split(' ')
      .filter(Boolean);
    setClaims(scopes);
    setLinkScopes(scopes);
    setLinkRedirect(props.client.redirect_uris[0] ?? '');
    setGeneratedLink(undefined);
  }, [props.client.client_id, props.client.enabled_scopes, props.client.redirect_uris]);
  const availableScopes = props.client.enabled_scopes
    .split(' ')
    .filter(Boolean);
  return (
    <div className="data">
      {editing ? (
        <div>
          <Field label="Name" name={`edit-name-${props.client.client_id}`} value={name} onChange={setName} />
          <label><span>Client type</span><select value={isPublic ? 'public' : 'confidential'} onChange={(event) => setIsPublic(event.target.value === 'public')}><option value="public">Public (CLI, mobile, SPA)</option><option value="confidential">Confidential (server)</option></select></label>
          {redirectUris.map((uri, index) => <div className="actions" key={index}><Field label={`Redirect URI ${index + 1}`} name={`edit-redirect-${props.client.client_id}-${index}`} value={uri} onChange={(value) => setRedirectUris(redirectUris.map((item, itemIndex) => itemIndex === index ? value : item))} /><Submit type="button" variant="quiet" onPress={() => setRedirectUris(redirectUris.filter((_item, itemIndex) => itemIndex !== index))}>Remove</Submit></div>)}
          <Submit type="button" variant="quiet" onPress={() => setRedirectUris([...redirectUris, ''])}>Add redirect URI</Submit>
          <ClaimSelector values={claims} onChange={setClaims} name={`edit-claims-${props.client.client_id}`} />
          <div className="actions">
            <Submit pending={props.update.isPending} disabled={!name.trim() || claims.length === 0} onPress={async () => { const result = await props.update.mutateAsync({ organizationId: props.organizationId, clientId: props.client.client_id, name: name.trim(), redirectUris: redirectUris.map((value) => value.trim()).filter(Boolean), enabledClaims: claims.join(' '), isPublic }); if (result.client_secret) props.onSecret({ clientId: props.client.client_id, secret: result.client_secret }); setEditing(false); }}>Save</Submit>
            <Submit variant="quiet" onPress={() => setEditing(false)}>Cancel</Submit>
          </div>
        </div>
      ) : (
        <>
          <div className="application-heading">{props.client.icon_url ? <img className="application-icon" src={publicAssetUrl(props.client.icon_url)} alt="" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} /> : <span className="application-icon application-icon--empty"><ImagePlus size={20} /></span>}<span><span className="data__label">{props.client.name}</span><span className="data__value">OAuth application</span></span></div>
          <div><span className="data__label">Client ID</span><code className="data__value">{props.client.client_id}</code><small>Internal record: {props.client.id}</small></div>
          <div><span className="data__label">Redirect URIs</span>{props.client.redirect_uris.map((uri) => <span className="data__value" key={uri}>{uri}</span>)}</div>
          <div><span className="data__label">Scopes</span><span className="data__value">{props.client.enabled_scopes}</span></div>
          <div><span className="data__label">Verification</span><span className="data__value">{props.client.verified_at ? 'Verified' : 'Not verified'}</span></div>
          {props.canManage ? <div className="icon-actions">
            <label className="icon-button icon-button--upload" title="Change application icon" aria-label="Change application icon"><Upload size={16} /><input type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadIcon.mutate({ organizationId: props.organizationId, clientId: props.client.client_id, file }); event.currentTarget.value = ''; }} /></label>
            {props.client.icon_url ? <button type="button" title="Delete application icon" aria-label="Delete application icon" disabled={deleteIcon.isPending} onClick={() => deleteIcon.mutate({ organizationId: props.organizationId, clientId: props.client.client_id })}><Trash2 size={16} /></button> : null}
            {consentUrl(props.client) ? <button type="button" title="Open link builder" aria-label="Open link builder" onClick={() => setShowLinkBuilder((visible) => !visible)}><ExternalLink size={16} /></button> : null}
            <button type="button" title="Edit application" aria-label="Edit application" onClick={() => setEditing(true)}><Pencil size={16} /></button>
            {!props.client.is_public ? <button type="button" title="Regenerate secret" aria-label="Regenerate secret" disabled={props.regenerate.isPending} onClick={async () => { const result = await props.regenerate.mutateAsync({ organizationId: props.organizationId, clientId: props.client.client_id }); props.onSecret({ clientId: result.client_id, secret: result.client_secret }); }}><RefreshCw size={16} /></button> : null}
            <button type="button" title="Delete application" aria-label="Delete application" disabled={props.remove.isPending} onClick={() => { if (window.confirm('Delete this application?')) props.remove.mutate({ organizationId: props.organizationId, clientId: props.client.client_id }); }}><Trash2 size={16} /></button>
          </div> : null}
          {showLinkBuilder ? (
            <div className="link-builder">
              <h4>Build authorization link</h4>
              <SelectField label="Redirect URL" name={`link-redirect-${props.client.client_id}`} value={linkRedirect} options={props.client.redirect_uris.map((uri) => ({ value: uri, label: uri }))} onChange={setLinkRedirect} />
              <fieldset className="claim-selector">
                <legend>Scopes</legend>
                {availableScopes.map((scope) => <label className="claim-selector__item" key={scope}><input type="checkbox" checked={linkScopes.includes(scope)} onChange={(event) => setLinkScopes((current) => event.target.checked ? [...current, scope] : current.filter((value) => value !== scope))} /> <span>{scope}</span></label>)}
              </fieldset>
              <Field label="State (optional)" name={`link-state-${props.client.client_id}`} value={linkState} onChange={setLinkState} hint="Returned unchanged to your redirect URL. Use it to match the response to the request." />
              <div className="actions">
                <Submit type="button" disabled={!linkRedirect || linkScopes.length === 0} onPress={() => { const url = new URL('/oauth2/authorize', window.location.origin); url.searchParams.set('response_type', 'code'); url.searchParams.set('client_id', props.client.client_id); url.searchParams.set('redirect_uri', linkRedirect); url.searchParams.set('scope', linkScopes.join(' ')); if (linkState) url.searchParams.set('state', linkState); const value = url.toString(); setGeneratedLink(value); void navigator.clipboard?.writeText(value); }}>Generate and copy</Submit>
                {generatedLink ? <code className="generated-link">{generatedLink}</code> : null}
              </div>
            </div>
          ) : null}
        </>
      )}
      {props.update.error ? <Notice tone="warning">{props.update.error instanceof Error ? props.update.error.message : 'The application could not be updated.'}</Notice> : null}
    </div>
  );
}

const CLAIM_OPTIONS = [
  ['openid', 'OpenID'],
  ['profile', 'Profile'],
  ['email', 'Email'],
  ['offline_access', 'Offline access'],
  ['org:*', 'Organizations'],
] as const;

function ClaimSelector(props: { values: string[]; onChange: (values: string[]) => void; name: string }) {
  return (
    <fieldset className="claim-selector">
      <legend>Enabled scopes</legend>
      {CLAIM_OPTIONS.map(([value, label]) => (
        <label className="claim-selector__item" key={value}>
          <input
            type="checkbox"
            name={props.name}
            value={value}
            checked={props.values.includes(value)}
            onChange={(event) => props.onChange(event.target.checked
              ? Array.from(new Set([...props.values, value]))
              : props.values.filter((current) => current !== value))}
          />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
