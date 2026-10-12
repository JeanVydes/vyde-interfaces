/**
 * Configuration, read once at boot and validated.
 *
 * # Why this is not just `import.meta.env` at each call site
 *
 * Because a missing variable read through `import.meta.env.FOO` is `undefined` at the point of use,
 * so the failure is a `TypeError` deep in a component, on a screen nobody was testing. Validated
 * once, here, it is a boot failure with a message that names the variable — the same reasoning the
 * gateway applies to its own configuration (`gateway/src/server/config.rs`).
 */

import { parseAllowedOrigins, type SafeReturnTo } from '@vyde/auth-client';

import { ACCENTS, type Accent } from '@vyde/tokens';

/** Read once. See `src/types/vite-env.d.ts` for the declared shape. */
const env = import.meta.env;

function required(name: string, fallback?: string): string {
  const value = env[name];
  if (value !== undefined && value.trim() !== '') {
    return value.trim();
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`[identity] ${name} is not set. Copy .env.example to .env and fill it in.`);
}

/**
 * The gateway.
 *
 * Trailing slash removed so `${apiUrl}/v1/...` cannot produce a double slash, which is a path some
 * routers normalise and others treat as a different resource.
 */
export const API_URL = required('VITE_API_URL', 'https://api.vyde.test:8443').replace(/\/+$/, '');

/** Origins a `return_to` may name. See `@vyde/auth-client` for the validation rules. */
export const ALLOWED_RETURN_ORIGINS: readonly string[] = parseAllowedOrigins(
  env['VITE_ALLOWED_RETURN_ORIGINS'],
);

/**
 * Where a refused `return_to` lands.
 *
 * A path rather than an origin, deliberately: it is this app's own route space, so it cannot be
 * anything but somewhere local, and it needs no allowlist entry to be safe.
 */
export const DEFAULT_DESTINATION: SafeReturnTo = '/overview' as SafeReturnTo;

/** The dev-time accent, or the platform default when the variable is blank. */
const defaultAccent = env['VITE_DEFAULT_ACCENT']?.trim();

if (defaultAccent && !ACCENTS.includes(defaultAccent as Accent)) {
  // A typo in a theme name should not silently render the default theme and leave the developer
  // wondering why their accent did nothing.
  throw new Error(
    `[identity] VITE_DEFAULT_ACCENT must be one of ${ACCENTS.join(', ')}; got "${defaultAccent}"`,
  );
}

export const DEFAULT_ACCENT: Accent = (defaultAccent as Accent | undefined) ?? 'red';

/** The issuer shown next to a TOTP, matching the service's `IDENTITY_MFA_ISSUER`. */
export const MFA_ISSUER = 'Vyde';
