alter table if exists journal_entries
    rename column image_count to attachment_count;

alter table if exists journal_images
    rename to journal_attachments;

alter table if exists journal_attachments
    rename column image_type to attachment_type;

alter index if exists idx_journal_images_entry_id
    rename to idx_journal_attachments_entry_id;
