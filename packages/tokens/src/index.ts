/**
 * Reading the design tokens as values.
 *
 * The CSS in `index.css` is the source of truth — it is what a component reads, and a theme
 * swap is a variable reassignment. This module exists for the places where a *value* is needed in
 * JavaScript rather than in a stylesheet:
 *
 *   - an SVG `stop-color`
 *   - a canvas or a WebGL clear colour
 *   - a `transition` duration read to decide whether to animate at all
 *
 * Reading a token from JS means duplicating its value here, and a duplicate is a value that can
 * drift. So this deliberately exposes only the handful that a runtime genuinely cannot express in
 * CSS, and `theme.ts` reads the *rest* off `getComputedStyle` — which is the live cascade, so
 * there is nothing to keep in step.
 */

import './index.css';
import './base.css';

/** Accent names the interface supports. These are token swaps, not component forks. */
export const ACCENTS = ['red', 'amber', 'green', 'cyan'] as const;
export type Accent = (typeof ACCENTS)[number];

/** How much the interface animates. `system` defers to `prefers-reduced-motion`. */
export const MOTIONS = ['system', 'full', 'reduced'] as const;
export type Motion = (typeof MOTIONS)[number];

/**
 * Dark mode has **three** states, not two.
 *
 * `system` is not the same as `dark`: it is "whichever the operating system says", which for a
 * person who has never opened these settings is the honest answer and the one they mean. Modelling
 * it as a boolean cannot express it, and defaulting it to a value silently overrides somebody's
 * system choice.
 */
export type DarkMode = boolean | 'system';

/** The preferences an account can set. Mirrors `PreferenceKey` in the identity service. */
export interface AppearancePreferences {
  readonly darkMode: DarkMode;
  readonly accent: Accent;
  readonly motion: Motion;
}

/** The defaults, which are also what an account with no stored preference gets. */
export const DEFAULT_APPEARANCE: AppearancePreferences = {
  darkMode: 'system',
  accent: 'red',
  motion: 'system',
};

/**
 * Read a token's *computed* value off the document.
 *
 * The cascade is the authority here, not this module: `data-accent="green"` on `<html>` has
 * already changed `--vyde-accent`, and reading it back means there is no second copy to fall out
 * of date. Returns the fallback when there is no document (a test, a worker) rather than
 * throwing, because a missing DOM is not a reason to fail to boot.
 */
export function token(name: string, fallback = ''): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  const trimmed = value.trim();
  return trimmed === '' ? fallback : trimmed;
}

/** Whether the operating system currently asks for reduced motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof matchMedia !== 'function') {
    return false;
  }
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Whether the operating system currently asks for a light appearance. */
export function prefersDark(): boolean {
  if (typeof window === 'undefined' || typeof matchMedia !== 'function') {
    // Dark is the default for this interface, so a missing `matchMedia` resolves to it rather
    // than to nothing.
    return true;
  }
  return matchMedia('(prefers-color-scheme: dark)').matches;
}