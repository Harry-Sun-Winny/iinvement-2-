package com.acme.investment.application.market;

import com.acme.investment.domain.market.HistoricalPrice;
import com.acme.investment.domain.market.MarketData;
import com.acme.investment.domain.market.MarketDataProvider;
import com.acme.investment.domain.market.Quote;
import java.time.OffsetDateTime;
import java.util.HashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class MarketDataService {
    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);

    private final MarketDataProvider fmpProvider;
    private final MarketDataProvider finnhubProvider;
    private final MarketDataProvider yahooProvider;

    public MarketDataService(
            @Qualifier("fmpMarketDataProvider") MarketDataProvider fmpProvider,
            @Qualifier("finnhubMarketDataProvider") MarketDataProvider finnhubProvider,
            @Qualifier("yahooMarketDataProvider") MarketDataProvider yahooProvider) {
        this.fmpProvider = fmpProvider;
        this.finnhubProvider = finnhubProvider;
        this.yahooProvider = yahooProvider;
    }

    /**
     * Cache Profile + Fundamentals
     */
    @Cacheable(value = "marketFundamentals", key = "#symbol", unless = "#result == null")
    public MarketData getFundamentals(String symbol) {
        return loadFundamentalsWithProvenance(symbol).data();
    }

    /**
     * Research needs provider attribution retained at field level. This deliberately uses one
     * fundamentals provider response rather than the merged market view, so a citation is never
     * guessed after fallback data has been combined.
     */
    public ResearchMarketData getResearchMarketData(String symbol) {
        try {
            ProviderMarketData providerData = loadFundamentalsWithProvenance(symbol);
            Map<String, FieldProvenance> provenance = new HashMap<>();
            addFundamentalProvenance(provenance, "pe", providerData.data().getPe(), providerData);
            addFundamentalProvenance(provenance, "pb", providerData.data().getPb(), providerData);
            addFundamentalProvenance(provenance, "roe", providerData.data().getRoe(), providerData);
            addFundamentalProvenance(provenance, "roic", providerData.data().getRoic(), providerData);
            addFundamentalProvenance(provenance, "beta", providerData.data().getBeta(), providerData);
            addFundamentalProvenance(provenance, "dividendYield", providerData.data().getDividendYield(), providerData);
            return new ResearchMarketData(providerData.data(), provenance, providerData.dataVersion());
        } catch (Exception exception) {
            log.error("[MarketDataService] Research fundamentals failed for {}", symbol, exception);
            MarketData unavailable = new MarketData();
            unavailable.setSymbol(symbol);
            return new ResearchMarketData(unavailable, Map.of(), "market-provider-unavailable");
        }
    }

    private ProviderMarketData loadFundamentalsWithProvenance(String symbol) {
        OffsetDateTime retrievedAt = OffsetDateTime.now();
        try {
            MarketData data = fmpProvider.getFundamentalsAndProfile(symbol);
            if (data == null) throw new RuntimeException("Empty");
            return new ProviderMarketData(data, "Financial Modeling Prep", "https://financialmodelingprep.com/",
                    "FMP", retrievedAt, "market-provider-fmp-live");
        } catch (Exception e) {
            log.warn("FMP fundamentals failed for {}, switching to Finnhub: {}", symbol, e.getMessage());
            try {
                MarketData data = finnhubProvider.getFundamentalsAndProfile(symbol);
                if (data == null) throw new RuntimeException("Empty");
                return new ProviderMarketData(data, "Finnhub", "https://finnhub.io/", "FINNHUB", retrievedAt,
                        "market-provider-finnhub-fallback");
            } catch (Exception fallbackEx) {
                log.warn("Finnhub fundamentals failed for {}, switching to Yahoo Finance: {}", symbol, fallbackEx.getMessage());
                try {
                    MarketData data = yahooProvider.getFundamentalsAndProfile(symbol);
                    if (data == null) throw new RuntimeException("Empty");
                    return new ProviderMarketData(data, "Yahoo Finance", "https://finance.yahoo.com/quote/" + symbol,
                            "YAHOO", retrievedAt, "market-provider-yahoo-fallback");
                } catch (Exception yahooEx) {
                    throw new RuntimeException("FMP, Finnhub, and Yahoo failed to fetch fundamentals for " + symbol, yahooEx);
                }
            }
        }
    }

    private void addFundamentalProvenance(Map<String, FieldProvenance> provenance, String field,
                                          Object value, ProviderMarketData providerData) {
        if (value == null) {
            return;
        }
        provenance.put(field, new FieldProvenance(providerData.sourceName(), providerData.sourceUrl(),
                providerData.retrievedAt(), sourceFields(providerData.providerId(), field)));
    }

    private List<String> sourceFields(String providerId, String field) {
        if ("FMP".equals(providerId)) {
            return switch (field) {
                case "pe" -> List.of("ratios.priceEarningsRatioTTM");
                case "pb" -> List.of("ratios.priceToBookRatioTTM");
                case "roe" -> List.of("ratios.returnOnEquityTTM");
                case "roic" -> List.of("ratios.returnOnCapitalEmployedTTM");
                case "beta" -> List.of("profile.beta");
                case "dividendYield" -> List.of("ratios.dividendYieldTTM");
                default -> List.of(field);
            };
        }
        if ("YAHOO".equals(providerId)) {
            return switch (field) {
                case "pe" -> List.of("summaryDetail.trailingPE");
                case "pb" -> List.of("defaultKeyStatistics.priceToBook");
                case "roe" -> List.of("financialData.returnOnEquity");
                case "roic" -> List.of("financialData.returnOnInvestedCapital");
                case "beta" -> List.of("summaryDetail.beta");
                case "dividendYield" -> List.of("summaryDetail.dividendYield");
                default -> List.of(field);
            };
        }
        return switch (field) {
            case "pe" -> List.of("metric.peBasicShareTTM");
            case "pb" -> List.of("metric.pbNormalisedTTM");
            case "roe" -> List.of("metric.roeTTM");
            case "beta" -> List.of("metric.beta");
            case "dividendYield" -> List.of("metric.dividendYieldIndicatedAnnual");
            default -> List.of(field);
        };
    }

    /**
     * Cache Analyst Consensus
     */
    @Cacheable(value = "marketConsensus", key = "#symbol", unless = "#result == null")
    public MarketData getAnalystConsensus(String symbol) {
        try {
            return finnhubProvider.getAnalystConsensus(symbol);
        } catch (Exception e) {
            throw new RuntimeException("Finnhub failed to fetch analyst consensus for " + symbol, e);
        }
    }

    /**
     * Cache Historical Prices
     */
    @Cacheable(value = "marketHistory", key = "#symbol", unless = "#result == null || #result.isEmpty()")
    public List<HistoricalPrice> getHistoricalPrices(String symbol) {
        try {
            // Yahoo is primary, free, has no key limits, and is extremely fast.
            List<HistoricalPrice> data = yahooProvider.getHistoricalPrices(symbol);
            if (data == null || data.isEmpty()) throw new RuntimeException("Empty");
            return data;
        } catch (Exception e) {
            log.warn("Yahoo historical prices failed for {}, trying FMP: {}", symbol, e.getMessage());
            try {
                List<HistoricalPrice> data = fmpProvider.getHistoricalPrices(symbol);
                if (data == null || data.isEmpty()) throw new RuntimeException("Empty");
                return data;
            } catch (Exception fallbackEx) {
                log.warn("FMP historical prices failed for {}, trying Finnhub: {}", symbol, fallbackEx.getMessage());
                try {
                    return finnhubProvider.getHistoricalPrices(symbol);
                } catch (Exception lastEx) {
                    throw new RuntimeException("All historical price providers failed for " + symbol, lastEx);
                }
            }
        }
    }

    @Cacheable(value = "marketQuote", key = "#symbol", unless = "#result == null")
    public Quote getQuote(String symbol) {
        try {
            // Yahoo is primary, free, and does not rate-limit requests.
            return yahooProvider.getQuote(symbol);
        } catch (Exception e) {
            log.warn("Yahoo quote failed for {}, trying FMP: {}", symbol, e.getMessage());
            try {
                Quote q = fmpProvider.getQuote(symbol);
                if (q == null) throw new RuntimeException("FMP quote empty");
                return q;
            } catch (Exception ex) {
                log.warn("FMP quote failed for {}, trying Finnhub: {}", symbol, ex.getMessage());
                try {
                    Quote q = finnhubProvider.getQuote(symbol);
                    if (q == null) throw new RuntimeException("Finnhub quote empty");
                    return q;
                } catch (Exception lastEx) {
                    throw new RuntimeException("All quote providers failed for " + symbol, lastEx);
                }
            }
        }
    }

    /**
     * Unified method combining all data for the frontend.
     * We don't cache this unified object directly because the parts have different TTLs.
     * We call the cached granular methods.
     */
    public MarketData getUnifiedMarketData(String symbol) {
        MarketData result = new MarketData();
        result.setSymbol(symbol);

        // 1. Fundamentals (FMP primary)
        try {
            MarketData fundamentals = getFundamentals(symbol);
            if (fundamentals != null) {
                mergeMarketData(result, fundamentals);
            }
        } catch (Exception e) {
            log.error("[MarketDataService] Failed to fetch fundamentals for {}", symbol, e);
        }

        // 2. Analyst Consensus (Finnhub primary)
        try {
            MarketData consensus = getAnalystConsensus(symbol);
            if (consensus != null) {
                mergeMarketData(result, consensus);
            }
        } catch (Exception e) {
            log.error("[MarketDataService] Failed to fetch consensus for {}", symbol, e);
        }

        // 3. Historical Prices (FMP primary)
        try {
            List<HistoricalPrice> history = getHistoricalPrices(symbol);
            result.setHistoricalPrices(history);
        } catch (Exception e) {
            log.error("[MarketDataService] Failed to fetch historical prices for {}", symbol, e);
        }

        // 4. Quote (FMP primary -> Finnhub fallback -> Yahoo fallback)
        try {
            Quote quote = getQuote(symbol);
            result.setQuote(quote);
        } catch (Exception e) {
            log.error("[MarketDataService] Failed to fetch quote for {}", symbol, e);
        }

        return result;
    }

    private void mergeMarketData(MarketData target, MarketData source) {
        if (source.getName() != null) target.setName(source.getName());
        if (source.getSector() != null) target.setSector(source.getSector());
        if (source.getIndustry() != null) target.setIndustry(source.getIndustry());
        if (source.getCountry() != null) target.setCountry(source.getCountry());
        if (source.getExchange() != null) target.setExchange(source.getExchange());
        if (source.getMarketCap() != null) target.setMarketCap(source.getMarketCap());
        if (source.getEnterpriseValue() != null) target.setEnterpriseValue(source.getEnterpriseValue());
        if (source.getPe() != null) target.setPe(source.getPe());
        if (source.getForwardPe() != null) target.setForwardPe(source.getForwardPe());
        if (source.getPb() != null) target.setPb(source.getPb());
        if (source.getPs() != null) target.setPs(source.getPs());
        if (source.getEps() != null) target.setEps(source.getEps());
        if (source.getRoe() != null) target.setRoe(source.getRoe());
        if (source.getRoic() != null) target.setRoic(source.getRoic());
        if (source.getBeta() != null) target.setBeta(source.getBeta());
        if (source.getDividendYield() != null) target.setDividendYield(source.getDividendYield());
        if (source.getAnnualDividend() != null) target.setAnnualDividend(source.getAnnualDividend());
        if (source.getRecommendation() != null) target.setRecommendation(source.getRecommendation());
        if (source.getTargetPrice() != null) target.setTargetPrice(source.getTargetPrice());
        if (source.getBuyCount() != null) target.setBuyCount(source.getBuyCount());
        if (source.getHoldCount() != null) target.setHoldCount(source.getHoldCount());
        if (source.getSellCount() != null) target.setSellCount(source.getSellCount());
    }

    private record ProviderMarketData(MarketData data, String sourceName, String sourceUrl, String providerId,
                                      OffsetDateTime retrievedAt, String dataVersion) { }

    public record ResearchMarketData(MarketData data, Map<String, FieldProvenance> fieldProvenance,
                                     String dataVersion) {
        public ResearchMarketData {
            fieldProvenance = Map.copyOf(fieldProvenance);
        }
    }

    public record FieldProvenance(String sourceName, String sourceUrl, OffsetDateTime observedAt,
                                  List<String> sourceFields) { }
}
