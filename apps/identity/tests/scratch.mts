/**
 * Drive one flow and print what the page says.
 *
 * The scratch tool for "the test failed and the assertion does not say why": it fills the form,
 * clicks, and dumps the errors, the URL and the visible text.
 */

import { chromium } from '@playwright/test';

const APP = process.env['SMOKE_APP_URL'] ?? 'https://identity.vyde.test:5173';
const email = `scratch-${Date.now()}@example.com`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });

page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') {
    console.log(`[${m.type()}] ${m.text()}`);
  }
});
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
page.on('response', (r) => {
  if (r.url().includes('/v1/')) {
    console.log(`[http] ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  }
});

await page.goto(`${APP}/register`, { waitUntil: 'networkidle' });

await page.getByLabel(/^name$/i).fill('Smoke Test');
await page.getByLabel(/e-mail/i).fill(email);
await page.getByLabel(/^password$/i).fill('Str0ng!Passphrase');
await page.getByLabel(/confirm new password/i).fill('Str0ng!Passphrase');
await page.getByLabel(/country/i).fill('US');
await page.getByLabel(/language/i).fill('en');
await page.getByLabel(/date of birth/i).fill('1990-01-01');

console.log(`--- submitting for ${email} ---`);
await page.getByRole('button', { name: /create account/i }).click();
await page.waitForTimeout(4000);

console.log('--- url ---');
console.log(page.url());
console.log('--- visible text ---');
console.log((await page.locator('body').innerText()).slice(0, 600));
console.log('--- role=alert ---');
for (const alert of await page.getByRole('alert').all()) {
  console.log(' •', (await alert.innerText()).slice(0, 200));
}

await browser.close();