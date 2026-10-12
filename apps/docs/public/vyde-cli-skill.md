---
name: vyde-cli
description: Use the Vyde command-line client to sign in and manage a Vyde account.
---

# Vyde CLI

Use `vyde` to manage a Vyde account from a terminal. Prefer the installed release over building
from source. Commands print human-readable output for account actions and JSON for `manage`
operations.

## Install

```bash
curl -fsSL https://docs.vyde.dev/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
vyde help
```

The installer supports Linux x86_64 and macOS Apple Silicon. To install a specific version:

```bash
VYDE_CLI_VERSION=0.1.0 curl -fsSL https://docs.vyde.dev/install.sh | sh
```

## Sign in

The installed release discovers its public OAuth client configuration from
`https://docs.vyde.dev/.well-known/vyde-cli.json`. Run:

```bash
vyde login
vyde whoami
```

The browser opens for authorization and returns to the local callback
`http://127.0.0.1:8675/callback`. The CLI is a public application: never create, request, or
store a client secret.

Useful session commands:

```bash
vyde ping
vyde whoami
vyde logout
```

## Account

```bash
vyde profile --name "Ada Lovelace" --language en
vyde emails
vyde email add --email ada@example.com
vyde email promote --email EMAIL_ID
vyde email remove --email EMAIL_ID
vyde photo ./avatar.png
```

Adding an email sends a verification code. For administrative verification:

```bash
vyde manage email resend --account-id ACCOUNT_ID --email-id EMAIL_ID
vyde manage email verify --account-id ACCOUNT_ID --email-id EMAIL_ID --code CODE
```

## Organizations

```bash
vyde org
vyde org create --name "Example team"
vyde org rename --id ORG_ID --name "New team name"
vyde manage org members list --org-id ORG_ID
vyde manage org member-add --org-id ORG_ID --member-id ACCOUNT_ID --role member
vyde manage org invites list --org-id ORG_ID
vyde manage org invite-create --org-id ORG_ID --role member --expires 604800 --max-uses 1
```

Invitation links can be previewed and accepted:

```bash
vyde manage org invite-preview --token INVITE_TOKEN
vyde manage org invite-accept --token INVITE_TOKEN
```

## OAuth applications and grants

```bash
vyde manage app list --org-id ORG_ID
vyde manage app create --org-id ORG_ID --name "My app" --public true
vyde manage app update --org-id ORG_ID --client-id CLIENT_ID --name "New name"
vyde manage app secret --org-id ORG_ID --client-id CLIENT_ID
vyde manage grants list
```

Use a public application for native, browser-only, and CLI clients. Use a confidential
application only when its secret can remain on a server. Public applications use PKCE and do not
need a client secret.

Destructive actions require explicit confirmation:

```bash
vyde manage grants revoke --client-id CLIENT_ID --yes
vyde manage org members remove --org-id ORG_ID --account-id ACCOUNT_ID --yes
vyde manage org invite-revoke --org-id ORG_ID --email-id INVITATION_ID --yes
vyde manage app delete --org-id ORG_ID --client-id CLIENT_ID --yes
```

## Environments and scripts

Production is the default. Use `--dev` for the local Vyde environment:

```bash
vyde --dev login
vyde --dev whoami
```

Override the API endpoint when needed:

```bash
VYDE_GATEWAY_URL=https://api.example.test vyde ping
```

For automation, check the command exit status and parse the JSON returned by `vyde manage`.
Never put access tokens, refresh tokens, or client secrets in shell history or source control.
