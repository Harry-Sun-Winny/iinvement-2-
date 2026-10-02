package com.acme.investment.application.intelligence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class ScenarioAnalysisServiceTest {
    @Test void calculatesProbabilityWeightedOutcome() {
        var result = ScenarioAnalysisService.aggregate(List.of(s("Bear", ".25", "-.30"), s("Base", ".50", ".10"), s("Bull", ".25", ".40")));
        assertEquals(new BigDecimal("0.075000"), result.probabilityWeightedExpectedReturn());
    }
    @Test void rejectsInvalidProbabilityTotal() {
        assertThrows(IllegalArgumentException.class, () -> ScenarioAnalysisService.aggregate(List.of(s("Bear", ".20", "-.30"), s("Base", ".50", ".10"), s("Bull", ".20", ".40"))));
    }
    private ScenarioAnalysisService.Scenario s(String name, String p, String r) {
        return new ScenarioAnalysisService.Scenario(name, new BigDecimal(p), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal(r), "Driver -> revenue -> cash flow", List.of("Falsifier"));
    }
}
