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
import org.springframework.web.util.UriUtils;

@Component("yahooMarketDataProvider")
public class YahooMarketDataProvider implements MarketDataProvider {

    private static final String QUOTE_URL =
            "https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&range=5d";
    private static final String HISTORY_URL =
            "https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&range=1y";
    private static final String FUNDAMENTALS_URL =
            "https://query1.finance.yahoo.com/v10/finance/quoteSummary/%s?modules=assetProfile,summaryDetail,defaultKeyStatistics,financialData,price";

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
        String encodedSymbol = UriUtils.encodePathSegment(symbol.trim(), java.nio.charset.StandardCharsets.UTF_8);
        JsonNode root = fetchJson(String.format(FUNDAMENTALS_URL, encodedSymbol), symbol);
        JsonNode results = root.path("quoteSummary").path("result");
        if (!results.isArray() || results.isEmpty() || results.get(0) == null) {
            throw new RuntimeException("Yahoo: no fundamentals result for " + symbol);
        }

        JsonNode result = results.get(0);
        JsonNode profile = result.path("assetProfile");
        JsonNode summary = result.path("summaryDetail");
        JsonNode keyStatistics = result.path("defaultKeyStatistics");
        JsonNode financials = result.path("financialData");
        JsonNode price = result.path("price");

        MarketData data = new MarketData();
        data.setSymbol(symbol.trim().toUpperCase());
        data.setName(firstText(price, "longName", "shortName"));
        data.setSector(text(profile.path("sector")));
        data.setIndustry(text(profile.path("industry")));
        data.setCountry(text(profile.path("country")));
        data.setExchange(firstText(price, "exchangeName", "fullExchangeName"));
        data.setMarketCap(metric(summary.path("marketCap")));
        data.setPe(metric(summary.path("trailingPE")));
        data.setPb(metric(keyStatistics.path("priceToBook")));
        data.setRoe(metric(financials.path("returnOnEquity")));
        data.setRoic(metric(financials.path("returnOnInvestedCapital")));
        data.setBeta(metric(summary.path("beta")));
        data.setDividendYield(metric(summary.path("dividendYield")));
        data.setAnnualDividend(metric(summary.path("dividendRate")));
        return data;
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
        return fetchJson(url, symbol);
    }

    private JsonNode fetchJson(String url, String symbol) {
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

    private String firstText(JsonNode node, String... names) {
        for (String name : names) {
            String value = text(node.path(name));
            if (value != null) return value;
        }
        return null;
    }

    private String text(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) return null;
        if (node.isTextual()) return node.asText();
        JsonNode fmt = node.path("fmt");
        return fmt.isTextual() ? fmt.asText() : null;
    }

    private BigDecimal metric(JsonNode node) {
        if (node != null && node.hasNonNull("raw")) return bd(node.path("raw"));
        return bd(node);
    }

    private BigDecimal bd(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) return null;
        if (!node.isNumber() && !node.isTextual()) return null;
        try {
            return new BigDecimal(node.asText());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
