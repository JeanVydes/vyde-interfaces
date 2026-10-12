---
title: API reference
description: OAuth endpoints and standard error codes.
---

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/.well-known/openid-configuration` | OIDC discovery |
| `GET` | `/.well-known/jwks.json` | Signing keys |
| `GET` | `/oauth2/authorize` | Browser authorization |
| `POST` | `/oauth2/token` | Code and refresh exchange |
| `POST` | `/oauth2/revoke` | Revoke a token |
| `GET` | `/oauth2/userinfo` | OIDC user information |
| `GET` | `/v1/grants` | List delegated grants |
| `DELETE` | `/v1/grants/{client_id}` | Revoke an application grant |

## Errors

| Code | Meaning |
| --- | --- |
| `invalid_request` | Missing or malformed parameters. |
| `invalid_client` | Client authentication failed. |
| `invalid_grant` | Code, verifier, or refresh token is invalid or reused. |
| `invalid_scope` | Requested scopes are not enabled for the application. |
| `unauthorized_client` | The client is not allowed to use the requested grant. |
| `access_denied` | The resource owner declined authorization. |
