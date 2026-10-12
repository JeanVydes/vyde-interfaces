---
title: Applications
description: Register public and confidential OAuth clients.
---

Applications belong to an organization. Create and manage them in the Identity Console.

## Public clients

Use public clients for CLI, desktop, mobile, and browser applications. They cannot safely protect a
secret, so Vyde does not issue one. PKCE with `S256` is mandatory.

## Confidential clients

Use confidential clients for server-side applications. The secret is returned only when the client
is created, regenerated, or changed from public to confidential. Vyde stores only its hash.

Never put a confidential secret in browser JavaScript, a mobile binary, or a public repository.

## Registration checklist

- Register every redirect URI exactly; prefixes and wildcards are rejected.
- Enable only the scopes the application needs.
- Enable `openid` when OIDC identity tokens are required.
- Enable `authorization_code` and `refresh_token` for the standard flow.

```text
https://identity.vyde.dev/organizations
```

The `client_id` is safe to ship in public clients. It identifies the application; it is not a
credential.
