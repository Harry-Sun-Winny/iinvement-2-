package com.acme.investment.infrastructure.persistence.snapshot;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PortfolioSnapshotRepository extends JpaRepository<PortfolioSnapshotEntity, UUID> {
    List<PortfolioSnapshotEntity> findByPortfolioIdOrderBySnapshotDateAsc(UUID portfolioId);
    Optional<PortfolioSnapshotEntity> findTopByPortfolioIdOrderBySnapshotDateDesc(UUID portfolioId);
    boolean existsByPortfolioIdAndSnapshotDate(UUID portfolioId, LocalDate snapshotDate);
    void deleteByPortfolioId(UUID portfolioId);
}
