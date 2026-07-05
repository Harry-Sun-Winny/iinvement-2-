package com.acme.investment.application.journal;

import com.acme.investment.domain.journal.EntryType;
import com.acme.investment.infrastructure.persistence.journal.JournalEntryEntity;
import com.acme.investment.infrastructure.persistence.journal.JournalEntryRepository;
import com.acme.investment.infrastructure.persistence.journal.JournalAttachmentEntity;
import com.acme.investment.interfaces.api.journal.JournalDtos.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class JournalService {

    private final JournalEntryRepository journalEntryRepository;
    private final ObjectMapper objectMapper;

    public JournalService(JournalEntryRepository journalEntryRepository, ObjectMapper objectMapper) {
        this.journalEntryRepository = journalEntryRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<JournalEntryResponse> getByPortfolio(UUID portfolioId, UUID userId, String symbol) {
        List<JournalEntryEntity> entries = symbol == null || symbol.isBlank()
                ? journalEntryRepository.findByPortfolioIdAndUserIdOrderByPinnedDescCreatedAtDesc(portfolioId, userId)
                : journalEntryRepository.findByPortfolioIdAndUserIdAndSymbolOrderByPinnedDescCreatedAtDesc(
                        portfolioId,
                        userId,
                        symbol
                );

        return entries
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public JournalEntryResponse create(UUID portfolioId, UUID userId, JournalEntryRequest request) {
        validateRequest(request);

        JournalEntryEntity entity = new JournalEntryEntity();
        entity.setId(UUID.randomUUID());
        entity.setPortfolioId(portfolioId);
        entity.setUserId(userId);
        entity.setSymbol(normalizeNullable(request.symbol()));
        entity.setEntryType(request.entry_type() == null ? EntryType.manual_note : request.entry_type());
        entity.setTitle(request.title().trim());
        entity.setContent(request.content().trim());
        entity.setPinned(request.is_pinned());
        entity.setCreatedAt(OffsetDateTime.now());
        entity.setUpdatedAt(OffsetDateTime.now());

        try {
            entity.setTags(objectMapper.writeValueAsString(request.tags() == null ? List.of() : request.tags()));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize tags", e);
        }

        List<JournalAttachmentEntity> attachments = new ArrayList<>();
        if (request.attachments() != null) {
            for (JournalAttachmentRequest attachmentRequest : request.attachments()) {
                JournalAttachmentEntity attachment = new JournalAttachmentEntity();
                attachment.setId(UUID.randomUUID());
                attachment.setJournalEntry(entity);
                attachment.setStorageKey(normalizeNullable(attachmentRequest.storage_key()));
                attachment.setPublicUrl(normalizeNullable(attachmentRequest.public_url()));
                attachment.setFileName(attachmentRequest.file_name().trim());
                attachment.setAttachmentType(attachmentRequest.attachment_type().trim());
                attachment.setMimeType(normalizeNullable(attachmentRequest.mime_type()));
                attachment.setSizeBytes(attachmentRequest.size_bytes());
                attachment.setCreatedAt(OffsetDateTime.now());
                attachments.add(attachment);
            }
        }

        entity.setAttachments(attachments);
        entity.setAttachmentCount(attachments.size());

        JournalEntryEntity saved = journalEntryRepository.save(entity);
        return toResponse(saved);
    }

    private void validateRequest(JournalEntryRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Journal payload is required");
        }
        if (isBlank(request.title())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Journal title is required");
        }
        if (isBlank(request.content())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Journal content is required");
        }
        if (request.attachments() == null) {
            return;
        }
        for (JournalAttachmentRequest attachment : request.attachments()) {
            if (attachment == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Journal attachment is invalid");
            }
            if (isBlank(attachment.file_name())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment file name is required");
            }
            if (isBlank(attachment.attachment_type())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment type is required");
            }
        }
    }

    private String normalizeNullable(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private JournalEntryResponse toResponse(JournalEntryEntity entity) {
        try {
            List<String> tags = List.of();
            if (entity.getTags() != null && !entity.getTags().isBlank()) {
                try {
                    tags = objectMapper.readValue(
                            entity.getTags(),
                            objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)
                    );
                } catch (Exception e) {
                    // Fallback to empty list if JSON parsing fails
                }
            }

            List<JournalAttachmentResponse> attachments = entity.getAttachments().stream()
                    .map(attachment -> new JournalAttachmentResponse(
                            attachment.getId(),
                            attachment.getStorageKey(),
                            attachment.getPublicUrl(),
                            attachment.getFileName(),
                            attachment.getAttachmentType(),
                            attachment.getMimeType(),
                            attachment.getSizeBytes()
                    ))
                    .toList();

            return new JournalEntryResponse(
                    entity.getId(),
                    entity.getSymbol(),
                    entity.getEntryType(),
                    entity.getTitle(),
                    entity.getContent(),
                    tags,
                    entity.isPinned(),
                    entity.getAttachmentCount(),
                    entity.getCreatedAt().toString(),
                    attachments
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to map journal entry response", e);
        }
    }
}
