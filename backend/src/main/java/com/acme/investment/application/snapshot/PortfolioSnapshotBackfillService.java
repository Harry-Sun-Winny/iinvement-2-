package com.acme.investment.application.snapshot;

import com.acme.investment.application.market.MarketDataService;
import com.acme.investment.domain.market.HistoricalPrice;
import com.acme.investment.infrastructure.persistence.portfolio.PortfolioJpaRepository;
import com.acme.investment.infrastructure.persistence.portfolio.PortfolioEntity;
import com.acme.investment.infrastructure.persistence.asset.AssetEntity;
import com.acme.investment.infrastructure.persistence.asset.AssetJpaRepository;
import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotEntity;
import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotRepository;
import com.acme.investment.infrastructure.persistence.transaction.TransactionEntity;
import com.acme.investment.infrastructure.persistence.transaction.TransactionJpaRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;

@Service
public class PortfolioSnapshotBackfillService {

    private static final Logger log = LoggerFactory.getLogger(PortfolioSnapshotBackfillService.class);

    private final TransactionJpaRepository transactionRepo;
    private final PortfolioSnapshotRepository snapshotRepo;
    private final PortfolioJpaRepository portfolioRepo;
    private final AssetJpaRepository assetRepo;
    private final MarketDataService marketDataService;
    private final TransactionTemplate transactionTemplate;

    private final ScheduledExecutorService scheduler;
    private final Map<UUID, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();
    private final Map<UUID, LocalDate> pendingStartDates = new ConcurrentHashMap<>();
    private final Map<UUID, Long> taskGenerations = new ConcurrentHashMap<>();
    private final Object lock = new Object();

    // Concurrent map to track backfilling status per portfolio
    private final Map<UUID, Boolean> activeBackfills = new ConcurrentHashMap<>();

    public PortfolioSnapshotBackfillService(TransactionJpaRepository transactionRepo,
                                            PortfolioSnapshotRepository snapshotRepo,
                                            PortfolioJpaRepository portfolioRepo,
                                            AssetJpaRepository assetRepo,
                                            MarketDataService marketDataService,
                                            PlatformTransactionManager transactionManager,
                                            @Value("${app.backfill.scheduler.pool-size:2}") int poolSize) {
        this.transactionRepo = transactionRepo;
        this.snapshotRepo = snapshotRepo;
        this.portfolioRepo = portfolioRepo;
        this.assetRepo = assetRepo;
        this.marketDataService = marketDataService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.scheduler = Executors.newScheduledThreadPool(poolSize);
    }

    public boolean isCurrentlyBackfilling(UUID portfolioId) {
        return activeBackfills.getOrDefault(portfolioId, false);
    }

    @PreDestroy
    public void shutdownScheduler() {
        log.info("Shutting down PortfolioSnapshotBackfillService scheduler pool...");
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    public void runIncrementalBackfillAsync(UUID portfolioId) {
        runIncrementalBackfillAsync(portfolioId, LocalDate.now());
    }

    @Async
    public void runIncrementalBackfillAsync(UUID portfolioId, LocalDate startDate) {
        synchronized (lock) {
            // Coalesce start dates to calculate from the oldest changed transaction date
            pendingStartDates.merge(portfolioId, startDate, 
                (oldDate, newDate) -> newDate.isBefore(oldDate) ? newDate : oldDate);

            // Increment generation count
            long generation = taskGenerations.merge(portfolioId, 1L, Long::sum);
            final long currentGen = generation;

            ScheduledFuture<?> pendingTask = scheduledTasks.get(portfolioId);
            if (pendingTask != null) {
                pendingTask.cancel(false);
            }

            try {
                ScheduledFuture<?> newTask = scheduler.schedule(() -> {
                    LocalDate dateToUse = null;
                    try {
                        synchronized (lock) {
                            if (currentGen == taskGenerations.getOrDefault(portfolioId, -1L)) {
                                scheduledTasks.remove(portfolioId);
                                taskGenerations.remove(portfolioId);
                                dateToUse = pendingStartDates.remove(portfolioId);
                            }
                        }
                        if (dateToUse != null) {
                            executeBackfillWithRetry(portfolioId, dateToUse);
                        }
                    } catch (Exception e) {
                        log.error("Unhandled exception during backfill for portfolio {}", portfolioId, e);
                    }
                }, 500, TimeUnit.MILLISECONDS);

                scheduledTasks.put(portfolioId, newTask);
            } catch (RejectedExecutionException ree) {
                log.warn("Backfill task scheduling was rejected because scheduler is shutting down. PortfolioId: {}", portfolioId, ree);
                synchronized (lock) {
                    pendingStartDates.remove(portfolioId);
                    taskGenerations.remove(portfolioId);
                }
            }
        }
    }

    public void executeBackfillWithRetry(UUID portfolioId, LocalDate startDate) {
        int maxAttempts = 2;
        int attempt = 0;
        Exception lastException = null;
        
        while (attempt < maxAttempts) {
            try {
                // Execute the ENTIRE backfill operation in a single transaction block.
                transactionTemplate.executeWithoutResult(status -> {
                    runBackfill(portfolioId, startDate);
                });
                log.info("Backfill succeeded for portfolio {} starting from {} on attempt {}", portfolioId, startDate, attempt + 1);
                return;
            } catch (Exception e) {
                if (!isTransientException(e)) {
                    log.error("CRITICAL: Backfill failed due to a permanent error for portfolio {} starting from {}: {}", 
                            portfolioId, startDate, e.getMessage(), e);
                    return; // Fail immediately on permanent errors
                }
                attempt++;
                lastException = e;
                log.warn("Backfill attempt {} failed due to a transient error for portfolio {} starting from {}: {}", attempt, portfolioId, startDate, e.getMessage());
                if (attempt < maxAttempts) {
                    try {
                        Thread.sleep(1000); // 1-second backoff before retry
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        log.error("CRITICAL: Backfill failed completely for portfolio {} starting from {} after {} attempts", 
                portfolioId, startDate, maxAttempts, lastException);
    }

    private boolean isTransientException(Exception e) {
        if (e instanceof IllegalArgumentException || 
            e instanceof jakarta.persistence.EntityNotFoundException ||
            e instanceof org.springframework.web.server.ResponseStatusException ||
            e instanceof org.springframework.dao.DataIntegrityViolationException) {
            return false;
        }
        
        Throwable cause = e;
        while (cause != null) {
            if (cause instanceof java.io.IOException || 
                cause instanceof org.springframework.dao.TransientDataAccessException ||
                (cause.getMessage() != null && (cause.getMessage().contains("timeout") || cause.getMessage().contains("rate limit") || cause.getMessage().contains("429") || cause.getMessage().contains("502") || cause.getMessage().contains("503")))) {
                return true;
            }
            cause = cause.getCause();
        }
        return false; // Default to treating unknown exceptions as permanent (fail-fast)
    }

    public void runBackfill(UUID portfolioId) {
        runBackfill(portfolioId, LocalDate.of(1970, 1, 1));
    }

    public void runBackfill(UUID portfolioId, LocalDate limitStartDate) {
        if (activeBackfills.putIfAbsent(portfolioId, true) != null) {
            return;
        }
        try {
            if (!portfolioRepo.existsById(portfolioId)) return;

            PortfolioEntity portfolio = portfolioRepo.findById(portfolioId).orElse(null);
            String baseCurrency = (portfolio != null && portfolio.getBaseCurrency() != null) ? portfolio.getBaseCurrency().trim().toUpperCase() : "USD";

            List<TransactionEntity> chronologicalTxns = transactionRepo.findByPortfolioId(portfolioId);
            if (chronologicalTxns.isEmpty()) return;
            
            chronologicalTxns.sort(Comparator.comparing(TransactionEntity::getTransactionDate)
                    .thenComparing(TransactionEntity::getCreatedAt));

            LocalDate firstTxDate = chronologicalTxns.get(0).getTransactionDate();
            LocalDate startDate = limitStartDate.isBefore(firstTxDate) ? firstTxDate : limitStartDate;
            LocalDate endDate = LocalDate.now();

            // Delete snapshots from startDate onwards
            snapshotRepo.deleteByPortfolioIdAndSnapshotDateGreaterThanEqual(portfolioId, startDate);

            // Cache historical prices locally to avoid N+1 REST/API queries
            Map<String, Map<LocalDate, BigDecimal>> priceHistoryCache = new HashMap<>();
            Set<String> symbols = new HashSet<>();
            for (TransactionEntity t : chronologicalTxns) {
                symbols.add(t.getAssetSymbol().toUpperCase());
            }

            for (String symbol : symbols) {
                try {
                    List<HistoricalPrice> history = marketDataService.getHistoricalPrices(symbol);
                    Map<LocalDate, BigDecimal> priceMap = new HashMap<>();
                    for (HistoricalPrice hp : history) {
                        priceMap.put(hp.getDate(), hp.getClose());
                    }
                    priceHistoryCache.put(symbol, priceMap);
                } catch (Exception e) {
                    priceHistoryCache.put(symbol, Collections.emptyMap());
                }
            }

            // Map symbols to currencies
            Map<String, String> symbolCurrencies = new HashMap<>();
            for (String symbol : symbols) {
                symbolCurrencies.put(symbol, resolveSymbolCurrency(symbol));
            }

            // Cache FX rates
            Map<String, Map<LocalDate, BigDecimal>> fxHistoryCache = new HashMap<>();
            for (String assetCurrency : new HashSet<>(symbolCurrencies.values())) {
                if (!assetCurrency.equalsIgnoreCase(baseCurrency)) {
                    try {
                        List<HistoricalPrice> rateHistory = marketDataService.getHistoricalPrices(assetCurrency + baseCurrency + "=X");
                        Map<LocalDate, BigDecimal> rateMap = new HashMap<>();
                        for (HistoricalPrice hp : rateHistory) {
                            rateMap.put(hp.getDate(), hp.getClose());
                        }
                        fxHistoryCache.put(assetCurrency, rateMap);
                    } catch (Exception e) {
                        log.warn("Failed to fetch FX rates for {}{}=X: {}", assetCurrency, baseCurrency, e.getMessage());
                        fxHistoryCache.put(assetCurrency, Collections.emptyMap());
                    }
                }
            }

            // Loop day-by-day starting from startDate
            LocalDate current = startDate;
            while (!current.isAfter(endDate)) {
                // Recompute holdings up to current day
                Map<String, BigDecimal> holdingsQty = new HashMap<>();
                Map<String, BigDecimal> holdingsCost = new HashMap<>();
                BigDecimal totalRealizedPnl = BigDecimal.ZERO;

                for (TransactionEntity t : chronologicalTxns) {
                    if (t.getTransactionDate().isAfter(current)) {
                        break;
                    }
                    BigDecimal qty = t.getQuantity();
                    BigDecimal price = t.getPrice();
                    BigDecimal fee = t.getFee() != null ? t.getFee() : BigDecimal.ZERO;
                    String sym = t.getAssetSymbol().toUpperCase();

                    if ("BUY".equalsIgnoreCase(t.getType())) {
                        holdingsQty.put(sym, holdingsQty.getOrDefault(sym, BigDecimal.ZERO).add(qty));
                        holdingsCost.put(sym, holdingsCost.getOrDefault(sym, BigDecimal.ZERO).add(qty.multiply(price).add(fee)));
                    } else if ("SELL".equalsIgnoreCase(t.getType())) {
                        BigDecimal currentQty = holdingsQty.getOrDefault(sym, BigDecimal.ZERO);
                        if (currentQty.compareTo(BigDecimal.ZERO) > 0) {
                            BigDecimal avgCostPerShare = holdingsCost.getOrDefault(sym, BigDecimal.ZERO).divide(currentQty, 8, java.math.RoundingMode.HALF_UP);
                            holdingsQty.put(sym, currentQty.subtract(qty));
                            holdingsCost.put(sym, holdingsCost.get(sym).subtract(qty.multiply(avgCostPerShare)));
                        }
                        totalRealizedPnl = totalRealizedPnl.add(t.getRealizedPnl() != null ? t.getRealizedPnl() : BigDecimal.ZERO);
                    }
                }

                // Holdings-only: purchases are externally funded and sale
                // proceeds leave the positions. No cash account is tracked.
                BigDecimal totalValue = BigDecimal.ZERO;
                BigDecimal totalCost = BigDecimal.ZERO;

                for (Map.Entry<String, BigDecimal> entry : holdingsQty.entrySet()) {
                    String sym = entry.getKey();
                    BigDecimal qty = entry.getValue();
                    if (qty.compareTo(BigDecimal.ZERO) <= 0) continue;

                    BigDecimal priceOnDate = null;
                    Map<LocalDate, BigDecimal> history = priceHistoryCache.get(sym);
                    if (history != null) {
                        priceOnDate = history.get(current);
                        if (priceOnDate == null) {
                            LocalDate lookback = current;
                            for (int i = 0; i < 7; i++) {
                                lookback = lookback.minusDays(1);
                                if (history.containsKey(lookback)) {
                                    priceOnDate = history.get(lookback);
                                    break;
                                }
                            }
                        }
                    }

                    if (priceOnDate == null) {
                        BigDecimal cost = holdingsCost.getOrDefault(sym, BigDecimal.ZERO);
                        priceOnDate = cost.divide(qty, 8, java.math.RoundingMode.HALF_UP);
                    } else {
                        // Apply currency conversion
                        String assetCurrency = symbolCurrencies.getOrDefault(sym, "USD");
                        if (!assetCurrency.equalsIgnoreCase(baseCurrency)) {
                            Map<LocalDate, BigDecimal> rateHistory = fxHistoryCache.get(assetCurrency);
                            BigDecimal rateOnDate = null;
                            if (rateHistory != null) {
                                rateOnDate = rateHistory.get(current);
                                if (rateOnDate == null) {
                                    LocalDate lookback = current;
                                    for (int i = 0; i < 7; i++) {
                                        lookback = lookback.minusDays(1);
                                        if (rateHistory.containsKey(lookback)) {
                                            rateOnDate = rateHistory.get(lookback);
                                            break;
                                        }
                                    }
                                }
                            }
                            if (rateOnDate == null) {
                                rateOnDate = BigDecimal.ONE;
                            }
                            priceOnDate = priceOnDate.multiply(rateOnDate);
                        }
                    }

                    totalValue = totalValue.add(qty.multiply(priceOnDate));
                    totalCost = totalCost.add(holdingsCost.getOrDefault(sym, BigDecimal.ZERO));
                }

                // Update or create EOD snapshot
                final LocalDate snapshotDate = current;
                PortfolioSnapshotEntity snapshot = snapshotRepo.findByPortfolioIdAndSnapshotDate(portfolioId, snapshotDate)
                        .orElseGet(() -> {
                            PortfolioSnapshotEntity s = new PortfolioSnapshotEntity();
                            s.setPortfolioId(portfolioId);
                            s.setSnapshotDate(snapshotDate);
                            return s;
                        });

                snapshot.setTotalValue(totalValue);
                snapshot.setTotalCost(totalCost);
                snapshot.setCashBalance(BigDecimal.ZERO);
                snapshot.setRealizedPnl(totalRealizedPnl);
                snapshot.setUnrealizedPnl(totalValue.subtract(totalCost));
                snapshotRepo.save(snapshot);

                current = current.plusDays(1);
            }
        } finally {
            activeBackfills.remove(portfolioId);
        }
    }

    private String resolveSymbolCurrency(String symbol) {
        if (symbol == null) return "USD";
        symbol = symbol.toUpperCase().trim();
        if (symbol.contains(".")) {
            if (symbol.endsWith(".KS")) return "KRW";
            if (symbol.endsWith(".HK")) return "HKD";
            if (symbol.endsWith(".TW") || symbol.endsWith(".TWO")) return "TWD";
            if (symbol.endsWith(".AS")) return "EUR";
            if (symbol.endsWith(".DE")) return "EUR";
            if (symbol.endsWith(".VN")) return "VND";
            if (symbol.endsWith(".T")) return "JPY";
            if (symbol.endsWith(".SS")) return "CNY";
        }
        return assetRepo.findBySymbolIgnoreCase(symbol)
                .map(AssetEntity::getCurrency)
                .map(String::trim)
                .map(String::toUpperCase)
                .orElse("USD");
    }
}
