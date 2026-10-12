# Vyde interfaces

Web applications for the Vyde platform, maintained in one pnpm workspace.

## Workspace

```text
apps/
  identity/    Account, organization, security, and OAuth management
  docs/        Developer documentation
packages/
  auth-client/ Shared browser auth and API client
  tokens/      Shared design tokens
```

`apps/identity` and `apps/docs` are the production applications currently included. New
interfaces belong under `apps/`; reusable browser code belongs under `packages/`.

## Local development

Requirements: Node.js 22.12+ and pnpm 10+.

```bash
corepack enable
pnpm install
cp apps/identity/.env.example apps/identity/.env
pnpm --filter @vyde/identity-interface dev
```

Set `VITE_API_URL` to the Gateway URL in `apps/identity/.env`. For local HTTPS development,
set `VYDE_DEV_CERT_DIR` to a directory containing `vyde.crt` and `vyde.key`; without it Vite
uses HTTP. Never commit environment files.

Useful commands:

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm --filter @vyde/docs-interface dev
```

## Vercel

Create one Vercel project per application, connected to this repository:

| Project | Root directory | Domain | Build output |
| --- | --- | --- | --- |
| Identity | `apps/identity` | `identity.vyde.dev` | `dist` |
| Docs | `apps/docs` | `docs.vyde.dev` | `dist` |

Enable **Include files outside the root directory** so workspace packages are available. Use
`pnpm install --frozen-lockfile` as the install command and the app's build script as the
build command. Configure `VITE_API_URL`, `VITE_ALLOWED_RETURN_ORIGINS`, and `VITE_APP_ORIGIN`
for Identity's Production environment.

Vercel may create a deployment for every project on each push. Configure an ignored build step
per project if needed; shared package or lockfile changes should rebuild every dependent app.

## Contributing

Keep changes scoped to the relevant app or package. Run `pnpm build`, `pnpm typecheck`, and
the affected package tests before opening a pull request.
