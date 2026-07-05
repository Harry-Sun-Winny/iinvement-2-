package com.acme.investment.infrastructure.market;

import com.acme.investment.domain.market.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Component("yahooMarketDataProvider")
public class YahooMarketDataProvider implements MarketDataProvider {

    private static final String QUOTE_URL =
            "https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&range=5d";
    private static final String HISTORY_URL =
            "https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&range=1y";

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    public YahooMarketDataProvider(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public Quote getQuote(String symbol) {
        JsonNode root = fetchChart(symbol, QUOTE_URL);
        if (root == null || root.path("chart").path("result").isMissingNode()) {
            throw new RuntimeException("Yahoo: no chart result for " + symbol);
        }
        JsonNode result = root.path("chart").path("result").get(0);
        if (result == null) {
            throw new RuntimeException("Yahoo: empty chart result array for " + symbol);
        }

        JsonNode meta = result.path("meta");
        BigDecimal price = bd(meta.path("regularMarketPrice"));
        
        if (price == null) {
            throw new RuntimeException("Yahoo: missing regularMarketPrice for " + symbol);
        }

        return new Quote(symbol, price, OffsetDateTime.now(ZoneOffset.UTC));
    }

    @Override
    public MarketData getFundamentalsAndProfile(String symbol) {
        throw new UnsupportedOperationException(
                "YahooMarketDataProvider does not support fundamentals for " + symbol);
    }

    @Override
    public MarketData getAnalystConsensus(String symbol) {
        throw new UnsupportedOperationException(
                "YahooMarketDataProvider does not support analyst consensus for " + symbol);
    }

    @Override
    public List<HistoricalPrice> getHistoricalPrices(String symbol) {
        JsonNode root = fetchChart(symbol, HISTORY_URL);
        if (root == null || root.path("chart").path("result").isMissingNode()) {
            throw new RuntimeException("Yahoo: no chart result for " + symbol);
        }
        JsonNode result = root.path("chart").path("result").get(0);
        if (result == null) {
            throw new RuntimeException("Yahoo: empty chart result array for " + symbol);
        }

        JsonNode timestamps = result.path("timestamp");
        JsonNode indicators = result.path("indicators");
        if (timestamps.isMissingNode() || indicators.isMissingNode()) {
            return new ArrayList<>();
        }
        JsonNode quote = indicators.path("quote").get(0);
        if (quote == null) {
            return new ArrayList<>();
        }
        JsonNode closes = quote.path("close");

        List<HistoricalPrice> out = new ArrayList<>();
        for (int i = 0; i < timestamps.size(); i++) {
            if (closes.get(i) == null || closes.get(i).isNull()) continue;
            LocalDate date = Instant.ofEpochSecond(timestamps.get(i).asLong())
                    .atZone(ZoneOffset.UTC).toLocalDate();
            BigDecimal close = bd(closes.get(i));
            if (close != null) {
                out.add(new HistoricalPrice(date, close));
            }
        }
        return out;
    }

    private JsonNode fetchChart(String symbol, String urlTemplate) {
        String url = String.format(urlTemplate, symbol);
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Mozilla/5.0 (compatible; AcmeInvestment/1.0)");
        ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Yahoo request failed for " + symbol + ": " + response.getStatusCode());
        }
        try {
            return mapper.readTree(response.getBody());
        } catch (Exception e) {
            throw new RuntimeException("Yahoo: failed to parse response for " + symbol, e);
        }
    }

    private BigDecimal bd(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) return null;
        return BigDecimal.valueOf(node.asDouble());
    }
}
