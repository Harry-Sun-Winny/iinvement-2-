package com.acme.investment.application.intelligence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.List;
import org.junit.jupiter.api.Test;

class ResearchGovernanceEngineTest {
    @Test void activationUsesAllEvidenceDimensions() {
        assertEquals(ResearchGovernanceEngine.State.ACTIVE, ResearchGovernanceEngine.activationState(
                ResearchGovernanceEngine.activationProbability(1, 1, 1, 1, 1, 1), ResearchGovernanceEngine.Thresholds.defaults()));
        assertEquals(ResearchGovernanceEngine.State.DEPRECATED, ResearchGovernanceEngine.activationState(
                ResearchGovernanceEngine.activationProbability(1, 1, 0, 1, 1, 1), ResearchGovernanceEngine.Thresholds.defaults()));
    }
    @Test void weightsNormalizeWithinModule() {
        List<Double> weights = ResearchGovernanceEngine.normalizeWeights(List.of(2d, 3d, 5d));
        assertEquals(1d, weights.stream().mapToDouble(Double::doubleValue).sum(), 1e-12);
    }
    @Test void blockingVetoCannotBeOffsetByScore() {
        assertEquals("BLOCKED", ResearchGovernanceEngine.governedStatus(1, 1, true));
    }
    @Test void confidenceCannotExceedCoverage() {
        double confidence = ResearchGovernanceEngine.confidence(.60, 1, 1, 1, 1, 1, 1);
        assertTrue(confidence <= .60d);
    }
}
