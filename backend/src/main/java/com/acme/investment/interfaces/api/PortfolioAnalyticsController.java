package com.acme.investment.interfaces.api;

import com.acme.investment.application.risk.PortfolioRiskMetricsService;
import com.acme.investment.application.risk.PortfolioDeepAnalysisService;
import com.acme.investment.application.portfolio.PortfolioService;
import com.acme.investment.application.snapshot.PortfolioSnapshotBackfillService;
import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotEntity;
import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotRepository;
import com.acme.investment.infrastructure.persistence.UserJpaRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/portfolios")
public class PortfolioAnalyticsController {

    private final PortfolioSnapshotBackfillService backfillService;
    private final PortfolioRiskMetricsService riskMetricsService;
    private final PortfolioDeepAnalysisService deepAnalysisService;
    private final PortfolioSnapshotRepository snapshotRepo;
    private final PortfolioService portfolioService;
    private final UserJpaRepository userRepo;

    public PortfolioAnalyticsController(
            PortfolioSnapshotBackfillService backfillService,
            PortfolioRiskMetricsService riskMetricsService,
            PortfolioDeepAnalysisService deepAnalysisService,
            PortfolioSnapshotRepository snapshotRepo,
            PortfolioService portfolioService,
            UserJpaRepository userRepo
    ) {
        this.backfillService = backfillService;
        this.riskMetricsService = riskMetricsService;
        this.deepAnalysisService = deepAnalysisService;
        this.snapshotRepo = snapshotRepo;
        this.portfolioService = portfolioService;
        this.userRepo = userRepo;
    }

    private UUID resolveUserId(UserDetails userDetails) {
        return userRepo.findByEmail(userDetails.getUsername()).orElseThrow().getId();
    }

    private void requireOwnedPortfolio(UUID portfolioId, UserDetails userDetails) {
        portfolioService.getById(portfolioId, resolveUserId(userDetails));
    }

    @PostMapping("/{id}/backfill")
    public ResponseEntity<Map<String, String>> triggerBackfill(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireOwnedPortfolio(id, userDetails);
        if (backfillService.isCurrentlyBackfilling(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "status", "CONFLICT",
                            "message", "Backfill operation is already running in background."
                    ));
        }

        backfillService.runIncrementalBackfillAsync(id);

        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of(
                        "status", "ACCEPTED",
                        "message", "Portfolio history backfill triggered successfully."
                ));
    }

    @GetMapping("/{id}/equity-curve")
    public ResponseEntity<List<PortfolioSnapshotEntity>> getEquityCurve(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireOwnedPortfolio(id, userDetails);
        return ResponseEntity.ok(snapshotRepo.findByPortfolioIdOrderBySnapshotDateAsc(id));
    }

    @GetMapping("/{id}/risk-metrics")
    public ResponseEntity<PortfolioRiskMetricsService.RiskMetrics> getRiskMetrics(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireOwnedPortfolio(id, userDetails);
        return ResponseEntity.ok(riskMetricsService.calculateMetrics(id));
    }

    @GetMapping("/{id}/deep-analysis")
    public ResponseEntity<PortfolioDeepAnalysisService.DeepAnalysisResponse> getDeepAnalysis(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireOwnedPortfolio(id, userDetails);
        return ResponseEntity.ok(deepAnalysisService.getDeepAnalysis(id));
    }
}
