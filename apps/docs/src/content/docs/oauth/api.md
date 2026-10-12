---
title: API reference
description: OAuth endpoints, request bodies, responses, and errors.
---

All OAuth requests use `https://api.vyde.dev` in production. Token requests use
`application/x-www-form-urlencoded`; resource requests use JSON only where noted.

## Discovery

### `GET /.well-known/openid-configuration`

Use this document to discover endpoints and signing keys.

```bash
curl https://api.vyde.dev/.well-known/openid-configuration
```

```json
{
  "issuer": "https://api.vyde.dev",
  "authorization_endpoint": "https://identity.vyde.dev/oauth2/authorize",
  "token_endpoint": "https://api.vyde.dev/oauth2/token",
  "userinfo_endpoint": "https://api.vyde.dev/oauth2/userinfo",
  "revocation_endpoint": "https://api.vyde.dev/oauth2/revoke",
  "jwks_uri": "https://api.vyde.dev/.well-known/jwks.json"
}
```

## Authorization

### `GET /oauth2/authorize`

Redirect the browser here. Query parameters:

| Parameter | Required | Description |
| --- | --- | --- |
| `response_type` | Yes | Must be `code`. |
| `client_id` | Yes | The registered application ID. |
| `redirect_uri` | Yes | Must exactly match a registered URI. |
| `scope` | Yes | Space-separated enabled scopes. |
| `state` | Yes | Application-generated CSRF value. |
| `code_challenge` | Yes | Base64url SHA-256 of the PKCE verifier. |
| `code_challenge_method` | Yes | Must be `S256`. |

Success redirects with `code` and `state`. A denied request redirects with `error`,
`error_description`, and `state`.

## Tokens

### `POST /oauth2/token`

Header: `content-type: application/x-www-form-urlencoded`.

#### Authorization-code request

```text
grant_type=authorization_code
code=ONE_TIME_CODE
client_id=CLIENT_ID
redirect_uri=https://app.example.com/oauth/callback
code_verifier=PKCE_VERIFIER
client_secret=CLIENT_SECRET
```

Omit `client_secret` for public clients.

#### Refresh request

```text
grant_type=refresh_token
refresh_token=STORED_REFRESH_TOKEN
client_id=CLIENT_ID
client_secret=CLIENT_SECRET
```

#### Success response

```json
{
  "access_token": "ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email",
  "refresh_token": "REFRESH_TOKEN",
  "id_token": "ID_TOKEN"
}
```

`refresh_token` is returned when `offline_access` was granted. `id_token` is returned when
`openid` was granted. Refresh tokens rotate; replace the stored token atomically.

## UserInfo

### `GET /oauth2/userinfo`

```http
GET /oauth2/userinfo HTTP/1.1
Host: api.vyde.dev
Authorization: Bearer ACCESS_TOKEN
```

Example response:

```json
{
  "sub": "account_123",
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "email_verified": true
}
```

## Revocation

### `POST /oauth2/revoke`

Revoke an access or refresh token. The request is form-encoded:

```text
token=TOKEN_TO_REVOKE
token_type_hint=refresh_token
client_id=CLIENT_ID
client_secret=CLIENT_SECRET
```

Public clients omit `client_secret`. A successful revocation returns `200` with an empty body.

## Delegated grants

### `GET /v1/grants`

```bash
curl https://api.vyde.dev/v1/grants \
  -H 'authorization: Bearer ACCESS_TOKEN'
```

Returns the grants owned by the authenticated account.

### `DELETE /v1/grants/{client_id}`

```bash
curl -X DELETE https://api.vyde.dev/v1/grants/CLIENT_ID \
  -H 'authorization: Bearer ACCESS_TOKEN'
```

Revokes the authenticated account's grant for that application. A successful request returns
`204 No Content`.

## Errors

Error responses use JSON:

```json
{
  "error": "invalid_grant",
  "error_description": "The authorization code is invalid or expired."
}
```

| Error | HTTP status | Meaning |
| --- | --- | --- |
| `invalid_request` | `400` | Missing or malformed parameters. |
| `invalid_client` | `401` | Client authentication failed. |
| `invalid_grant` | `400` | Code, verifier, or refresh token is invalid or reused. |
| `invalid_scope` | `400` | A requested scope is not enabled. |
| `unauthorized_client` | `400` | The client cannot use the requested grant. |
| `access_denied` | `400` | The resource owner declined authorization. |
| `invalid_token` | `401` | The bearer token is expired, revoked, or malformed. |
