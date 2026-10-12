import { Form } from 'react-aria-components';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Field, FieldError, Submit } from '@/components/ui';
import { messages } from '@/lib/messages';

import { loginSchema, type LoginValues } from '../schema';

/**
 * The login form.
 *
 * # Why one generic failure message
 *
 * Every authentication refusal renders `messages.auth.denied` — a wrong password, an address that
 * does not exist, an account with no password, a wrong second factor. The service deliberately makes
 * those indistinguishable (`identity/src/application/use_cases/login.rs` hashes a dummy credential on
 * the unknown-address path specifically to equalise the timing), and copy that tells them apart undoes
 * that at the last step.
 *
 * # Why the code field is conditional, and it is safe
 *
 * This is the one place where conditional rendering would normally hand an attacker a free oracle: if
 * the field appears only for accounts with a second factor, then its presence says the account exists
 * *and* has MFA, to anybody who can type an address into a login form.
 *
 * It is not an oracle here because **the field appears after the password has been verified**, never
 * before. The service answers the first step with `{ challenge_id }` only once the password is right
 * (`LoginOutcome::SecondFactorRequired`), and the form learns nothing from step one — it just submits
 * and is told what came back. The order is the entire property:
 *
 * > a field that appears only after the secret has been proved discloses nothing about who has one.
 *
 * This is why the challenge is held in component state and not in a URL or a query parameter: a
 * challenge in `?challenge_id=…` ends up in history and referrers, and it is the one value in this
 * flow that should not outlive the tab.
 *
 * # Why the fields are controlled rather than spread-registered
 *
 * `register('email')` returns `name`, `onChange`, `onBlur` and `ref` for React DOM. React Aria's
 * `<Input>` needs to own `ref`, `id` and `aria-describedby` — it reads them from the enclosing
 * `TextField` — and a spread of `register` overwrites them. So the values come from `watch` and go
 * back through `setValue`, which is what every other form in the app does. The zod resolver still
 * runs on submit either way; `register` is not what validates.
 */
export function LoginForm(props: {
  onSubmit: (values: LoginValues) => Promise<void>;
  pending: boolean;
  error: string | null;
  /** Seconds remaining, when the server sent a `Retry-After`. */
  retryAfter: number | null;
  /**
   * Whether the service has asked for a second factor.
   *
   * `false` on the first render, for **every** account, including those with a factor. It becomes
   * `true` only after a `200` carrying a `challenge_id`, which the service sends only once the
   * password has been accepted. See the note above on why that ordering is the security property.
   */
  secondFactorRequired: boolean;
}) {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    // Nothing is pre-filled. A password field that arrives populated is a password manager that has
    // been asked about the wrong origin, and an empty one is what every manager expects.
    defaultValues: { email: '', password: '', totpCode: '' },
    mode: 'onBlur',
  });

  const { handleSubmit, formState, watch, setValue } = form;

  return (
    <Form onSubmit={handleSubmit(props.onSubmit)} validationBehavior="aria">
      {props.error ? (
        <div className="alert" role="alert">
          <span aria-hidden="true">▚</span>
          <span>{props.error}</span>
        </div>
      ) : null}

      <Field
        label={messages.auth.email}
        name="email"
        type="email"
        // `username` rather than `email`: this is the identifying half of a credential pair, and a
        // manager that reads it as a standalone email field will offer to save the password alone.
        autoComplete="username"
        value={watch('email') ?? ''}
        onChange={(value) => setValue('email', value)}
        error={formState.errors['email']?.message}
      />

      <Field
        label={messages.auth.password}
        name="password"
        type="password"
        // `current-password` and not `new-password`: on a *login* form they mean different things to
        // a manager, and getting it backwards is how a login form starts offering to save a new one.
        autoComplete="current-password"
        value={watch('password') ?? ''}
        onChange={(value) => setValue('password', value)}
        error={formState.errors['password']?.message}
      />

      {/*
        Conditional, and safe only because of *when*. See the note at the top of this file. React
        mounts this only after the password was accepted, so its absence tells an attacker nothing:
        every account that does not have a factor never reaches this branch at all.
      */}
      {props.secondFactorRequired ? (
        <Field
          label={messages.auth.verificationCode}
          name="totpCode"
          type="text"
          inputMode="numeric"
          // Without this a password manager will not offer to fill the code. `one-time-code` is
          // also what tells an SMS or a clipboard entry that this box wants the thing they just
          // copied, which is most of how MFA codes actually get typed.
          autoComplete="one-time-code"
          value={watch('totpCode') ?? ''}
          onChange={(value) => setValue('totpCode', value)}
          error={formState.errors['totpCode']?.message}
          hint={messages.auth.twoFactorHint}
        />
      ) : null}

      <Submit type="submit" pending={props.pending}>
        {props.pending
          ? messages.auth.signingIn
          : props.secondFactorRequired
            ? messages.auth.verifySecondFactor
            : messages.auth.signIn}
      </Submit>

      {props.retryAfter !== null ? (
        <p className="field__hint" role="status">
          {messages.auth.rateLimited(props.retryAfter)}
        </p>
      ) : null}
    </Form>
  );
}

/** Re-exported so a caller need not import from two places for one concept. */
export { FieldError };