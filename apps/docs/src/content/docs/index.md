---
title: Vyde Developer Docs
description: OAuth 2.1 and OpenID Connect for the Vyde platform.
template: splash
hero:
  title: Identity for the things you build.
  tagline: Connect applications to Vyde with OAuth 2.1 and OpenID Connect. Secure authorization, clear ownership, and a flow that works everywhere.
  actions:
    - text: Start with OAuth
      link: /oauth/overview
      icon: right-arrow
    - text: Download CLI skill
      link: /vyde-cli-skill.md
      attrs:
        download: vyde-cli-skill.md
---

## Build on Vyde

Vyde is an OAuth 2.1 and OpenID Connect authorization server. Register an application, send users
through consent, exchange a one-time code, and call APIs with delegated access.

| | |
| --- | --- |
| **Public clients** | Native, mobile, browser and CLI applications use PKCE and never ship a secret. |
| **Confidential clients** | Server-side applications authenticate with a secret kept on the backend. |
| **OIDC** | Add `openid` when your application needs an identity token and UserInfo. |

<a class="download-skill" href="/vyde-cli-skill.md" download="vyde-cli-skill.md">↓ Download the CLI skill for agents</a>
