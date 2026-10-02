package com.acme.investment.application.intelligence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class ValuationEngineTest {
    @Test void blocksInconsistentCurrency() {
        var result = ValuationEngine.dcf(input(false, false, new BigDecimal("0.10"), new BigDecimal("0.03")));
        assertEquals("BLOCKED", result.status());
    }
    @Test void blocksInvalidTerminalGrowth() {
        var result = ValuationEngine.dcf(input(true, false, new BigDecimal("0.03"), new BigDecimal("0.03")));
        assertEquals("BLOCKED", result.status());
    }
    @Test void calculatesEligibleDcf() {
        var result = ValuationEngine.dcf(input(true, false, new BigDecimal("0.10"), new BigDecimal("0.03")));
        assertEquals("PROVISIONAL", result.status());
        assertNotNull(result.enterpriseValue());
    }
    private ValuationEngine.DcfInput input(boolean currency, boolean veto, BigDecimal rate, BigDecimal terminal) {
        return new ValuationEngine.DcfInput(BigDecimal.valueOf(100), List.of(new BigDecimal("0.08"), new BigDecimal("0.06")), rate, terminal,
                currency, veto, 1, 1, 1, 1, 1, 1, 1, .50);
    }
}
