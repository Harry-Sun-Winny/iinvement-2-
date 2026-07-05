package com.acme.investment.application.risk;

import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotEntity;
import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.when;

class PortfolioDeepAnalysisServiceTest {

    @Test
    void buildsOverviewAndRollingMetricsFromSnapshots() {
        UUID portfolioId = UUID.randomUUID();
        PortfolioSnapshotRepository repository = Mockito.mock(PortfolioSnapshotRepository.class);

        when(repository.findByPortfolioIdOrderBySnapshotDateAsc(portfolioId)).thenReturn(List.of(
                snapshot(portfolioId, LocalDate.of(2026, 1, 1), 1000, 1000, 50),
                snapshot(portfolioId, LocalDate.of(2026, 1, 2), 1000, 1025, 50),
                snapshot(portfolioId, LocalDate.of(2026, 1, 3), 1000, 990, 50),
                snapshot(portfolioId, LocalDate.of(2026, 1, 4), 1000, 1055, 50)
        ));

        PortfolioRiskMetricsService riskMetricsService = new PortfolioRiskMetricsService(repository);
        PortfolioDeepAnalysisService service = new PortfolioDeepAnalysisService(repository, riskMetricsService);

        PortfolioDeepAnalysisService.DeepAnalysisResponse response = service.getDeepAnalysis(portfolioId);

        assertEquals(4, response.overview().snapshotCount());
        assertEquals(0, BigDecimal.valueOf(1055).compareTo(response.overview().latestValue()));
        assertEquals(0, BigDecimal.valueOf(55).compareTo(response.overview().netGain()));
        assertFalse(response.rollingMetrics().isEmpty());
        assertEquals(4, response.drawdownSeries().size());
        assertEquals(3, response.methodologyNotes().size());
    }

    private PortfolioSnapshotEntity snapshot(
            UUID portfolioId,
            LocalDate date,
            double investedAmount,
            double portfolioValue,
            double cashBalance
    ) {
        PortfolioSnapshotEntity entity = new PortfolioSnapshotEntity();
        entity.setPortfolioId(portfolioId);
        entity.setSnapshotDate(date);
        entity.setInvestedAmount(BigDecimal.valueOf(investedAmount));
        entity.setPortfolioValue(BigDecimal.valueOf(portfolioValue));
        entity.setCashBalance(BigDecimal.valueOf(cashBalance));
        return entity;
    }
}
