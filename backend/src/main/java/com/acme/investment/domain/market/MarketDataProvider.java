package com.acme.investment.domain.market;

import java.util.List;

public interface MarketDataProvider {
    /**
     * Gets fundamental data and company profile.
     * Expected to populate fields like P/E, Beta, Market Cap, etc.
     * Returns a partially populated MarketData object.
     */
    MarketData getFundamentalsAndProfile(String symbol);

    /**
     * Gets analyst consensus and recommendations.
     * Expected to populate fields like targetPrice, recommendation, buyCount, etc.
     */
    MarketData getAnalystConsensus(String symbol);

    /**
     * Gets historical daily prices.
     */
    List<HistoricalPrice> getHistoricalPrices(String symbol);

    /**
     * Gets a single live/real-time quote.
     */
    Quote getQuote(String symbol);

    /**
     * Batch queries multiple symbols for quotes.
     */
    default List<Quote> getQuotesBatch(List<String> symbols) {
        return symbols.stream().map(this::getQuote).filter(java.util.Objects::nonNull).toList();
    }
}
