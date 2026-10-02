# Daily Session Summary Sequence

The Dashboard, aggregate Holdings page, and individual portfolio page show how
the user's current holdings changed in the latest market session. This is
portfolio analytics, not trading or financial advice.

```mermaid
sequenceDiagram
    actor User
    participant UI as Dashboard / Holdings / Portfolio
    participant API as Spring Portfolio API
    participant BFF as Next.js Market BFF
    participant Provider as Market-data provider

    User->>UI: Open portfolio view
    UI->>API: Load owned portfolios and transactions
    API-->>UI: Holdings inputs after ownership check
    UI->>BFF: GET /api/stock-price for held symbols
    BFF->>Provider: Fetch current price and previous close
    Provider-->>BFF: Quote, currency, market timestamp
    BFF-->>UI: price, previousClose, change, asOf, tradingDate
    UI->>BFF: GET /api/stock-history?range=1M for held symbols
    BFF-->>UI: Daily USD-normalized closing prices
    UI->>UI: Multiply per-share change by quantity held
    UI->>UI: Aggregate value change, breadth, best/worst contributors
    UI->>UI: Estimate one-month trend for current quantities in display currency
    UI-->>User: Session summary with source trading date, portfolio labels, contributor details, and monthly chart
```

## Calculation

- Position change = `quantity * (currentPrice - previousClose)`.
- Portfolio percentage = `sum(position change) / sum(quantity * previousClose)`.
- Currency conversion uses the same FX path as the surrounding page.
- The displayed date uses the provider's latest trading-session date
  (tradingDate, formatted as day/month/year), not the browser or server date.
- Cash positions do not provide a trading date and therefore cannot move the
  summary date forward on weekends or market holidays.
- A missing or invalid previous close is never replaced with cost basis. The
  position is excluded and the unavailable count is shown.
- The one-month chart backcasts the currently held quantities through market
  closes. It is labeled as an estimate and does not claim cash-flow-adjusted
  portfolio performance.
- Reading the summary creates no mutation. Moving a symbol is a separate,
  explicit user action described in `POSITION_TRANSFER_SEQUENCE.md`.
