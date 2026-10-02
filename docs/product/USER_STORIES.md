# User Stories

## Personas

| Persona | Description | Primary goals |
|---------|-------------|---------------|
| **Retail Investor** | Individual managing personal wealth across crypto, stocks, commodities | Track P&L, understand news impact, set savings goals |
| **Premium Investor** | Power user with multiple portfolios and alert rules | Advanced AI analysis, custom notifications, export |
| **Moderator** | Content reviewer | Review flagged AI outputs and news summaries |
| **Admin** | Platform operator | User management, asset catalog, system health |

---

## Epic 1: Authentication & Account

### US-1.1 Register account
**As a** retail investor  
**I want to** create an account with email and password  
**So that** my portfolio data is private and persistent  

**Acceptance criteria:**
- Email must be unique; password ≥ 12 characters
- Default role is `USER`
- Returns JWT on success

### US-1.2 Login
**As a** registered user  
**I want to** log in with my credentials  
**So that** I can access my portfolios on web and mobile  

---

## Epic 2: Portfolio & Transactions

### US-2.1 Create portfolio
**As a** retail investor  
**I want to** create a named portfolio with a base currency  
**So that** I can organize holdings by strategy (e.g. "Long-term", "Trading")  

### US-2.2 Add BTC transaction
**As a** retail investor  
**I want to** record a BUY transaction for BTC (quantity, price, date, fees)  
**So that** I can track my cost basis and unrealized P&L  

**Acceptance criteria:**
- Asset resolved from Asset Master by symbol
- Holding (`portfolio_positions`) recalculated automatically
- Audit log entry created

### US-2.3 View holdings and P&L
**As a** retail investor  
**I want to** see current holdings with quantity, average cost, and gain/loss  
**So that** I know how each position is performing  

**Acceptance criteria:**
- Dashboard, aggregate Holdings, and portfolio detail show the latest completed/current session change versus the previous close
- Summary includes value and percentage change, advancing/declining/unchanged counts, and the highest/lowest contributor
- Assets without a reliable previous close are excluded and identified; the UI does not invent a price
- The summary states that market data may be delayed and is informational, not financial advice

### US-2.4 Edit transaction
**As a** retail investor  
**I want to** correct a mistyped transaction  
**So that** my records stay accurate  

**Acceptance criteria:**
- Before/after state logged in `audit_logs`
- Holdings recalculated

### US-2.5 Delete transaction
**As a** retail investor  
**I want to** remove an erroneous transaction  
**So that** my portfolio reflects reality  

**Acceptance criteria:**
- Soft validation: cannot delete if it would cause negative quantity
- Audit log with `DELETE` action

### US-2.6 Import transactions (future)
**As a** premium investor  
**I want to** upload a CSV of trades  
**So that** I don't enter hundreds of transactions manually  

---

## Epic 3: Watchlist & Market Monitoring

### US-3.1 Create watchlist
**As a** retail investor  
**I want to** create a watchlist (e.g. "Tech stocks")  
**So that** I can monitor assets I don't own yet  

### US-3.2 Add NVDA to watchlist
**As a** retail investor  
**I want to** add NVDA to my watchlist  
**So that** I get news and price alerts for it  

---

## Epic 4: News & Context

### US-4.1 View BTC-related news
**As a** retail investor  
**I want to** see news articles tagged to BTC with AI summaries  
**So that** I understand why BTC is moving  

**Acceptance criteria:**
- Each article shows: title, summary (≤ 150 words), source, publication date, link
- Summary cites original source; no investment advice

### US-4.2 Filter news by asset
**As a** retail investor  
**I want to** filter the news feed by asset or watchlist  
**So that** I only see relevant information  

### US-4.3 Automatic news collection
**As the** system  
**I want to** fetch RSS feeds, summarize with AI, and tag assets  
**So that** users always have fresh, sourced news  

> See [News + AI Pipeline](../architecture/NEWS_AI_PIPELINE.md)

---

## Epic 5: AI Assistant

### US-5.1 Portfolio risk analysis
**As a** retail investor  
**I want to** request an AI analysis of my portfolio risk  
**So that** I understand concentration and volatility exposure  

**Acceptance criteria:**
- Output includes risk score (0–100), narrative analysis, and citations
- AI does NOT guarantee returns or recommend specific trades

### US-5.2 Ask AI about holdings
**As a** premium investor  
**I want to** chat with the AI about my portfolio in a conversation thread  
**So that** I can ask follow-up questions with context  

**Acceptance criteria:**
- Messages stored in `ai_conversations` / `ai_messages`
- Every factual claim includes citation or uncertainty marker

---

## Epic 6: Goals

### US-6.1 Set savings goal
**As a** retail investor  
**I want to** set a target amount and date (e.g. $50,000 by 2028)  
**So that** I can track progress toward financial milestones  

### US-6.2 Goal progress notification
**As a** retail investor  
**I want to** be notified when I reach 50% / 100% of a goal  
**So that** I stay motivated  

---

## Epic 7: Notifications

### US-7.1 Price drop alert
**As a** retail investor  
**I want to** receive a notification when BTC drops 5% in 24h  
**So that** I'm aware of significant moves  

### US-7.2 News alert for watched asset
**As a** retail investor  
**I want to** be notified when NVDA has breaking news  
**So that** I don't miss market-moving events  

### US-7.3 Portfolio drawdown alert
**As a** retail investor  
**I want to** be alerted when my portfolio drops more than 10% from peak  
**So that** I can review my strategy  

> See [Notification Service](../architecture/NOTIFICATION_SERVICE.md)

---

## Epic 8: Administration

### US-8.1 Manage asset catalog
**As an** admin  
**I want to** add or deactivate assets in the master catalog  
**So that** users can only record transactions for valid instruments  

### US-8.2 Review audit trail
**As an** admin  
**I want to** query audit logs for a user's transaction changes  
**So that** I can investigate disputes or compliance requests  

### US-8.3 Moderate AI output
**As a** moderator  
**I want to** flag and hide AI summaries that violate policy  
**So that** users aren't exposed to misleading content  

---

## Story Map (User Flow)

```
Register → Login → Create Portfolio → Add Transaction → View Dashboard
                                              ↓
                                    Add Watchlist → Configure Alerts
                                              ↓
                                    Read News Feed → Ask AI → Set Goal
```

## Priority (MoSCoW)

| Must have (MVP) | Should have | Could have | Won't have (v1) |
|-----------------|-------------|------------|-----------------|
| US-1.1, 1.2 | US-3.1, 3.2 | US-2.6 CSV import | Live trading |
| US-2.1–2.5 | US-4.1, 4.3 | US-5.2 chat | Tax filing |
| US-2.3 | US-5.1 | US-6.2 | Social features |
| US-4.1 | US-7.1–7.3 | US-8.3 | Robo-advisor auto-trade |
