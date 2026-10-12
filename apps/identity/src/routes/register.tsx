import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createRoute, Link, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';

import { Field, Panel, SelectField, Submit } from '@/components/ui';
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/profile-options';
import { PublicShell } from '@/components/ProtectedShell';
import { messages } from '@/lib/messages';
import { birthdateSchema, emailSchema, passwordSchema } from '@/lib/schemas';
import { useRegister, useUsernameAvailability } from '@/features/queries';

import { RootRoute } from './__root';

export const RegisterRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: 'register',
  component: RegisterScreen,
});

/**
 * The registration form's own validation.
 *
 * Presence and shape only, and deliberately so: `domain/credential/entity.rs` and
 * `domain/validation` own the real policy, and a client that guesses at it produces a form accepting
 * what the server rejects. The two rules below that *are* client-side are the ones no browser can
 * check for us — the passwords match, and the codes are the right length.
 */
const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters.').max(80),
    username: z.string().regex(/^[a-z0-9](?:[a-z0-9._]{1,28}[a-z0-9])?$/, 'Use 3-30 lowercase letters, numbers, dots, or underscores.'),
    email: emailSchema,
    password: passwordSchema.min(10, 'Password must be at least 10 characters.'),
    confirmPassword: z.string(),
    country: z.string().length(2, 'Use a 2-letter country code.'),
    language: z.string().length(2, 'Use a 2-letter language code.'),
    birthday: birthdateSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'The two passwords do not match.',
    path: ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof registerSchema>;

function RegisterScreen() {
  const navigate = useNavigate();
  const register = useRegister();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      country: '',
      language: '',
      birthday: '',
    },
    mode: 'onBlur',
  });

  const { handleSubmit, formState, watch, setValue } = form;
  const usernameAvailability = useUsernameAvailability(watch('username'));

  const onSubmit = async (values: RegisterValues) => {
    await register.mutateAsync({
      name: values.name,
      username: values.username,
      email: values.email,
      password: values.password,
      country: values.country,
      language: values.language,
      birthday: values.birthday,
    });
    // Registration issues **no** token — `RegisterAccountResponse` carries an optional
    // `access_token` that the first-party path does not use — so the new account signs in next. The
    // redirect is therefore correct even though the account exists: nobody is signed in yet.
    void navigate({ to: '/login' });
  };

  return (
    <PublicShell>
      <main id="main" className="auth">
      <div className="auth__panel panel--bracketed">
        <h1 className="auth__brand">Vyde</h1>
        <p className="auth__sub">Create account</p>

        <Panel title={messages.register.title} bracketed={false}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/*
              Controlled through `watch`/`setValue` rather than `{...register('name')}`.
              `register` hands back `name`, `onChange`, `onBlur` and `ref` for React DOM, and React
              Aria's `<Input>` owns `ref`, `id` and `aria-describedby` — a spread overwrites them and
              leaves the input unlabelled. The zod resolver still runs on submit either way.
            */}
            <Field
              label={messages.profile.name}
              name="name"
              value={watch('name') ?? ''}
              onChange={(value) => setValue('name', value, { shouldValidate: true })}
              error={formState.errors.name?.message}
            />
            <Field
              label="Username"
              name="username"
              autoComplete="username"
              value={watch('username') ?? ''}
              onChange={(value) =>
                setValue('username', value.toLowerCase().replace(/[^a-z0-9._]/g, ''), {
                  shouldValidate: true,
                })
              }
              error={
                formState.errors.username?.message ??
                (usernameAvailability.data?.valid && !usernameAvailability.data.available
                  ? 'Username already taken.'
                  : undefined)
              }
            />
            <Field
              label={messages.auth.email}
              name="email"
              type="email"
              autoComplete="username"
              value={watch('email') ?? ''}
              onChange={(value) => setValue('email', value, { shouldValidate: true })}
              error={formState.errors.email?.message}
            />
            <Field
              label={messages.auth.password}
              name="password"
              type="password"
              // `new-password`, not `current-password`: this is the one place a manager *should*
              // offer to generate and save.
              autoComplete="new-password"
              value={watch('password') ?? ''}
              onChange={(value) => setValue('password', value, { shouldValidate: true })}
              error={formState.errors.password?.message}
            />
            <Field
              label={messages.security.confirmPassword}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={watch('confirmPassword') ?? ''}
              onChange={(value) => setValue('confirmPassword', value, { shouldValidate: true })}
              error={formState.errors.confirmPassword?.message}
            />
            <SelectField
              label={messages.profile.country}
              name="country"
              value={watch('country') ?? ''}
              options={COUNTRY_OPTIONS}
              onChange={(value) => setValue('country', value, { shouldValidate: true })}
              error={formState.errors.country?.message}
            />
            <SelectField
              label={messages.profile.language}
              name="language"
              value={watch('language') ?? ''}
              options={LANGUAGE_OPTIONS}
              onChange={(value) => setValue('language', value, { shouldValidate: true })}
              error={formState.errors.language?.message}
            />
            <Field
              label={messages.profile.birthday}
              name="birthday"
              type="date"
              value={watch('birthday') ?? ''}
              onChange={(value) => setValue('birthday', value, { shouldValidate: true })}
              error={formState.errors.birthday?.message}
            />
            <Submit
              type="submit"
              pending={register.isPending}
            >
              {register.isPending ? 'Creating account' : 'Create account'}
            </Submit>
          </form>
        </Panel>
        <p className="auth__switch">
          Already provisioned? <Link to="/login">Sign in</Link>
        </p>
      </div>
      </main>
    </PublicShell>
  );
}