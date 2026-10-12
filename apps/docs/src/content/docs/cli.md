---
title: Vyde CLI
description: Install and use the Vyde command-line client.
---

Use the Vyde CLI to sign in and manage your account, email addresses, organizations, OAuth
applications, and grants from a terminal.

## Install

```bash
curl -fsSL https://docs.vyde.dev/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
vyde help
```

The installer supports Linux x86_64 and macOS Apple Silicon, verifies the release checksum, and
installs to `~/.local/bin`. Pin a version with `VYDE_CLI_VERSION=0.1.0`.

<a class="download-skill" href="/vyde-cli-skill.md" download="vyde-cli-skill.md">↓ Download the CLI usage skill</a>

## Sign in

The CLI uses a public OAuth application. Register this exact redirect URI on the application:

```text
http://127.0.0.1:8675/callback
```

Enable the authorization-code and refresh-token grants, then set the public client ID:

```bash
export VYDE_OAUTH_CLIENT_ID=YOUR_PUBLIC_CLIENT_ID
vyde login
vyde whoami
```

The browser opens automatically. Do not create or provide a client secret: the CLI is a public
client and uses PKCE. The session is stored in the operating system credential store.

```bash
vyde ping
vyde logout
```

## Account commands

```bash
vyde profile --name "New name" --country UY --language es
vyde emails
vyde email add --email person@example.com
vyde email promote --email EMAIL_ID
vyde email remove --email EMAIL_ID
vyde photo ./avatar.png
```

## Organization commands

```bash
vyde org
vyde org create --name "Example team"
vyde org rename --id ORG_ID --name "New name"
vyde manage org members list --org-id ORG_ID
vyde manage org invites --org-id ORG_ID
vyde manage org invite-create --org-id ORG_ID --role member --expires 604800 --max-uses 1
```

Invitation links can be shared without exposing account credentials:

```bash
vyde manage org invite-preview --token INVITE_TOKEN
vyde manage org invite-accept --token INVITE_TOKEN
```

## Applications and grants

```bash
vyde manage app list --org-id ORG_ID
vyde manage app create --org-id ORG_ID --name "My app" --public true
vyde manage app update --org-id ORG_ID --client-id CLIENT_ID --name "Updated app"
vyde manage app secret --org-id ORG_ID --client-id CLIENT_ID
vyde manage grants list
```

Use public applications for browser, native, and CLI clients. Use confidential applications only
for servers that can protect a client secret. Public applications use PKCE and must not receive a
secret.

Operations that remove or revoke data require `--yes`:

```bash
vyde manage grants revoke --client-id CLIENT_ID --yes
vyde manage org members remove --org-id ORG_ID --account-id ACCOUNT_ID --yes
vyde manage org invite-revoke --org-id ORG_ID --email-id INVITATION_ID --yes
vyde manage app delete --org-id ORG_ID --client-id CLIENT_ID --yes
```

## Development and automation

Production is the default. Use `--dev` for the local environment:

```bash
vyde --dev login
vyde --dev whoami
```

Override the API endpoint with `VYDE_GATEWAY_URL`:

```bash
VYDE_GATEWAY_URL=https://api.example.test vyde ping
```

Management commands return JSON, which makes them suitable for scripts. Check the process exit
status and never store access tokens, refresh tokens, or secrets in source control.
