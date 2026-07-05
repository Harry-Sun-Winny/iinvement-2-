package com.acme.investment.domain.market;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class Quote {
    private String symbol;
    private BigDecimal price;
    private OffsetDateTime timestamp;

    public Quote() {}

    public Quote(String symbol, BigDecimal price, OffsetDateTime timestamp) {
        this.symbol = symbol;
        this.price = price;
        this.timestamp = timestamp;
    }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public OffsetDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(OffsetDateTime timestamp) { this.timestamp = timestamp; }
}
