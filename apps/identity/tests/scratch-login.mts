/**
 * Register, sign in, and report where the app actually ended up.
 *
 * The scratch tool for the authenticated half of the journey: it creates an account through the UI,
 * signs in, and dumps the URL, the rendered text and any error boundary content — because "the nav
 * is missing" is a symptom with a dozen causes and none of them are visible from the assertion.
 */

import { chromium } from '@playwright/test';

const APP = process.env['SMOKE_APP_URL'] ?? 'https://identity.vyde.test:5173';
const email = `login-${Date.now()}@example.com`;
const password = 'Str0ng!Passphrase';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });

page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !/401/.test(m.text())) {
    console.log(`[error] ${m.text()}`);
  }
});
page.on('response', (r) => {
  if (r.url().includes('/v1/')) {
    console.log(`[http] ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  }
});

// --- register ---------------------------------------------------------------
await page.goto(`${APP}/register`, { waitUntil: 'networkidle' });
await page.getByLabel(/^name$/i).fill('Login Test');
await page.getByLabel(/e-mail/i).fill(email);
await page.getByLabel(/^password$/i).fill(password);
await page.getByLabel(/confirm new password/i).fill(password);
await page.getByLabel(/country/i).fill('US');
await page.getByLabel(/language/i).fill('en');
await page.getByLabel(/date of birth/i).fill('1990-01-01');
await page.getByRole('button', { name: /create account/i }).click();
await page.waitForURL(/\/login/, { timeout: 15_000 });
console.log(`registered ${email}`);

// --- sign in ----------------------------------------------------------------
console.log('--- signing in ---');
await page.getByLabel(/e-mail/i).fill(email);
await page.getByLabel(/^password$/i).fill(password);
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForTimeout(5000);

console.log('--- url ---');
console.log(page.url());
console.log('--- cookies ---');
for (const c of await page.context().cookies()) {
  console.log(` ${c.name} secure=${c.secure} sameSite=${c.sameSite} domain=${c.domain}`);
}
console.log('--- visible text ---');
console.log((await page.locator('body').innerText()).slice(0, 700));
console.log('--- #root children ---');
console.log((await page.locator('#root').innerHTML()).slice(0, 300));

await page.screenshot({ path: 'test-results/shots/after-login.png', fullPage: true });
await browser.close();