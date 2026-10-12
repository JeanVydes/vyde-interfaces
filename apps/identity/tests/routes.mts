/**
 * Print the router's own view of the route tree.
 *
 * Asking the framework rather than inferring it. A pathless layout composes *ids* from its parents,
 * and whether it also composes *paths* is exactly the sort of thing that is true in one version of a
 * router and false in the next — and a wrong answer here is a router that resolves nothing and says
 * so with a blank page.
 */

import { chromium } from '@playwright/test';

const APP = process.env['SMOKE_APP_URL'] ?? 'https://identity.vyde.test:5173';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(`${APP}/login`, { waitUntil: 'networkidle' });

// `flatRoutes` is the router's own index: full id, full path, and whether it is a match.
const routes = await page.evaluate(async () => {
  const mod = await import('/src/routes/router.tsx');
  const router = mod.router as unknown as {
    routesById: Record<string, { id: string; path: string }>;
    routeTree?: unknown;
  };
  return Object.values(router.routesById ?? {}).map((r) => ({ id: r.id, path: r.path }));
});

console.log('id'.padEnd(26), 'full path');
for (const route of routes) {
  console.log(route.id.padEnd(26), route.path === '' ? '(empty)' : route.path);
}

await browser.close();