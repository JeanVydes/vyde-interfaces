import { describe, expect, it } from 'vitest';

import { DEFAULT_APPEARANCE, type AppearancePreferences } from './index';
import { resolveAppearance } from './theme';

/** Resolve with the media queries pinned, so no test depends on the machine it runs on. */
function resolve(preferences: Partial<AppearancePreferences>, systemDark: boolean, systemReduced: boolean) {
  return resolveAppearance({ ...DEFAULT_APPEARANCE, ...preferences }, systemDark, systemReduced);
}

describe('resolveAppearance', () => {
  describe('dark mode is three states, not two', () => {
    it('follows a dark system', () => {
      expect(resolve({ darkMode: 'system' }, true, false).theme).toBe('dark');
    });

    it('follows a light system', () => {
      // The case a boolean cannot express: the user chose nothing, and the OS says light.
      expect(resolve({ darkMode: 'system' }, false, false).theme).toBe('light');
    });

    it('an explicit choice overrides the system in both directions', () => {
      expect(resolve({ darkMode: true }, false, false).theme).toBe('dark');
      expect(resolve({ darkMode: false }, true, false).theme).toBe('light');
    });
  });

  describe('motion can only add restraint, never remove it', () => {
    it('follows the system by default', () => {
      expect(resolve({}, true, true).reducedMotion).toBe(true);
      expect(resolve({}, true, false).reducedMotion).toBe(false);
    });

    it('reduced reduces even when the system says nothing', () => {
      expect(resolve({ motion: 'reduced' }, true, false).reducedMotion).toBe(true);
    });

    it('full overrides the system query, deliberately', () => {
      // Somebody who disabled reduced motion at the OS level for a reason unrelated to the web
      // gets what they asked for here. This is the one direction that adds motion back.
      expect(resolve({ motion: 'full' }, true, true).reducedMotion).toBe(false);
    });
  });

  describe('the accent passes through untouched', () => {
    it('is whatever was chosen, for every combination', () => {
      for (const accent of ['red', 'amber', 'green', 'cyan'] as const) {
        expect(resolve({ accent }, true, true).accent).toBe(accent);
      }
    });
  });

  it('resolving twice with the same inputs gives the same answer', () => {
    // No hidden state, no `Date.now()`, no ordering dependency — so a re-render cannot flicker
    // between two themes because a listener fired in a different order.
    const first = resolve({ darkMode: 'system', motion: 'system' }, false, false);
    const second = resolve({ darkMode: 'system', motion: 'system' }, false, false);
    expect(first).toEqual(second);
  });

  it('the default preferences are dark-neutral, red, and system-following', () => {
    // Red is the register this interface is built around, so the default must not look like
    // "nothing was chosen".
    expect(DEFAULT_APPEARANCE).toEqual({ darkMode: 'system', accent: 'red', motion: 'system' });
  });
});