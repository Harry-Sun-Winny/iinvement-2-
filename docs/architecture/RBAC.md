# Role-Based Access Control (RBAC)

## Roles

| Role | Code | Description |
|------|------|-------------|
| Admin | `ADMIN` | Full system access, user management, asset catalog |
| Moderator | `MODERATOR` | Content moderation, read-only audit access |
| Premium User | `PREMIUM` | All user features + advanced AI chat, CSV import, custom alert rules |
| Normal User | `USER` | Standard portfolio, watchlist, news, basic AI analysis |

Stored in `users.role` (VARCHAR). Spring Security maps to `ROLE_{code}`.

## Permission Matrix

| Resource / Action | USER | PREMIUM | MODERATOR | ADMIN |
|-------------------|:----:|:-------:|:---------:|:-----:|
| **Auth** register/login | ✅ | ✅ | ✅ | ✅ |
| **Portfolio** CRUD (own) | ✅ | ✅ | ✅ | ✅ |
| **Transaction** CRUD (own) | ✅ | ✅ | ✅ | ✅ |
| **Watchlist** CRUD (own) | ✅ | ✅ | ✅ | ✅ |
| **Goal** CRUD (own) | ✅ | ✅ | ✅ | ✅ |
| **News** read | ✅ | ✅ | ✅ | ✅ |
| **AI** portfolio analysis | ✅ | ✅ | ✅ | ✅ |
| **AI** multi-turn chat | ❌ | ✅ | ✅ | ✅ |
| **Notification** read (own) | ✅ | ✅ | ✅ | ✅ |
| **Notification** custom rules | ❌ | ✅ | ❌ | ✅ |
| **CSV** transaction import | ❌ | ✅ | ❌ | ✅ |
| **Audit log** read (own) | ❌ | ❌ | ❌ | ✅ |
| **Audit log** read (all) | ❌ | ❌ | ✅ | ✅ |
| **News** moderate/flag | ❌ | ❌ | ✅ | ✅ |
| **Asset** catalog manage | ❌ | ❌ | ❌ | ✅ |
| **User** manage roles | ❌ | ❌ | ❌ | ✅ |

## Implementation

### JWT Claims

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "USER"
}
```

### Spring Security

```java
@PreAuthorize("hasRole('ADMIN')")
public void createAsset(...) { }

@PreAuthorize("hasAnyRole('PREMIUM', 'ADMIN')")
public void importTransactions(...) { }

@PreAuthorize("#userId == authentication.principal.id or hasRole('ADMIN')")
public Portfolio getPortfolio(UUID userId, UUID portfolioId) { }
```

### Ownership Checks

All portfolio-scoped resources verify:

```
portfolio.user_id == currentUser.id  OR  currentUser.role == ADMIN
```

Moderators may read but not mutate user financial data.

## Role Assignment

| Event | Default role |
|-------|--------------|
| Registration | `USER` |
| First local administrator | `ADMIN` only through the one-time, environment-gated bootstrap process |
| Admin promotion | `ADMIN` (existing admin API, when implemented) |
| Premium subscription | `PREMIUM` (future billing integration) |

Public registration can never choose a role. After bootstrap, only `ADMIN` can change another user's role. The bootstrap flag is an installation procedure, not a client-facing API.

## Future: Fine-Grained Permissions

If role count grows, introduce `permissions` table with role-permission mapping. For MVP, four roles with method-level `@PreAuthorize` is sufficient.
