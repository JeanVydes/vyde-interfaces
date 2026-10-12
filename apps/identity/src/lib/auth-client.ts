/**
 * The one configured instance of the shared client.
 *
 * # Why a module singleton and not a React context
 *
 * Because there is exactly one session per browser tab-tree and the client's job is to end it.
 * A context would add a provider, a hook, and a null-check on every call site — and the failure
 * mode of forgetting the provider is a request sent without `credentials: 'include'`, which looks
 * exactly like a signed-out user.
 *
 * The 401 handler is injected rather than imported, so this module stays free of any dependency
 * on the router. The alternative — importing the router here — is a cycle.
 */

import { AuthClient } from '@vyde/auth-client';

import { API_URL } from '@/config';

let onUnauthenticated: (returnTo: string) => void = () => undefined;

export const authClient = new AuthClient({
  apiUrl: API_URL,
  onUnauthenticated: (returnTo) => onUnauthenticated(returnTo),
});

/** Install the 401 handler. Called once, during boot. */
export function setUnauthenticatedHandler(handler: (returnTo: string) => void): void {
  onUnauthenticated = handler;
}
