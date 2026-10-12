---
name: vyde-cli
description: Use and extend the headless Vyde CLI without reintroducing a TUI or bypassing its service/socket architecture.
---

# Vyde CLI

The CLI lives in `interfaces/cli.vyde.dev`. It is headless only: do not add terminal UI code or
restore `ratatui`/`crossterm`.

## Architecture

Commands are parsed in `vyde/src/headless.rs`, sent as typed `core::channel::Request` values over
the Unix socket, dispatched by `core::Dispatcher`, and executed through `PlatformPort` by
`vyde/src/platform/mod.rs`. The background `vyde serve` process owns the active OAuth session and
the keyring token. New commands must follow this path instead of making HTTP calls in the parser.

## OAuth and local development

The CLI is a public OAuth client using Authorization Code + PKCE and
`http://127.0.0.1:8675/callback`. Configure `VYDE_OAUTH_CLIENT_ID`; never add a client secret.
`--dev` selects the local HTTPS gateway, and the adapter trusts `services/certs/ca.crt` or the
`VYDE_CA_CERT_PATH` override without disabling TLS verification.

## Management commands

Identity administration is exposed by `vyde manage ...`; results are JSON. Use `--yes` for grant
revocation, member removal, leaving organizations, invitation revocation, application deletion,
and application-secret regeneration. Keep destructive confirmation explicit for new operations.

## Validation

From `interfaces/cli.vyde.dev` run:

```bash
cargo fmt --all
cargo check -p vyde-cli
cargo test -p vyde-cli
```
