package com.acme.investment.application.intelligence;

import java.util.List;

/** Deterministic shared policy calculations; callers provide point-in-time evidence inputs. */
public final class ResearchGovernanceEngine {
    private ResearchGovernanceEngine() { }

    public static double activationProbability(double industryFit, double businessModelFit, double dataAvailability,
                                               double transmissionStrength, double temporalValidity, double sourceReliability) {
        return clamp(industryFit) * clamp(businessModelFit) * clamp(dataAvailability)
                * clamp(transmissionStrength) * clamp(temporalValidity) * clamp(sourceReliability);
    }

    public static State activationState(double probability, Thresholds thresholds) {
        if (probability >= thresholds.active()) return State.ACTIVE;
        if (probability >= thresholds.watch()) return State.WATCH;
        if (probability >= thresholds.dormant()) return State.DORMANT;
        return State.DEPRECATED;
    }

    public static double dataQuality(double sourceReliability, double pointInTimeIntegrity, double freshness,
                                     double completeness, double consistency, double auditability, double restatementSafety) {
        return clamp(sourceReliability) * clamp(pointInTimeIntegrity) * clamp(freshness) * clamp(completeness)
                * clamp(consistency) * clamp(auditability) * clamp(restatementSafety);
    }

    public static double dependencyPenalty(double activeWeightSimilaritySum) {
        return 1d / (1d + Math.max(0d, activeWeightSimilaritySum));
    }

    public static List<Double> normalizeWeights(List<Double> rawWeights) {
        double sum = rawWeights.stream().mapToDouble(value -> Math.max(0d, value)).sum();
        if (sum == 0d) return rawWeights.stream().map(value -> 0d).toList();
        return rawWeights.stream().map(value -> Math.max(0d, value) / sum).toList();
    }

    public static double confidence(double coverage, double weightedDataQuality, double evidenceConsistency,
                                    double sourceDiversity, double modelStability, double outOfSampleValidity,
                                    double temporalRelevance) {
        return clamp(coverage) * clamp(weightedDataQuality) * clamp(evidenceConsistency) * clamp(sourceDiversity)
                * clamp(modelStability) * clamp(outOfSampleValidity) * clamp(temporalRelevance);
    }

    public static String governedStatus(double coverage, double confidence, boolean blockingVeto) {
        if (blockingVeto) return "BLOCKED";
        if (coverage < .40d) return "PROVISIONAL";
        return confidence < .50d ? "PASS_WITH_WARNINGS" : "PASS";
    }

    public static double clamp(double value) { return Math.max(0d, Math.min(1d, value)); }
    public record Thresholds(double active, double watch, double dormant) {
        public Thresholds { if (!(active >= watch && watch >= dormant && dormant >= 0d)) throw new IllegalArgumentException("Invalid activation thresholds"); }
        public static Thresholds defaults() { return new Thresholds(.70d, .45d, .20d); }
    }
    public enum State { ACTIVE, WATCH, DORMANT, DEPRECATED, REACTIVATED }
}
