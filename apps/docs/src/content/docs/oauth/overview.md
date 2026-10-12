---
title: OAuth 2.1 overview
description: The Vyde authorization model and environments.
---

Vyde uses Authorization Code + PKCE. Your application sends the user to Vyde, the user decides what
to share, and Vyde redirects back with a short-lived authorization code.

## Environments

| Service | Development | Production |
| --- | --- | --- |
| Identity interface | `https://identity.vyde.test:5173` | `https://identity.vyde.dev` |
| API | `https://api.vyde.test:8443` | `https://api.vyde.dev` |
| Documentation | `https://docs.vyde.test:5174` | `https://docs.vyde.dev` |

Redirect URIs are environment-specific and must match exactly.

## The flow

1. Register a public or confidential application.
2. Generate `state` and a PKCE verifier in your application.
3. Redirect the browser to `/oauth2/authorize`.
4. Verify `state` in the callback.
5. Exchange the one-time code at `/oauth2/token`.
6. Validate tokens before calling your API.

Scopes must be enabled for the application before they can be requested. An unenabled scope returns
`invalid_scope`, not a generic request error.
