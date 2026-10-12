import { z } from 'zod';

import { emailSchema, passwordSchema } from '@/lib/schemas';

/**
 * The login form's own validation.
 *
 * # Why this is only three rules
 *
 * Because everything else is the server's job. The service owns what a valid address is and what a
 * strong enough password looks like (`identity/src/domain/credential/entity.rs`), and a client that
 * second-guesses it produces a form that accepts what the server rejects — which is worse than one
 * that accepts a little too much and says why.
 *
 * So this checks presence and shape, and nothing about strength.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  /**
   * Optional, and always present in the form.
   *
   * A second factor may be a six-digit TOTP **or** a sixteen-character recovery code, and the two are
   * not distinguishable by shape without looking at the first character — which the service does
   * deliberately not tell the client. So this is a loose string and the server decides.
   */
  totpCode: z.string().max(64).optional(),
});

export type LoginValues = z.infer<typeof loginSchema>;
