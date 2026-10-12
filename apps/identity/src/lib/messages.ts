/**
 * Every string the user can read, in one place.
 *
 * # Why a hand-written catalogue and not i18next
 *
 * Because there is exactly one locale and the app is not translated yet. An i18n framework here
 * would be a dependency, a provider, a bundler plugin and a locale-detection pass — four moving
 * parts to say `"ACCESS DENIED"` — and the moment the second locale arrives every one of those is
 * needed anyway.
 *
 * The catalogue is shaped so that move is cheap: **no component contains a user-facing string.**
 * A component imports a key, and the key's English text lives here. That is the whole i18n-readiness
 * requirement, and it is met by construction rather than by a library.
 *
 * # Two rules this file exists to enforce
 *
 * 1. **An auth failure has exactly one message.** `auth.denied` is used for every refusal: a wrong
 *    password, an unknown address, a wrong second factor, a malformed code. The service deliberately
 *    makes those indistinguishable (see `use_cases/login.rs`), and copy that distinguishes them
 *    undoes that at the last step. A themed "ACCESS DENIED" on every failure is not less informative
 *    — it is as informative as the service is, which is the point.
 *
 * 2. **A rate limit says only when to come back.** Never "too many attempts for this e-mail", never a
 *    count of what is left. `auth.rateLimited` is built from `Retry-After` and says nothing about
 *    which limit fired or why — the service can produce that number from two different mechanisms
 *    (a per-address limiter and a credential lockout) and telling them apart is exactly the leak the
 *    constant message exists to prevent.
 */

export const messages = {
  /** The app's own name on the first screen. */
  identity: 'Identity',

  // --- authentication ------------------------------------------------------
  auth: {
    signIn: 'Sign in',
    signingIn: 'Verifying',
    signOut: 'Sign out',
    email: 'E-mail',
    password: 'Password',
    verificationCode: 'Verification code',
    verifySecondFactor: 'Verify',
    codeLabel: 'Verification code',

    /**
     * The header once a second factor is outstanding.
     *
     * Separate from `auth.denied` because it is not a failure: the password was accepted and this
     * is the next step. Announced through `role="status"` so a screen reader hears the form change
     * shape rather than finding a new field with no explanation.
     */
    secondFactorStep: 'Second factor',

    /**
     * The one refusal message. Every authentication failure renders this and nothing else.
     *
     * It is worded as the platform's decision rather than as a diagnosis, because there is no
     * diagnosis to give: the service does not say whether the account exists, and this app must not
     * say it either.
     */
    denied: 'ACCESS DENIED',

    /** Shown when the session is gone, as distinct from a rejected login. */
    sessionExpired: 'Your session ended. Sign in again to continue.',

    /**
     * Rate limited. `retryAfter` is seconds, taken from the `Retry-After` header.
     *
     * Deliberately says nothing about which limit fired. The number comes from a per-address limiter
     * or from a credential lockout, and naming the difference between them tells an attacker whether
     * the address they guessed exists — so this is about *requests*, not attempts, and it carries no
     * count of what is left.
     */
    rateLimited: (retryAfterSeconds: number): string =>
      `Too many requests. Try again in ${formatDuration(retryAfterSeconds)}.`,

    /** Used when the server sent no `Retry-After`. Still says nothing about why. */
    rateLimitedUnknown: 'Too many requests. Try again shortly.',

    /** The second-factor field appears only once the account has one. */
    twoFactorRequired: 'Two-factor verification is on for this account.',
    twoFactorHint: 'Enter the code from your authenticator, or one of your recovery codes.',
    useRecoveryCode: 'Use a recovery code',
    returnedFrom: 'Welcome back',
  },

  // --- registration --------------------------------------------------------
  register: {
    title: 'Create an account',
    submit: 'Create account',
    submitting: 'Creating',
    name: 'Name',
    birthday: 'Date of birth',
    country: 'Country',
    language: 'Language',
    haveAccount: 'Already have an account? Sign in',
    needAccount: 'No account? Create one',
    verifyNext: 'Account created. Check your inbox to confirm your address, then sign in.',
  },

  // --- verification --------------------------------------------------------
  verify: {
    title: 'Confirm your e-mail',
    body: 'We sent a code to {address}. Enter it to finish setting up your account.',
    resend: 'Send another code',
    resendIn: 'Send another code in {seconds}s',
    resending: 'Sending',
    confirm: 'Confirm',
    confirmed: 'Address confirmed',
    devCode: 'Development code',
  },

  // --- navigation ----------------------------------------------------------
  nav: {
    primary: 'Identity navigation',
    home: 'Overview',
    profile: 'Profile',
    emails: 'E-mail addresses',
    security: 'Security',
    sessions: 'Active sessions',
    connected: 'Connected apps',
    preferences: 'Preferences',
    organizations: 'Organizations',
    appearance: 'Appearance',
    developer: 'Developer',
    signOut: 'Sign out',
  },

  // --- profile -------------------------------------------------------------
  profile: {
    title: 'Profile',
    save: 'Save changes',
    saving: 'Saving',
    saved: 'Profile saved',
    photo: 'Photo',
    uploadPhoto: 'Upload photo',
    nameTooLong: 'That name is too long.',
    birthdayInFuture: 'That date is in the future.',
    name: 'Name',
    country: 'Country',
    language: 'Language',
    birthday: 'Date of birth',
    primaryEmail: 'Primary e-mail',
    description: 'Your public profile.',
    empty: 'Nothing to save yet.',
    edit: 'Edit profile',
  },

  // --- registration --------------------------------------------------------
  // --- emails --------------------------------------------------------------
  emails: {
    title: 'E-mail addresses',
    add: 'Add an address',
    remove: 'Remove',
    makePrimary: 'Make primary',
    primary: 'Primary',
    verified: 'Confirmed',
    unverified: 'Not confirmed',
    confirmFirst: 'Confirm this address to make it primary.',
    cannotRemovePrimary: 'The primary address cannot be removed. Make another one primary first.',
    loading: 'Loading addresses',
    status: 'Status',
    createdAt: 'Added',
    verifyPrompt: 'Enter the code from the e-mail',
    codeCopied: 'Code copied to clipboard: {code}',
    sent: 'A new verification code was sent.',
    confirmRemove: 'Remove this address?',
  },

  // --- preferences ---------------------------------------------------------
  preferences: {
    title: 'Appearance',
    darkMode: 'Dark mode',
    darkModeSystem: 'Follow the system',
    darkModeOn: 'Always on',
    darkModeOff: 'Always off',
    accent: 'Accent',
    motion: 'Motion',
    motionSystem: 'Follow the system',
    motionFull: 'Full',
    motionReduced: 'Reduced',
    notifications: 'Notifications',
  },

  // --- security ------------------------------------------------------------
  security: {
    title: 'Security',
    changePassword: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    passwordChanged: 'Password changed',
    saving: 'Saving',
    passwordsDontMatch: 'The two passwords do not match.',
    secondFactor: 'Two-factor authentication',
    enableSecondFactor: 'Enable two-factor',
    disableSecondFactor: 'Remove two-factor',
    enrollInstruction:
      'Scan this QR code with your authenticator app, then enter the six-digit code it shows.',
    authenticatorCode: 'Authenticator code',
    confirmEnroll: 'Turn on two-factor',
    recoveryCodes: 'Recovery codes — shown once, keep them safe.',
    disableInstruction:
      'Removing two-factor needs your current password and a valid code from your authenticator or recovery codes.',
    confirmDisable: 'Remove two-factor',

    mfa: 'Two-factor authentication',
    mfaOff: 'Not enabled',
    mfaOn: 'Enabled',
    mfaEnable: 'Enable two-factor',
    mfaDisable: 'Remove two-factor',
    mfaScan: 'Scan this with your authenticator app, then enter the code it shows.',
    mfaSecret: 'Cannot scan? Enter this key by hand.',
    mfaRecoveryCodes: 'Recovery codes',
    mfaRecoveryWarning:
      'These are shown once and cannot be retrieved again. Keep them somewhere safe — each one is a single use.',
    mfaEnterCode: 'Enter the code from your app',
    mfaConfirm: 'Turn on two-factor',
    mfaRemoveWarning:
      'Removing two-factor needs your password and a current code. Anyone with your password could do this without the second step.',
  },

  // --- sessions ------------------------------------------------------------
  sessions: {
    title: 'Active sessions',
    /** No endpoint exists. Said plainly rather than shown as an empty list. */
    unavailable: 'Session listing is not available yet.',
    signOutEverywhere: 'Sign out everywhere',
    signOutEverywhereWarning:
      'This ends every session on every device, including this one. You will be asked to sign in again.',
  },

  // --- connected apps ------------------------------------------------------
  connected: {
    title: 'Connected apps',
    empty: 'No application has access to this account.',
    grantedOn: 'Granted',
    revoke: 'Revoke access',
    revoked: 'Access revoked',
    /**
     * What revoking actually does, stated in the confirmation.
     *
     * The grant is consulted on every request rather than trusted from the token's own copy of it,
     * so a revocation takes effect on the *next* request and not when a token expires — which is a
     * stronger and more surprising promise than "it expires soon", and one the user deserves to hear
     * before clicking.
     */
    revokeWarning:
      'This takes effect on the next request the application makes. It does not wait for a token to expire.',
  },

  // --- organizations -------------------------------------------------------
  organizations: {
    title: 'Organizations',
    create: 'Create an organization',
    name: 'Name',
    empty: 'You are not a member of any organization.',
    members: 'Members',
    role: 'Role',
    addMember: 'Add a member',
    memberAccountId: 'Account ID',
    leave: 'Leave',
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer',
    ownerUntouched: 'The owner cannot be removed, demoted, or leave.',
    notAMember: 'That organization does not exist, or you are not a member.',
  },

  // --- consent -------------------------------------------------------------
  consent: {
    title: 'Authorise {application}',
    body: '{application} is asking for access to your account.',
    askable: 'This application is asking for',
    alreadyGranted: 'You have already granted',
    unavailable: 'This application cannot have',
    unavailableBody: 'It asked for something it was never registered with.',
    allow: 'Allow',
    deny: 'Deny',
  },

  // --- states --------------------------------------------------------------
  state: {
    loading: 'Loading',
    empty: 'Nothing here yet.',
    retry: 'Try again',
    error: 'Something went wrong.',
    /** For a 5xx. `auth.denied` is never used here: it is for authentication only. */
    offline: 'Cannot reach the platform.',
  },

  common: {
    loading: 'Loading',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    continue: 'Continue',
    required: 'Required',
    optional: 'Optional',
    copy: 'Copy',
    copied: 'Copied',
  },
} as const;

/**
 * Human-readable duration from a `Retry-After`.
 *
 * # Why this formats rather than showing a raw count
 *
 * "243 seconds" is a number to compute; "4 minutes" is a wait to plan around. And it must never
 * render as something that *reveals* the limit — so the unit is chosen for readability and the
 * seconds are not repeated alongside it, because two representations of one number invite a reader
 * to compare them and infer the underlying value.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'a moment';
  }
  const whole = Math.ceil(seconds);
  if (whole < 60) {
    return `${whole} second${whole === 1 ? '' : 's'}`;
  }
  const minutes = Math.ceil(whole / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

/** Replace `{name}` placeholders. A failure here is a missing key, not a runtime error. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * Every message key, dotted: `auth.denied`, `emails.title`.
 *
 * Exists so a test can walk the catalogue and assert a rule over all of it at once — for instance
 * that no key leaks a mechanism. A rule checked on one message is a rule that gets forgotten on the
 * next one added.
 */
export function messageKeys(): string[] {
  return Object.entries(messages).flatMap(([group, entries]) =>
    Object.entries(entries).map(([key]) => `${group}.${key}`),
  );
}