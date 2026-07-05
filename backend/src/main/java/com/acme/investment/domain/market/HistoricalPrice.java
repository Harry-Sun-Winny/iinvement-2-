package com.acme.investment.domain.market;

import java.math.BigDecimal;
import java.time.LocalDate;

public class HistoricalPrice {
    
    private LocalDate date;
    private BigDecimal close;

    public HistoricalPrice() {}

    public HistoricalPrice(LocalDate date, BigDecimal close) {
        this.date = date;
        this.close = close;
    }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public BigDecimal getClose() { return close; }
    public void setClose(BigDecimal close) { this.close = close; }
}
