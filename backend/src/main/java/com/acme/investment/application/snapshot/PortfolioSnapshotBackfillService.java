package com.acme.investment.application.snapshot;

import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotEntity;
import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotRepository;
import com.acme.investment.infrastructure.persistence.transaction.TransactionEntity;
import com.acme.investment.infrastructure.persistence.transaction.TransactionJpaRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PortfolioSnapshotBackfillService {

    private final PortfolioSnapshotRepository snapshotRepository;
    private final TransactionJpaRepository transactionRepository;
    private final Set<UUID> runningPortfolioIds = ConcurrentHashMap.newKeySet();

    public PortfolioSnapshotBackfillService(
            PortfolioSnapshotRepository snapshotRepository,
            TransactionJpaRepository transactionRepository
    ) {
        this.snapshotRepository = snapshotRepository;
        this.transactionRepository = transactionRepository;
    }

    public boolean isCurrentlyBackfilling(UUID portfolioId) {
        return runningPortfolioIds.contains(portfolioId);
    }

    @Async
    public void runIncrementalBackfillAsync(UUID portfolioId) {
        if (!runningPortfolioIds.add(portfolioId)) {
            return;
        }

        try {
            runBackfill(portfolioId);
        } finally {
            runningPortfolioIds.remove(portfolioId);
        }
    }

    @Transactional
    public void runBackfill(UUID portfolioId) {
        List<TransactionEntity> txs = transactionRepository.findByPortfolioIdOrderByTransactionDateAsc(portfolioId);
        snapshotRepository.deleteByPortfolioId(portfolioId);
        if (txs.isEmpty()) {
            return;
        }

        LocalDate startDate = txs.get(0).getTransactionDate();
        LocalDate endDate = LocalDate.now();

        BigDecimal cumulativeInvested = BigDecimal.ZERO;
        BigDecimal cumulativeValue = BigDecimal.ZERO;
        int txIndex = 0;
        List<PortfolioSnapshotEntity> rebuiltSnapshots = new ArrayList<>();

        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            while (txIndex < txs.size()) {
                TransactionEntity tx = txs.get(txIndex);
                LocalDate txDate = tx.getTransactionDate();
                if (txDate.isAfter(date)) {
                    break;
                }

                BigDecimal quantity = nvl(tx.getQuantity());
                BigDecimal price = nvl(tx.getPrice());
                BigDecimal gross = price.multiply(quantity);
                BigDecimal fee = nvl(tx.getFee());
                BigDecimal realizedPnl = nvl(tx.getRealizedPnl());

                String side = tx.getType() == null ? "" : tx.getType().toUpperCase(Locale.ROOT);

                switch (side) {
                    case "BUY" -> {
                        cumulativeInvested = cumulativeInvested.add(gross).add(fee);
                        cumulativeValue = cumulativeValue.add(gross).subtract(fee);
                    }
                    case "SELL" -> cumulativeValue = cumulativeValue.subtract(gross).subtract(fee).add(realizedPnl);
                    case "DEPOSIT" -> {
                        cumulativeInvested = cumulativeInvested.add(gross).add(fee);
                        cumulativeValue = cumulativeValue.add(gross);
                    }
                    case "WITHDRAW" -> cumulativeValue = cumulativeValue.subtract(gross).subtract(fee);
                    default -> cumulativeValue = cumulativeValue.add(gross).subtract(fee).add(realizedPnl);
                }

                txIndex++;
            }

            PortfolioSnapshotEntity snapshot = new PortfolioSnapshotEntity();
            snapshot.setPortfolioId(portfolioId);
            snapshot.setSnapshotDate(date);
            snapshot.setInvestedAmount(cumulativeInvested.max(BigDecimal.ZERO));
            snapshot.setPortfolioValue(cumulativeValue.max(BigDecimal.ZERO));
            snapshot.setCashBalance(BigDecimal.ZERO);
            snapshot.setCreatedAt(OffsetDateTime.now());
            rebuiltSnapshots.add(snapshot);
        }

        snapshotRepository.saveAll(rebuiltSnapshots);
    }

    private BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
