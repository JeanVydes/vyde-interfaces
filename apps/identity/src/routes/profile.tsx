import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {createRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { useEffect } from 'react';

import { ProtectedShell } from '@/components/ProtectedShell';
import { Panel, Field, SelectField, Submit, Notice } from '@/components/ui';
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/profile-options';
import { Flags } from '@/components/Flags';
import { messages } from '@/lib/messages';
import { accountSchema } from '@/lib/schemas';
import { useAccount, useUpdateProfile, useUploadPhoto, useUsernameAvailability } from '@/features/queries';

import { RootRoute } from './__root';

export const ProfileRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/profile',
  component: () => (
    <ProtectedShell>
      <ProfileScreen />
    </ProtectedShell>
  ),
});

/** The update form schema: only presence is enforced; the server owns the real policy. */
const updateSchema = accountSchema
  .pick({ name: true, username: true, country: true, language: true, birthday: true })
  .merge(
    z.object({
      // A client cannot change the ID and should not pretend otherwise.
      id: z.literal('me'),
      photo_url: z.string().optional(),
    }),
  )
  .superRefine((data, context) => {
    const birthday = new Date(`${data.birthday}T00:00:00Z`);
    const today = new Date();
    const cutoff = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
    if (birthday > cutoff) {
      context.addIssue({ code: 'custom', path: ['birthday'], message: 'You must be at least 18 years old.' });
    }

  })
  .refine((data) => Object.values(data).some((v) => v !== undefined && v !== ''), {
    message: messages.profile.empty,
  });

export type ProfileValues = z.infer<typeof updateSchema>;

function UsernameField({ form, currentUsername }: { form: ReturnType<typeof useForm<ProfileValues>>; currentUsername: string }) {
  const username = form.watch('username');
  const availability = useUsernameAvailability(username);
  const error = form.formState.errors.username?.message;
  const status =
    username && username !== currentUsername && availability.data?.valid && !availability.data.available
      ? 'Username already taken'
      : undefined;
  return (
    <Field
      label="Username"
      name="username"
      value={username}
      onChange={(value) =>
        form.setValue('username', value.toLowerCase().replace(/[^a-z0-9._]/g, ''), {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
      error={error ?? status}
    />
  );
}

function ProfileScreen() {
  const { data: account, isLoading, error } = useAccount();
  const update = useUpdateProfile();
  const uploadPhoto = useUploadPhoto();
  const navigate = useNavigate();

  const form = useForm<ProfileValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: account
      ? { ...account, id: 'me' as const }
      : { name: '', country: '', language: '', birthday: '', id: 'me' as const },
    mode: 'onBlur',
  });

  const { handleSubmit, formState, watch } = form;
  useEffect(() => {
    if (account) {
      form.reset({ ...account, id: 'me' as const });
    }

  }, [account]);
  const dirty = formState.isDirty;

  const onSubmit = async (values: ProfileValues) => {
    await update.mutateAsync({
      name: values.name,
      username: values.username,
      country: values.country,
      language: values.language,
      birthday: values.birthday,
    });
    // Navigate back to the overview on save so the shell's "Edit profile" action stays consistent.
    navigate({ to: '/overview' });
  };

  if (isLoading) {
    return (
      <Panel title={messages.nav.profile} bracketed={false}>
        <Notice tone="info">Loading profile...</Notice>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title={messages.nav.profile} bracketed={false}>
        <Notice tone="warning">{messages.state.error}</Notice>
      </Panel>
    );
  }

  if (!account) {
    return null;
  }

  return (
    <>
      <Panel
        title={messages.nav.profile}
        description={messages.profile.description}
        bracketed
        action={
          <Submit
            variant="primary"
            pending={update.isPending}
            disabled={!dirty}
            onPress={handleSubmit(onSubmit)}
          >
            {update.isPending ? messages.profile.saving : messages.profile.save}
          </Submit>
        }
      >
        <Field
          label={messages.profile.name}
          name="name"
          value={watch('name')}
          onChange={(value) => form.setValue('name', value, { shouldDirty: true, shouldValidate: true })}
          error={formState.errors.name?.message}
        />
        <div className="profile-public-card">
          <div>
            <strong>Public profile</strong>
            <span>Visible at <code>/u/{account.username ?? ''}</code></span>
          </div>
          <Flags values={account.flags} />
          <a className="button button--quiet" href={`/u/${encodeURIComponent(account.username ?? '')}`}>View profile</a>
        </div>
        <UsernameField form={form} currentUsername={account.username ?? ''} />
        <SelectField
          label={messages.profile.country}
          name="country"
          value={watch('country')}
          options={COUNTRY_OPTIONS}
          onChange={(value) => form.setValue('country', value, { shouldDirty: true, shouldValidate: true })}
          error={formState.errors.country?.message}
        />
        <SelectField
          label={messages.profile.language}
          name="language"
          value={watch('language')}
          options={LANGUAGE_OPTIONS}
          onChange={(value) => form.setValue('language', value, { shouldDirty: true, shouldValidate: true })}
          error={formState.errors.language?.message}
        />
        <Field
          label={messages.profile.birthday}
          name="birthday"
          type="date"
          value={watch('birthday')}
          onChange={(value) => form.setValue('birthday', value, { shouldDirty: true, shouldValidate: true })}
          error={formState.errors.birthday?.message}
        />

        <fieldset style={{ marginTop: 'var(--vyde-space-4)', border: 'none', padding: 0 }}>
          <legend style={{ fontFamily: 'var(--vyde-font-mono)', fontSize: 'var(--vyde-text-xs)', color: 'var(--vyde-fg-muted)' }}>
            {messages.profile.photo}
          </legend>
          {account.photo_url ? (
            <img
              src={account.photo_url}
              alt={messages.profile.photo}
              width={128}
              height={128}
              style={{ display: 'block', objectFit: 'cover', marginBottom: 'var(--vyde-space-2)' }}
            />
          ) : null}
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            disabled={uploadPhoto.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadPhoto.mutateAsync(file);
              event.currentTarget.value = '';
            }}
            style={{
              width: '100%',
            }}
          />
          {uploadPhoto.error ? <Notice tone="warning">Could not upload photo.</Notice> : null}
        </fieldset>
      </Panel>
    </>
  );
}
