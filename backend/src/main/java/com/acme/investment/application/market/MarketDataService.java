package com.acme.investment.application.market;

import com.acme.investment.domain.market.HistoricalPrice;
import com.acme.investment.domain.market.MarketData;
import com.acme.investment.domain.market.MarketDataProvider;
import com.acme.investment.domain.market.Quote;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

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
        try {
            MarketData data = fmpProvider.getFundamentalsAndProfile(symbol);
            if (data == null) throw new RuntimeException("Empty");
            return data;
        } catch (Exception e) {
            log.warn("FMP fundamentals failed for {}, switching to Finnhub: {}", symbol, e.getMessage());
            // Fallback to Finnhub if FMP fails
            try {
                return finnhubProvider.getFundamentalsAndProfile(symbol);
            } catch (Exception fallbackEx) {
                // Return empty rather than throwing, cache handles it or throws exception up
                throw new RuntimeException("Both FMP and Finnhub failed to fetch fundamentals for " + symbol, fallbackEx);
            }
        }
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
            System.err.println("[MarketDataService] Failed to fetch fundamentals for " + symbol + ":");
            e.printStackTrace();
        }

        // 2. Analyst Consensus (Finnhub primary)
        try {
            MarketData consensus = getAnalystConsensus(symbol);
            if (consensus != null) {
                mergeMarketData(result, consensus);
            }
        } catch (Exception e) {
            System.err.println("[MarketDataService] Failed to fetch consensus for " + symbol + ":");
            e.printStackTrace();
        }

        // 3. Historical Prices (FMP primary)
        try {
            List<HistoricalPrice> history = getHistoricalPrices(symbol);
            result.setHistoricalPrices(history);
        } catch (Exception e) {
            System.err.println("[MarketDataService] Failed to fetch historical prices for " + symbol + ":");
            e.printStackTrace();
        }

        // 4. Quote (FMP primary -> Finnhub fallback -> Yahoo fallback)
        try {
            Quote quote = getQuote(symbol);
            result.setQuote(quote);
        } catch (Exception e) {
            System.err.println("[MarketDataService] Failed to fetch quote for " + symbol + ":");
            e.printStackTrace();
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
}
