---
title: OpenID Connect
description: Discovery, ID tokens, UserInfo and claims.
---

Add `openid` to the requested scopes to enable OIDC. OAuth provides delegated API access; OIDC adds
an identity assertion about the authenticated account.

## Discovery

Use the discovery document as the source of truth:

`GET https://api.vyde.dev/.well-known/openid-configuration`

It provides `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `revocation_endpoint`,
`end_session_endpoint`, and `jwks_uri`.

## Validate ID tokens

Validate the signature against `jwks_uri`, then check issuer, audience, expiry, nonce when used, and
the authorized party. Never treat an ID token as an API access token.

| Scope | Meaning |
| --- | --- |
| `openid` | Enables OIDC and an ID token. |
| `profile` | Basic account profile. |
| `email` | Verified email claims. |
| `offline_access` | Requests a refresh token. |

## UserInfo

Call `GET /oauth2/userinfo` with the access token:

```http
GET https://api.vyde.dev/oauth2/userinfo
Authorization: Bearer ACCESS_TOKEN
```

Your API must validate signature, issuer, audience, expiry, subject, and required scopes before
acting for the account.
