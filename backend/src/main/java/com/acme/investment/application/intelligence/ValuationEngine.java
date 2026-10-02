package com.acme.investment.application.intelligence;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.List;

/** Pure valuation calculations. Inputs must be point-in-time and currency-consistent. */
public final class ValuationEngine {
    private static final MathContext MC = MathContext.DECIMAL64;
    private ValuationEngine() { }

    public static double suitability(double businessModelFit, double dataAvailability, double forecastability,
                                     double accountingReliability, double assetRelevance, double peerAvailability,
                                     double regimeStability) {
        return ResearchGovernanceEngine.clamp(businessModelFit) * ResearchGovernanceEngine.clamp(dataAvailability)
                * ResearchGovernanceEngine.clamp(forecastability) * ResearchGovernanceEngine.clamp(accountingReliability)
                * ResearchGovernanceEngine.clamp(assetRelevance) * ResearchGovernanceEngine.clamp(peerAvailability)
                * ResearchGovernanceEngine.clamp(regimeStability);
    }

    public static Result dcf(DcfInput input) {
        if (!input.currencyConsistent || input.blockingGate || suitability(input.businessModelFit, input.dataAvailability,
                input.forecastability, input.accountingReliability, input.assetRelevance, input.peerAvailability,
                input.regimeStability) < input.minimumSuitability) {
            return new Result(null, "BLOCKED", List.of("Valuation suitability or governance gate failed."));
        }
        if (input.discountRate.compareTo(input.terminalGrowth) <= 0) {
            return new Result(null, "BLOCKED", List.of("Discount rate must exceed terminal growth."));
        }
        BigDecimal pv = BigDecimal.ZERO;
        BigDecimal cashFlow = input.initialFcff;
        for (int year = 1; year <= input.explicitGrowth.size(); year++) {
            cashFlow = cashFlow.multiply(BigDecimal.ONE.add(input.explicitGrowth.get(year - 1)), MC);
            pv = pv.add(cashFlow.divide(BigDecimal.ONE.add(input.discountRate).pow(year, MC), MC));
        }
        BigDecimal terminalCashFlow = cashFlow.multiply(BigDecimal.ONE.add(input.terminalGrowth), MC);
        BigDecimal terminalValue = terminalCashFlow.divide(input.discountRate.subtract(input.terminalGrowth), MC);
        pv = pv.add(terminalValue.divide(BigDecimal.ONE.add(input.discountRate).pow(input.explicitGrowth.size(), MC), MC));
        return new Result(pv.setScale(2, RoundingMode.HALF_UP), "PROVISIONAL",
                List.of("Fair value is provisional until inputs are source-verified and backtested."));
    }

    public record DcfInput(BigDecimal initialFcff, List<BigDecimal> explicitGrowth, BigDecimal discountRate,
                           BigDecimal terminalGrowth, boolean currencyConsistent, boolean blockingGate,
                           double businessModelFit, double dataAvailability, double forecastability,
                           double accountingReliability, double assetRelevance, double peerAvailability,
                           double regimeStability, double minimumSuitability) { }
    public record Result(BigDecimal enterpriseValue, String status, List<String> warnings) { }
}
