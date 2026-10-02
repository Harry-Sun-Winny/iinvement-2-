package com.acme.investment.application.intelligence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.acme.investment.application.market.MarketDataService;
import com.acme.investment.domain.market.MarketData;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ResearchIntelligenceServiceTest {
    @Test
    void attachesSourceCitationAndUncertaintyToProviderDerivedObservations() {
        MarketDataService marketDataService = mock(MarketDataService.class);
        MarketData data = new MarketData();
        data.setSector("Technology");
        data.setPe(BigDecimal.valueOf(20));
        data.setPb(BigDecimal.valueOf(5));
        data.setRoe(BigDecimal.valueOf(0.25));
        data.setRoic(BigDecimal.valueOf(0.18));
        data.setBeta(BigDecimal.valueOf(1.1));
        data.setDividendYield(BigDecimal.valueOf(0.02));
        OffsetDateTime observedAt = OffsetDateTime.parse("2026-07-24T00:00:00+07:00");
        var provenance = new MarketDataService.FieldProvenance("Financial Modeling Prep", "https://financialmodelingprep.com/",
                observedAt, java.util.List.of("ratios.priceEarningsRatioTTM"));
        when(marketDataService.getResearchMarketData("AAPL")).thenReturn(new MarketDataService.ResearchMarketData(data,
                Map.of("pe", provenance, "pb", provenance, "roe", provenance, "roic", provenance,
                        "beta", provenance, "dividendYield", provenance), "market-provider-fmp-live"));

        var response = new ResearchIntelligenceService(marketDataService).analyze(" aapl ");

        assertEquals("AAPL", response.symbol());
        assertEquals(6, response.parameterResults().size());
        var observation = response.parameterResults().get(0);
        assertNotNull(observation.citation());
        assertEquals("ratios.priceEarningsRatioTTM", observation.citation().sourceFields().get(0));
        assertEquals(observedAt, observation.citation().observedAt());
        assertEquals("Financial Modeling Prep", observation.citation().sourceName());
        assertFalse(observation.warnings().isEmpty());
        assertEquals(ResearchIntelligenceService.EvidenceStatus.PROXY, observation.evidenceStatus());
        assertEquals(100d, response.parameterResults().get(2).normalizedScore());
    }
}
