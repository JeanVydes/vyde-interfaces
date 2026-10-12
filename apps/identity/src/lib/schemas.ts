/**
 * The wire shapes, validated at the boundary.
 *
 * # Why this file exists
 *
 * `identity` is not this app, and a change to it is a change to every client. A schema at the
 * boundary means a renamed field fails one test with a clear message instead of rendering `undefined`
 * into a field somewhere in the middle of the interface, where the symptom points at the component
 * rather than at the cause.
 *
 * Every shape here is checked against a Rust DTO; the DTO's line is named in a comment on each. Where
 * the DTO skips a field when absent (`skip_serializing_if`), the schema uses `.optional()` rather than
 * `.nullable()` — an absent key and a `null` are different on the wire and the difference matters when
 * the value is optional rather than empty.
 */

import { z } from 'zod';

// --- shared ----------------------------------------------------------------

/** An ISO 8601 instant. Kept as a string: nothing here does arithmetic on it. */
const timestampSchema = z.string();

export const emailSchema = z
  .string()
  .min(1, 'An e-mail address is required.')
  // Deliberately loose. The service owns the real rule and it is stricter than anything reasonable to
  // hand-write; a client-side regex that disagrees with it produces a form that accepts what the
  // server rejects, which is the worst of both.
  .email('That does not look like an e-mail address.')
  .max(254);

/**
 * The password policy is the server's.
 *
 * `domain/credential/entity.rs` enforces 8..256 characters and no control characters, while
 * `domain/validation` additionally requires 10 characters and three character classes for
 * registration. The client checks only presence and lets the server be the one that says "no",
 * because its answer is the one that counts.
 */
export const passwordSchema = z.string().min(1, 'A password is required.');

export const birthdateSchema = z
  .string()
  .min(1, 'A date of birth is required.')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.');

// --- account ----------------------------------------------------------------

/** `application/dto/email.rs:43`. */
export const emailViewSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  email: z.string(),
  primary: z.boolean(),
  verified: z.boolean(),
  verified_at: timestampSchema.nullable(),
  created_at: timestampSchema,
});

export type EmailView = z.infer<typeof emailViewSchema>;

const subjectFlagsSchema = z.array(z.enum(['verified', 'beta', 'support', 'official'])).optional();

/** `application/dto/email.rs:75`. */
export const listEmailsSchema = z.object({
  emails: z.array(emailViewSchema),
});

/** `application/dto/account.rs:55`. */
export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  flags: subjectFlagsSchema,
  country: z.string(),
  language: z.string(),
  birthday: birthdateSchema,
  // The DB allows three values. An unknown one is a platform change, and the schema is honest
  // about it: the server always returns this field (`#[serde(default)]` in the DTO), so a missing
  // value is a contract violation and fails validation rather than silently defaulting.
  status: z.enum(['active', 'suspended', 'closed']),
  primary_email: emailViewSchema.nullable(),
  // Absent, not null: `AccountView` skips the field entirely when there is no photo.
  photo_url: z.string().optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type AccountResponse = Omit<z.infer<typeof accountSchema>, 'flags'> & {
  flags?: z.infer<typeof subjectFlagsSchema>;
};

export const publicAccountSchema = z.object({
  username: z.string(),
  name: z.string(),
  flags: z.array(z.enum(['verified', 'beta', 'support', 'official'])),
  photo_url: z.string().nullable(),
  created_at: timestampSchema,
});

export const publicOrganizationSchema = z.object({
  name: z.string(),
  slug: z.string(),
  flags: z.array(z.enum(['verified', 'beta', 'support', 'official'])),
  member_count: z.number(),
  created_at: timestampSchema,
});

export type PublicAccount = z.infer<typeof publicAccountSchema>;
export type PublicOrganization = z.infer<typeof publicOrganizationSchema>;

export const usernameAvailabilitySchema = z.object({
  username: z.string(),
  available: z.boolean(),
  valid: z.boolean(),
  error: z.string().optional(),
});

/** `application/dto/account.rs:19`. */
export const registerResponseSchema = z.object({
  account: accountSchema,
  primary_email: emailViewSchema,
  email_verification_required: z.boolean(),
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

/** `application/dto/email.rs:30`. */
export const resendResponseSchema = z.object({
  email: emailViewSchema,
  expires_in: z.number(),
  attempts_remaining: z.number(),
});

export type ResendResponse = z.infer<typeof resendResponseSchema>;

// --- preferences ------------------------------------------------------------

/**
 * `application/dto/preference.rs:23`.
 *
 * `BTreeMap<String, serde_json::Value>` — so the *values* are free-form JSON and the keys are not.
 * The key set is closed by `PreferenceKey` in the domain, and this app mirrors it below.
 */
export const preferencesSchema = z.object({
  preferences: z.record(z.string(), z.union([z.boolean(), z.string()])),
});

export type PreferencesResponse = z.infer<typeof preferencesSchema>;

/**
 * Every key the service accepts, mirroring `PreferenceKey::ALL`.
 *
 * Written out rather than derived, because these are *the app's* controls and their labels are
 * copy, not data. A key the service adds is not automatically a control the interface should show.
 */
export const PREFERENCE_KEYS = [
  'appearance.dark_mode',
  'appearance.accent',
  'appearance.motion',
  'notifications.product_updates',
  'notifications.organization_activity',
  'notifications.security_alerts',
  'notifications.connected_apps',
  'notifications.email_verification',
] as const;

export type PreferenceKey = (typeof PREFERENCE_KEYS)[number];

// --- second factor ----------------------------------------------------------

/** `application/use_cases/mfa.rs:363`. */
export const enrollmentSchema = z.object({
  secret: z.string(),
  provisioning_uri: z.string(),
  recovery_codes: z.array(z.string()),
});

export type Enrollment = z.infer<typeof enrollmentSchema>;

/** `GET /v1/accounts/me/mfa`. */
export const mfaStatusSchema = z.object({
  active: z.boolean(),
  label: z.string().optional(),
});

// --- grants -----------------------------------------------------------------

/** `application/ports/grant_repository.rs:81`. */
export const grantViewSchema = z.object({
  client_id: z.string(),
  client_name: z.string(),
  organization_id: z.string().nullable(),
  organization_name: z.string().nullable(),
  scopes: z.string(),
  granted_at: timestampSchema,
  revoked_at: timestampSchema.nullable(),
});

/** `GET /v1/grants` answers with a bare array, not an envelope. */
export const grantsSchema = z.array(grantViewSchema);

export type GrantView = z.infer<typeof grantViewSchema>;

export const consentPreviewSchema = z.object({
  askable: z.array(z.string()),
  already_granted: z.array(z.string()),
  unavailable: z.array(z.string()),
});

export type ConsentPreview = z.infer<typeof consentPreviewSchema>;

// --- organizations ----------------------------------------------------------

/** `application/dto/organization.rs:51`. */
export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  flags: subjectFlagsSchema,
  slug: z.string(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type Organization = Omit<z.infer<typeof organizationSchema>, 'flags'> & {
  flags?: z.infer<typeof subjectFlagsSchema>;
};

/** `application/dto/organization.rs:83`. */
export const memberSchema = z.object({
  organization_id: z.string(),
  member: z.object({
    kind: z.literal('account'),
    id: z.string(),
  }),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  joined_at: timestampSchema,
  name: z.string().nullable().optional(),
});

export type MemberView = z.infer<typeof memberSchema>;

export const registeredClientSchema = z.object({
  client_id: z.string(),
  client_secret: z.string().nullable(),
});

export type RegisteredClient = z.infer<typeof registeredClientSchema>;

export const regeneratedClientSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const clientViewSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  name: z.string(),
  redirect_uris: z.array(z.string()),
  grant_types: z.array(z.string()),
  enabled_scopes: z.string(),
  is_public: z.boolean(),
  icon_url: z.string().nullable().optional(),
  verified_at: timestampSchema.nullable().optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const updatedClientSchema = z.object({
  client: clientViewSchema,
  client_secret: z.string().nullable(),
});

export const clientsSchema = z.array(clientViewSchema);
export type ClientView = z.infer<typeof clientViewSchema>;

/** `application/dto/organization.rs:103`. */
export const listOrganizationsSchema = z.array(organizationSchema);

/** `GET /v1/organizations/{id}/members`. */
export const listMembersSchema = z.array(memberSchema);

export const invitationSchema = z.object({
  id: z.string(),
  role: z.enum(['admin', 'member', 'viewer']),
  expires_at: timestampSchema,
  max_uses: z.number(),
  use_count: z.number(),
  link_token: z.string(),
});
export const invitationsSchema = z.array(invitationSchema);

export const invitationPreviewSchema = z.object({
  organization_id: z.string(),
  organization_name: z.string(),
  organization_slug: z.string(),
  role: z.enum(['admin', 'member', 'viewer']),
  member_count: z.number(),
  expires_at: timestampSchema,
  max_uses: z.number(),
  use_count: z.number(),
});