import { describe, expect, it } from 'vitest';

import { parseAllowedOrigins, safeReturnTo } from './return-to';

const ALLOWED = ['https://console.vyde.dev', 'https://research.vyde.dev'];
const HOME = '/';

describe('safeReturnTo', () => {
  describe('accepts a destination on an allowed origin', () => {
    it('keeps a full URL, path and query included', () => {
      expect(safeReturnTo('https://console.vyde.dev/reports?tab=7', ALLOWED, HOME)).toBe(
        'https://console.vyde.dev/reports?tab=7',
      );
    });

    it('keeps a fragment, which cannot change where the browser goes', () => {
      expect(safeReturnTo('https://console.vyde.dev/a#section', ALLOWED, HOME)).toBe(
        'https://console.vyde.dev/a#section',
      );
    });

    it('tolerates a trailing slash in the configured entry, which operators naturally write', () => {
      const withSlash = ['https://console.vyde.dev/'];
      expect(safeReturnTo('https://console.vyde.dev/x', withSlash, HOME)).toBe(
        'https://console.vyde.dev/x',
      );
    });

    it('compares origins, so a different path on the same host is fine', () => {
      expect(safeReturnTo('https://console.vyde.dev/deep/path', ALLOWED, HOME)).toBe(
        'https://console.vyde.dev/deep/path',
      );
    });

    it('ignores surrounding whitespace rather than carrying it into the navigation', () => {
      expect(safeReturnTo('  https://console.vyde.dev/x  ', ALLOWED, HOME)).toBe(
        'https://console.vyde.dev/x',
      );
    });
  });

  describe('refuses a destination that would leave the platform', () => {
    it('a different origin', () => {
      expect(safeReturnTo('https://attacker.example', ALLOWED, HOME)).toBe(HOME);
    });

    it('a lookalike host whose name merely starts with an allowed one', () => {
      // The prefix trap. `startsWith` on a string says yes; an origin comparison says no.
      expect(safeReturnTo('https://console.vyde.dev.attacker.example', ALLOWED, HOME)).toBe(HOME);
    });

    it('a lookalike host that ends with the allowed name', () => {
      expect(safeReturnTo('https://evilvyde.dev', ALLOWED, HOME)).toBe(HOME);
    });

    it('a bare subdomain of the registrable domain, which is not on the list', () => {
      expect(safeReturnTo('https://docs.vyde.dev', ALLOWED, HOME)).toBe(HOME);
    });

    it('a different port on an allowed host', () => {
      // An origin includes the port, and `:8443` is somebody's service.
      expect(safeReturnTo('https://console.vyde.dev:8443/', ALLOWED, HOME)).toBe(HOME);
    });

    it('plain http against an https allowlist', () => {
      // A downgrade is a destination change, and the origin comparison catches it.
      expect(safeReturnTo('http://console.vyde.dev', ALLOWED, HOME)).toBe(HOME);
    });
  });

  describe('refuses the representations that carry a different origin inside them', () => {
    it('protocol-relative, which inherits the current scheme', () => {
      // `//attacker.example` is a perfectly good URL to a browser and resolves against the page's
      // scheme. It has to be caught before parsing, because `new URL('//x', base)` resolves it.
      expect(safeReturnTo('//attacker.example/path', ALLOWED, HOME)).toBe(HOME);
      expect(safeReturnTo('//attacker.example', ALLOWED, HOME)).toBe(HOME);
    });

    it('userinfo whose real host is somewhere else', () => {
      // `https://console.vyde.dev@attacker.example` reads as "console.vyde.dev" to a person and as
      // "attacker.example" to a parser. The origin comparison would catch it; refusing any userinfo
      // catches it a step earlier and also covers a URL carrying a password.
      expect(safeReturnTo('https://console.vyde.dev@attacker.example/', ALLOWED, HOME)).toBe(HOME);
      expect(safeReturnTo('https://user:pass@console.vyde.dev/', ALLOWED, HOME)).toBe(HOME);
    });

    it('a javascript: URL', () => {
      expect(safeReturnTo('javascript:alert(1)', ALLOWED, HOME)).toBe(HOME);
      expect(safeReturnTo('JavaScript:alert(1)', ALLOWED, HOME)).toBe(HOME);
    });

    it('the other script-bearing schemes, which all parse as URLs', () => {
      for (const scheme of ['data:text/html,<script>alert(1)</script>', 'blob:https://x/y', 'file:///etc/passwd']) {
        expect(safeReturnTo(scheme, ALLOWED, HOME)).toBe(HOME);
      }
    });
  });

  describe('refuses input that is not a destination at all', () => {
    it('nothing, an empty string, or only whitespace', () => {
      expect(safeReturnTo(null, ALLOWED, HOME)).toBe(HOME);
      expect(safeReturnTo(undefined, ALLOWED, HOME)).toBe(HOME);
      expect(safeReturnTo('', ALLOWED, HOME)).toBe(HOME);
      expect(safeReturnTo('   ', ALLOWED, HOME)).toBe(HOME);
    });

    it('a relative path without a leading slash', () => {
      expect(safeReturnTo('next', ALLOWED, HOME)).toBe(HOME);
    });

    it('a malformed URL', () => {
      expect(safeReturnTo('https://', ALLOWED, HOME)).toBe(HOME);
      expect(safeReturnTo('http://[not-an-ip', ALLOWED, HOME)).toBe(HOME);
    });

    it('an interior space, which is not trimmed away into something valid', () => {
      // Trimming the interior would be a way to smuggle a host past the comparison.
      expect(safeReturnTo('https://console.vyde.dev /attacker.example', ALLOWED, HOME)).toBe(HOME);
    });
  });

  describe('accepts a same-origin path', () => {
    it('keeps the path, query, and OAuth state', () => {
      expect(
        safeReturnTo('/consent?client_id=app&scope=profile%20email&state=opaque', ALLOWED, HOME),
      ).toBe('/consent?client_id=app&scope=profile%20email&state=opaque');
    });

    it('rejects a path that escapes into another origin', () => {
      expect(safeReturnTo('/\\attacker.example/path', ALLOWED, HOME)).toBe(HOME);
    });
  });

  it('falls back to the app home when the allowlist is empty', () => {
    // A deployment that has not configured its origins must not accept anything, including its own.
    expect(safeReturnTo('https://console.vyde.dev/', [], HOME)).toBe(HOME);
  });

  it('does not accept an origin that is only *nearly* the configured one', () => {
    const configured = ['https://console.vyde.dev'];
    expect(safeReturnTo('https://console.vyde.dev.', configured, HOME)).toBe(HOME);
    expect(safeReturnTo('https://CONSOLE.vyde.dev', configured, '/ok')).toBe('https://CONSOLE.vyde.dev');
  });
});

describe('parseAllowedOrigins', () => {
  it('splits on commas and trims', () => {
    expect(parseAllowedOrigins('https://a.vyde.dev, https://b.vyde.dev')).toEqual([
      'https://a.vyde.dev',
      'https://b.vyde.dev',
    ]);
  });

  it('drops blanks rather than producing empty entries', () => {
    expect(parseAllowedOrigins(' https://a.vyde.dev , , https://b.vyde.dev ,')).toEqual([
      'https://a.vyde.dev',
      'https://b.vyde.dev',
    ]);
  });

  it('ignores a malformed entry rather than matching nothing later', () => {
    expect(parseAllowedOrigins('not-a-url,https://a.vyde.dev')).toEqual(['https://a.vyde.dev']);
  });

  it('treats an unset variable as an empty allowlist, which accepts nothing', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
    expect(parseAllowedOrigins('')).toEqual([]);
  });
});