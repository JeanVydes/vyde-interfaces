# Capability map — Identity Interface (Accounts Center)

`interfaces/identity.vyde.dev`

Every row was verified against the source before any UI was written. Status is the
**backend's** capability, not the UI's intent.

| Status | Meaning |
|---|---|
| SUPPORTED | A route exists and the shape is confirmed from the Rust DTO |
| PARTIAL | Some of the feature exists; the gap is named |
| NOT FOUND | No route. No UI. Appears here and nowhere else |
| UNCLEAR | Needs a decision — see [Questions](#questions) |

## Gateway contract (verified)

| What | Value | Evidence |
|---|---|---|
| Base URL | `VITE_API_URL`, the gateway — **never** identity directly | `gateway/src/server/config.rs:169` |
| Public routes | `/health/live`, `/health/ready` only; everything else is proxied | `gateway/src/server/router.rs:63-67` |
| Browser session | `HttpOnly` cookie named by `GATEWAY_SESSION_COOKIE_NAME` (default `vyde_rt`) | `gateway/src/server/session.rs:87` |
| Cookie flags | `Path=/; HttpOnly; Secure; SameSite=Lax`, `Max-Age` = refresh TTL | `gateway/src/server/session.rs:93` |
| Cookie domain | **host-only, no `Domain=` attribute** — so it is scoped to the gateway's own host | `gateway/src/server/session.rs:93` |
| Cookie-mode login | append **`?mode=cookie`** to the login URL; the gateway strips `refresh_token` from the body and sets the cookie | `gateway/src/server/session.rs:41,61`; `router.rs:255` |
| Refresh | explicit — the client calls `/v1/auth/refresh`; the gateway exchanges and rotates the `HttpOnly` cookie | `gateway/src/server/router.rs` |
| Logout | `POST /v1/auth/logout`; the gateway injects the cookie's token into the body and always clears the cookie | `gateway/src/server/router.rs:169-213` |
| Error body | `{"error":"<reason phrase>","code":"<stable>","message":"<public>"}` + `fields[]` when a field is rejected | `gateway/src/server/error.rs:29`; `identity/src/server/error.rs:29` |
| 429 | `Retry-After` header carries the seconds | `gateway/src/server/error.rs:57` |
| CORS | `GATEWAY_CORS_*` — **added during this work**, the gateway had none | `gateway/src/server/middleware.rs` |
| Framing | `Content-Security-Policy: frame-ancestors none` — **added during this work** | `gateway/src/server/middleware.rs` |

### Cookie strategy across `*.vyde.dev`

One cookie, set by the gateway host. Because there is no `Domain=` attribute it is
**host-only**, and because every first-party app talks to the *same* gateway origin, a
single session is shared by `identity`, `console`, `research` and `docs` — logging in here
signs the user in everywhere, with no second round trip.

## Features

| Feature | Status | Evidence | UI decision |
|---|---|---|---|
| Registration | SUPPORTED | `POST /v1/accounts`; `RegisterAccountRequest` (`dto/account.rs:19`) | Built. Issues **no** token — the user signs in next |
| Email verification | SUPPORTED | `POST /v1/accounts/{id}/emails/{id}/verify`; `VerifyEmailRequest` | Built |
| Resend verification | SUPPORTED | `POST /v1/accounts/{id}/emails/{id}/resend` → `ResendVerificationResponse` | Built |
| Login (first-party) | SUPPORTED | `POST /v1/auth/login`; `NativeLoginRequest` (`dto/oidc.rs:132`) | Built, `?mode=cookie` |
| Login with org binding | SUPPORTED | `organization_id` on `NativeLoginRequest` | Built, optional |
| Logout | SUPPORTED | `POST /v1/auth/logout`; `LogoutRequest` | Built |
| Session refresh | SUPPORTED | gateway-side, implicit | No UI. The gateway does it |
| Profile read | SUPPORTED | `GET /v1/accounts/me` → `AccountView` (`dto/account.rs:55`) | Built |
| Profile edit | SUPPORTED | `PATCH /v1/accounts/me` → `UpdateAccountRequest` (`dto/account.rs:113`) | Built: name, country, language, birthday, photo_url |
| Emails: add | SUPPORTED | `POST /v1/accounts/me/emails` → `AddEmailRequest` | Built |
| Emails: remove | SUPPORTED | `DELETE /v1/accounts/me/emails/{email_id}` | Built |
| Emails: set primary | SUPPORTED | `PUT /v1/accounts/me/emails/{email_id}/primary` | Built |
| Password change | SUPPORTED | `PATCH /v1/accounts/me/password` → `ChangePasswordRequest` | Built, requires current password |
| Password reset / recovery | **NOT FOUND** | `ForgotPasswordRequest`, `ResetPasswordRequest` exist in `dto/oidc.rs:165,171` but **no route** is registered | No UI. DTOs are dead code — see [Backend issues](#backend-issues) |
| MFA / TOTP | SUPPORTED | `POST /v1/accounts/me/mfa/enroll`, `.../confirm`, `GET`/`DELETE /v1/accounts/me/mfa`; `totp_code` on `NativeLoginRequest`; `domain/mfa.rs` | Built. Two-step enrolment; recovery codes; removal needs password **and** code |
| Passkeys / WebAuthn | **NOT FOUND** | no route, no DTO | No UI |
| Active sessions / devices | **NOT FOUND** | sessions live in-process (`infrastructure/session.rs`), never exposed; no route | No UI. "Revoke all sessions" is `POST /v1/auth/logout` with `everywhere: true` — built as a logout option |
| Connected apps (list) | SUPPORTED | `GET /v1/grants` → `Vec<GrantView>` (`ports/grant_repository.rs:81`) | Built |
| Connected apps (revoke) | SUPPORTED | `DELETE /v1/grants/{client_id}` | Built |
| OAuth consent screen | SUPPORTED | `GET /oauth2/authorize` → browser consent, `POST /oauth2/authorize` → code redirect, `POST /v1/grants/consent-preview` → `ConsentPreview` | Built |
| Authorization code + PKCE | SUPPORTED | `code_challenge`/`code_challenge_method` on `AuthorizeRequest`; discovery advertises `S256` | Built — the consent screen completes the flow |
| External identity links | **NOT FOUND** | `ThirdPartyStartResponse`/`ThirdPartyCallbackResponse` exist (`dto/oidc.rs:179,188`) but **no route** | No UI — see [Backend issues](#backend-issues) |
| Organizations: list | SUPPORTED | `GET /v1/organizations` → `ListOrganizationsResponse` | Built |
| Organizations: create | SUPPORTED | `POST /v1/organizations` → `CreateOrganizationRequest` | Built |
| Organizations: read | SUPPORTED | `GET /v1/organizations/{id}` → `OrganizationView` (includes members + your role) | Built |
| Organizations: rename | SUPPORTED | `PATCH /v1/organizations/{id}` — **`deny_unknown_fields`**, so `slug` is refused by design | Built. Name only; the UI must not offer a slug field |
| Organizations: list members | SUPPORTED | `GET /v1/organizations/{id}/members` | Built |
| Organizations: add member | SUPPORTED | `POST /v1/organizations/{id}/members` → `AddMemberRequest`. `owner` is refused: one owner, the creator | Built, role select excluding `owner` |
| Organizations: remove member | SUPPORTED | `DELETE /v1/organizations/{id}/members/{member_account_id}`; use case already existed, the route did not | Built. Owner cannot be removed |
| Organizations: change role | SUPPORTED | `PATCH /v1/organizations/{id}/members/{member_account_id}` → `{role}`; `OrganizationUseCase::change_role` | Built. `can_manage()` = owner\|admin; the owner's row is untouchable in both directions |
| Organizations: leave | SUPPORTED | `POST /v1/organizations/{id}/leave`; `OrganizationUseCase::leave` | Built. Owner refused — an ownerless tenant is unrecoverable |
| Organizations: invitations | **NOT FOUND** | no route | No UI |
| OAuth client management | SUPPORTED | `POST`/`GET /v1/organizations/{id}/clients`, `PATCH`/`DELETE /v1/organizations/{id}/clients/{client_id}`, `POST /v1/organizations/{id}/clients/{client_id}/secret` | Applications can be listed, edited, deleted, and have secrets regenerated. A secret is returned only on create/regeneration and never retrieved |
| API keys | **NOT FOUND** | no route, no DTO | No UI |
| Audit / activity log | **NOT FOUND** | no route | No UI |
| Account deletion | **NOT FOUND** | no route. `accounts.status` accepts `closed` but nothing sets it | No UI |
| Account export | **NOT FOUND** | no route | No UI |
| Notification preferences | SUPPORTED | `GET`/`PATCH /v1/accounts/me/preferences`; `PreferenceKey` (`domain/preference.rs`) | Built, inside the general settings screen |
| General settings (`dark_mode`, theme, motion) | SUPPORTED | same endpoint; `appearance.dark_mode` \| `"system"`, `appearance.accent` (red\|amber\|green), `appearance.motion` | Built. **Storage is one generic `account_preferences` table**, so a new setting needs no migration; the key set is closed and typed |
| Invitations | **NOT FOUND** | table `organization_invitations` exists but has no port, use case or route. Skipped at the user's request | No UI |

## Conventions confirmed from the source

| | |
|---|---|
| Error body | flat: `error` is the **reason phrase string**, detail is in `message`, per-field detail in `fields[]` |
| Validation status | **400**, not 422. `status_of` maps `Error::BadRequest` → 400 deliberately (`identity/src/server/error.rs:79`) |
| Roles | `owner`, `admin`, `member`, `viewer` — ordered; `can_manage()` is owner+admin (`domain/organization/role.rs:34,48`) |
| Scope/claim wire names | `openid`, `profile`, `email`, `offline_access`, `org:*`, `org:<uuid>` (`domain/claim/value.rs:89`) |
| First-party grant | hardcoded `openid profile email offline_access` for `client_id: "native"`; **no** `oauth_clients` row (`use_cases/login.rs:78`) |
| Pagination | **none**. Every list endpoint returns the whole array |
| Timestamps | RFC 3339 strings |
| `country` | ISO 3166-1 alpha-2, uppercase, DB-enforced |
| `language` | ISO 639-1 alpha-2, lowercase, DB-enforced |

## Backend issues found

Reported, not worked around.

1. **The gateway had no CORS at all.** `grep -c 'Cors\|cors' gateway/src/` was **0**. Every
   credentialed request from a browser app on `*.vyde.dev` failed the preflight. **Fixed**
   during this work: `GATEWAY_CORS_*`, a `CorsLayer` applied outermost, and a boot-time
   refusal to combine `*` with credentials.

2. **The gateway sent no framing headers.** Nothing set `frame-ancestors`, so the login and
   consent screens were frameable, and `SameSite=Lax` does not help — the framing page is a
   top-level navigation, which is exactly what Lax allows. **Fixed** during this work:
   `Content-Security-Policy: frame-ancestors none`, `X-Content-Type-Options`, `Referrer-Policy`.

3. **Discovery advertised two endpoints that do not exist.** `/oauth2/userinfo` and
   `/oauth2/revoke` were in the document with no route behind either. A conforming OIDC client
   reads the document and *uses* what it finds, so a good login would end in a `404`.
   **Fixed** during this work: both fields are now optional and omitted.

4. **No CSRF protection — now fixed.** `SameSite=Lax` was the only defence, and it is **not
   sufficient here**: `identity.vyde.dev` and `api.vyde.dev` are the *same site* (`vyde.dev` is the
   registrable domain), so Lax permits the cookie on a cross-origin request from a sibling app. A
   compromised or XSS'd `research.vyde.dev` could drive `api.vyde.dev` with the user's session.
   **Fixed**: a cookie-authenticated request that changes state must carry `X-CSRF-Token`. The
   defence is the browser's CORS preflight, so the value is a constant and there is no per-session
   state. Bearer clients (CLI, mobile) are exempt and unaffected.

   Two things worth knowing about it:
   - **The header is `X-CSRF-Token`, not `X-Vyde-CSRF`.** It was the latter first, and it could
     never work: the gateway reserves the whole `x-vyde-` prefix and strips it from every inbound
     request, which is how its own signed auth context reaches an upstream. A client header inside
     that namespace is removed before the gateway can check it.
   - **It must be listed in `GATEWAY_CORS_ALLOW_HEADERS`**, or first-party preflights fail and every
     write breaks with a CORS error.

5. **Dead DTOs with no route.** `ForgotPasswordRequest`, `ResetPasswordRequest`,
   `ThirdPartyStartResponse`, `ThirdPartyCallbackResponse`. Password recovery and third-party
   login are unreachable; the types are the only trace of an intended design.

6. **`scripts/schema.sql` and its generator were dead and are now deleted.** `generate-schema-sql.sh`
   parsed a `MIGRATION_STATEMENTS` constant that no longer exists — the schema moved to being derived
   from the sea-orm entities — so the committed SQL was an artifact that could not be regenerated and
   would silently drift from the entities it claimed to describe. `migrate.sh` existed only to feed
   `psql` that file. Both removed: the schema has exactly one definition, in the entities, and the
   service applies it on boot.

6. **`clients: Vec` is empty for `native`,** so a `null` field is on the wire for a first-party
   login. The schema allows it and the UI must tolerate it.

## Questions

Each needs a decision; none is guessed in the code.

2. **Photo uploads.** `photo_url` is settable, but the backend validates it as *this platform's
   own* CDN. Is there an upload endpoint? None was found. Until answered, the field is shown
   read-only.

3. **`photo_url` write path.** Is a plain URL accepted, or only a path issued by an upload
   endpoint? The validator rejects anything off-CDN, and the exact rule is not exposed.

4. **Organization slug.** `POST /v1/organizations` accepts an optional `slug` and derives it
   otherwise. Should the UI offer it, or always let the backend derive it? The default is
   derived, and deriving is safer.

## Not built, and why

Everything in the **NOT FOUND** rows above gets no UI, no placeholder, no disabled button
and no navigation entry. A screen that cannot work is worse than an absent one: it teaches
the user that the product has a feature it does not have.

The **UNCLEAR** items — photo upload and the slug field — are marked in the UI as
read-only or omitted rather than guessed at.