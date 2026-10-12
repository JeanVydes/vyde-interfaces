import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ProtectedShell } from '@/components/ProtectedShell';
import { Panel, Field, Submit, Notice, Chip } from '@/components/ui';
import { messages } from '@/lib/messages';
import { emailSchema, type EmailView } from '@/lib/schemas';
import {
  useEmails,
  useAddEmail,
  useRemoveEmail,
  useSetPrimaryEmail,
  useSendVerification,
} from '@/features/queries';

import { RootRoute } from './__root';
import { createRoute } from '@tanstack/react-router';

export const EmailsRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/emails',
  component: () => (
    <ProtectedShell>
      <EmailsScreen />
    </ProtectedShell>
  ),
});

function EmailsScreen() {
  const { data: emails, isLoading, error } = useEmails();
  const add = useAddEmail();
  const remove = useRemoveEmail();
  const setPrimary = useSetPrimaryEmail();
  const resend = useSendVerification();

  const addForm = useForm<AddEmailValues>({
    resolver: zodResolver(addEmailSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  });
  const { handleSubmit: aHandleSubmit, formState: aState } = addForm;

  const onSubmit = async (values: AddEmailValues) => {
    await add.mutateAsync(values.email, {
      onSuccess: () => addForm.reset({ email: '' }),
    });
  };

  const handlePrimary = async (email: EmailView) => {
    if (email.primary) return;
    await setPrimary.mutateAsync(email.id);
  };

  const handleVerify = async (email: EmailView) => {
    await resend.mutateAsync(email.id, {
      onSuccess: () => {
        alert(messages.emails.sent);
      },
    });
  };

  if (isLoading) {
    return (
      <Panel title={messages.nav.emails} bracketed={false}>
        <Notice tone="info">{messages.emails.loading}</Notice>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title={messages.nav.emails} bracketed={false}>
        <Notice tone="warning">{messages.state.error}</Notice>
      </Panel>
    );
  }

  if (!emails) {
    return (
      <Panel title={messages.nav.emails} bracketed={false}>
        <Notice tone="info">{messages.emails.loading}</Notice>
      </Panel>
    );
  }

  return (
    <>
      <Panel
        title={messages.nav.emails}
        bracketed
        action={
          <Submit variant="primary" pending={add.isPending} onPress={aHandleSubmit(onSubmit)}>
            Add address
          </Submit>
        }
      >
        <Field
          label={messages.emails.add}
          name="email"
          value={addForm.watch('email')}
          onChange={(value) => addForm.setValue('email', value)}
          error={aState.errors.email?.message}
        />
      </Panel>

      {emails.emails.map((email) => (
        <Panel key={email.id} title={email.email} bracketed={false}>
          <div className="data" style={{ display: 'grid', gap: 'var(--vyde-space-2)' }}>
            <div>
              <span className="data__label">{messages.emails.status}</span>{' '}
              {email.verified ? <Chip tone="ok">verified</Chip> : <Chip tone="idle">unverified</Chip>}
            </div>
            <div>
              <span className="data__label">{messages.emails.primary}</span>{' '}
              {email.primary ? (
                <Chip tone="ok">primary</Chip>
              ) : (
                <Submit
                  variant="quiet"
                  onPress={() => handlePrimary(email)}
                  disabled={setPrimary.isPending}
                >
                  set primary
                </Submit>
              )}
            </div>
            <div>
              <span className="data__label">{messages.emails.createdAt}</span>
              <time dateTime={email.created_at}>{email.created_at}</time>
            </div>
            <div className="actions">
              {!email.verified ? (
                <Submit variant="quiet" onPress={() => handleVerify(email)} disabled={resend.isPending}>
                  resend code
                </Submit>
              ) : null}
              <Submit
                variant="quiet"
                onPress={() => {
                  if (confirm(messages.emails.confirmRemove)) remove.mutateAsync(email.id);
                }}
                disabled={remove.isPending || email.primary}
              >
                remove
              </Submit>
            </div>
          </div>
        </Panel>
      ))}
    </>
  );
}

const addEmailSchema = z.object({ email: emailSchema });
type AddEmailValues = z.infer<typeof addEmailSchema>;
