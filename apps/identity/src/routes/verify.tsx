import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {createRoute, useNavigate, useParams } from '@tanstack/react-router';
import { z } from 'zod';

import { Panel, Field, Submit } from '@/components/ui';
import { PublicShell } from '@/components/ProtectedShell';
import { messages } from '@/lib/messages';
import { useVerifyEmail, useSendVerification } from '@/features/queries';

import { RootRoute } from './__root';

export const VerifyRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/verify/$emailId',
  component: VerifyScreen,
});

const verifySchema = z.object({
  code: z.string().min(4, 'Enter the code from the e-mail.').max(8),
});

type VerifyValues = z.infer<typeof verifySchema>;

function VerifyScreen() {
  const { emailId } = useParams({ from: '/verify/$emailId' as const });
  const navigate = useNavigate();
  const verify = useVerifyEmail();
  const resend = useSendVerification();

  const form = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: '' },
    mode: 'onBlur',
  });

  const { handleSubmit, formState, watch, setValue } = form;

  const onSubmit = async (values: VerifyValues) => {
    await verify.mutateAsync({ emailId, code: values.code });
    navigate({ to: '/login' });
  };

  return (
    <PublicShell>
      <main id="main" className="auth">
      <div className="auth__panel panel--bracketed">
        <h1 className="auth__brand">Vyde</h1>
        <p className="auth__sub">Verify e-mail</p>

        <Panel title="Enter the code" description="We sent a code to your e-mail address." bracketed={false}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Field
              label={messages.emails.verifyPrompt}
              name="code"
              value={watch('code') ?? ''}
              onChange={(value) => setValue('code', value)}
              error={formState.errors.code ? formState.errors.code.message : undefined}
            />
            <Submit pending={verify.isPending}>
              {verify.isPending ? 'Verifying' : 'Verify'}
            </Submit>
          </form>
          <div className="actions">
            <Submit
              variant="quiet"
              onPress={() => resend.mutateAsync(emailId)}
              disabled={resend.isPending}
            >
              Resend code
            </Submit>
          </div>
        </Panel>
      </div>
      </main>
    </PublicShell>
  );
}