package com.acme.investment.application.transaction;

import com.acme.investment.application.audit.AuditLogService;
import com.acme.investment.application.holding.HoldingService;
import com.acme.investment.domain.transaction.Transaction;
import com.acme.investment.infrastructure.persistence.asset.AssetEntity;
import com.acme.investment.infrastructure.persistence.asset.AssetJpaRepository;
import com.acme.investment.infrastructure.persistence.portfolio.PortfolioJpaRepository;
import com.acme.investment.infrastructure.persistence.transaction.TransactionEntity;
import com.acme.investment.infrastructure.persistence.transaction.TransactionJpaRepository;
import com.acme.investment.application.taxlot.TaxLotService;
import com.acme.investment.application.snapshot.PortfolioSnapshotBackfillService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TransactionService {
    private final TransactionJpaRepository transactionRepo;
    private final PortfolioJpaRepository portfolioRepo;
    private final AssetJpaRepository assetRepo;
    private final AuditLogService auditLogService;
    private final HoldingService holdingService;
    private final TaxLotService taxLotService;
    private final PortfolioSnapshotBackfillService backfillService;

    public TransactionService(TransactionJpaRepository transactionRepo,
                              PortfolioJpaRepository portfolioRepo,
                              AssetJpaRepository assetRepo,
                              AuditLogService auditLogService,
                              HoldingService holdingService,
                              TaxLotService taxLotService,
                              PortfolioSnapshotBackfillService backfillService) {
        this.transactionRepo = transactionRepo;
        this.portfolioRepo = portfolioRepo;
        this.assetRepo = assetRepo;
        this.auditLogService = auditLogService;
        this.holdingService = holdingService;
        this.taxLotService = taxLotService;
        this.backfillService = backfillService;
    }

    @Transactional(readOnly = true)
    public List<Transaction> listByPortfolio(UUID portfolioId, UUID userId) {
        var portfolio = portfolioRepo.findById(portfolioId)
                .filter(p -> p.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return transactionRepo.findByPortfolioId(portfolio.getId())
                .stream().map(TransactionEntity::toDomain).toList();
    }

    @Transactional
    public Transaction create(UUID portfolioId, UUID userId, String assetSymbol, String assetName,
            String type, BigDecimal quantity, BigDecimal price, String currency,
            LocalDate transactionDate, String notes) {
        var portfolio = portfolioRepo.findById(portfolioId)
                .filter(p -> p.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        // Auto-create asset if not exists
        AssetEntity assetEntity = assetRepo.findBySymbolIgnoreCase(assetSymbol).orElseGet(() -> {
            AssetEntity a = new AssetEntity();
            a.setSymbol(assetSymbol.toUpperCase());
            a.setName(assetName != null && !assetName.isBlank() ? assetName : assetSymbol);
            a.setAssetType("STOCK");
            a.setCurrency(currency != null ? currency : "USD");
            return assetRepo.save(a);
        });
        String resolvedName = assetName != null && !assetName.isBlank() ? assetName : assetEntity.getName();

        var entity = new TransactionEntity();
        entity.setPortfolio(portfolio);
        entity.setAssetSymbol(assetEntity.getSymbol());
        entity.setAssetName(resolvedName);
        entity.setType(type.toUpperCase());
        entity.setQuantity(quantity);
        entity.setPrice(price);
        entity.setCurrency(currency);
        entity.setTransactionDate(transactionDate);
        entity.setNotes(notes);
        TransactionEntity saved = transactionRepo.save(entity);

        // Recompute FIFO tax lots before recalculating holdings
        taxLotService.recomputeForSymbol(portfolioId, assetEntity.getSymbol());
        holdingService.recalculate(portfolioId);
        auditLogService.log(userId, "TRANSACTION", saved.getId(), "CREATE", null, toAuditMap(saved));

        triggerBackfillAfterCommit(portfolioId, transactionDate);

        return saved.toDomain();
    }

    public Transaction getById(UUID id, UUID userId) {
        return transactionRepo.findById(id)
                .filter(t -> t.getPortfolio().getUser().getId().equals(userId))
                .map(TransactionEntity::toDomain)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Transactional
    public void delete(UUID id, UUID userId, UUID portfolioId) {
        var entity = transactionRepo.findById(id)
                .filter(t -> t.getPortfolio().getUser().getId().equals(userId))
                .filter(t -> t.getPortfolio().getId().equals(portfolioId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String symbol = entity.getAssetSymbol();
        LocalDate txDate = entity.getTransactionDate();
        Map<String, Object> before = toAuditMap(entity);
        transactionRepo.delete(entity);
        
        // Recompute FIFO tax lots after deletion
        taxLotService.recomputeForSymbol(portfolioId, symbol);
        holdingService.recalculate(portfolioId);
        auditLogService.log(userId, "TRANSACTION", id, "DELETE", before, null);

        triggerBackfillAfterCommit(portfolioId, txDate);
    }

    @Transactional
    public Transaction update(UUID id, UUID userId, UUID portfolioId,
            String assetSymbol, String assetName, String type,
            BigDecimal quantity, BigDecimal price, String currency,
            LocalDate transactionDate, String notes) {
        var entity = transactionRepo.findById(id)
                .filter(t -> t.getPortfolio().getUser().getId().equals(userId))
                .filter(t -> t.getPortfolio().getId().equals(portfolioId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String oldSymbol = entity.getAssetSymbol();
        LocalDate oldDate = entity.getTransactionDate();
        Map<String, Object> before = toAuditMap(entity);
        entity.setAssetSymbol(assetSymbol.toUpperCase());
        entity.setAssetName(assetName);
        entity.setType(type.toUpperCase());
        entity.setQuantity(quantity);
        entity.setPrice(price);
        entity.setCurrency(currency);
        entity.setTransactionDate(transactionDate);
        entity.setNotes(notes);
        TransactionEntity saved = transactionRepo.save(entity);
        
        // Recompute FIFO tax lots for both old and new symbols if symbol changed
        taxLotService.recomputeForSymbol(portfolioId, oldSymbol);
        if (!oldSymbol.equalsIgnoreCase(assetSymbol)) {
            taxLotService.recomputeForSymbol(portfolioId, assetSymbol);
        }
        holdingService.recalculate(portfolioId);
        auditLogService.log(userId, "TRANSACTION", saved.getId(), "UPDATE", before, toAuditMap(saved));

        LocalDate oldestDate = oldDate.isBefore(transactionDate) ? oldDate : transactionDate;
        triggerBackfillAfterCommit(portfolioId, oldestDate);

        return saved.toDomain();
    }

    private void triggerBackfillAfterCommit(UUID portfolioId, LocalDate startDate) {
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        backfillService.runIncrementalBackfillAsync(portfolioId, startDate);
                    }
                }
            );
        } else {
            backfillService.runIncrementalBackfillAsync(portfolioId, startDate);
        }
    }

    private Map<String, Object> toAuditMap(TransactionEntity entity) {
        return Map.of(
                "assetSymbol", entity.getAssetSymbol(),
                "type", entity.getType(),
                "quantity", entity.getQuantity(),
                "price", entity.getPrice(),
                "transactionDate", entity.getTransactionDate().toString()
        );
    }
}
