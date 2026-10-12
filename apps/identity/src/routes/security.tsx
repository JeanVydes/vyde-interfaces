import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { useEffect } from 'react';
import QRCode from 'qrcode';

import { ProtectedShell } from '@/components/ProtectedShell';
import { Panel, Field, Submit, Notice } from '@/components/ui';
import { messages } from '@/lib/messages';
import { passwordSchema } from '@/lib/schemas';
import {
  useMfaStatus,
  useBeginMfa,
  useConfirmMfa,
  useRemoveMfa,
  useChangePassword,
} from '@/features/queries';

import { RootRoute } from './__root';
import { createRoute } from '@tanstack/react-router';

export const SecurityRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/security',
  component: () => (
    <ProtectedShell>
      <SecurityScreen />
    </ProtectedShell>
  ),
});

function SecurityScreen() {
  const { data: mfa } = useMfaStatus();
  const begin = useBeginMfa();
  const confirm = useConfirmMfa();
  const remove = useRemoveMfa();
  const change = useChangePassword();

  const passwordForm = useForm({
    resolver: zodResolver(
      z.object({
        current_password: passwordSchema,
        new_password: passwordSchema,
        confirm_password: z.string(),
      }).refine((data) => data.new_password === data.confirm_password, {
        message: messages.security.passwordsDontMatch,
      })),
    mode: 'onBlur',
  });

  const onPasswordSubmit = async () => {
    await change.mutateAsync({
      currentPassword: passwordForm.getValues('current_password'),
      newPassword: passwordForm.getValues('new_password'),
    });
  };

  // MFA state
  const [enrollState, setEnrollState] = useState<{
    secret: string;
    provisioningUri: string;
    recoveryCodes: string[];
  } | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    if (!enrollState) {
      setQrCode(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(enrollState.provisioningUri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
    }).then((dataUrl) => {
      if (!cancelled) setQrCode(dataUrl);
    }).catch((error: unknown) => {
      console.error('[identity] could not render MFA QR code', error);
      if (!cancelled) setQrCode(null);
    });
    return () => {
      cancelled = true;
    };
  }, [enrollState]);

  // --- helpers inside the component so they close over all hooks ---

  function handleMfaAction() {
    if (mfa?.active) {
      handleDisable();
    } else {
      handleBegin();
    }
  }

  function handleBegin() {
    begin.mutateAsync('phone', {
      onSuccess: (data) => {
        setEnrollState({
          secret: data.secret,
          provisioningUri: data.provisioning_uri,
          recoveryCodes: data.recovery_codes,
        });
      },
    });
  }

  function handleDisable() {
    const password = window.prompt('Enter your current password:');
    if (!password) return;
    const code = window.prompt('Enter a six-digit verification code:');
    if (!code || code.trim().length < 6) return;
    remove.mutateAsync({ password, code: code.trim() }, {
      onSuccess: () => window.location.reload(),
    });
  }

  function renderMfaForm() {
    if (!mfa) {
      return <Notice tone="info">Loading...</Notice>;
    }

    if (enrollState !== null) {
      return <EnrollStep enrollState={enrollState} confirm={confirm} />;
    }

    if (mfa.active) {
      return <RemoveStep remove={remove} />;
    }

    return <Notice tone="info">{messages.security.mfaOff}</Notice>;
  }

  function EnrollStep(props: {
    enrollState: { secret: string; provisioningUri: string; recoveryCodes: string[] };
    confirm: ReturnType<typeof useConfirmMfa>;
  }) {
    const handleConfirm = async () => {
      const code = window.prompt('Enter the code from your authenticator:');
      if (!code || code.trim().length < 6) return;
      await props.confirm.mutateAsync(code.trim());
      setEnrollState(null);
    };
    return (
      <div>
        <p>{messages.security.enrollInstruction}</p>
        {qrCode ? (
          <img
            src={qrCode}
            alt="Authenticator setup QR code"
            width={256}
            height={256}
            style={{ display: 'block', margin: 'var(--vyde-space-4) 0', imageRendering: 'pixelated' }}
          />
        ) : (
          <Notice tone="info">Preparing QR code...</Notice>
        )}
        <p className="field__hint">Secret: {props.enrollState.secret}</p>
        <Submit variant="primary" onPress={handleConfirm} pending={props.confirm.isPending}>
          {messages.security.confirmEnroll}
        </Submit>
        <p style={{ marginTop: 'var(--vyde-space-3)', fontFamily: 'var(--vyde-font-mono)', fontSize: 'var(--vyde-text-xs)' }}>
          {messages.security.recoveryCodes}
          <pre style={{
            marginTop: 'var(--vyde-space-2)',
            padding: 'var(--vyde-space-3)',
            background: 'var(--vyde-bg-raised)',
            border: '1px solid var(--vyde-line)',
            clipPath: 'var(--vyde-chamfer-sm)',
            overflow: 'auto',
          }}>
            {props.enrollState.recoveryCodes.join('\n')}
          </pre>
        </p>
      </div>
    );
  }

  function RemoveStep(props: { remove: ReturnType<typeof useRemoveMfa> }) {
    return (
      <div>
        <p>{messages.security.disableInstruction}</p>
        <Submit variant="primary" onPress={handleDisable} pending={props.remove.isPending}>
          {messages.security.confirmDisable}
        </Submit>
      </div>
    );
  }

  return (
    <>
      <Panel title={messages.nav.security} bracketed={false}>
        {mfa === undefined ? (
          <Notice tone="info">Loading security settings...</Notice>
        ) : mfa.active ? (
          <Notice tone="success">{messages.security.mfaOn}</Notice>
        ) : (
          <Notice tone="info">{messages.security.mfaOff}</Notice>
        )}
      </Panel>

      <Panel
        title={messages.security.changePassword}
        bracketed
        action={
          <Submit
            variant="primary"
            pending={change.isPending}
            onPress={passwordForm.handleSubmit(onPasswordSubmit)}
          >
            {change.isPending ? messages.security.saving : messages.security.changePassword}
          </Submit>
        }
      >
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
          <Field
            label={messages.security.currentPassword}
            name="current_password"
            type="password"
            value={passwordForm.watch('current_password') ?? ''}
            onChange={(value) => passwordForm.setValue('current_password', value, { shouldDirty: true })}
            error={passwordForm.formState.errors.current_password?.message as string | undefined}
          />
          <Field
            label={messages.security.newPassword}
            name="new_password"
            type="password"
            value={passwordForm.watch('new_password') ?? ''}
            onChange={(value) => passwordForm.setValue('new_password', value, { shouldDirty: true })}
            error={passwordForm.formState.errors.new_password?.message as string | undefined}
          />
          <Field
            label={messages.security.confirmPassword}
            name="confirm_password"
            type="password"
            value={passwordForm.watch('confirm_password') ?? ''}
            onChange={(value) => passwordForm.setValue('confirm_password', value, { shouldDirty: true })}
            error={passwordForm.formState.errors.confirm_password?.message as string | undefined}
          />
        </form>
      </Panel>

      <Panel
        title={messages.security.secondFactor}
        bracketed
        action={
          <Submit
            variant={mfa?.active ? 'quiet' : 'primary'}
            pending={begin.isPending || confirm.isPending || remove.isPending}
            onPress={handleMfaAction}
          >
            {mfa?.active
              ? messages.security.disableSecondFactor
              : messages.security.enableSecondFactor}
          </Submit>
        }
      >
        {renderMfaForm()}
      </Panel>
    </>
  );
}