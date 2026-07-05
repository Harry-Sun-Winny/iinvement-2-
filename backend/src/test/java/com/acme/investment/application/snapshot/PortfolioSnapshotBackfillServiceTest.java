package com.acme.investment.application.snapshot;

import com.acme.investment.infrastructure.persistence.portfolio.PortfolioEntity;
import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotEntity;
import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotRepository;
import com.acme.investment.infrastructure.persistence.transaction.TransactionEntity;
import com.acme.investment.infrastructure.persistence.transaction.TransactionJpaRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
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
        PortfolioSnapshotBackfillService service = new PortfolioSnapshotBackfillService(snapshotRepository, transactionRepository);

        when(transactionRepository.findByPortfolioIdOrderByTransactionDateAsc(portfolioId)).thenReturn(List.of(
                transaction(portfolioId, "BUY", "2026-01-01", 10, 100, 5, 0),
                transaction(portfolioId, "SELL", "2026-01-02", 2, 120, 3, 20)
        ));

        service.runBackfill(portfolioId);

        verify(snapshotRepository).deleteByPortfolioId(portfolioId);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PortfolioSnapshotEntity>> snapshotsCaptor =
                ArgumentCaptor.forClass((Class<List<PortfolioSnapshotEntity>>) (Class<?>) List.class);
        verify(snapshotRepository).saveAll(snapshotsCaptor.capture());

        List<PortfolioSnapshotEntity> savedSnapshots = snapshotsCaptor.getValue();
        assertTrue(savedSnapshots.size() >= 2);

        PortfolioSnapshotEntity firstDay = savedSnapshots.get(0);
        assertEquals(LocalDate.of(2026, 1, 1), firstDay.getSnapshotDate());
        assertEquals(0, BigDecimal.valueOf(1005).compareTo(firstDay.getInvestedAmount()));
        assertEquals(0, BigDecimal.valueOf(995).compareTo(firstDay.getPortfolioValue()));

        PortfolioSnapshotEntity secondDay = savedSnapshots.get(1);
        assertEquals(LocalDate.of(2026, 1, 2), secondDay.getSnapshotDate());
        assertEquals(0, BigDecimal.valueOf(1005).compareTo(secondDay.getInvestedAmount()));
        assertEquals(0, BigDecimal.valueOf(772).compareTo(secondDay.getPortfolioValue()));
    }

    @Test
    void clearsSnapshotsWhenPortfolioHasNoTransactions() {
        UUID portfolioId = UUID.randomUUID();
        PortfolioSnapshotRepository snapshotRepository = mock(PortfolioSnapshotRepository.class);
        TransactionJpaRepository transactionRepository = mock(TransactionJpaRepository.class);
        PortfolioSnapshotBackfillService service = new PortfolioSnapshotBackfillService(snapshotRepository, transactionRepository);

        when(transactionRepository.findByPortfolioIdOrderByTransactionDateAsc(portfolioId)).thenReturn(List.of());

        service.runBackfill(portfolioId);

        verify(snapshotRepository).deleteByPortfolioId(portfolioId);
        verify(snapshotRepository, never()).saveAll(Mockito.<List<PortfolioSnapshotEntity>>any());
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
        entity.setType(type);
        entity.setTransactionDate(LocalDate.parse(date));
        entity.setQuantity(BigDecimal.valueOf(quantity));
        entity.setPrice(BigDecimal.valueOf(price));
        entity.setFee(BigDecimal.valueOf(fee));
        entity.setRealizedPnl(BigDecimal.valueOf(realizedPnl));
        return entity;
    }
}
