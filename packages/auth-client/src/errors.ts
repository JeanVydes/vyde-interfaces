/**
 * What the gateway says when it says no.
 *
 * # Why the shape is parsed rather than trusted
 *
 * Every backend in this repo answers an error the same way, and the shape is deliberate rather than
 * incidental — see `identity/src/server/error.rs` and `gateway/src/server/error.rs`:
 *
 * ```json
 * {"error": "Bad Request", "code": "invalid_request", "message": "the request is not valid",
 *  "fields": [{"field": "email", "code": "too_long", "message": "must have at most 64 characters"}]}
 * ```
 *
 * `error` is the HTTP **reason phrase**, a string. `code` is stable and safe to branch on. `message`
 * is for a human and may be reworded at any time. `fields` is present only when a request is
 * rejected, so a form can highlight every bad input in one pass.
 *
 * The trap this file exists to prevent: `body.error.message` looks right and is not — `error` is a
 * string, so `body.error.message` is `undefined` and an assertion about it passes vacuously. It was
 * written that way in the Python integration suite and every test using it failed with
 * `TypeError: string indices must be integers` while looking like a service bug.
 */

/** One rejected field. `code` is stable; `message` is for a human. */
export interface FieldError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

/** The body every non-2xx answer carries. */
interface ErrorBody {
  readonly error: string;
  readonly code: string;
  readonly message: string;
  readonly fields?: readonly FieldError[];
}

/**
 * A non-2xx answer, as an object rather than a bare string.
 *
 * # Why a class and not a plain object
 *
 * `instanceof` is the one narrowing check that cannot be defeated by a stray field, and there is
 * exactly one constructor in this package. A structural check would have to be applied at every
 * catch site, which is the shape of the bug this avoids.
 */
export class ApiError extends Error {
  /** HTTP status. The one thing worth branching on that is not `code`. */
  readonly status: number;

  /** Stable machine-readable code, e.g. `invalid_request`. */
  readonly code: string;

  /** The reason phrase, which is *not* a detail — it is the same for every 400. */
  readonly reason: string;

  /** Rejected fields, empty unless a request was refused. */
  readonly fields: readonly FieldError[];

  /** Seconds the caller may retry, from `Retry-After`. `undefined` when the server did not say. */
  readonly retryAfterSeconds: number | undefined;

  constructor(init: {
    status: number;
    code: string;
    reason: string;
    message: string;
    // `| undefined` rather than `?`, so a caller may pass an absent value explicitly. With
    // `exactOptionalPropertyTypes` a bare `?` rejects `{ fields: undefined }`, which is the
    // natural thing to write at a call site that built a value conditionally.
    fields?: readonly FieldError[] | undefined;
    retryAfterSeconds?: number | undefined;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.reason = init.reason;
    this.fields = init.fields ?? [];
    this.retryAfterSeconds = init.retryAfterSeconds;
  }

  /** Whether retrying the identical request could plausibly work. */
  get retryable(): boolean {
    // A 5xx is the server's problem; a 4xx is the request's, and repeating it changes nothing.
    return this.status >= 500;
  }

  /** The rejected fields keyed by field name, for a form. */
  get fieldsByName(): Readonly<Record<string, string>> {
    return Object.fromEntries(this.fields.map((field) => [field.field, field.message]));
  }
}

/**
 * Read a `Retry-After` header.
 *
 * # Why the HTTP-date form is not supported
 *
 * The RFC allows either a delay in seconds or a date. Both backends here only ever emit seconds —
 * `identity/src/application/use_cases/login.rs` computes a remaining duration and the gateway copies
 * it through — so implementing the date form would be a second parser for a case that cannot happen,
 * and a wrong one would silently produce `NaN` and a countdown that never ends.
 *
 * A non-numeric value therefore yields `undefined`, which the UI reads as "no countdown" rather than
 * as "retry immediately".
 */
export function parseRetryAfter(header: string | null): number | undefined {
  if (header === null) return undefined;
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;
  return Math.floor(seconds);
}

/**
 * Build an `ApiError` from a failed response.
 *
 * Never throws. A body that is not JSON, or is JSON in an unexpected shape, still produces an
 * `ApiError` — carrying whatever message was salvageable — because throwing from the error path
 * turns a 502 into an unhandled rejection, which is strictly worse than an imprecise message.
 */
export async function toApiError(response: Response): Promise<ApiError> {
  const retryAfterSeconds = parseRetryAfter(response.headers.get('retry-after'));
  let body: Partial<ErrorBody> = {};

  try {
    body = (await response.json()) as Partial<ErrorBody>;
  } catch {
    // Not JSON. An HTML error page from something in front of the gateway is the usual cause, and
    // its content is not ours to surface.
  }

  return new ApiError({
    status: response.status,
    code: typeof body.code === 'string' ? body.code : 'unknown',
    reason: typeof body.error === 'string' ? body.error : 'error',
    message:
      typeof body.message === 'string' && body.message.length > 0
        ? body.message
        : `the request failed with status ${response.status}`,
    fields: Array.isArray(body.fields) ? body.fields : [],
    retryAfterSeconds,
  });
}

/** Whether a value is an `ApiError`, for a `catch` that has to tell it from a bug. */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}