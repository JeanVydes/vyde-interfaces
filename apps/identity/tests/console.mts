/**
 * Print what the browser actually says.
 *
 * A scratch file, not a test: when the app is blank, the cause is in the console, and this is the
 * fastest way to read it without editing assertions to make a failure print the same thing.
 */

import { chromium } from '@playwright/test';

const APP = process.env['SMOKE_APP_URL'] ?? 'https://identity.vyde.test:5173';

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('console', (message) => {
  console.log(`[${message.type()}] ${message.text()}`);
});
page.on('pageerror', (error) => {
  console.log(`[pageerror] ${error.stack ?? error.message}`);
});
page.on('requestfailed', (request) => {
  console.log(`[requestfailed] ${request.url()} — ${request.failure()?.errorText}`);
});

await page.goto(APP, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

console.log('\n--- html class ---');
console.log(await page.locator('html').getAttribute('class'));
console.log('--- #root innerHTML (first 400) ---');
console.log((await page.locator('#root').innerHTML()).slice(0, 400));
console.log('--- body text ---');
console.log((await page.locator('body').innerText()).slice(0, 300));

await browser.close();