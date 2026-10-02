# API Scope

REST API map organized by domain. Base path: `/api/v1`.

## Summary

| Domain | Base path | Auth | Status |
|--------|-----------|------|--------|
| Auth | `/api/v1/auth` | Public (register/login) | ✅ Implemented |
| Portfolio | `/api/v1/portfolios` | JWT | ✅ Implemented |
| Transaction | `/api/v1/portfolios/{id}/transactions` | JWT | ✅ Implemented |
| Watchlist | `/api/v1/watchlists` | JWT | ✅ Implemented |
| Goal | `/api/v1/goals` | JWT | ✅ Implemented |
| News | `/api/v1/news` | JWT | ✅ Implemented |
| Research Intelligence | `/api/v1/research` | JWT (catalog import: Admin) | ✅ Implemented |
| AI Analysis | `/api/v1/portfolios/{id}/analysis` | JWT | ✅ Implemented |
| Asset | `/api/v1/assets` | JWT | 🔜 Planned |
| AI Chat | `/api/v1/ai/conversations` | JWT (Premium+) | 🔜 Planned |
| Notification | `/api/v1/notifications` | JWT | 🔜 Planned |
| Notification Rules | `/api/v1/notification-rules` | JWT (Premium+) | 🔜 Planned |
| Audit | `/api/v1/admin/audit-logs` | JWT (Admin/Mod) | 🔜 Planned |
| Admin | `/api/v1/admin/*` | JWT (Admin) | 🔜 Planned |

---

## /api/v1/auth

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/register` | Create account | Public |
| POST | `/login` | Get JWT | Public |
| GET | `/me` | Current user profile | JWT |
| POST | `/refresh` | Refresh token | JWT |

---

## /api/v1/portfolios

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List user's portfolios |
| POST | `/` | Create portfolio |
| GET | `/{portfolioId}` | Get portfolio with holdings summary |
| PUT | `/{portfolioId}` | Update name / base currency |
| DELETE | `/{portfolioId}` | Delete portfolio (cascade) |
| GET | `/{portfolioId}/holdings` | List holdings with P&L |

---

## /api/v1/portfolios/{portfolioId}/transactions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List transactions (filter by asset, date) |
| POST | `/` | Add transaction → recalc holdings + audit log |
| GET | `/{transactionId}` | Get single transaction |
| PUT | `/{transactionId}` | Update → recalc + audit log |
| DELETE | `/{transactionId}` | Delete → recalc + audit log |

---

## /api/v1/watchlists

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List user's watchlists |
| POST | `/` | Create watchlist |
| DELETE | `/{watchlistId}` | Delete watchlist |
| POST | `/{watchlistId}/items` | Add asset |
| DELETE | `/{watchlistId}/items/{itemId}` | Remove asset |

---

## /api/v1/goals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List user's goals |
| POST | `/` | Create goal |
| PUT | `/{goalId}` | Update goal |
| DELETE | `/{goalId}` | Delete goal |

---

## /api/v1/news

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List news (paginated, filter by asset, tag, date) |
| GET | `/{articleId}` | Single article with linked assets |

Query params: `?asset=BTC&tag=earnings&from=2026-01-01&limit=20`

---

## /api/v1/portfolios/{portfolioId}/analysis

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Generate AI risk analysis with citations |
| GET | `/` | List past analyses for portfolio |
| GET | `/{analysisId}` | Get specific analysis |

---

## /api/v1/research

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | `/{symbol}/profile` | Point-in-time profile and research context; does not write a run | USER+ |
| GET | `/{symbol}/parameters` | Provider-mapped observations, evidence status, source citation, and warnings | USER+ |
| GET | `/{symbol}/score` | Governed scorecard; a null overall score means insufficient evidence | USER+ |
| POST | `/{symbol}/runs` | Calculate and persist an immutable, private research snapshot | USER+ |
| GET | `/{symbol}/runs/latest` | Read only the caller's most recent saved snapshot for the symbol | USER+ |
| POST | `/catalog/import` | Validate and atomically upsert the complete 3,600-row DOCX dictionary | ADMIN |

The catalog import rejects a partial, duplicate, malformed, or non-DOCX dictionary. It records an audit entry and never stores the uploaded document. Current scoring activates only provider-mapped proxy observations; all other documented entries remain unscored until a data-source mapping is approved.

---

## /api/v1/ai (planned)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | `/conversations` | List conversations | PREMIUM+ |
| POST | `/conversations` | Start conversation | PREMIUM+ |
| GET | `/conversations/{id}` | Get with messages | PREMIUM+ |
| POST | `/conversations/{id}/messages` | Send message | PREMIUM+ |

---

## /api/v1/assets (planned)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | `/` | Search asset catalog | USER+ |
| GET | `/{assetId}` | Asset detail | USER+ |

---

## /api/v1/notifications (planned)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List notifications |
| PATCH | `/{id}/read` | Mark read |
| POST | `/read-all` | Mark all read |

---

## /api/v1/admin (planned)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | `/users` | List users | ADMIN |
| PATCH | `/users/{id}/role` | Change role | ADMIN |
| POST | `/assets` | Add to catalog | ADMIN |
| GET | `/audit-logs` | Query audit trail | ADMIN, MODERATOR |
| PATCH | `/news/{id}/flag` | Flag AI summary | MODERATOR+ |

---

## Cross-Cutting Concerns

| Concern | Implementation |
|---------|----------------|
| Authentication | JWT Bearer token |
| Authorization | `@PreAuthorize` + ownership checks — see [RBAC](../architecture/RBAC.md) |
| Validation | Jakarta Bean Validation on request DTOs |
| Pagination | `?page=0&size=20` (Spring Pageable) |
| Errors | RFC 7807 Problem Details |
| Docs | OpenAPI 3 at `/swagger-ui.html` |
| Versioning | URL prefix `/api/v1` |

### Web market-data BFF performance

The Next.js web client uses internal `/api/stock-*` routes as a provider-facing
BFF; these routes are not part of the public Spring Boot `/api/v1` contract.
Dashboard quote reads use `GET /api/stock-price?symbols=AAPL,MSFT` (maximum 40
symbols per batch). Live quotes, FX rates, history, fundamentals, dividends, and
news use bounded TTL caching plus in-flight request coalescing. See
[Data Loading Performance](../architecture/DATA_LOADING_PERFORMANCE.md) for the
sequence and cache policy.

The daily session summary is computed client-side from this BFF response using
`price`, `previousClose`, `change`, `changePercent`, `currency`, and `asOf`.
Positions without a valid `previousClose` are reported as unavailable and are
not included in aggregate session performance. This does not add a public
Spring Boot endpoint or persist market-price data.

## OpenAPI

Canonical contract: `backend/src/main/resources/openapi/investment-api.yaml`

Extend this file as endpoints are implemented. Frontend and mobile clients generate types from this spec.

## Transaction CSV Import (implemented)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| POST | `/import/preview` | Validate and normalize up to 500 rows; no transaction is written | PREMIUM, ADMIN |
| POST | `/import/commit` | Revalidate, atomically create rows, audit each row, recalculate holdings once | PREMIUM, ADMIN |

The client must present preview errors to the user and only enable commit when `readyToImport` is true. Ownership is verified for the target portfolio on both endpoints.
