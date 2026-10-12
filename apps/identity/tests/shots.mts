/**
 * Capture the app so it can be looked at rather than asserted about.
 *
 * `playwright test` already writes a screenshot on failure; this writes one on *success*, which is
 * the only way to check that a screen looks like something rather than merely containing the right
 * words.
 */

import { chromium } from '@playwright/test';

const APP = process.env['SMOKE_APP_URL'] ?? 'https://identity.vyde.test:5173';
const OUT = process.env['SHOT_DIR'] ?? 'test-results/shots';

const SHOTS = [
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const shot of SHOTS) {
  await page.goto(`${APP}${shot.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: true });
  console.log(`${shot.name.padEnd(10)} ${APP}${shot.path}`);
}

await browser.close();