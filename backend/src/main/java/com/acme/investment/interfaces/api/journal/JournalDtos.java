package com.acme.investment.interfaces.api.journal;

import com.acme.investment.domain.journal.EntryType;
import com.fasterxml.jackson.annotation.JsonAlias;

import java.util.List;
import java.util.UUID;

public class JournalDtos {

    public record JournalAttachmentRequest(
            @JsonAlias("storageKey")
            String storage_key,
            @JsonAlias("publicUrl")
            String public_url,
            @JsonAlias("fileName")
            String file_name,
            @JsonAlias("attachmentType")
            String attachment_type,
            @JsonAlias("mimeType")
            String mime_type,
            @JsonAlias("sizeBytes")
            Long size_bytes
    ) {}

    public record JournalEntryRequest(
            String symbol,
            @JsonAlias("entryType")
            EntryType entry_type,
            String title,
            String content,
            List<String> tags,
            @JsonAlias("isPinned")
            boolean is_pinned,
            List<JournalAttachmentRequest> attachments
    ) {}

    public record JournalAttachmentResponse(
            UUID id,
            String storage_key,
            String public_url,
            String file_name,
            String attachment_type,
            String mime_type,
            Long size_bytes
    ) {}

    public record JournalAttachmentUploadResponse(
            String storage_key,
            String public_url,
            String file_name,
            String attachment_type,
            String mime_type,
            Long size_bytes
    ) {}

    public record JournalEntryResponse(
            UUID id,
            String symbol,
            EntryType entry_type,
            String title,
            String content,
            List<String> tags,
            boolean is_pinned,
            int attachment_count,
            String created_at,
            List<JournalAttachmentResponse> attachments
    ) {}
}
