# Transaction CSV Import

## Safety rules

- Only `PREMIUM` and `ADMIN` roles may preview or commit imports.
- A preview validates at most 500 rows and never writes financial data.
- Commit repeats validation; any invalid row rejects the whole batch.
- Ownership of the target portfolio is checked before preview and commit.
- Every committed transaction has an audit event. Tax lots and holdings are recomputed once after the batch is saved.

## Sequence

```mermaid
sequenceDiagram
  participant U as User
  participant W as Dashboard or Ledger web app
  participant A as API
  participant D as Database
  U->>W: Choose CSV
  W->>A: POST import/preview
  A-->>W: normalized rows and row issues
  W-->>U: Show valid/invalid rows
  U->>W: Confirm only when valid
  W->>A: POST import/commit
  A->>A: Revalidate role and ownership
  A->>D: Save transactions and audit events
  A->>A: Recompute tax lots and holdings once
  A-->>W: Created transactions
  W-->>U: Reload portfolio values
```
