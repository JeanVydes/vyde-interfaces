---
title: Tokens
description: Exchange authorization codes and rotate refresh tokens.
---

Authorization codes are short-lived and single-use. The token endpoint accepts form-encoded data.

```bash
curl -X POST https://api.vyde.dev/oauth2/token \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode 'code=CODE_FROM_CALLBACK' \
  --data-urlencode 'client_id=YOUR_CLIENT_ID' \
  --data-urlencode 'client_secret=YOUR_CLIENT_SECRET' \
  --data-urlencode 'redirect_uri=https://app.example/callback' \
  --data-urlencode 'code_verifier=YOUR_PKCE_VERIFIER'
```

## Refresh

Request `offline_access` only when background access is needed. Refresh tokens rotate: every request
consumes the old token and returns a replacement.

```bash
curl -X POST https://api.vyde.dev/oauth2/token \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=refresh_token' \
  --data-urlencode 'refresh_token=STORED_REFRESH_TOKEN' \
  --data-urlencode 'client_id=YOUR_CLIENT_ID' \
  --data-urlencode 'client_secret=YOUR_CLIENT_SECRET'
```

Replace the stored value atomically. Reusing an old refresh token is treated as replay and revokes
the session family.

## Revoke and log out

Use `POST /oauth2/revoke` to revoke a token. Use RP-Initiated Logout at `/oauth2/logout` with an
optional `id_token_hint` and registered `post_logout_redirect_uri`.
