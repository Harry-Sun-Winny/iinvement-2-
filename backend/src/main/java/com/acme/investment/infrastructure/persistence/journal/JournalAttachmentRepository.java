package com.acme.investment.infrastructure.persistence.journal;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface JournalAttachmentRepository extends JpaRepository<JournalAttachmentEntity, UUID> {
}
