/**
 * Every server read and write in the app, in one file.
 *
 * # Why the hooks and the paths live together
 *
 * Because a hook that hard-codes a path is a hook whose path cannot be checked, and a path that
 * cannot be checked is the thing that breaks when the service moves an endpoint. Keeping them
 * adjacent means the route and the shape that validates its answer can be read on one screen.
 *
 * # Why nothing here renders
 *
 * Every hook returns data, pending state, and an error. The decision about what a failure *looks*
 * belongs to the screen, because "the theme failed to save" and "the account failed to load" want
 * different treatment — one is a message under a control, the other is the whole screen.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { apiGet, apiSend, ApiError } from '@/lib/api';
import { SESSION_KEY, fetchSession } from '@/lib/session';
import {
  accountSchema,
  publicAccountSchema,
  publicOrganizationSchema,
  usernameAvailabilitySchema,
  clientsSchema,
  clientViewSchema,
  consentPreviewSchema,
  enrollmentSchema,
  grantsSchema,
  listEmailsSchema,
  listMembersSchema,
  invitationsSchema,
  invitationSchema,
  invitationPreviewSchema,
  listOrganizationsSchema,
  mfaStatusSchema,
  organizationSchema,
  preferencesSchema,
  registerResponseSchema,
  registeredClientSchema,
  regeneratedClientSchema,
  updatedClientSchema,
  resendResponseSchema,
} from '@/lib/schemas';

import type {
  AccountResponse,
  Enrollment,
  GrantView,
  MemberView,
  Organization,
  PreferencesResponse,
  RegisterResponse,
  RegisteredClient,
  ResendResponse,
} from '@/lib/schemas';

/** Re-exported so a screen does not import from two places to say "this failed". */
export { ApiError };

// --- account ----------------------------------------------------------------

/**
 * The signed-in account.
 *
 * # Why this shares `useSession`'s cache entry instead of having its own
 *
 * Because it is the same request. `useSession` asks `GET /v1/accounts/me` to answer "is anybody
 * signed in"; this asks the same question to fill in a screen. Under separate keys — `['account']`
 * and `['session']` — React Query sees two unrelated queries, fires both, and they arrive at the
 * gateway together.
 *
 * Sharing the key avoids duplicate requests and keeps the session state consistent.
 */
export function useAccount() {
  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: fetchSession,
    retry: false,
    staleTime: 30_000,
  });

  return { ...query, data: query.data ?? undefined };
}

export type UpdateProfileInput = {
  name?: string;
  username?: string;
  country?: string;
  language?: string;
  birthday?: string;
};

/**
 * The profile write.
 *
 * Sends only the fields that changed. `PATCH /v1/accounts/me` treats an absent key as *leave it
 * alone*, so a form that submits every field turns a partial update into an overwrite — and two
 * screens open at once would then fight.
 */
export function useUpdateProfile(): UseMutationResult<AccountResponse, unknown, UpdateProfileInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => {
      const changed = Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined),
      );

      await apiSend('/v1/accounts/me', 'PATCH', changed);

      // The account *is* the answer to the query it invalidates. Reading it back rather than
      // patching the cache means a server-side normalisation — a trimmed name, a canonical address —
      // is what the interface shows, not what was typed.
      return apiGet('/v1/accounts/me', accountSchema);
    },
    onSuccess: (account) => {
      queryClient.setQueryData(['account'], account);
    },
  });
}

export function useUsernameAvailability(username: string | undefined) {
  return useQuery({
    queryKey: ['username-availability', username ?? ''],
    enabled: Boolean(username),
    queryFn: () =>
      apiGet(
        `/v1/accounts/username-availability?username=${encodeURIComponent(username ?? '')}`,
        usernameAvailabilitySchema,
      ),
  });
}

export function usePublicAccount(username: string) {
  return useQuery({
    queryKey: ['public-account', username],
    queryFn: () => apiGet(`/v1/public/accounts/${encodeURIComponent(username)}`, publicAccountSchema),
  });
}

export function usePublicOrganization(slug: string) {
  return useQuery({
    queryKey: ['public-organization', slug],
    queryFn: () => apiGet(`/v1/public/organizations/${encodeURIComponent(slug)}`, publicOrganizationSchema),
  });
}

// --- emails -----------------------------------------------------------------

export function useEmails() {
  return useQuery({
    queryKey: ['emails'],
    queryFn: ({ signal }) => apiGet('/v1/accounts/me/emails', listEmailsSchema, { signal }),
  });
}

export function useAddEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => apiSend('/v1/accounts/me/emails', 'POST', { email, primary: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emails'] }),
  });
}

export function useRemoveEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (emailId: string) => apiSend(`/v1/accounts/me/emails/${emailId}`, 'DELETE'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emails'] }),
  });
}

export function useSetPrimaryEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (emailId: string) => apiSend(`/v1/accounts/me/emails/${emailId}/primary`, 'PUT'),
    // The primary address is also on the account, so both caches are stale.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['emails'] });
      void queryClient.invalidateQueries({ queryKey: SESSION_KEY });
    },
  });
}

/** `POST /v1/accounts/me/emails/{id}/resend` — sends a new code and reads it back. */
export function useSendVerification(): UseMutationResult<
  ResendResponse,
  unknown,
  string
> {
  return useMutation({
    mutationFn: async (emailId: string) =>
      apiGet(
        `/v1/accounts/me/emails/${emailId}/resend`,
        resendResponseSchema,
        // A fresh code is being issued, which is a write even though the shape is returned
        // immediately. An explicit method is correct here: a POST is idempotent for the server
        // and the caller must be able to retry without fear.
        { method: 'POST' },
      ),
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append('photo', file);
      return apiGet('/v1/accounts/me/photo', accountSchema, { method: 'POST', body });
    },
    onSuccess: (account) => {
      queryClient.setQueryData(SESSION_KEY, account);
    },
  });
}

/** `POST /v1/accounts/me/emails/{id}/verify`. */
export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { emailId: string; code: string }) => {
      await apiSend(`/v1/accounts/me/emails/${input.emailId}/verify`, 'POST', { code: input.code });
      return apiGet('/v1/accounts/me/emails', listEmailsSchema);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['emails'] });
      void queryClient.invalidateQueries({ queryKey: SESSION_KEY });
    },
  });
}

// --- password ---------------------------------------------------------------

/**
 * Changing a password.
 *
 * `PATCH /v1/accounts/me/password` requires the current one. That is not friction to work around —
 * without it a stolen token alone could take an account over permanently, and any client that made it
 * optional would be the vulnerability.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      apiSend('/v1/accounts/me/password', 'PATCH', {
        current_password: input.currentPassword,
        new_password: input.newPassword,
      }),
  });
}

// --- second factor ----------------------------------------------------------

export function useMfaStatus() {
  return useQuery({
    queryKey: ['mfa'],
    queryFn: ({ signal }) => apiGet('/v1/accounts/me/mfa', mfaStatusSchema, { signal }),
  });
}

export function useBeginMfa() {
  return useMutation({
    mutationFn: (label: string) =>
      apiGet('/v1/accounts/me/mfa/enroll', enrollmentSchema, { method: 'POST', body: { label } }),
  });
}

export function useConfirmMfa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      await apiSend('/v1/accounts/me/mfa/confirm', 'POST', { code });
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mfa'] }),
  });
}

export function useRemoveMfa() {
  const queryClient = useQueryClient();
  return useMutation({
    // Both the password and a code. Refusing to remove a second factor on the strength of a live
    // session alone is what stops a borrowed laptop from permanently locking its owner out.
    mutationFn: (input: { password: string; code: string }) =>
      apiSend('/v1/accounts/me/mfa', 'DELETE', { password: input.password, code: input.code }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mfa'] }),
  });
}

// --- preferences ------------------------------------------------------------

export function usePreferences(): UseQueryResult<PreferencesResponse, Error> {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: ({ signal }) => apiGet('/v1/accounts/me/preferences', preferencesSchema, { signal }),
    // A theme that flickers back to the default on every refetch is worse than one that is briefly
    // stale, and nothing here is urgent.
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Saves the whole preference map, or part of it.
 *
 * The service refuses an unknown key rather than ignoring it, so a client that sends a key it invented
 * gets an error instead of a false success. That is why this takes a typed `Partial<Record<...>>`
 * rather than a loose object: the type is the check.
 */
export function useSavePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (preferences: Record<string, boolean | string>) => {
      await apiSend('/v1/accounts/me/preferences', 'PATCH', { preferences });
      return apiGet('/v1/accounts/me/preferences', preferencesSchema);
    },
    onSuccess: (saved) => queryClient.setQueryData(['preferences'], saved),
  });
}

// --- grants -----------------------------------------------------------------

export function useGrants() {
  return useQuery({
    queryKey: ['grants'],
    queryFn: ({ signal }) => apiGet('/v1/grants', grantsSchema, { signal }),
  });
}

export function useRevokeGrant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientId: string) => apiSend(`/v1/grants/${encodeURIComponent(clientId)}`, 'DELETE'),
    onSuccess: (_result, clientId) => {
      queryClient.setQueryData(
        ['grants'],
        (grants: Array<{ client_id: string }> | undefined) =>
          grants?.filter((grant) => grant.client_id !== clientId),
      );
      void queryClient.invalidateQueries({ queryKey: ['grants'] });
    },
  });
}

export function useConsentPreview() {
  return useMutation({
    mutationFn: (input: { clientId: string; redirectUri: string; requested: string }) =>
      apiGet('/v1/grants/consent-preview', consentPreviewSchema, {
        method: 'POST',
        body: { client_id: input.clientId, redirect_uri: input.redirectUri, requested: input.requested },
      }),
  });
}

// --- organizations ----------------------------------------------------------

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: ({ signal }) =>     apiGet('/v1/organizations', listOrganizationsSchema, { signal }),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; slug: string }) =>
      apiGet('/v1/organizations', organizationSchema, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export function useMembers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['members', organizationId],
    queryFn: ({ signal }) => apiGet(`/v1/organizations/${organizationId}/members`, listMembersSchema, { signal }),
    enabled: organizationId !== undefined,
  });
}

export function useInvitations(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['invitations', organizationId],
    queryFn: ({ signal }) => apiGet(`/v1/organizations/${organizationId}/invitations`, invitationsSchema, { signal }),
    enabled: organizationId !== undefined,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { organizationId: string; role: 'admin' | 'member' | 'viewer'; expiresInSeconds: number; maxUses: number }) =>
      apiGet(`/v1/organizations/${input.organizationId}/invitations`, invitationSchema, {
        method: 'POST',
        body: {
          role: input.role,
          expires_in_seconds: input.expiresInSeconds,
          max_uses: input.maxUses,
        },
      }),
    onSuccess: (_result, input) => queryClient.invalidateQueries({ queryKey: ['invitations', input.organizationId] }),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { organizationId: string; invitationId: string }) =>
      apiSend(
        `/v1/organizations/${input.organizationId}/invitations/${input.invitationId}`,
        'DELETE',
      ),
    onSuccess: (_result, input) =>
      queryClient.setQueryData(
        ['invitations', input.organizationId],
        (items: Array<{ id: string }> | undefined) =>
          items?.filter((item) => item.id !== input.invitationId),
      ),
  });
}

export function useRegenerateInvitationLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { organizationId: string; invitationId: string }) =>
      apiGet(
        `/v1/organizations/${input.organizationId}/invitations/${input.invitationId}`,
        invitationSchema,
        { method: 'POST' },
      ),
    onSuccess: (_result, input) =>
      queryClient.invalidateQueries({ queryKey: ['invitations', input.organizationId] }),
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (token: string) => apiSend('/v1/organizations/invitations/accept', 'POST', { token }),
  });
}

export function usePreviewInvitation() {
  return useMutation({
    mutationFn: (token: string) =>
      apiGet('/v1/organizations/invitations/preview', invitationPreviewSchema, {
        method: 'POST',
        body: { token },
      }),
  });
}

export function useChangeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { organizationId: string; accountId: string; role: MemberView['role'] }) =>
      apiSend(
        `/v1/organizations/${input.organizationId}/members/${input.accountId}`,
        'PATCH',
        { role: input.role },
      ),
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: ['members', input.organizationId] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { organizationId: string; accountId: string }) =>
      apiSend(`/v1/organizations/${input.organizationId}/members/${input.accountId}`, 'DELETE'),
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: ['members', input.organizationId] });
    },
  });
}

export function useLeaveOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (organizationId: string) =>
      apiSend(`/v1/organizations/${organizationId}/leave`, 'POST'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { organizationId: string; name: string; slug: string }) =>
      apiSend(`/v1/organizations/${input.organizationId}`, 'PATCH', { name: input.name, slug: input.slug }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export function useRegisterClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      organizationId: string;
      clientId?: string;
      name: string;
      redirectUris: string[];
      enabledClaims: string;
      isPublic: boolean;
    }) =>
      apiGet(
        `/v1/organizations/${input.organizationId}/clients`,
        registeredClientSchema,
        {
          method: 'POST',
          body: {
            ...(input.clientId === undefined ? {} : { client_id: input.clientId }),
            name: input.name || undefined,
            redirect_uris: input.redirectUris,
            enabled_scopes: input.enabledClaims,
            grant_types: ['authorization_code', 'refresh_token'],
            is_public: input.isPublic,
          },
        },
      ),
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
      void queryClient.invalidateQueries({ queryKey: ['organization-clients', input.organizationId] });
    },
  });
}

export function useOrganizationClients(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-clients', organizationId],
    queryFn: ({ signal }) =>
      apiGet(`/v1/organizations/${organizationId}/clients`, clientsSchema, { signal }),
    enabled: organizationId !== undefined,
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      clientId: string;
      name?: string;
      redirectUris?: string[];
      enabledClaims?: string;
      grantTypes?: string[];
      isPublic?: boolean;
    }) =>
      apiGet(
        `/v1/organizations/${input.organizationId}/clients/${encodeURIComponent(input.clientId)}`,
        updatedClientSchema,
        {
          method: 'PATCH',
          body: {
            ...(input.name === undefined ? {} : { name: input.name }),
            ...(input.redirectUris === undefined ? {} : { redirect_uris: input.redirectUris }),
            ...(input.enabledClaims === undefined ? {} : { enabled_scopes: input.enabledClaims }),
            ...(input.grantTypes === undefined ? {} : { grant_types: input.grantTypes }),
            ...(input.isPublic === undefined ? {} : { is_public: input.isPublic }),
          },
        },
      ),
    onSuccess: (_result, input) =>
      queryClient.invalidateQueries({ queryKey: ['organization-clients', input.organizationId] }),
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { organizationId: string; clientId: string }) =>
      apiSend(
        `/v1/organizations/${input.organizationId}/clients/${encodeURIComponent(input.clientId)}`,
        'DELETE',
      ),
    onSuccess: (_result, input) =>
      queryClient.invalidateQueries({ queryKey: ['organization-clients', input.organizationId] }),
  });
}

export function useUploadClientIcon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { organizationId: string; clientId: string; file: File }) => {
      const form = new FormData();
      form.append('icon', input.file, input.file.name);
      return apiGet(
        `/v1/organizations/${input.organizationId}/clients/${encodeURIComponent(input.clientId)}/icon`,
        clientViewSchema,
        { method: 'POST', body: form },
      );
    },
    onSuccess: (_result, input) =>
      queryClient.invalidateQueries({ queryKey: ['organization-clients', input.organizationId] }),
  });
}

export function useDeleteClientIcon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { organizationId: string; clientId: string }) =>
      apiGet(
        `/v1/organizations/${input.organizationId}/clients/${encodeURIComponent(input.clientId)}/icon`,
        clientViewSchema,
        { method: 'DELETE' },
      ),
    onSuccess: (_result, input) =>
      queryClient.invalidateQueries({ queryKey: ['organization-clients', input.organizationId] }),
  });
}

export function useRegenerateClientSecret() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { organizationId: string; clientId: string }) =>
      apiGet(
        `/v1/organizations/${input.organizationId}/clients/${encodeURIComponent(input.clientId)}/secret`,
        regeneratedClientSchema,
        { method: 'POST' },
      ),
    onSuccess: (_result, input) =>
      queryClient.invalidateQueries({ queryKey: ['organization-clients', input.organizationId] }),
  });
}

// --- registration -----------------------------------------------------------

/**
 * Create an account.
 *
 * **Issues no token.** `RegisterAccountResponse` has an optional `access_token`, but the first-party
 * path does not use it — the user signs in next, so the session is created by the credential they
 * chose rather than handed to them at the top of the flow. This type reflects what the app actually
 * relies on, so a later change to that decision is a type error here rather than a blank screen.
 */
export function useRegister(): UseMutationResult<RegisterResponse | undefined, unknown, RegisterInput> {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      await apiSend('/v1/accounts', 'POST', {
        name: input.name,
        username: input.username,
        password: input.password,
        email: input.email,
        country: input.country,
        language: input.language,
        birthday: input.birthday,
        client_id: 'native',
      }, { anonymous: true });
      // Not signed in yet, so there is nothing to read back. The registration itself succeeded and
      // that is all the screen needs in order to move to "check your inbox".
      return apiGet('/v1/accounts/me', registerResponseSchema).catch(() => undefined);
    },
  });
}

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
  country: string;
  language: string;
  birthday: string;
}

/** `GET /v1/organizations/{id}` — used to name the organization a screen is about. */
export function useOrganization(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization', organizationId],
    queryFn: ({ signal }) =>
      apiGet(`/v1/organizations/${organizationId}`, organizationSchema, { signal }),
    enabled: organizationId !== undefined,
  });
}

export type {
  AccountResponse,
  Enrollment,
  GrantView,
  MemberView,
  Organization,
  PreferencesResponse,
  RegisterResponse,
  RegisteredClient,
  ResendResponse,
};