/**
 * Applying the appearance preferences to the document.
 *
 * Everything here is a `data-` attribute on `<html>`. There is no class, no inline style, and no
 * theme object in React state that a component reads — a theme swap is a variable reassignment
 * and this is the only place that reassigns one.
 *
 * # Why attributes and not a React context
 *
 * Because the decorative layers live in `base.css` and in components that render through portals
 * and out of the tree. A value held in React state has to be *threaded* to reach them, and the
 * first component that forgets is the one that silently ignores the preference. An attribute on
 * the root reaches every node in the document, including nodes this code does not own.
 */

import { type AppearancePreferences, prefersDark, prefersReducedMotion } from './index';

/** Everything actually applied, after `system` has been resolved. */
export interface ResolvedAppearance {
  readonly theme: 'dark' | 'light';
  readonly accent: AppearancePreferences['accent'];
  /** True when *something* — the OS or the preference — says to reduce motion. */
  readonly reducedMotion: boolean;
}

/**
 * Resolve `system` against the operating system.
 *
 * Pure on purpose: it takes the media-query answers as arguments so a test can pin them without
 * mocking `matchMedia`, which is a global and a nuisance to fake.
 */
export function resolveAppearance(
  preferences: AppearancePreferences,
  systemPrefersDark: boolean,
  systemPrefersReducedMotion: boolean,
): ResolvedAppearance {
  const theme =
    preferences.darkMode === 'system'
      ? systemPrefersDark
        ? 'dark'
        : 'light'
      : preferences.darkMode
        ? 'dark'
        : 'light';

  // The preference can only ever *add* restraint, never remove it. `full` means "ignore the
  // media query", which is a real choice for somebody who disabled reduced motion at the OS
  // level for a reason unrelated to the web — so it is honoured when asked for explicitly.
  const reducedMotion =
    preferences.motion === 'reduced'
      ? true
      : preferences.motion === 'full'
        ? false
        : systemPrefersReducedMotion;

  return { theme, accent: preferences.accent, reducedMotion };
}

/** Write the resolved appearance onto `<html>`, and return what it actually applied. */
export function applyAppearance(preferences: AppearancePreferences): ResolvedAppearance {
  const resolved = resolveAppearance(
    preferences,
    prefersDark(),
    prefersReducedMotion(),
  );

  const root = document.documentElement;
  root.dataset['theme'] = resolved.theme;
  root.dataset['accent'] = resolved.accent;
  // `reduced` rather than a boolean, because the CSS also has to distinguish "the user reduced
  // motion here" from "the OS did" — both zero the durations, but only the second is worth
  // telling the user about.
  root.dataset['motion'] = resolved.reducedMotion ? 'reduced' : 'full';
  root.lang = document.documentElement.lang || 'en';

  return resolved;
}

/**
 * Keep following the system while the preference says `system`.
 *
 * Without this, a person who set "follow the system" and then switched their laptop to light mode
 * would keep a stale dark interface until they reloaded. Returns an unsubscribe function; a
 * component that forgets to call it leaks a listener per mount, which is how an app ends up
 * doing three theme resolutions per keystroke.
 */
export function watchSystemAppearance(onChange: () => void): () => void {
  if (typeof matchMedia !== 'function') {
    return () => undefined;
  }

  const queries = [matchMedia('(prefers-color-scheme: dark)'), matchMedia('(prefers-reduced-motion: reduce)')];
  for (const query of queries) {
    query.addEventListener('change', onChange);
  }

  return () => {
    for (const query of queries) {
      query.removeEventListener('change', onChange);
    }
  };
}