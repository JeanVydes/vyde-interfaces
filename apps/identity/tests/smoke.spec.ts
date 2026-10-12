import { expect, test } from '@playwright/test';

const APP = process.env['SMOKE_APP_URL'] ?? 'https://identity.vyde.test:5173';

test.describe('the app renders', () => {
  test('mounts React and drops the no-js guard', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      const text = message.text();
      if (message.type() === 'error' && !/status of 401/.test(text)) {
        consoleErrors.push(text);
      }
    });
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });

    await page.goto(APP, { waitUntil: 'networkidle' });

    await expect(page.locator('html')).not.toHaveClass(/no-js/);
    await expect(page.locator('#root')).not.toBeEmpty();

    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });

  test('a visitor sees the public landing page', async ({ page }) => {
    await page.goto(`${APP}/`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /operate your digital perimeter/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create account/i })).toBeVisible();
  });

  test('the login form asks for a code only after the password is accepted', async ({ page }) => {
    await page.goto(`${APP}/login`, { waitUntil: 'networkidle' });

    await expect(page.getByLabel(/verification code/i)).toHaveCount(0);
  });
});

test.describe('the stack behind it', () => {
  test('the gateway answers from the app, cross-origin, with credentials', async ({ page }) => {
    await page.goto(APP, { waitUntil: 'networkidle' });

    const result = await page.evaluate(async (api) => {
      try {
        const response = await fetch(`${api}/v1/accounts/me`, { credentials: 'include' });
        return { status: response.status, ok: response.ok };
      } catch (error) {
        return { status: 0, ok: false, error: String(error) };
      }
    }, process.env['VITE_API_URL'] ?? 'https://api.vyde.test:8443');

    expect(result.status, `cross-origin fetch failed: ${JSON.stringify(result)}`).toBe(401);
  });
});