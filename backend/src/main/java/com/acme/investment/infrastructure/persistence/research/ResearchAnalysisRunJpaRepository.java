package com.acme.investment.infrastructure.persistence.research;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResearchAnalysisRunJpaRepository extends JpaRepository<ResearchAnalysisRunEntity, UUID> {
    Optional<ResearchAnalysisRunEntity> findTopByUser_IdAndSymbolOrderByAsOfDesc(UUID userId, String symbol);
}
