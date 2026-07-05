package com.acme.investment.infrastructure.persistence.journal;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface JournalEntryRepository extends JpaRepository<JournalEntryEntity, UUID> {
    List<JournalEntryEntity> findByPortfolioIdAndUserIdOrderByPinnedDescCreatedAtDesc(UUID portfolioId, UUID userId);
    List<JournalEntryEntity> findByPortfolioIdAndUserIdAndSymbolOrderByPinnedDescCreatedAtDesc(UUID portfolioId, UUID userId, String symbol);
}
