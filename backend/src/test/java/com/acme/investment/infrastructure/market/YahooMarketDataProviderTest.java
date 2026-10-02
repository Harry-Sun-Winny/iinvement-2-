package com.acme.investment.infrastructure.market;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class YahooMarketDataProviderTest {
    @Test
    void mapsQuoteSummaryFundamentalsForKoreanTicker() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);
        server.expect(requestTo(org.hamcrest.Matchers.containsString("quoteSummary/000660.KS")))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {"quoteSummary":{"result":[{
                          "assetProfile":{"sector":"Technology","industry":"Semiconductors","country":"South Korea"},
                          "summaryDetail":{"marketCap":{"raw":125000000000},"trailingPE":{"raw":12.4},"beta":{"raw":0.92},"dividendYield":{"raw":0.02},"dividendRate":{"raw":1500}},
                          "defaultKeyStatistics":{"priceToBook":{"raw":1.3}},
                          "financialData":{"returnOnEquity":{"raw":0.18},"returnOnInvestedCapital":{"raw":0.14}},
                          "price":{"longName":"SK hynix Inc.","exchangeName":"KSC"}
                        }]}}
                        """, APPLICATION_JSON));

        var data = new YahooMarketDataProvider(restTemplate).getFundamentalsAndProfile("000660.KS");

        assertEquals("SK hynix Inc.", data.getName());
        assertEquals("South Korea", data.getCountry());
        assertEquals(BigDecimal.valueOf(12.4), data.getPe());
        assertEquals(BigDecimal.valueOf(1.3), data.getPb());
        assertEquals(BigDecimal.valueOf(.18), data.getRoe());
        assertEquals(BigDecimal.valueOf(.14), data.getRoic());
        server.verify();
    }
}
