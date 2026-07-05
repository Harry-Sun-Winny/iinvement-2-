alter table if exists journal_attachments
    add column if not exists storage_key text,
    add column if not exists mime_type varchar(100),
    add column if not exists size_bytes bigint;

alter table if exists journal_attachments
    alter column public_url drop not null;
