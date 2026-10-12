import { expect, test } from '@playwright/test';

const APP = process.env['SMOKE_APP_URL'] ?? 'https://identity.vyde.test:5173';

test('public navigation reaches account entry points', async ({ page }) => {
  await page.goto(APP, { waitUntil: 'networkidle' });

  await page.getByRole('link', { name: /create account/i }).first().click();
  await expect(page).toHaveURL(/\/register/);

  await page.getByRole('link', { name: /sign in/i }).first().click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('the sign-in destination is the authenticated overview', async ({ page }) => {
  await page.goto(`${APP}/login`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('link', { name: /create an account/i })).toBeVisible();
});

test('protected screens redirect anonymous visitors to sign in', async ({ page }) => {
  for (const path of ['/overview', '/profile', '/organizations', '/applications']) {
    await page.goto(`${APP}${path}`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(new RegExp(`/login\\?return_to=${path.replace('/', '%2F')}`));
  }
});
