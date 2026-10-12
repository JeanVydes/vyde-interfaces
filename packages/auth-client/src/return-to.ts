/**
 * Where to send the user after they sign in.
 *
 * Same-origin paths are accepted directly; absolute URLs require an exact configured origin.
 *
 * # The threat
 *
 * `identity.vyde.dev` owns the login screen. A link like
 * `identity.vyde.dev/login?return_to=https://attacker.example` that sends a user — who just typed
 * their real password — to an attacker page carrying a convincing "session expired, sign in again"
 * form is the whole attack, and it needs no bug in this app at all: it needs only that the app
 * believed a URL in a query string.
 *
 * # Why structural comparison and not string comparison
 *
 * `allowed.includes(value)` on a string is a prefix-shaped trap: `startsWith('https://ok.example')`
 * is also true for `https://ok.example.attacker.example`, and `https://ok.example@attacker.example`
 * parses as a URL whose *host* is `attacker.example`. Both are the same bug wearing different hats.
 * So this parses and compares the **origin**, and only the origin: path, query and fragment are
 * allowed to be anything, because they cannot change where the browser goes.
 */

/** A destination that passed validation. Branded, so it cannot be confused with a raw string. */
export type SafeReturnTo = string & { readonly __brand: 'SafeReturnTo' };

/** Why a destination was refused. The reason is for the log; the message is never shown raw. */
export type ReturnToRejection =
  | 'empty'
  | 'not-absolute'
  | 'protocol-relative'
  | 'unsupported-scheme'
  | 'has-userinfo'
  | 'not-allowed';

/**
 * Resolve a `return_to` against the origins a deployment trusts.
 *
 * @param raw      the untrusted value from the query string
 * @param allowed  exact origins, e.g. `['https://console.vyde.dev']`. Trailing slashes are tolerated
 *                 on the way in; anything else is compared as a parsed origin.
 * @param fallback the destination to use when `raw` is refused. Must itself be trusted — it is
 *                 configuration, not input, so it is returned without checking.
 */
export function safeReturnTo(
  raw: string | null | undefined,
  allowed: readonly string[],
  fallback: string,
): SafeReturnTo {
  if (raw === null || raw === undefined || raw.trim() === '') {
    return refused('empty', fallback);
  }

  // The value is trimmed only of surrounding whitespace. Interior whitespace is left to the URL
  // parser, which rejects it — trimming the interior would be a way to smuggle one past the check.
  const candidate = raw.trim();

  // `//attacker.example` inherits the current scheme and is therefore perfectly valid input to a
  // browser. Caught before parsing, because `new URL('//x', base)` resolves it rather than rejecting it.
  if (candidate.startsWith('//')) {
    return refused('protocol-relative', fallback);
  }

  if (candidate.startsWith('/')) {
    try {
      const relative = new URL(candidate, 'https://vyde.invalid');
      if (relative.origin === 'https://vyde.invalid') {
        return candidate as SafeReturnTo;
      }
    } catch {
      return refused('not-absolute', fallback);
    }
    return refused('not-allowed', fallback);
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return refused('not-absolute', fallback);
  }

  // `javascript:`, `data:`, `blob:` and the rest are all parseable URLs. Only http(s) is ever a
  // destination for a login flow, so the check is on the scheme rather than on a blocklist — a
  // blocklist would need every dangerous scheme, and would miss the next one invented.
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return refused('unsupported-scheme', fallback);
  }

  // `https://user:pass@ok.example` — and more to the point `https://ok.example@attacker.example`,
  // whose *host* is `attacker.example` and whose userinfo is `ok.example`. The origin comparison below
  // would catch the second one, but a URL that carries a password in its own text is never something
  // this function should hand to `location.assign`, so it is refused outright.
  if (url.username !== '' || url.password !== '') {
    return refused('has-userinfo', fallback);
  }

  const origin = url.origin;
  const permitted = allowed.some((entry) => normaliseOrigin(entry) === origin);
  if (!permitted) {
    return refused('not-allowed', fallback);
  }

  return candidate as SafeReturnTo;
}

/**
 * Compare origins, tolerating a trailing slash on the configured entry.
 *
 * Only ever applied to values from **configuration**, never to input — so the comparison is the
 * exact parsed origin on both sides and there is nothing to normalise the input side.
 */
function normaliseOrigin(entry: string): string | undefined {
  try {
    // `URL.origin` of `https://console.vyde.dev/` is `https://console.vyde.dev`, so the trailing
    // slash an operator naturally writes in a config file disappears on its own.
    return new URL(entry).origin;
  } catch {
    // A malformed entry in the allowlist matches nothing, which fails closed: a typo in
    // configuration disables that destination rather than opening one up.
    return undefined;
  }
}

function refused(reason: ReturnToRejection, fallback: string): SafeReturnTo {
  // Recorded for the developer console and nothing else. Never rendered: the message a user sees must
  // not depend on *why* their link was refused, because that is a description of the attack.
  console.warn(`[auth-client] refused a return_to destination: ${reason}`);
  return fallback as SafeReturnTo;
}

/**
 * Parse the allowlist from configuration.
 *
 * Comma-separated, blank-tolerant, and validated once at boot rather than on every navigation — a
 * malformed entry is dropped here with a warning instead of quietly matching nothing later.
 */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  const origins: string[] = [];
  for (const entry of raw.split(',')) {
    const trimmed = entry.trim();
    if (trimmed === '') continue;
    if (normaliseOrigin(trimmed) === undefined) {
      console.warn(`[auth-client] ignoring a malformed origin in the allowlist: ${trimmed}`);
      continue;
    }
    origins.push(trimmed);
  }
  return origins;
}