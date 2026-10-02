package com.acme.investment.application.intelligence;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.List;

public final class ScenarioAnalysisService {
    private static final MathContext MC = MathContext.DECIMAL64;
    private ScenarioAnalysisService() { }

    public static Result aggregate(List<Scenario> scenarios) {
        if (scenarios == null || scenarios.size() < 3) throw new IllegalArgumentException("At least Bear, Base and Bull scenarios are required.");
        BigDecimal totalProbability = scenarios.stream().map(Scenario::probability).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalProbability.subtract(BigDecimal.ONE).abs().compareTo(new BigDecimal("0.0001")) > 0) {
            throw new IllegalArgumentException("Scenario probabilities must sum to 1.0.");
        }
        BigDecimal expectedReturn = scenarios.stream()
                .map(s -> s.probability().multiply(s.expectedReturn(), MC)).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Result(expectedReturn.setScale(6, RoundingMode.HALF_UP), scenarios);
    }

    public record Scenario(String name, BigDecimal probability, BigDecimal revenueImpact, BigDecimal marginImpact,
                           BigDecimal cashFlowImpact, BigDecimal balanceSheetImpact, BigDecimal valuationImpact,
                           BigDecimal expectedReturn, String causalChain, List<String> falsifiers) { }
    public record Result(BigDecimal probabilityWeightedExpectedReturn, List<Scenario> scenarios) { }
}
