/**
 * Does `/` render for a browser that already holds a session?
 *
 * Isolates the two halves of the sign-in journey. If a direct load of `/` works and only the
 * post-login transition crashes, the fault is in the transition and not in the gate — and that
 * distinction decides where to look.
 */

import { chromium } from '@playwright/test';

const APP = process.env['SMOKE_APP_URL'] ?? 'https://identity.vyde.test:5173';
const email = `direct-${Date.now()}@example.com`;
const password = 'Str0ng!Passphrase';

const browser = await chromium.launch();
// `ignoreHTTPSErrors` because the development CA is in no trust store on this machine —
// `./services/scripts/dev-certs.sh --print` explains how to trust it properly in a real
// browser profile, which is what a human uses. A test does not need the ceremony.
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();

page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
page.on('response', (r) => {
  if (r.url().includes('/v1/accounts/me')) {
    const cookie = r.request().headers()['cookie'];
    console.log(
      `[http] ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}` +
        ` cookie=${cookie ? 'SENT' : 'NOT SENT'}`,
    );
  }
});

// --- register, then sign in, capturing the cookie ---------------------------
await page.goto(`${APP}/register`, { waitUntil: 'networkidle' });
await page.getByLabel(/^name$/i).fill('Direct Test');
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
await page.waitForTimeout(3000);

const cookies = await context.cookies();
console.log(`session cookie present: ${cookies.some((c) => c.name === 'vyde_rt')}`);
for (const c of cookies) {
  console.log(
    `  ${c.name}: domain=${c.domain} path=${c.path} secure=${c.secure} ` +
      `sameSite=${c.sameSite} expires=${c.expires}`,
  );
}

// --- a *fresh* load of `/`, with the cookie already in the context ----------
console.log('--- fresh load of / ---');
await page.goto(`${APP}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

console.log(`url:    ${page.url()}`);
console.log(`nav:    ${await page.getByRole('navigation').count()} navigation element(s)`);
console.log(`heading:${(await page.locator('h2').allTextContents()).join(' | ')}`);
const text = (await page.locator('body').innerText()).slice(0, 300);
console.log('text:');
console.log(text);

await page.screenshot({ path: 'test-results/shots/direct-root.png', fullPage: true });
await browser.close();