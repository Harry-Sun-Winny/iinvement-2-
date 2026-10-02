package com.acme.investment.application.snapshot;

import com.acme.investment.application.market.MarketDataService;
import com.acme.investment.domain.market.HistoricalPrice;
import com.acme.investment.infrastructure.persistence.portfolio.PortfolioEntity;
import com.acme.investment.infrastructure.persistence.portfolio.PortfolioJpaRepository;
import com.acme.investment.infrastructure.persistence.asset.AssetJpaRepository;
import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotEntity;
import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotRepository;
import com.acme.investment.infrastructure.persistence.transaction.TransactionEntity;
import com.acme.investment.infrastructure.persistence.transaction.TransactionJpaRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PortfolioSnapshotBackfillServiceTest {

    @Test
    void rebuildsSnapshotsFromTransactionsInsteadOfKeepingStaleRows() {
        UUID portfolioId = UUID.randomUUID();
        PortfolioSnapshotRepository snapshotRepository = mock(PortfolioSnapshotRepository.class);
        TransactionJpaRepository transactionRepository = mock(TransactionJpaRepository.class);
        PortfolioJpaRepository portfolioRepository = mock(PortfolioJpaRepository.class);
        AssetJpaRepository assetRepository = mock(AssetJpaRepository.class);
        MarketDataService marketDataService = mock(MarketDataService.class);
        PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);

        PortfolioSnapshotBackfillService service = new PortfolioSnapshotBackfillService(
                transactionRepository,
                snapshotRepository,
                portfolioRepository,
                assetRepository,
                marketDataService,
                transactionManager,
                2
        );

        when(portfolioRepository.existsById(portfolioId)).thenReturn(true);
        when(transactionRepository.findByPortfolioId(portfolioId)).thenReturn(new ArrayList<>(List.of(
                transaction(portfolioId, "BUY", "2026-01-01", 10, 100, 5, 0),
                transaction(portfolioId, "SELL", "2026-01-02", 2, 120, 3, 20)
        )));

        // Mock historical market prices
        when(marketDataService.getHistoricalPrices("TEST")).thenReturn(List.of(
                new HistoricalPrice(LocalDate.of(2026, 1, 1), BigDecimal.valueOf(100)),
                new HistoricalPrice(LocalDate.of(2026, 1, 2), BigDecimal.valueOf(120))
        ));

        service.runBackfill(portfolioId);

        verify(snapshotRepository).deleteByPortfolioIdAndSnapshotDateGreaterThanEqual(portfolioId, LocalDate.of(2026, 1, 1));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<PortfolioSnapshotEntity> snapshotCaptor = ArgumentCaptor.forClass(PortfolioSnapshotEntity.class);
        verify(snapshotRepository, Mockito.atLeastOnce()).save(snapshotCaptor.capture());

        List<PortfolioSnapshotEntity> savedSnapshots = snapshotCaptor.getAllValues();
        assertTrue(savedSnapshots.size() >= 2);

        PortfolioSnapshotEntity firstDay = savedSnapshots.get(0);
        assertEquals(LocalDate.of(2026, 1, 1), firstDay.getSnapshotDate());
        assertEquals(0, BigDecimal.valueOf(1005).compareTo(firstDay.getTotalCost()));
        assertEquals(0, BigDecimal.valueOf(1000).compareTo(firstDay.getTotalValue()));
        assertEquals(0, BigDecimal.ZERO.compareTo(firstDay.getCashBalance()));

        PortfolioSnapshotEntity secondDay = savedSnapshots.get(1);
        assertEquals(LocalDate.of(2026, 1, 2), secondDay.getSnapshotDate());
        assertEquals(0, BigDecimal.valueOf(804).compareTo(secondDay.getTotalCost()));
        assertEquals(0, BigDecimal.valueOf(960).compareTo(secondDay.getTotalValue()));
        assertEquals(0, BigDecimal.ZERO.compareTo(secondDay.getCashBalance()));
    }

    @Test
    void clearsSnapshotsWhenPortfolioHasNoTransactions() {
        UUID portfolioId = UUID.randomUUID();
        PortfolioSnapshotRepository snapshotRepository = mock(PortfolioSnapshotRepository.class);
        TransactionJpaRepository transactionRepository = mock(TransactionJpaRepository.class);
        PortfolioJpaRepository portfolioRepository = mock(PortfolioJpaRepository.class);
        AssetJpaRepository assetRepository = mock(AssetJpaRepository.class);
        MarketDataService marketDataService = mock(MarketDataService.class);
        PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);

        PortfolioSnapshotBackfillService service = new PortfolioSnapshotBackfillService(
                transactionRepository,
                snapshotRepository,
                portfolioRepository,
                assetRepository,
                marketDataService,
                transactionManager,
                2
        );

        when(portfolioRepository.existsById(portfolioId)).thenReturn(true);
        when(transactionRepository.findByPortfolioId(portfolioId)).thenReturn(List.of());

        service.runBackfill(portfolioId);

        verify(snapshotRepository, never()).deleteByPortfolioIdAndSnapshotDateGreaterThanEqual(Mockito.any(), Mockito.any());
        verify(snapshotRepository, never()).save(Mockito.any(PortfolioSnapshotEntity.class));
    }

    private TransactionEntity transaction(
            UUID portfolioId,
            String type,
            String date,
            double quantity,
            double price,
            double fee,
            double realizedPnl
    ) {
        TransactionEntity entity = new TransactionEntity();
        PortfolioEntity portfolio = new PortfolioEntity();
        ReflectionTestUtils.setField(portfolio, "id", portfolioId);
        entity.setPortfolio(portfolio);
        entity.setAssetSymbol("TEST");
        entity.setType(type);
        entity.setTransactionDate(LocalDate.parse(date));
        entity.setQuantity(BigDecimal.valueOf(quantity));
        entity.setPrice(BigDecimal.valueOf(price));
        entity.setFee(BigDecimal.valueOf(fee));
        entity.setRealizedPnl(BigDecimal.valueOf(realizedPnl));
        return entity;
    }
}
