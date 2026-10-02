# Refresh Token Database Update

## Summary

Migration `V17__add_refresh_tokens.sql` introduces server-managed refresh sessions for Spring Security authentication.

## Tables

- `refresh_tokens`
  - `id`
  - `user_id`
  - `token_hash`
  - `created_at`
  - `expires_at`
  - `revoked_at`

## Security Notes

- Plain refresh tokens are never persisted. The database stores only a SHA-256 hash.
- Browser clients now receive the refresh token through an `HttpOnly` cookie, reducing XSS exposure compared with `localStorage`.
- Rotation revokes the prior refresh token before issuing a new session.
- Logout revokes all active refresh tokens for the authenticated user.

## Operational Notes

- Default lifetime is controlled by `security.refresh-token.ttl-days`.
- Production should set `security.refresh-token.cookie-secure=true` and terminate traffic over HTTPS.
- Audit events are written for login, refresh, and logout session actions.
