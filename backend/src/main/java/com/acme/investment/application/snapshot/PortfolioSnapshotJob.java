package com.acme.investment.application.snapshot;

import com.acme.investment.infrastructure.persistence.portfolio.PortfolioEntity;
import com.acme.investment.infrastructure.persistence.portfolio.PortfolioJpaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PortfolioSnapshotJob {
    private static final Logger log = LoggerFactory.getLogger(PortfolioSnapshotJob.class);

    private final PortfolioJpaRepository portfolioRepo;
    private final PortfolioSnapshotBackfillService backfillService;

    public PortfolioSnapshotJob(PortfolioJpaRepository portfolioRepo,
                                PortfolioSnapshotBackfillService backfillService) {
        this.portfolioRepo = portfolioRepo;
        this.backfillService = backfillService;
    }

    /**
     * Captures EOD snapshot at 6:00 PM every weekday (Mon-Fri)
     */
    @Scheduled(cron = "0 0 18 * * MON-FRI")
    public void captureEodSnapshots() {
        log.info("Starting daily portfolio snapshot scheduled job...");
        List<PortfolioEntity> portfolios = portfolioRepo.findAll();
        for (PortfolioEntity p : portfolios) {
            try {
                // Since this runs at EOD, we trigger an incremental backfill up to today
                backfillService.runIncrementalBackfillAsync(p.getId());
            } catch (Exception e) {
                log.error("Failed to capture snapshot for portfolio: {}", p.getId(), e);
            }
        }
        log.info("Daily portfolio snapshot job triggering complete.");
    }
}
