create table if not exists journal_entries (
    id uuid primary key,
    portfolio_id uuid not null,
    user_id uuid not null,
    symbol varchar(32),
    entry_type varchar(32) not null,
    title text not null,
    content text not null,
    tags jsonb not null default '[]'::jsonb,
    is_pinned boolean not null default false,
    image_count integer not null default 0,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create table if not exists journal_images (
    id uuid primary key,
    journal_entry_id uuid not null references journal_entries(id) on delete cascade,
    public_url text not null,
    file_name text not null,
    image_type varchar(32) not null,
    created_at timestamp with time zone not null default now()
);

create index if not exists idx_journal_entries_portfolio_id on journal_entries(portfolio_id);
create index if not exists idx_journal_entries_user_id on journal_entries(user_id);
create index if not exists idx_journal_entries_created_at on journal_entries(created_at desc);
create index if not exists idx_journal_images_entry_id on journal_images(journal_entry_id);
