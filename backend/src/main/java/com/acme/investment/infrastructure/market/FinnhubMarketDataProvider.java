package com.acme.investment.infrastructure.market;

import com.acme.investment.domain.market.HistoricalPrice;
import com.acme.investment.domain.market.MarketData;
import com.acme.investment.domain.market.MarketDataProvider;
import com.acme.investment.domain.market.Quote;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Component("finnhubMarketDataProvider")
public class FinnhubMarketDataProvider implements MarketDataProvider {

    private final RestTemplate restTemplate;
    private final String apiKey;
    private final String baseUrl = "https://finnhub.io/api/v1";

    public FinnhubMarketDataProvider(
            RestTemplate restTemplate,
            @Value("${finnhub.api.key:demo}") String apiKey) {
        this.restTemplate = restTemplate;
        this.apiKey = apiKey;
    }

    @Override
    public MarketData getFundamentalsAndProfile(String symbol) {
        // Only used as fallback. Fetch basic profile from Finnhub /stock/profile2
        String url = baseUrl + "/stock/profile2?symbol=" + symbol + "&token=" + apiKey;
        Map<String, Object> response = executeWithBackoff(url);
        
        if (response == null || response.isEmpty()) {
            return null;
        }

        MarketData md = new MarketData();
        md.setSymbol(symbol);
        md.setName((String) response.get("name"));
        md.setExchange((String) response.get("exchange"));
        md.setIndustry((String) response.get("finnhubIndustry"));
        md.setCountry((String) response.get("country"));
        
        // Convert market capitalization (Finnhub returns it in Millions, FMP in absolute value)
        BigDecimal mCap = toBigDecimal(response.get("marketCapitalization"));
        if (mCap != null) {
            md.setMarketCap(mCap.multiply(new BigDecimal("1000000")));
        }

        // Fetch fundamental metrics from Finnhub /stock/metric
        String metricUrl = baseUrl + "/stock/metric?symbol=" + symbol + "&metric=all&token=" + apiKey;
        Map<String, Object> metricResp = executeWithBackoff(metricUrl);
        if (metricResp != null && metricResp.containsKey("metric")) {
            Map<String, Object> metrics = mapValue(metricResp.get("metric"));
            if (metrics != null) {
                md.setPe(toBigDecimal(metrics.get("peBasicShareTTM")));
                md.setForwardPe(toBigDecimal(metrics.get("forwardPE")));
                md.setPb(toBigDecimal(metrics.get("pbNormalisedTTM")));
                md.setPs(toBigDecimal(metrics.get("psTTM")));
                md.setEps(toBigDecimal(metrics.get("epsBasicExclExtraItemsTTM")));
                md.setRoe(toBigDecimal(metrics.get("roeTTM")));
                md.setBeta(toBigDecimal(metrics.get("beta")));
                md.setDividendYield(toBigDecimal(metrics.get("dividendYieldIndicatedAnnual")));
                md.setAnnualDividend(toBigDecimal(metrics.get("dividendPerShareTTM")));
            }
        }

        return md;
    }

    @Override
    public MarketData getAnalystConsensus(String symbol) {
        // Finnhub is PRIMARY for Analyst Consensus
        // Endpoint: /stock/recommendation
        String url = baseUrl + "/stock/recommendation?symbol=" + symbol + "&token=" + apiKey;
        Object responseObj = executeWithBackoffForList(url);
        
        if (!(responseObj instanceof List)) {
            return null;
        }
        
        if (!(responseObj instanceof List<?> rawList)) {
            return null;
        }

        List<Map<String, Object>> list = rawList.stream()
                .map(this::mapValue)
                .filter(item -> item != null && !item.isEmpty())
                .toList();
        if (list.isEmpty()) return null;

        // Take the latest recommendation
        Map<String, Object> latest = list.get(0);
        
        MarketData md = new MarketData();
        md.setSymbol(symbol);
        md.setBuyCount(toLong(latest.get("buy")) + toLong(latest.get("strongBuy")));
        md.setHoldCount(toLong(latest.get("hold")));
        md.setSellCount(toLong(latest.get("sell")) + toLong(latest.get("strongSell")));
        
        // Target Price: /stock/price-target
        String tpUrl = baseUrl + "/stock/price-target?symbol=" + symbol + "&token=" + apiKey;
        Map<String, Object> tpResp = executeWithBackoff(tpUrl);
        if (tpResp != null) {
            md.setTargetPrice(toBigDecimal(tpResp.get("targetMean")));
        }

        // Determine Consensus String manually
        long totalBuy = md.getBuyCount() != null ? md.getBuyCount() : 0;
        long totalSell = md.getSellCount() != null ? md.getSellCount() : 0;
        long totalHold = md.getHoldCount() != null ? md.getHoldCount() : 0;
        
        if (totalBuy > totalSell && totalBuy >= totalHold) md.setRecommendation("BUY");
        else if (totalSell > totalBuy && totalSell >= totalHold) md.setRecommendation("SELL");
        else if (totalHold > 0) md.setRecommendation("HOLD");

        return md;
    }

    @Override
    public List<HistoricalPrice> getHistoricalPrices(String symbol) {
        long to = System.currentTimeMillis() / 1000;
        long from = to - (180 * 24 * 60 * 60); // approx 6 months
        String url = baseUrl + "/stock/candle?symbol=" + symbol + "&resolution=D&from=" + from + "&to=" + to + "&token=" + apiKey;
        Map<String, Object> response = executeWithBackoff(url);

        if (response == null || !"ok".equals(response.get("s"))) {
            return new java.util.ArrayList<>();
        }

        List<HistoricalPrice> prices = new java.util.ArrayList<>();
        List<Number> closePrices = listValue(response.get("c"));
        List<Number> timestamps = listValue(response.get("t"));
        
        if (closePrices != null && timestamps != null && closePrices.size() == timestamps.size()) {
            for (int i = 0; i < closePrices.size(); i++) {
                java.time.LocalDate date = java.time.Instant.ofEpochSecond(timestamps.get(i).longValue())
                        .atZone(java.time.ZoneId.systemDefault())
                        .toLocalDate();
                java.math.BigDecimal close = new java.math.BigDecimal(closePrices.get(i).toString());
                prices.add(new HistoricalPrice(date, close));
            }
        }
        return prices;
    }

    @Override
    public Quote getQuote(String symbol) {
        String url = baseUrl + "/quote?symbol=" + symbol + "&token=" + apiKey;
        Map<String, Object> response = executeWithBackoff(url);
        if (response == null || response.isEmpty()) {
            return null;
        }
        BigDecimal price = toBigDecimal(response.get("c"));
        if (price == null) {
            return null;
        }
        return new Quote(symbol, price, java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC));
    }

    private Map<String, Object> executeWithBackoff(String url) {
        return execute(url, Map.class);
    }

    private Object executeWithBackoffForList(String url) {
        return execute(url, List.class);
    }

    private <T> T execute(String url, Class<T> responseType) {
        int maxAttempts = 2;
        int delayMs = 1000;
        
        for (int i = 0; i < maxAttempts; i++) {
            try {
                return restTemplate.getForObject(url, responseType);
            } catch (HttpClientErrorException e) {
                if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                    if (i == maxAttempts - 1) throw e;
                    try {
                        Thread.sleep(delayMs);
                        delayMs *= 2; // Exponential backoff
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException(ie);
                    }
                } else {
                    throw e; // Not a 429, fail immediately
                }
            }
        }
        return null;
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return null;
        try {
            return new BigDecimal(val.toString());
        } catch (Exception e) {
            return null;
        }
    }

    private Long toLong(Object val) {
        if (val == null) return null;
        try {
            return Long.parseLong(val.toString());
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> mapValue(Object value) {
        return value instanceof Map<?, ?> ? (Map<String, Object>) value : null;
    }

    @SuppressWarnings("unchecked")
    private List<Number> listValue(Object value) {
        return value instanceof List<?> ? (List<Number>) value : null;
    }
}
