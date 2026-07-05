package com.acme.investment.infrastructure.persistence.snapshot;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PortfolioSnapshotRepository extends JpaRepository<PortfolioSnapshotEntity, UUID> {
    List<PortfolioSnapshotEntity> findByPortfolioIdOrderBySnapshotDateAsc(UUID portfolioId);
    
    Optional<PortfolioSnapshotEntity> findTopByPortfolioIdOrderBySnapshotDateDesc(UUID portfolioId);

    Optional<PortfolioSnapshotEntity> findByPortfolioIdAndSnapshotDate(UUID portfolioId, LocalDate snapshotDate);

    boolean existsByPortfolioIdAndSnapshotDate(UUID portfolioId, LocalDate snapshotDate);

    @Query("SELECT s FROM PortfolioSnapshotEntity s WHERE s.portfolioId = :portfolioId AND s.snapshotDate >= :startDate ORDER BY s.snapshotDate ASC")
    List<PortfolioSnapshotEntity> findByPortfolioIdAndStartDate(
            @Param("portfolioId") UUID portfolioId,
            @Param("startDate") LocalDate startDate);

    void deleteByPortfolioId(UUID portfolioId);

    @Transactional
    void deleteByPortfolioIdAndSnapshotDateGreaterThanEqual(UUID portfolioId, LocalDate snapshotDate);
}
