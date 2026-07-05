package com.acme.investment.application.risk;

import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotEntity;
import com.acme.investment.infrastructure.persistence.snapshot.PortfolioSnapshotRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class PortfolioDeepAnalysisService {

    private static final MathContext MC = MathContext.DECIMAL64;
    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    private final PortfolioSnapshotRepository snapshotRepository;
    private final PortfolioRiskMetricsService riskMetricsService;

    public PortfolioDeepAnalysisService(
            PortfolioSnapshotRepository snapshotRepository,
            PortfolioRiskMetricsService riskMetricsService
    ) {
        this.snapshotRepository = snapshotRepository;
        this.riskMetricsService = riskMetricsService;
    }

    public DeepAnalysisResponse getDeepAnalysis(UUID portfolioId) {
        List<PortfolioSnapshotEntity> snapshots =
                snapshotRepository.findByPortfolioIdOrderBySnapshotDateAsc(portfolioId);

        PortfolioRiskMetricsService.RiskMetrics riskMetrics = riskMetricsService.calculateMetrics(portfolioId);
        List<RollingPoint> rollingMetrics = buildRollingMetrics(snapshots, 30);
        List<DrawdownPoint> drawdownSeries = buildDrawdownSeries(snapshots);
        Overview overview = buildOverview(snapshots, riskMetrics);

        return new DeepAnalysisResponse(
                overview,
                riskMetrics,
                buildEquityCurve(snapshots),
                rollingMetrics,
                drawdownSeries,
                List.of(
                        "Nguon du lieu: portfolio_snapshots noi bo, giao dich da ghi nhan trong he thong.",
                        "Cach tinh: return theo snapshot ngay, Sharpe/Sortino/Drawdown/Volatility tinh tu chuoi snapshot lich su.",
                        "Do bat dinh: ket qua phu thuoc muc do day du cua snapshot; neu lich su ngan thi metric se kem on dinh hon."
                )
        );
    }

    private Overview buildOverview(
            List<PortfolioSnapshotEntity> snapshots,
            PortfolioRiskMetricsService.RiskMetrics riskMetrics
    ) {
        if (snapshots.isEmpty()) {
            return new Overview(
                    0,
                    null,
                    null,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO
            );
        }

        PortfolioSnapshotEntity latest = snapshots.get(snapshots.size() - 1);
        PortfolioSnapshotEntity first = snapshots.get(0);

        BigDecimal latestValue = nvl(latest.getPortfolioValue());
        BigDecimal invested = nvl(latest.getInvestedAmount());
        BigDecimal cashBalance = nvl(latest.getCashBalance());
        BigDecimal netGain = latestValue.subtract(invested);
        BigDecimal totalReturnPct = riskMetrics.totalReturn().multiply(ONE_HUNDRED);

        return new Overview(
                snapshots.size(),
                first.getSnapshotDate(),
                latest.getSnapshotDate(),
                latestValue,
                netGain,
                totalReturnPct,
                cashBalance
        );
    }

    private List<RollingPoint> buildRollingMetrics(List<PortfolioSnapshotEntity> snapshots, int windowSize) {
        List<DailyReturnPoint> returns = buildDailyReturns(snapshots);
        if (returns.size() < 2) {
            return List.of();
        }

        List<RollingPoint> points = new ArrayList<>();
        for (int end = 0; end < returns.size(); end++) {
            int start = Math.max(0, end - windowSize + 1);
            List<Double> windowReturns = new ArrayList<>();
            for (int i = start; i <= end; i++) {
                windowReturns.add(returns.get(i).dailyReturn());
            }

            BigDecimal volatility = calculateAnnualizedVolatility(windowReturns);
            BigDecimal downside = calculateAnnualizedDownsideDeviation(windowReturns);
            BigDecimal averageReturn = BigDecimal.valueOf(mean(windowReturns));
            BigDecimal annualizedReturn = averageReturn.multiply(BigDecimal.valueOf(252), MC);

            BigDecimal sharpe = volatility.signum() == 0
                    ? BigDecimal.ZERO
                    : annualizedReturn.divide(volatility, 8, RoundingMode.HALF_UP);
            BigDecimal sortino = downside.signum() == 0
                    ? BigDecimal.ZERO
                    : annualizedReturn.divide(downside, 8, RoundingMode.HALF_UP);

            points.add(new RollingPoint(
                    returns.get(end).date(),
                    sharpe,
                    sortino,
                    calculateHistoricalVar95(windowReturns),
                    calculateConditionalVar95(windowReturns)
            ));
        }

        return points;
    }

    private List<DrawdownPoint> buildDrawdownSeries(List<PortfolioSnapshotEntity> snapshots) {
        if (snapshots.isEmpty()) {
            return List.of();
        }

        List<DrawdownPoint> points = new ArrayList<>();
        BigDecimal peak = BigDecimal.ZERO;

        for (PortfolioSnapshotEntity snapshot : snapshots) {
            BigDecimal value = nvl(snapshot.getPortfolioValue());
            if (value.compareTo(peak) > 0) {
                peak = value;
            }

            BigDecimal drawdown = BigDecimal.ZERO;
            if (peak.signum() > 0) {
                drawdown = peak.subtract(value).divide(peak, 8, RoundingMode.HALF_UP);
            }

            points.add(new DrawdownPoint(snapshot.getSnapshotDate(), value, peak, drawdown));
        }

        return points;
    }

    private List<EquityCurvePoint> buildEquityCurve(List<PortfolioSnapshotEntity> snapshots) {
        return snapshots.stream()
                .map(snapshot -> new EquityCurvePoint(
                        snapshot.getSnapshotDate(),
                        nvl(snapshot.getPortfolioValue()),
                        nvl(snapshot.getInvestedAmount()),
                        nvl(snapshot.getCashBalance())
                ))
                .toList();
    }

    private List<DailyReturnPoint> buildDailyReturns(List<PortfolioSnapshotEntity> snapshots) {
        List<DailyReturnPoint> returns = new ArrayList<>();

        for (int i = 1; i < snapshots.size(); i++) {
            BigDecimal previous = nvl(snapshots.get(i - 1).getPortfolioValue());
            BigDecimal current = nvl(snapshots.get(i).getPortfolioValue());
            if (previous.signum() <= 0) {
                continue;
            }

            returns.add(new DailyReturnPoint(
                    snapshots.get(i).getSnapshotDate(),
                    current.subtract(previous).divide(previous, MC).doubleValue()
            ));
        }

        return returns;
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
        return BigDecimal.valueOf(Math.sqrt(variance) * Math.sqrt(252));
    }

    private BigDecimal calculateAnnualizedDownsideDeviation(List<Double> dailyReturns) {
        List<Double> downsideReturns = dailyReturns.stream().filter(value -> value < 0).toList();
        if (downsideReturns.isEmpty()) {
            return BigDecimal.ZERO;
        }

        double downsideVariance = 0d;
        for (double value : downsideReturns) {
            downsideVariance += value * value;
        }
        downsideVariance /= downsideReturns.size();

        return BigDecimal.valueOf(Math.sqrt(downsideVariance) * Math.sqrt(252));
    }

    private BigDecimal calculateHistoricalVar95(List<Double> dailyReturns) {
        if (dailyReturns.isEmpty()) {
            return BigDecimal.ZERO;
        }

        List<Double> sorted = new ArrayList<>(dailyReturns);
        sorted.sort(Comparator.naturalOrder());
        int index = Math.max(0, (int) Math.floor(0.05 * (sorted.size() - 1)));
        return BigDecimal.valueOf(Math.abs(sorted.get(index)));
    }

    private BigDecimal calculateConditionalVar95(List<Double> dailyReturns) {
        if (dailyReturns.isEmpty()) {
            return BigDecimal.ZERO;
        }

        List<Double> sorted = new ArrayList<>(dailyReturns);
        sorted.sort(Comparator.naturalOrder());
        int index = Math.max(0, (int) Math.floor(0.05 * (sorted.size() - 1)));
        double threshold = sorted.get(index);

        List<Double> tailLosses = sorted.stream().filter(value -> value <= threshold).toList();
        if (tailLosses.isEmpty()) {
            return BigDecimal.ZERO;
        }

        double averageTail = tailLosses.stream().mapToDouble(Math::abs).average().orElse(0d);
        return BigDecimal.valueOf(averageTail);
    }

    private double mean(List<Double> values) {
        return values.stream().mapToDouble(Double::doubleValue).average().orElse(0d);
    }

    private BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private record DailyReturnPoint(LocalDate date, double dailyReturn) {}

    public record DeepAnalysisResponse(
            Overview overview,
            PortfolioRiskMetricsService.RiskMetrics riskMetrics,
            List<EquityCurvePoint> equityCurve,
            List<RollingPoint> rollingMetrics,
            List<DrawdownPoint> drawdownSeries,
            List<String> methodologyNotes
    ) {}

    public record Overview(
            int snapshotCount,
            LocalDate firstSnapshotDate,
            LocalDate latestSnapshotDate,
            BigDecimal latestValue,
            BigDecimal netGain,
            BigDecimal totalReturnPct,
            BigDecimal cashBalance
    ) {}

    public record RollingPoint(
            LocalDate date,
            BigDecimal sharpeRatio,
            BigDecimal sortinoRatio,
            BigDecimal valueAtRisk95,
            BigDecimal conditionalValueAtRisk95
    ) {}

    public record DrawdownPoint(
            LocalDate date,
            BigDecimal portfolioValue,
            BigDecimal runningPeak,
            BigDecimal drawdown
    ) {}

    public record EquityCurvePoint(
            LocalDate date,
            BigDecimal portfolioValue,
            BigDecimal investedAmount,
            BigDecimal cashBalance
    ) {}
}
