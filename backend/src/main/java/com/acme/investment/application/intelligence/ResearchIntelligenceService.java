package com.acme.investment.application.intelligence;

import com.acme.investment.application.market.MarketDataService;
import com.acme.investment.domain.market.MarketData;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

/** Phase-2 shared engine foundation. Missing observations remain unscored by design. */
@Service
public class ResearchIntelligenceService {
    public static final String METHODOLOGY_VERSION = "IIE-0.2";
    private final MarketDataService marketDataService;

    public ResearchIntelligenceService(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    public ResearchResponse analyze(String requestedSymbol) {
        String symbol = requestedSymbol.trim().toUpperCase(Locale.ROOT);
        MarketDataService.ResearchMarketData snapshot = marketDataService.getResearchMarketData(symbol);
        MarketData data = snapshot.data();
        OffsetDateTime observedAt = OffsetDateTime.now();
        CompanyProfile profile = new CompanyProfile(symbol, data.getSector(), data.getIndustry(),
                data.getCountry(), data.getExchange(), data.getIndustry() == null ? "MIXED" : "FINANCIAL_OR_OPERATING");
        List<Observation> observations = List.of(
                observe("M7-001", "M7", 0.22, data.getPe(), "pe", Direction.LOWER_IS_BETTER, profile, observedAt, snapshot),
                observe("M7-011", "M7", 0.12, data.getPb(), "pb", Direction.LOWER_IS_BETTER, profile, observedAt, snapshot),
                observe("M6-006", "M6", 0.22, data.getRoe(), "roe", Direction.HIGHER_IS_BETTER, profile, observedAt, snapshot),
                observe("M6-001", "M6", 0.22, data.getRoic(), "roic", Direction.HIGHER_IS_BETTER, profile, observedAt, snapshot),
                observe("M10-156", "M10", 0.10, data.getBeta(), "beta", Direction.LOWER_IS_BETTER, profile, observedAt, snapshot),
                observe("M7-036", "M7", 0.12, data.getDividendYield(), "dividendYield", Direction.HIGHER_IS_BETTER, profile, observedAt, snapshot)
        );
        double activeWeight = observations.stream().filter(o -> o.state == State.ACTIVE).mapToDouble(Observation::baseWeight).sum();
        double coveredWeight = observations.stream().filter(o -> o.normalizedScore != null).mapToDouble(Observation::baseWeight).sum();
        double coverage = activeWeight == 0 ? 0 : coveredWeight / activeWeight;
        double weightedDq = coveredWeight == 0 ? 0 : observations.stream().filter(o -> o.normalizedScore != null)
                .mapToDouble(o -> o.baseWeight() * o.dataQuality()).sum() / coveredWeight;
        double confidence = coverage * weightedDq;
        String status = coverage < .40 ? "PROVISIONAL" : confidence < .50 ? "PASS_WITH_WARNINGS" : "PASS";
        List<String> warnings = new ArrayList<>();
        warnings.add("Six catalog parameters have a live provider mapping; the remaining 3,594 documented entries are retained but unscored.");
        if (coverage < .80) warnings.add("Coverage below governance threshold; no final stock verdict is issued.");
        StockScore score = stockScore(observations, coverage, confidence, status);
        return new ResearchResponse(symbol, observedAt, METHODOLOGY_VERSION, snapshot.dataVersion(),
                profile, coverage, confidence, status, warnings, observations, List.of(), score);
    }

    private StockScore stockScore(List<Observation> observations, double coverage, double confidence, String status) {
        Double valuation = scoreFor(observations, "M7-001", "M7-011");
        Double quality = scoreFor(observations, "M6-006", "M6-001");
        Double resilience = scoreFor(observations, "M10-156");
        Double income = scoreFor(observations, "M7-036");
        double covered = observations.stream().filter(o -> o.normalizedScore() != null).mapToDouble(Observation::baseWeight).sum();
        Double overall = coverage < .80 ? null : weightedMean(List.of(
                new ScoreWeight(valuation, .30), new ScoreWeight(quality, .35),
                new ScoreWeight(resilience, .20), new ScoreWeight(income, .15)));
        String classification = overall == null ? "INSUFFICIENT_EVIDENCE"
                : valuation != null && valuation >= 70 && quality != null && quality < 40 ? "CHEAP_VALUE_TRAP_RISK"
                : quality != null && quality >= 70 && valuation != null && valuation >= 60 ? "HIGH_QUALITY_ATTRACTIVE"
                : quality != null && quality >= 70 ? "HIGH_QUALITY_EXPENSIVE" : "PROVISIONAL";
        return new StockScore(quality, null, valuation, resilience, null, null, null, overall,
                confidence, coverage, "NONE", classification, covered, status);
    }

    private Double scoreFor(List<Observation> observations, String... parameterCodes) {
        List<String> codes = List.of(parameterCodes);
        return weightedMean(observations.stream().filter(o -> codes.contains(o.parameterCode()))
                .map(o -> new ScoreWeight(o.normalizedScore(), o.effectiveWeight())).toList());
    }

    private Double weightedMean(List<ScoreWeight> values) {
        double weight = values.stream().filter(v -> v.score != null).mapToDouble(ScoreWeight::weight).sum();
        return weight == 0 ? null : values.stream().filter(v -> v.score != null)
                .mapToDouble(v -> v.score * v.weight).sum() / weight;
    }

    private Observation observe(String code, String module, double baseWeight, BigDecimal value, String sourceField,
                                Direction direction, CompanyProfile profile, OffsetDateTime observedAt,
                                MarketDataService.ResearchMarketData snapshot) {
        double activation = profile.primaryIndustry() == null ? .60 : .80;
        State state = activation >= .70 ? State.ACTIVE : State.WATCH;
        EvidenceCitation citation = citationFor(snapshot.fieldProvenance().get(sourceField), sourceField, observedAt);
        if (value == null) return new Observation(code, module, baseWeight, null, null, state, EvidenceStatus.MISSING,
                0, 0, List.of("No point-in-time provider value available."), citation);
        double scoringValue = ratioPercent(value, sourceField);
        double score = direction == Direction.HIGHER_IS_BETTER
                ? clamp(scoringValue * 4) : clamp(100 - scoringValue * 8);
        double dq = .70; // Provider data is a proxy until source/as-of/reconciliation are persisted.
        return new Observation(code, module, baseWeight, value, score, state, EvidenceStatus.PROXY,
                dq, baseWeight * activation * dq,
                List.of("Provider-derived proxy; peer and historical normalization pending."), citation);
    }

    private EvidenceCitation citationFor(MarketDataService.FieldProvenance provenance, String sourceField,
                                         OffsetDateTime fallbackObservedAt) {
        if (provenance == null) {
            return new EvidenceCitation("No provider value returned", null, fallbackObservedAt, List.of(sourceField));
        }
        return new EvidenceCitation(provenance.sourceName(), provenance.sourceUrl(), provenance.observedAt(),
                provenance.sourceFields());
    }
    private double ratioPercent(BigDecimal value, String sourceField) {
        double raw = value.doubleValue();
        return ("roe".equals(sourceField) || "roic".equals(sourceField) || "dividendYield".equals(sourceField))
                && Math.abs(raw) <= 1d ? raw * 100d : raw;
    }
    private double clamp(double score) { return Math.max(0, Math.min(100, score)); }
    private enum Direction { HIGHER_IS_BETTER, LOWER_IS_BETTER }
    public enum State { ACTIVE, WATCH, DORMANT, DEPRECATED, REACTIVATED }
    public enum EvidenceStatus { VERIFIED, ESTIMATED, PROXY, MISSING, CONFLICTED }
    public record CompanyProfile(String symbol, String primaryIndustry, String subIndustry, String country,
                                 String exchange, String businessModel) { }
    public record Observation(String parameterCode, String moduleId, double baseWeight, BigDecimal rawValue, Double normalizedScore,
                              State state, EvidenceStatus evidenceStatus, double dataQuality,
                              double effectiveWeight, List<String> warnings, EvidenceCitation citation) { }
    public record EvidenceCitation(String sourceName, String sourceUrl, OffsetDateTime observedAt,
                                   List<String> sourceFields) { }
    public record ResearchResponse(String symbol, OffsetDateTime asOf, String methodologyVersion, String dataVersion,
                                   CompanyProfile profile, double coverage, double confidence, String status,
                                   List<String> warnings, List<Observation> parameterResults, List<String> vetoes,
                                   StockScore stockScore) { }
    private record ScoreWeight(Double score, double weight) { }
    public record StockScore(Double qualityScore, Double growthScore, Double valuationScore, Double resilienceScore,
                             Double governanceScore, Double catalystScore, Double marketScore, Double overallScore,
                             double confidence, double coverage, String vetoStatus, String finalClassification,
                             double coveredWeight, String governanceStatus) { }
}
