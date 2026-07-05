package com.acme.investment.application.risk;

import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotEntity;
import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class PortfolioRiskMetricsService {

    private static final MathContext MC = MathContext.DECIMAL64;
    private static final BigDecimal TRADING_DAYS = BigDecimal.valueOf(252);
    private static final double SQRT_252 = Math.sqrt(252);

    private final PortfolioSnapshotRepository snapshotRepository;

    public PortfolioRiskMetricsService(PortfolioSnapshotRepository snapshotRepository) {
        this.snapshotRepository = snapshotRepository;
    }

    public RiskMetrics calculateMetrics(UUID portfolioId) {
        List<PortfolioSnapshotEntity> snapshots =
                snapshotRepository.findByPortfolioIdOrderBySnapshotDateAsc(portfolioId);

        if (snapshots.size() < 2) {
            return new RiskMetrics(
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO
            );
        }

        List<Double> dailyReturns = buildDailyReturns(snapshots);

        BigDecimal maxDrawdown = calculateMaxDrawdown(snapshots);

        PortfolioSnapshotEntity first = snapshots.get(0);
        PortfolioSnapshotEntity last = snapshots.get(snapshots.size() - 1);

        BigDecimal firstValue = nvl(first.getPortfolioValue());
        BigDecimal lastValue = nvl(last.getPortfolioValue());

        BigDecimal totalReturn = BigDecimal.ZERO;
        if (firstValue.compareTo(BigDecimal.ZERO) > 0) {
            totalReturn = lastValue.subtract(firstValue).divide(firstValue, MC);
        }

        long days = Math.max(1, ChronoUnit.DAYS.between(first.getSnapshotDate(), last.getSnapshotDate()));
        double years = Math.max(days / 365.25d, 1d / 365.25d);

        BigDecimal annualizedReturn = BigDecimal.ZERO;
        if (firstValue.compareTo(BigDecimal.ZERO) > 0 && lastValue.compareTo(BigDecimal.ZERO) > 0) {
            double ratio = lastValue.divide(firstValue, MC).doubleValue();
            double annualized = Math.pow(ratio, 1.0 / years) - 1.0;
            annualizedReturn = BigDecimal.valueOf(annualized);
        }

        BigDecimal volatility = calculateAnnualizedVolatility(dailyReturns);
        BigDecimal sharpeRatio = BigDecimal.ZERO;
        if (volatility.compareTo(BigDecimal.ZERO) > 0) {
            sharpeRatio = annualizedReturn.divide(volatility, 8, RoundingMode.HALF_UP);
        }

        BigDecimal sortinoRatio = calculateSortinoRatio(dailyReturns, annualizedReturn);
        BigDecimal valueAtRisk = calculateHistoricalVar95(dailyReturns);

        return new RiskMetrics(
                totalReturn,
                annualizedReturn,
                volatility,
                sharpeRatio,
                sortinoRatio,
                maxDrawdown,
                valueAtRisk
        );
    }

    private List<Double> buildDailyReturns(List<PortfolioSnapshotEntity> snapshots) {
        List<Double> returns = new ArrayList<>();

        for (int i = 1; i < snapshots.size(); i++) {
            BigDecimal prev = nvl(snapshots.get(i - 1).getPortfolioValue());
            BigDecimal curr = nvl(snapshots.get(i).getPortfolioValue());

            if (prev.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            double dailyReturn = curr.subtract(prev).divide(prev, MC).doubleValue();
            returns.add(dailyReturn);
        }

        return returns;
    }

    private BigDecimal calculateMaxDrawdown(List<PortfolioSnapshotEntity> snapshots) {
        BigDecimal maxDrawdown = BigDecimal.ZERO;
        BigDecimal peak = BigDecimal.ZERO;

        for (PortfolioSnapshotEntity snapshot : snapshots) {
            BigDecimal value = nvl(snapshot.getPortfolioValue());

            if (value.compareTo(peak) > 0) {
                peak = value;
            }

            if (peak.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal drawdown = peak.subtract(value).divide(peak, MC);
                if (drawdown.compareTo(maxDrawdown) > 0) {
                    maxDrawdown = drawdown;
                }
            }
        }

        return maxDrawdown;
    }

    private BigDecimal calculateAnnualizedVolatility(List<Double> dailyReturns) {
        if (dailyReturns.size() < 2) {
            return BigDecimal.ZERO;
        }

        double mean = mean(dailyReturns);
        double variance = 0d;

        for (double value : dailyReturns) {
            double diff = value - mean;
            variance += diff * diff;
        }

        variance /= dailyReturns.size();
        double dailyVol = Math.sqrt(variance);
        double annualizedVol = dailyVol * SQRT_252;

        return BigDecimal.valueOf(annualizedVol);
    }

    private BigDecimal calculateSortinoRatio(List<Double> dailyReturns, BigDecimal annualizedReturn) {
        if (dailyReturns.isEmpty()) {
            return BigDecimal.ZERO;
        }

        List<Double> downsideReturns = new ArrayList<>();
        for (double value : dailyReturns) {
            if (value < 0) {
                downsideReturns.add(value);
            }
        }

        if (downsideReturns.isEmpty()) {
            return BigDecimal.ZERO;
        }

        double downsideVariance = 0d;
        for (double value : downsideReturns) {
            downsideVariance += value * value;
        }

        downsideVariance /= downsideReturns.size();
        double downsideDeviationAnnualized = Math.sqrt(downsideVariance) * SQRT_252;

        if (downsideDeviationAnnualized == 0d) {
            return BigDecimal.ZERO;
        }

        return annualizedReturn.divide(
                BigDecimal.valueOf(downsideDeviationAnnualized),
                8,
                RoundingMode.HALF_UP
        );
    }

    private BigDecimal calculateHistoricalVar95(List<Double> dailyReturns) {
        if (dailyReturns.isEmpty()) {
            return BigDecimal.ZERO;
        }

        List<Double> sorted = new ArrayList<>(dailyReturns);
        sorted.sort(Comparator.naturalOrder());

        int index = (int) Math.floor(0.05 * (sorted.size() - 1));
        double percentile5 = sorted.get(Math.max(0, index));

        return BigDecimal.valueOf(Math.abs(percentile5));
    }

    private double mean(List<Double> values) {
        if (values.isEmpty()) {
            return 0d;
        }

        double sum = 0d;
        for (double value : values) {
            sum += value;
        }
        return sum / values.size();
    }

    private BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    public record RiskMetrics(
            BigDecimal totalReturn,
            BigDecimal annualizedReturn,
            BigDecimal volatility,
            BigDecimal sharpeRatio,
            BigDecimal sortinoRatio,
            BigDecimal maxDrawdown,
            BigDecimal valueAtRisk
    ) {}
}