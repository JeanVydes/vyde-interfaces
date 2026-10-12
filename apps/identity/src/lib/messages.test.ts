import { describe, expect, it } from 'vitest';

import { formatDuration, interpolate, messages } from './messages';

describe('formatDuration', () => {
  it('says "a moment" for a wait of nothing', () => {
    // A `Retry-After: 0` is legal. Rendering "0 seconds" reads as a bug; "a moment" is honest.
    expect(formatDuration(0)).toBe('a moment');
    expect(formatDuration(-5)).toBe('a moment');
    expect(formatDuration(Number.NaN)).toBe('a moment');
  });

  it('pluralises seconds', () => {
    expect(formatDuration(1)).toBe('1 second');
    expect(formatDuration(30)).toBe('30 seconds');
  });

  it('rounds up, because a wait must never be under-stated', () => {
    // Under-stating is the one direction that matters: it tells somebody to come back before they can.
    expect(formatDuration(60.1)).toBe('2 minutes');
    expect(formatDuration(0.1)).toBe('1 second');
  });

  it('escalates the unit rather than printing a large number of seconds', () => {
    expect(formatDuration(243)).toBe('5 minutes');
    expect(formatDuration(3600)).toBe('1 hour');
  });
});

describe('interpolate', () => {
  it('substitutes a known placeholder', () => {
    expect(interpolate('We sent a code to {address}.', { address: 'a@b.test' })).toBe(
      'We sent a code to a@b.test.',
    );
  });

  it('leaves an unknown placeholder alone rather than printing undefined', () => {
    // A missing value is a missing key, and silently rendering "undefined" into a message the user
    // reads is worse than leaving the placeholder where it can be spotted.
    expect(interpolate('to {address}', {})).toBe('to {address}');
  });
});

describe('the rate limit message', () => {
  it('says only when to come back, and nothing about why', () => {
    const message = messages.auth.rateLimited(243);

    // The words that would leak the mechanism. The service produces this number from a per-address
    // limiter *or* from a credential lockout, and telling them apart is the whole point of the
    // identical error it returns for every failure.
    for (const forbidden of ['e-mail', 'email', 'attempt', 'lock', 'locked', 'password', 'wrong']) {
      expect(message.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('never reveals a count of remaining attempts', () => {
    expect(messages.auth.rateLimited(300)).not.toMatch(/\b(remaining|left|left over)\b/i);
  });

  it('has a fallback for a missing Retry-After that still says nothing about the cause', () => {
    const message = messages.auth.rateLimitedUnknown;
    for (const forbidden of ['e-mail', 'email', 'attempt', 'lock']) {
      expect(message.toLowerCase()).not.toContain(forbidden);
    }
  });
});

describe('the authentication failure message', () => {
  it('is a single constant, so no failure can be told from another by its wording', () => {
    // Every authentication failure renders this exact string. If it ever becomes a function of the
    // failure, the enumeration protection the service provides has been undone here.
    expect(messages.auth.denied).toBe('ACCESS DENIED');
    expect(typeof messages.auth.denied).toBe('string');
  });
});

describe('error messages distinguish authentication from everything else', () => {
  it('a platform error does not reuse the authentication refusal', () => {
    // `auth.denied` on a 500 would tell a user their credentials were rejected when the server was
    // simply unreachable, which sends them to reset a password they do not need to reset.
    expect(messages.state.error).not.toBe(messages.auth.denied);
    expect(messages.state.offline).not.toBe(messages.auth.denied);
  });
});
