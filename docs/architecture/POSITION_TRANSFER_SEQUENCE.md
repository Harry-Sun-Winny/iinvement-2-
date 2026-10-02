# Position Transfer Sequence

The dashboard can move one symbol to the correct owned portfolio without
creating synthetic trades. The operation reassigns the symbol's complete
transaction history so dates, fees, and cost basis remain intact.

```mermaid
sequenceDiagram
    actor User
    participant UI as Dashboard session details
    participant API as TransactionController
    participant Service as TransactionService
    participant DB as PostgreSQL
    participant Audit as AuditLogService
    participant Rebuild as Tax lots / Holdings / Snapshots

    User->>UI: Select target portfolio and confirm
    UI->>API: PATCH source/transactions/positions/{symbol}/transfer
    API->>Service: transferSymbol(source, target, user, symbol)
    Service->>DB: Verify both portfolios belong to user
    Service->>DB: Load full source transaction history for symbol
    Service->>DB: Reassign transactions to target portfolio
    loop Each moved transaction
        Service->>Audit: Write TRANSFER before/after states
    end
    Service->>Rebuild: Recompute tax lots and holdings for source and target
    Service->>Rebuild: Schedule incremental snapshots after commit
    Service-->>API: symbol and moved transaction count
    API-->>UI: Transfer result
    UI->>UI: Reload dashboard holdings and portfolio labels
    UI-->>User: Show success or contextual error
```

## Safety and data rules

- Source and target must be different portfolios owned by the authenticated user.
- Every transaction mutation writes an audit entry with source and target portfolio IDs.
- The operation is atomic. Any failure rolls back transaction reassignment and audit writes.
- No database migration is required because `transactions.portfolio_id` already represents ownership.
- The operation is portfolio management, not order execution or financial advice.
