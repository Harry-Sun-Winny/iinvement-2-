package com.acme.investment.infrastructure.persistence.transaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface TransactionJpaRepository extends JpaRepository<TransactionEntity, UUID> {
    @Query("SELECT t FROM TransactionEntity t WHERE t.portfolio.id = :portfolioId ORDER BY t.transactionDate DESC")
    List<TransactionEntity> findByPortfolioId(@Param("portfolioId") UUID portfolioId);

    List<TransactionEntity> findByPortfolioIdAndAssetSymbolOrderByTransactionDateAscCreatedAtAsc(
            UUID portfolioId, String assetSymbol);

    @Query("SELECT DISTINCT t.assetSymbol FROM TransactionEntity t WHERE t.portfolio.id = :portfolioId")
    List<String> findDistinctAssetSymbolsByPortfolioId(@Param("portfolioId") UUID portfolioId);

    List<TransactionEntity> findByPortfolioIdOrderByTransactionDateAsc(UUID portfolioId);
}