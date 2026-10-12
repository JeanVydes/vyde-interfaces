/**
 * The typed boundary: a fetch that validates what comes back.
 *
 * # Why validation lives here and not in each hook
 *
 * Because a hook that trusts its response is a hook that renders `undefined` into the interface when
 * a field is renamed, and the symptom — a blank label — points at the component rather than at the
 * boundary. Validating here means one place decides what a valid answer is, and every screen inherits
 * that decision.
 *
 * The cost is a Zod parse per response, which is microseconds against a network round trip and worth
 * it for the failure mode it removes.
 */

import { ApiError, isApiError } from '@vyde/auth-client';
import { z } from 'zod';

import { authClient } from '@/lib/auth-client';

/**
 * Fetch and validate in one step.
 *
 * A 401 is re-thrown as the original `ApiError` rather than being turned into a validation failure,
 * so the caller can tell "signed out" from "the server changed shape" — two problems with completely
 * different responses.
 */
/** Request options for a validated fetch. A `GET` with an explicit `POST` is used for
 * idempotent reads that also perform a state change on the server (resending a verification code). */
export type FetchOptions = {
  signal?: AbortSignal | undefined;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  anonymous?: boolean;
};

export async function apiGet<T>(
  path: string,
  schema: z.ZodType<T>,
  options: FetchOptions = {},
): Promise<T> {
  // Spelled out rather than passed through: `exactOptionalPropertyTypes` distinguishes "absent"
  // from "present and undefined", and a conditional spread is the only way to be right for both.
  const result = schema.safeParse(
    await authClient.request<unknown>(path, {
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.method ? { method: options.method } : {}),
      ...(options.body === undefined ? {} : { body: options.body }),
      ...(options.anonymous === true ? { anonymous: true } : {}),
    }),
  );

  if (!result.success) {
    // The shape changed under us. That is worth shouting about in the console — it is a server
    // change and not something the user can act on — and worth reporting to the caller's error UI
    // as a plain failure rather than as a validation message they would try to act on.
    console.error(`[identity] ${path} did not match the expected shape`, result.error.flatten());
    throw new ApiError({
      status: 500,
      code: 'unexpected_response',
      reason: 'error',
      message: 'the platform returned an unexpected response',
    });
  }

  return result.data;
}

/** A mutation whose body the server does not echo back usefully. */
export async function apiSend(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
  options: Pick<FetchOptions, 'anonymous'> = {},
): Promise<void> {
  await authClient.request(path, {
    method,
    ...(body === undefined ? {} : { body }),
    ...(options.anonymous === true ? { anonymous: true } : {}),
  });
}

/** Re-exported so a feature does not import from two places for one concept. */
export { ApiError, isApiError };
