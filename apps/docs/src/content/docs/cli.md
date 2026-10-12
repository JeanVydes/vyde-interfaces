---
title: Vyde CLI
description: Install and use the headless public OAuth client.
---

The official CLI is a headless public OAuth client. It uses Authorization Code + PKCE, a loopback
callback, and a background service that owns the session.

## Install

```bash
curl -fsSL https://docs.vyde.dev/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
vyde help
```

The installer detects Linux x86_64 and macOS Apple Silicon, downloads a GitHub Release archive, and
verifies `SHA256SUMS` before installing to `~/.local/bin`. Pin a release with
`VYDE_CLI_VERSION=0.1.0`.

Linux stores the session in the kernel keyring. macOS stores it in the native Keychain; neither
platform writes the credential to a plaintext file.

<a class="download-skill" href="/vyde-cli-skill.md" download="vyde-cli-skill.md">↓ Download the CLI skill for agents</a>

## Sign in

Register `http://127.0.0.1:8675/callback` exactly on a public application. Enable
`authorization_code`, `refresh_token`, `openid`, `profile`, `email`, and `offline_access`.

```bash
export VYDE_OAUTH_CLIENT_ID=YOUR_PUBLIC_CLIENT_ID
vyde login
vyde whoami
```

Do not create or send a client secret. Development uses `--dev`; the CLI trusts the local CA at
`services/certs/ca.crt`, or `VYDE_CA_CERT_PATH` when overridden.

## Management

```bash
vyde emails
vyde profile --name "New name"
vyde manage grants list
vyde manage org members --org-id ORG_ID
vyde manage app list --org-id ORG_ID
vyde manage app create --org-id ORG_ID --name "My app" --public true
vyde manage app delete --org-id ORG_ID --client-id CLIENT_ID --yes
```

Destructive operations require `--yes`.
