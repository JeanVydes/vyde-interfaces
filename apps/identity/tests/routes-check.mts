/**
 * Load each protected route directly and report what it renders.
 *
 * # Why not click through the nav
 *
 * Because a click cannot distinguish "this screen is broken" from "the element I clicked has been
 * replaced". Every screen mounts its own `ProtectedShell`, so navigating replaces the entire DOM and
 * Playwright reports `element was detached from the DOM` — a true statement that says nothing about
 * the screen. Going to each URL directly answers the question that is actually being asked.
 *
 * The nav is exercised separately by `smoke.spec.ts`, which only asserts that the links exist.
 */

import { chromium } from '@playwright/test';

const APP = process.env['SMOKE_APP_URL'] ?? 'https://identity.vyde.test:5173';
const SPKI = process.env['VYDE_DEV_CA_SPKI'] ?? '';

const ROUTES = [
  { path: '/', heading: 'Profile' },
  { path: '/profile', heading: 'Profile' },
  { path: '/emails', heading: 'E-mail addresses' },
  { path: '/security', heading: 'Security' },
  { path: '/preferences', heading: 'Appearance' },
  { path: '/connections', heading: 'Connected apps' },
  { path: '/organizations', heading: 'Organizations' },
];

const browser = await chromium.launch({
  args: SPKI ? [`--ignore-certificate-errors-spki-list=${SPKI}`] : [],
});
const context = await browser.newContext();
const page = await context.newPage();

const errors: string[] = [];
page.on('pageerror', (e) => errors.push(`${e.message}`));

// Sign in once; every route below needs the session.
const email = `routes-${Date.now()}@example.com`;
const password = 'Str0ng!Passphrase';
await page.goto(`${APP}/register`, { waitUntil: 'networkidle' });
await page.getByLabel(/^name$/i).fill('Routes Check');
await page.getByLabel(/e-mail/i).fill(email);
await page.getByLabel(/^password$/i).fill(password);
await page.getByLabel(/confirm new password/i).fill(password);
await page.getByLabel(/country/i).fill('US');
await page.getByLabel(/language/i).fill('en');
await page.getByLabel(/date of birth/i).fill('1990-01-01');
await page.getByRole('button', { name: /create account/i }).click();
await page.waitForURL(/\/login/, { timeout: 15_000 });

await page.getByLabel(/e-mail/i).fill(email);
await page.getByLabel(/^password$/i).fill(password);
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15_000 });
console.log('signed in\n');

let failures = 0;
for (const route of ROUTES) {
  errors.length = 0;
  await page.goto(`${APP}${route.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const nav = await page.getByRole('navigation').count();
  const headings = await page.locator('h2').allTextContents();
  const matched = headings.some((h) => h.trim().toLowerCase() === route.heading.toLowerCase());

  const ok = matched && nav === 1 && errors.length === 0;
  if (!ok) failures += 1;

  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${route.path.padEnd(16)} nav=${nav} headings=[${headings.join(' | ')}]` +
      (errors.length ? ` errors=[${errors.join(' ; ')}]` : ''),
  );
}

console.log(`\n${ROUTES.length - failures}/${ROUTES.length} rendered`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);