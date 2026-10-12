/**
 * Test environment shims.
 *
 * # Why `matchMedia` has to be faked
 *
 * `jsdom` does not implement it, and everything that resolves an appearance preference asks it
 * twice — once for `prefers-color-scheme` and once for `prefers-reduced-motion`. A stub that
 * returns `false` for everything is the honest default: it means "the system expressed no
 * preference", which is the case where the app's own default is supposed to decide.
 */

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}
