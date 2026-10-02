
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
import java.util.LinkedHashSet;
import java.util.ArrayList;
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
            LocalDate transactionDate, String notes, BigDecimal fee) {
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
        entity.setFee(fee != null ? fee : BigDecimal.ZERO);
        TransactionEntity saved = transactionRepo.save(entity);

        // Recompute FIFO tax lots before recalculating holdings
        taxLotService.recomputeForSymbol(portfolioId, assetEntity.getSymbol());
        holdingService.recalculate(portfolioId);
        auditLogService.log(userId, "TRANSACTION", saved.getId(), "CREATE", null, toAuditMap(saved));

        triggerBackfillAfterCommit(portfolioId, transactionDate);

        return saved.toDomain();
    }

    /**
     * Persists a pre-validated broker import atomically. Holding and tax-lot recalculation
     * intentionally happen once at the end of the batch; each created transaction remains audited.
     */
    @Transactional
    public List<Transaction> createBatch(UUID portfolioId, UUID userId,
            List<TransactionImportService.NormalizedImportRow> rows) {
        var portfolio = portfolioRepo.findById(portfolioId)
                .filter(p -> p.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (rows == null || rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không có giao dịch hợp lệ để nhập.");
        }

        var affectedSymbols = new LinkedHashSet<String>();
        LocalDate oldestDate = null;
        var imported = new java.util.ArrayList<Transaction>();
        for (var row : rows) {
            AssetEntity asset = resolveAsset(row.assetSymbol(), row.assetName(), row.currency());
            TransactionEntity entity = new TransactionEntity();
            entity.setPortfolio(portfolio);
            entity.setAssetSymbol(asset.getSymbol());
            entity.setAssetName(row.assetName());
            entity.setType(row.type());
            entity.setQuantity(row.quantity());
            entity.setPrice(row.price());
            entity.setCurrency(row.currency());
            entity.setTransactionDate(row.transactionDate());
            entity.setNotes(row.notes());
            entity.setFee(row.fee());
            TransactionEntity saved = transactionRepo.save(entity);
            affectedSymbols.add(asset.getSymbol());
            oldestDate = oldestDate == null || row.transactionDate().isBefore(oldestDate) ? row.transactionDate() : oldestDate;
            auditLogService.log(userId, "TRANSACTION", saved.getId(), "CREATE", null, toAuditMap(saved));
            imported.add(saved.toDomain());
        }
        affectedSymbols.forEach(symbol -> taxLotService.recomputeForSymbol(portfolioId, symbol));
        holdingService.recalculate(portfolioId);
        triggerBackfillAfterCommit(portfolioId, oldestDate);
        return List.copyOf(imported);
    }

    private AssetEntity resolveAsset(String assetSymbol, String assetName, String currency) {
        return assetRepo.findBySymbolIgnoreCase(assetSymbol).orElseGet(() -> {
            AssetEntity a = new AssetEntity();
            a.setSymbol(assetSymbol.toUpperCase());
            a.setName(assetName != null && !assetName.isBlank() ? assetName : assetSymbol);
            a.setAssetType("STOCK");
            a.setCurrency(currency != null ? currency : "USD");
            return assetRepo.save(a);
        });
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
            LocalDate transactionDate, String notes, BigDecimal fee) {
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
        entity.setFee(fee != null ? fee : BigDecimal.ZERO);
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

    /**
     * Moves the complete transaction history for one symbol between two portfolios.
     * Reassigning history preserves cost basis and does not manufacture taxable BUY/SELL events.
     */
    @Transactional
    public TransferResult transferSymbol(UUID sourcePortfolioId, UUID targetPortfolioId,
            UUID userId, String assetSymbol) {
        if (targetPortfolioId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target portfolio is required.");
        }
        if (sourcePortfolioId.equals(targetPortfolioId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Source and target portfolios must be different.");
        }

        var source = portfolioRepo.findById(sourcePortfolioId)
                .filter(p -> p.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var target = portfolioRepo.findById(targetPortfolioId)
                .filter(p -> p.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        String symbol = assetSymbol == null ? "" : assetSymbol.trim().toUpperCase();
        if (symbol.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Asset symbol is required.");
        }

        List<TransactionEntity> transactions = transactionRepo
                .findByPortfolioIdAndAssetSymbolOrderByTransactionDateAscCreatedAtAsc(sourcePortfolioId, symbol);
        if (transactions.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No transaction history was found for this symbol in the source portfolio.");
        }

        LocalDate oldestDate = transactions.get(0).getTransactionDate();
        var beforeStates = new ArrayList<Map<String, Object>>(transactions.size());
        transactions.forEach(transaction -> beforeStates.add(toAuditMap(transaction)));
        transactions.forEach(transaction -> transaction.setPortfolio(target));
        transactionRepo.saveAll(transactions);

        for (int index = 0; index < transactions.size(); index++) {
            TransactionEntity transaction = transactions.get(index);
            auditLogService.log(userId, "TRANSACTION", transaction.getId(), "TRANSFER",
                    beforeStates.get(index), toAuditMap(transaction));
        }

        taxLotService.recomputeForSymbol(sourcePortfolioId, symbol);
        taxLotService.recomputeForSymbol(targetPortfolioId, symbol);
        holdingService.recalculate(sourcePortfolioId);
        holdingService.recalculate(targetPortfolioId);
        triggerBackfillAfterCommit(sourcePortfolioId, oldestDate);
        triggerBackfillAfterCommit(targetPortfolioId, oldestDate);

        return new TransferResult(source.getId(), target.getId(), symbol, transactions.size());
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
                "portfolioId", entity.getPortfolio().getId(),
                "assetSymbol", entity.getAssetSymbol(),
                "type", entity.getType(),
                "quantity", entity.getQuantity(),
                "price", entity.getPrice(),
                "transactionDate", entity.getTransactionDate().toString(),
                "fee", entity.getFee()
        );
    }

    public record TransferResult(
            UUID sourcePortfolioId,
            UUID targetPortfolioId,
            String symbol,
            int transactionCount
    ) {}
}
