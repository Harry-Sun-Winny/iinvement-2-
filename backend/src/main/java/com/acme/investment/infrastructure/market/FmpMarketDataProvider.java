package com.acme.investment.infrastructure.market;

import com.acme.investment.domain.market.HistoricalPrice;
import com.acme.investment.domain.market.MarketData;
import com.acme.investment.domain.market.MarketDataProvider;
import com.acme.investment.domain.market.Quote;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component("fmpMarketDataProvider")
public class FmpMarketDataProvider implements MarketDataProvider {
    private static final Logger log = LoggerFactory.getLogger(FmpMarketDataProvider.class);

    private final RestTemplate restTemplate;
    private final String apiKey;
    private static final String BASE_URL = "https://financialmodelingprep.com/stable";

    public FmpMarketDataProvider(
            RestTemplate restTemplate,
            @Value("${fmp.api.key:}") String apiKey) {
        this.restTemplate = restTemplate;
        this.apiKey = apiKey;
    }

    @Override
    public MarketData getFundamentalsAndProfile(String symbol) {
        String normalizedSymbol = normalizeSymbol(symbol);
        Map<String, Object> profile = getFirstRow("profile", normalizedSymbol);
        Map<String, Object> ratios = getFirstRow("ratios", normalizedSymbol);
        Map<String, Object> metrics = getFirstRow("key-metrics", normalizedSymbol);

        if (profile == null && ratios == null && metrics == null) {
            return null;
        }

        MarketData md = new MarketData();
        md.setSymbol(normalizedSymbol);

        if (profile != null) {
            md.setName(stringOrNull(firstNonNull(profile, "companyName", "companyNameLong", "name")));
            md.setSector((String) profile.get("sector"));
            md.setIndustry((String) profile.get("industry"));
            md.setCountry((String) profile.get("country"));
            md.setExchange(stringOrNull(firstNonNull(profile, "exchangeShortName", "exchange")));
            md.setMarketCap(toBigDecimal(firstNonNull(profile, "mktCap", "marketCap")));
            md.setBeta(toBigDecimal(profile.get("beta")));
            md.setAnnualDividend(toBigDecimal(firstNonNull(profile, "lastDiv", "dividendPerShare")));
        }

        if (ratios != null) {
            md.setPe(toBigDecimal(firstNonNull(ratios, "priceEarningsRatioTTM", "priceToEarningsRatio", "priceEarningsRatio")));
            md.setForwardPe(toBigDecimal(firstNonNull(ratios, "priceEarningsToGrowthRatioTTM", "priceToEarningsGrowthRatio", "priceToEarningsGrowthRatio")));
            md.setPb(toBigDecimal(firstNonNull(ratios, "priceToBookRatioTTM", "priceToBookRatio")));
            md.setPs(toBigDecimal(firstNonNull(ratios, "priceToSalesRatioTTM", "priceToSalesRatio")));
            md.setRoe(toBigDecimal(firstNonNull(ratios, "returnOnEquityTTM", "returnOnEquity")));
            md.setRoic(toBigDecimal(firstNonNull(ratios, "returnOnCapitalEmployedTTM", "returnOnCapitalEmployed")));
            md.setDividendYield(toBigDecimal(firstNonNull(ratios, "dividendYieldTTM", "dividendYield")));
        }

        if (metrics != null) {
            md.setEnterpriseValue(toBigDecimal(firstNonNull(metrics, "enterpriseValueTTM", "enterpriseValue")));
            md.setEps(toBigDecimal(firstNonNull(metrics, "netIncomePerShareTTM", "netIncomePerShare", "eps")));
        }

        log.debug(
                "FMP stable fundamentals mapped for {}: profileKeys={}, ratiosKeys={}, metricsKeys={}",
                normalizedSymbol,
                describeKeys(profile),
                describeKeys(ratios),
                describeKeys(metrics)
        );

        return md;
    }

    @Override
    public MarketData getAnalystConsensus(String symbol) {
        return null;
    }

    @Override
    public List<HistoricalPrice> getHistoricalPrices(String symbol) {
        String normalizedSymbol = normalizeSymbol(symbol);
        String url = buildUrl("historical-price-eod/light", normalizedSymbol);
        List<Map<String, Object>> response = executeWithBackoffList(url);

        List<HistoricalPrice> prices = new ArrayList<>();
        int count = 0;
        for (Map<String, Object> item : response) {
            if (count >= 125) break; // Limit to 6 months
            LocalDate date = LocalDate.parse((String) item.get("date"));
            BigDecimal close = toBigDecimal(item.get("price"));
            prices.add(new HistoricalPrice(date, close));
            count++;
        }
        log.debug("FMP stable history mapped for {}: {} rows", normalizedSymbol, prices.size());
        return prices;
    }

    @Override
    public Quote getQuote(String symbol) {
        String normalizedSymbol = normalizeSymbol(symbol);
        Map<String, Object> quoteData = getFirstRow("quote", normalizedSymbol);
        if (quoteData == null) {
            return null;
        }
        BigDecimal price = toBigDecimal(quoteData.get("price"));
        if (price == null) {
            return null;
        }
        return new Quote(normalizedSymbol, price, java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC));
    }

    private Map<String, Object> getFirstRow(String path, String symbol) {
        List<Map<String, Object>> rows = executeWithBackoffList(buildUrl(path, symbol));
        return rows.isEmpty() ? null : rows.get(0);
    }

    private String buildUrl(String path, String symbol) {
        String encodedSymbol = UriUtils.encodeQueryParam(symbol, StandardCharsets.UTF_8);
        String encodedApiKey = UriUtils.encodeQueryParam(apiKey, StandardCharsets.UTF_8);
        return BASE_URL + "/" + path + "?symbol=" + encodedSymbol + "&apikey=" + encodedApiKey;
    }

    private String normalizeSymbol(String symbol) {
        return symbol == null ? "" : symbol.trim().toUpperCase();
    }

    private List<Map<String, Object>> executeWithBackoffList(String url) {
        Object response = executeWithBackoff(url);
        if (response instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return Collections.emptyList();
    }

    private Object executeWithBackoff(String url) {
        int maxAttempts = 2;
        int delayMs = 1000;

        for (int i = 0; i < maxAttempts; i++) {
            try {
                return restTemplate.getForObject(url, Object.class);
            } catch (HttpClientErrorException e) {
                if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                    log.warn("FMP rate limited on attempt {} for {}", i + 1, redactApiKey(url));
                    if (i == maxAttempts - 1) throw e;
                    try {
                        Thread.sleep(delayMs);
                        delayMs *= 2; // Exponential backoff
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException(ie);
                    }
                } else {
                    log.warn("FMP request failed with status {} for {}", e.getStatusCode().value(), redactApiKey(url));
                    throw e; // Not a 429, fail immediately
                }
            }
        }
        return null;
    }

    private Object firstNonNull(Map<String, Object> data, String... keys) {
        if (data == null) {
            return null;
        }
        for (String key : keys) {
            Object value = data.get(key);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String stringOrNull(Object value) {
        return value == null ? null : value.toString();
    }

    private String describeKeys(Map<String, Object> data) {
        if (data == null || data.isEmpty()) {
            return "none";
        }
        return data.keySet().stream().sorted().limit(8).toList().toString();
    }

    private String redactApiKey(String url) {
        return url.replaceAll("apikey=[^&]+", "apikey=REDACTED");
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return null;
        try {
            return new BigDecimal(val.toString());
        } catch (Exception e) {
            return null;
        }
    }
}
