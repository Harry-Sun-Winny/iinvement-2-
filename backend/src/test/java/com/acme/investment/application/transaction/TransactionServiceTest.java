package com.acme.investment.application.transaction;

import com.acme.investment.application.audit.AuditLogService;
import com.acme.investment.application.holding.HoldingService;
import com.acme.investment.application.snapshot.PortfolioSnapshotBackfillService;
import com.acme.investment.application.taxlot.TaxLotService;
import com.acme.investment.domain.transaction.Transaction;
import com.acme.investment.infrastructure.persistence.UserEntity;
import com.acme.investment.infrastructure.persistence.asset.AssetEntity;
import com.acme.investment.infrastructure.persistence.asset.AssetJpaRepository;
import com.acme.investment.infrastructure.persistence.portfolio.PortfolioEntity;
import com.acme.investment.infrastructure.persistence.portfolio.PortfolioJpaRepository;
import com.acme.investment.infrastructure.persistence.transaction.TransactionEntity;
import com.acme.investment.infrastructure.persistence.transaction.TransactionJpaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.NOT_FOUND;

class TransactionServiceTest {

    @Test
    void createTriggersHoldingAuditAndSnapshotRebuild() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();
        TransactionJpaRepository transactionRepo = mock(TransactionJpaRepository.class);
        PortfolioJpaRepository portfolioRepo = mock(PortfolioJpaRepository.class);
        AssetJpaRepository assetRepo = mock(AssetJpaRepository.class);
        AuditLogService auditLogService = mock(AuditLogService.class);
        HoldingService holdingService = mock(HoldingService.class);
        TaxLotService taxLotService = mock(TaxLotService.class);
        PortfolioSnapshotBackfillService snapshotBackfillService = mock(PortfolioSnapshotBackfillService.class);

        TransactionService service = new TransactionService(
                transactionRepo,
                portfolioRepo,
                assetRepo,
                auditLogService,
                holdingService,
                taxLotService,
                snapshotBackfillService
        );

        PortfolioEntity portfolio = portfolio(portfolioId, userId);
        AssetEntity asset = asset("AAPL", "Apple", "USD");

        when(portfolioRepo.findById(portfolioId)).thenReturn(Optional.of(portfolio));
        when(assetRepo.findBySymbolIgnoreCase("aapl")).thenReturn(Optional.of(asset));
        when(transactionRepo.save(any(TransactionEntity.class))).thenAnswer(invocation -> {
            TransactionEntity saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", transactionId);
            ReflectionTestUtils.setField(saved, "createdAt", OffsetDateTime.now());
            return saved;
        });
        doNothing().when(holdingService).recalculate(portfolioId);
        doNothing().when(snapshotBackfillService).runIncrementalBackfillAsync(eq(portfolioId), any(LocalDate.class));

        Transaction transaction = service.create(
                portfolioId,
                userId,
                "aapl",
                "Apple",
                "buy",
                BigDecimal.TEN,
                BigDecimal.valueOf(100),
                "USD",
                LocalDate.of(2026, 7, 5),
                "test"
        );

        assertEquals(transactionId, transaction.id());
        verify(taxLotService).recomputeForSymbol(portfolioId, "AAPL");
        verify(holdingService).recalculate(portfolioId);
        verify(snapshotBackfillService).runIncrementalBackfillAsync(eq(portfolioId), eq(LocalDate.of(2026, 7, 5)));
        verify(auditLogService).log(eq(userId), eq("TRANSACTION"), eq(transactionId), eq("CREATE"), eq(null), anyMap());
    }

    @Test
    void deleteTriggersHoldingAuditAndSnapshotRebuild() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();
        TransactionJpaRepository transactionRepo = mock(TransactionJpaRepository.class);
        PortfolioJpaRepository portfolioRepo = mock(PortfolioJpaRepository.class);
        AssetJpaRepository assetRepo = mock(AssetJpaRepository.class);
        AuditLogService auditLogService = mock(AuditLogService.class);
        HoldingService holdingService = mock(HoldingService.class);
        TaxLotService taxLotService = mock(TaxLotService.class);
        PortfolioSnapshotBackfillService snapshotBackfillService = mock(PortfolioSnapshotBackfillService.class);

        TransactionService service = new TransactionService(
                transactionRepo,
                portfolioRepo,
                assetRepo,
                auditLogService,
                holdingService,
                taxLotService,
                snapshotBackfillService
        );

        TransactionEntity existing = transactionEntity(transactionId, portfolioId, userId);
        when(transactionRepo.findById(transactionId)).thenReturn(Optional.of(existing));
        doNothing().when(transactionRepo).delete(existing);

        service.delete(transactionId, userId, portfolioId);

        verify(taxLotService).recomputeForSymbol(portfolioId, "AAPL");
        verify(holdingService).recalculate(portfolioId);
        verify(snapshotBackfillService).runIncrementalBackfillAsync(eq(portfolioId), eq(LocalDate.of(2026, 7, 1)));
        verify(auditLogService).log(eq(userId), eq("TRANSACTION"), eq(transactionId), eq("DELETE"), anyMap(), eq(null));
    }

    @Test
    void updateTriggersHoldingAuditAndSnapshotRebuild() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();
        TransactionJpaRepository transactionRepo = mock(TransactionJpaRepository.class);
        PortfolioJpaRepository portfolioRepo = mock(PortfolioJpaRepository.class);
        AssetJpaRepository assetRepo = mock(AssetJpaRepository.class);
        AuditLogService auditLogService = mock(AuditLogService.class);
        HoldingService holdingService = mock(HoldingService.class);
        TaxLotService taxLotService = mock(TaxLotService.class);
        PortfolioSnapshotBackfillService snapshotBackfillService = mock(PortfolioSnapshotBackfillService.class);

        TransactionService service = new TransactionService(
                transactionRepo,
                portfolioRepo,
                assetRepo,
                auditLogService,
                holdingService,
                taxLotService,
                snapshotBackfillService
        );

        TransactionEntity existing = transactionEntity(transactionId, portfolioId, userId);
        when(transactionRepo.findById(transactionId)).thenReturn(Optional.of(existing));
        when(transactionRepo.save(any(TransactionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Transaction transaction = service.update(
                transactionId,
                userId,
                portfolioId,
                "msft",
                "Microsoft",
                "sell",
                BigDecimal.ONE,
                BigDecimal.valueOf(200),
                "USD",
                LocalDate.of(2026, 7, 6),
                "updated"
        );

        assertEquals("MSFT", transaction.assetSymbol());
        verify(taxLotService).recomputeForSymbol(portfolioId, "AAPL");
        verify(taxLotService).recomputeForSymbol(portfolioId, "msft");
        verify(holdingService).recalculate(portfolioId);
        verify(snapshotBackfillService).runIncrementalBackfillAsync(eq(portfolioId), eq(LocalDate.of(2026, 7, 1)));
        verify(auditLogService).log(eq(userId), eq("TRANSACTION"), eq(transactionId), eq("UPDATE"), anyMap(), anyMap());
    }

    @Test
    void createDoesNotTriggerSnapshotWhenPortfolioDoesNotBelongToUser() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        TransactionJpaRepository transactionRepo = mock(TransactionJpaRepository.class);
        PortfolioJpaRepository portfolioRepo = mock(PortfolioJpaRepository.class);
        AssetJpaRepository assetRepo = mock(AssetJpaRepository.class);
        AuditLogService auditLogService = mock(AuditLogService.class);
        HoldingService holdingService = mock(HoldingService.class);
        TaxLotService taxLotService = mock(TaxLotService.class);
        PortfolioSnapshotBackfillService snapshotBackfillService = mock(PortfolioSnapshotBackfillService.class);

        TransactionService service = new TransactionService(
                transactionRepo,
                portfolioRepo,
                assetRepo,
                auditLogService,
                holdingService,
                taxLotService,
                snapshotBackfillService
        );

        when(portfolioRepo.findById(portfolioId)).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.create(
                portfolioId,
                userId,
                "aapl",
                "Apple",
                "buy",
                BigDecimal.ONE,
                BigDecimal.ONE,
                "USD",
                LocalDate.of(2026, 7, 5),
                null
        ));

        assertEquals(NOT_FOUND, error.getStatusCode());
        verify(snapshotBackfillService, never()).runIncrementalBackfillAsync(eq(portfolioId), any(LocalDate.class));
        verify(holdingService, never()).recalculate(portfolioId);
    }

    private PortfolioEntity portfolio(UUID portfolioId, UUID userId) {
        PortfolioEntity portfolio = new PortfolioEntity();
        UserEntity user = new UserEntity("tester@example.com", "hash", "Test User");
        ReflectionTestUtils.setField(user, "id", userId);
        ReflectionTestUtils.setField(portfolio, "id", portfolioId);
        portfolio.setUser(user);
        portfolio.setName("Growth");
        portfolio.setBaseCurrency("USD");
        portfolio.setType("STOCKS");
        return portfolio;
    }

    private AssetEntity asset(String symbol, String name, String currency) {
        AssetEntity asset = new AssetEntity();
        asset.setSymbol(symbol);
        asset.setName(name);
        asset.setCurrency(currency);
        asset.setAssetType("STOCK");
        return asset;
    }

    private TransactionEntity transactionEntity(UUID transactionId, UUID portfolioId, UUID userId) {
        TransactionEntity entity = new TransactionEntity();
        ReflectionTestUtils.setField(entity, "id", transactionId);
        entity.setPortfolio(portfolio(portfolioId, userId));
        entity.setAssetSymbol("AAPL");
        entity.setAssetName("Apple");
        entity.setType("BUY");
        entity.setQuantity(BigDecimal.ONE);
        entity.setPrice(BigDecimal.TEN);
        entity.setCurrency("USD");
        entity.setTransactionDate(LocalDate.of(2026, 7, 1));
        entity.setNotes("seed");
        return entity;
    }
}
