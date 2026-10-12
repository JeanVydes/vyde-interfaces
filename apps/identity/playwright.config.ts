import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 20_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: process.env['SMOKE_APP_URL'] ?? 'https://identity.vyde.test:5173',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
