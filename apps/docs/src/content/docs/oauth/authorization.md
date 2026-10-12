---
title: Authorization and consent
description: Build the browser authorization request with state and PKCE.
---

Send the browser to the Identity authorization endpoint:

```text
https://identity.vyde.dev/oauth2/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https%3A%2F%2Fapp.example%2Fcallback
  &scope=openid%20profile%20email
  &state=UNPREDICTABLE_VALUE
  &code_challenge=BASE64URL_SHA256_VERIFIER
  &code_challenge_method=S256
```

### `state`

Generate an unpredictable value, bind it to the initiating browser session, and reject callbacks
that do not match. Vyde returns it unchanged.

### PKCE

Create a random verifier, send its base64url SHA-256 digest as `code_challenge`, and retain the
verifier until the token exchange. Public clients must use `S256`; confidential clients should use it
too.

### Callback

On approval, Vyde redirects to the registered URI:

```text
https://app.example/callback?code=ONE_TIME_CODE&state=UNPREDICTABLE_VALUE
```

On denial, handle `error`, `error_description`, and `state` without attempting a token exchange.
The browser route is `/oauth2/authorize`; the authenticated API completion route is not a URL to open
directly.
