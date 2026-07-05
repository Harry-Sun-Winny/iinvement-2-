DROP TABLE IF EXISTS portfolio_snapshots;

create table portfolio_snapshots (
    id uuid primary key,
    portfolio_id uuid not null,
    snapshot_date date not null,
    invested_amount numeric(19,4) not null,
    portfolio_value numeric(19,4) not null,
    cash_balance numeric(19,4),
    created_at timestamp with time zone default now()
);

create index if not exists idx_portfolio_snapshots_portfolio_id
    on portfolio_snapshots(portfolio_id);

create index if not exists idx_portfolio_snapshots_portfolio_date
    on portfolio_snapshots(portfolio_id, snapshot_date);
