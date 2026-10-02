# Auth Session Sequence

## Purpose

Describe the access-token plus refresh-cookie flow used by the frontend and Spring Boot backend after the P0 security hardening work.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Next Frontend
    participant API as Spring Boot API
    participant AUTH as AuthController
    participant RT as RefreshTokenService
    participant AUDIT as AuditLogService

    U->>FE: Submit login form
    FE->>API: POST /api/v1/auth/login
    API->>AUTH: authenticate(email, password)
    AUTH->>RT: issue(user)
    AUTH->>AUDIT: log LOGIN
    AUTH-->>FE: 200 AuthResponse + Set-Cookie(HttpOnly refresh)
    FE->>FE: Store access token only

    FE->>API: Authenticated API request with Bearer token
    API-->>FE: 401 access token expired
    FE->>API: POST /api/v1/auth/refresh with refresh cookie
    API->>AUTH: refresh()
    AUTH->>RT: rotate(old refresh token)
    AUTH->>RT: issue(user)
    AUTH->>AUDIT: log REFRESH
    AUTH-->>FE: 200 AuthResponse + rotated Set-Cookie
    FE->>API: Retry original request with new Bearer token
    API-->>FE: 200 success

    U->>FE: Logout
    FE->>API: POST /api/v1/auth/logout
    API->>RT: revokeAll(user)
    API->>AUDIT: log LOGOUT
    API-->>FE: 204 + expired Set-Cookie
```

## Notes

- The refresh cookie is the preferred production path.
- The refresh body field remains documented only for compatibility with older clients.
- Session failure clears client-side access state and redirects the user to `/login`.

## Initial Administrator Bootstrap

```mermaid
sequenceDiagram
    participant O as Local Operator
    participant ENV as Process Environment
    participant APP as Spring Boot
    participant DB as PostgreSQL
    participant AUDIT as Audit Log

    O->>ENV: Set explicit bootstrap flag, email, and password
    ENV->>APP: Start application once
    APP->>DB: Find configured email
    alt account exists
        APP->>DB: Promote that account to ADMIN
    else account is absent
        APP->>DB: Create ADMIN with bcrypt password hash
    end
    APP->>AUDIT: Record bootstrap create/promotion
    APP-->>O: Warn to disable bootstrap flag
```

There is intentionally no public Admin registration request. See `docs/operations/BOOTSTRAP_ADMIN.md` for the local procedure.
