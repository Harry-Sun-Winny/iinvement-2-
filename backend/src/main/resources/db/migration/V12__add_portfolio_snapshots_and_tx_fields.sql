-- Add columns to transactions for tax lot tracking and realized P&L
ALTER TABLE transactions ADD COLUMN fee NUMERIC(24,8) DEFAULT 0.0 NOT NULL;
ALTER TABLE transactions ADD COLUMN realized_pnl NUMERIC(24,8) DEFAULT 0.0 NOT NULL;
ALTER TABLE transactions ADD COLUMN tax_lot_method VARCHAR(20) DEFAULT 'FIFO' NOT NULL;

-- Create portfolio EOD snapshots table
CREATE TABLE portfolio_snapshots (
    id UUID PRIMARY KEY,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_value NUMERIC(24,8) NOT NULL,
    total_cost NUMERIC(24,8) NOT NULL,
    cash_balance NUMERIC(24,8) NOT NULL,
    realized_pnl NUMERIC(24,8) NOT NULL,
    unrealized_pnl NUMERIC(24,8) NOT NULL,
    CONSTRAINT uq_portfolio_snapshot_date UNIQUE (portfolio_id, snapshot_date)
);

-- Create benchmark index prices table for Beta/Alpha risk metrics
CREATE TABLE benchmark_prices (
    id UUID PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    price_date DATE NOT NULL,
    close_price NUMERIC(24,8) NOT NULL,
    CONSTRAINT uq_benchmark_symbol_date UNIQUE (symbol, price_date)
);
