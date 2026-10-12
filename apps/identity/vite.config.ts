import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The development server.
 *
 * # It speaks HTTPS, on the same shape production uses
 *
 * `https://identity.localhost:5173`, with a real certificate from
 * `services/scripts/dev-certs.sh`.
 *
 * That is not decoration. The session cookie carries `Secure`, which is the attribute that stops
 * script reading it — and a `Secure` cookie set over plain HTTP is stored by the browser and then
 * never sent back. The session silently does not exist: login answers `200`, every request after it
 * is anonymous, and the app looks like it forgot the sign-in. The only way to exercise `Secure` is to
 * be on TLS.
 *
 * `.localhost` is reserved by RFC 6761 and Chromium resolves it to loopback natively, so this needs
 * no `/etc/hosts` entry and no root. `.test` is reserved too but has no built-in resolver — measured,
 * not assumed; `tests/dns.mts` navigates rather than `fetch`es, because `TypeError: Failed to fetch`
 * is indistinguishable from a DNS failure and reading it as success is how the wrong name survives.
 *
 * # Why there is no `server.proxy` any more
 *
 * There was one, pointing at the gateway, and it was the wrong shape. It made the browser see a
 * single origin, which meant development never produced a CORS preflight — so a missing
 * `GATEWAY_CORS_ALLOW_HEADERS` entry could only be found in production — and it meant `SameSite=Lax`
 * was never exercised against a real cross-origin request, because there was no second origin.
 *
 * Now that the app and the API are on different subdomains, as they are in production, the browser
 * does the preflights, the cookie is sent cross-origin, and both are tested here first. The CORS
 * allowlist in `services/.env` is now the thing development depends on, which is the point.
 *
 * # Why the certificate is read rather than generated
 *
 * The gateway terminates TLS with the same certificate, and the certificate covers `*.vyde.test`.
 * One CA, one leaf, one place to trust in a browser — `./scripts/dev-certs.sh --print` says where it
 * is. Generating a second, Vite-only certificate would mean trusting two.
 */
const CERT_DIR = process.env.VYDE_DEV_CERT_DIR
  ? fileURLToPath(new URL(process.env.VYDE_DEV_CERT_DIR, import.meta.url))
  : undefined;

const certPath = CERT_DIR ? `${CERT_DIR}/vyde.crt` : undefined;
const keyPath = CERT_DIR ? `${CERT_DIR}/vyde.key` : undefined;

/** Read the certificate, or say exactly what to run to make one. */
function readTls(): { cert: Buffer; key: Buffer } | undefined {
  if (!certPath || !keyPath) return undefined;
  if (!existsSync(certPath) || !existsSync(keyPath)) {
    // Thrown rather than warned about. Falling back to plain HTTP here is the exact failure this
    // configuration exists to prevent, and a warning is a thing that scrolls past.
    throw new Error(
      `No development certificate at ${certPath}.\n` +
        'Run:  ./services/scripts/dev-certs.sh\n' +
        'The app cannot be served over plain HTTP: the session cookie is `Secure`, and a `Secure`\n' +
        'cookie set over http is stored and then never sent back.',
    );
  }
  return { cert: readFileSync(certPath), key: readFileSync(keyPath) };
}

const tls = process.env.NODE_ENV === 'development' ? readTls() : undefined;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // `true` so the dev server is reachable from other containers and from the host's LAN, which is
    // what makes it usable on a phone.
    host: true,
    port: 5173,
    // Same TLS as the gateway, so the browser sees one certificate covering both hosts.
    ...(tls ? { https: tls } : {}),
    // Vite's own host check, which is separate from TLS and rejects requests whose `Host` header is
    // not one it was told to expect. Named explicitly for the same reason as the gateway's CORS
    // allowlist: a list, so a missing entry is a startup error rather than a mystery 403.
    allowedHosts: [
      'identity.vyde.test',
      'console.vyde.test',
      'research.vyde.test',
      'docs.vyde.test',
      'localhost',
      '127.0.0.1',
    ],
    hmr: {
      // Over HTTPS, a websocket to a plaintext dev server is blocked as mixed content. This is the
      // documented way to keep hot reload working; without it the page loads and then never
      // updates, which reads as a broken build rather than a blocked socket.
      protocol: 'wss',
      host: 'identity.vyde.test',
    },
  },
  build: {
    // No manual chunks. The bundle is small enough that a vendor split would add a second request
    // and a cache-invalidation axis for no measurable win, and it is the kind of configuration that
    // gets tuned once and then nobody remembers why.
    sourcemap: true,
    target: 'es2022',
  },
});