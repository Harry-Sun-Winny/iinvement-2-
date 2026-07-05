package com.acme.investment.infrastructure.persistence.benchmark;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "benchmark_prices", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"symbol", "price_date"})
})
public class BenchmarkPriceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "symbol", nullable = false, length = 20)
    private String symbol; // SPY, VNI, etc.

    @Column(name = "price_date", nullable = false)
    private LocalDate priceDate;

    @Column(name = "close_price", nullable = false, precision = 24, scale = 8)
    private BigDecimal closePrice;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public LocalDate getPriceDate() { return priceDate; }
    public void setPriceDate(LocalDate priceDate) { this.priceDate = priceDate; }

    public BigDecimal getClosePrice() { return closePrice; }
    public void setClosePrice(BigDecimal closePrice) { this.closePrice = closePrice; }
}
