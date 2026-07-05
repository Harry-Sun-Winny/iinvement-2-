package com.acme.investment.domain.market;

import java.math.BigDecimal;
import java.util.List;

public class MarketData {

    private String symbol;
    private String name;

    // Profile
    private String sector;
    private String industry;
    private String country;
    private String exchange;

    // Fundamentals
    private BigDecimal marketCap;
    private BigDecimal enterpriseValue;
    private BigDecimal pe;
    private BigDecimal forwardPe;
    private BigDecimal pb;
    private BigDecimal ps;
    private BigDecimal eps;
    private BigDecimal roe;
    private BigDecimal roic;
    private BigDecimal beta;
    private BigDecimal dividendYield;
    private BigDecimal annualDividend;

    // Analyst Consensus
    private String recommendation;
    private BigDecimal targetPrice;
    private Long buyCount;
    private Long holdCount;
    private Long sellCount;

    // History
    private List<HistoricalPrice> historicalPrices;

    // Current EOD Quote
    private Quote quote;

    public MarketData() {}

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }

    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getExchange() { return exchange; }
    public void setExchange(String exchange) { this.exchange = exchange; }

    public BigDecimal getMarketCap() { return marketCap; }
    public void setMarketCap(BigDecimal marketCap) { this.marketCap = marketCap; }

    public BigDecimal getEnterpriseValue() { return enterpriseValue; }
    public void setEnterpriseValue(BigDecimal enterpriseValue) { this.enterpriseValue = enterpriseValue; }

    public BigDecimal getPe() { return pe; }
    public void setPe(BigDecimal pe) { this.pe = pe; }

    public BigDecimal getForwardPe() { return forwardPe; }
    public void setForwardPe(BigDecimal forwardPe) { this.forwardPe = forwardPe; }

    public BigDecimal getPb() { return pb; }
    public void setPb(BigDecimal pb) { this.pb = pb; }

    public BigDecimal getPs() { return ps; }
    public void setPs(BigDecimal ps) { this.ps = ps; }

    public BigDecimal getEps() { return eps; }
    public void setEps(BigDecimal eps) { this.eps = eps; }

    public BigDecimal getRoe() { return roe; }
    public void setRoe(BigDecimal roe) { this.roe = roe; }

    public BigDecimal getRoic() { return roic; }
    public void setRoic(BigDecimal roic) { this.roic = roic; }

    public BigDecimal getBeta() { return beta; }
    public void setBeta(BigDecimal beta) { this.beta = beta; }

    public BigDecimal getDividendYield() { return dividendYield; }
    public void setDividendYield(BigDecimal dividendYield) { this.dividendYield = dividendYield; }

    public BigDecimal getAnnualDividend() { return annualDividend; }
    public void setAnnualDividend(BigDecimal annualDividend) { this.annualDividend = annualDividend; }

    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }

    public BigDecimal getTargetPrice() { return targetPrice; }
    public void setTargetPrice(BigDecimal targetPrice) { this.targetPrice = targetPrice; }

    public Long getBuyCount() { return buyCount; }
    public void setBuyCount(Long buyCount) { this.buyCount = buyCount; }

    public Long getHoldCount() { return holdCount; }
    public void setHoldCount(Long holdCount) { this.holdCount = holdCount; }

    public Long getSellCount() { return sellCount; }
    public void setSellCount(Long sellCount) { this.sellCount = sellCount; }

    public List<HistoricalPrice> getHistoricalPrices() { return historicalPrices; }
    public void setHistoricalPrices(List<HistoricalPrice> historicalPrices) { this.historicalPrices = historicalPrices; }

    public Quote getQuote() { return quote; }
    public void setQuote(Quote quote) { this.quote = quote; }
}
