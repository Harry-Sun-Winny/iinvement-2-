package com.acme.investment.application.market;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.acme.investment.domain.market.MarketData;
import com.acme.investment.domain.market.MarketDataProvider;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class MarketDataServiceTest {
    @Test
    void fallsBackToYahooFundamentalsWithFieldLevelProvenance() {
        MarketDataProvider fmp = mock(MarketDataProvider.class);
        MarketDataProvider finnhub = mock(MarketDataProvider.class);
        MarketDataProvider yahoo = mock(MarketDataProvider.class);
        when(fmp.getFundamentalsAndProfile("000660.KS")).thenThrow(new RuntimeException("FMP unavailable"));
        when(finnhub.getFundamentalsAndProfile("000660.KS")).thenThrow(new RuntimeException("Finnhub unavailable"));

        MarketData data = new MarketData();
        data.setSymbol("000660.KS");
        data.setPe(BigDecimal.valueOf(12.4));
        data.setPb(BigDecimal.valueOf(1.3));
        data.setRoe(BigDecimal.valueOf(.18));
        data.setBeta(BigDecimal.valueOf(.92));
        data.setDividendYield(BigDecimal.valueOf(.02));
        when(yahoo.getFundamentalsAndProfile("000660.KS")).thenReturn(data);

        MarketDataService service = new MarketDataService(fmp, finnhub, yahoo);
        MarketDataService.ResearchMarketData result = service.getResearchMarketData("000660.KS");

        assertEquals("market-provider-yahoo-fallback", result.dataVersion());
        assertEquals(BigDecimal.valueOf(12.4), result.data().getPe());
        assertNotNull(result.fieldProvenance().get("pe"));
        assertEquals("Yahoo Finance", result.fieldProvenance().get("pe").sourceName());
        assertEquals("summaryDetail.trailingPE", result.fieldProvenance().get("pe").sourceFields().get(0));
    }
}
