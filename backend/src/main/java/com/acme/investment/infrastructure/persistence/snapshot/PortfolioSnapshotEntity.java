package com.acme.investment.infrastructure.persistence.snapshot;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "portfolio_snapshots")
public class PortfolioSnapshotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "portfolio_id", nullable = false)
    private UUID portfolioId;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "invested_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal investedAmount;

    @Column(name = "portfolio_value", nullable = false, precision = 19, scale = 4)
    private BigDecimal portfolioValue;

    @Column(name = "cash_balance", precision = 19, scale = 4)
    private BigDecimal cashBalance;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getPortfolioId() {
        return portfolioId;
    }

    public void setPortfolioId(UUID portfolioId) {
        this.portfolioId = portfolioId;
    }

    public LocalDate getSnapshotDate() {
        return snapshotDate;
    }

    public void setSnapshotDate(LocalDate snapshotDate) {
        this.snapshotDate = snapshotDate;
    }

    public BigDecimal getInvestedAmount() {
        return investedAmount;
    }

    public void setInvestedAmount(BigDecimal investedAmount) {
        this.investedAmount = investedAmount;
    }

    public BigDecimal getPortfolioValue() {
        return portfolioValue;
    }

    public void setPortfolioValue(BigDecimal portfolioValue) {
        this.portfolioValue = portfolioValue;
    }

    public BigDecimal getCashBalance() {
        return cashBalance;
    }

    public void setCashBalance(BigDecimal cashBalance) {
        this.cashBalance = cashBalance;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    // Compatibility aliases for B's calculations
    public BigDecimal getTotalValue() {
        return portfolioValue;
    }

    public void setTotalValue(BigDecimal totalValue) {
        this.portfolioValue = totalValue;
    }

    public BigDecimal getTotalCost() {
        return investedAmount;
    }

    public void setTotalCost(BigDecimal totalCost) {
        this.investedAmount = totalCost;
    }

    // ---------------------------------------------------------------------
    // Compatibility shim for the merged Project B backfill implementation.
    //
    // Project A's portfolio_snapshots schema does not contain
    // realized_pnl or unrealized_pnl columns.
    //
    // These methods exist only to preserve binary/source compatibility
    // with code imported from Project B.
    //
    // The setters are intentionally no-ops because these values are not
    // persisted in Project A.
    //
    // Do NOT use these methods as a source of persisted financial data.
    //
    // If snapshot P&L needs to be persisted in the future,
    // introduce a proper Flyway migration and map real database columns
    // instead of extending this compatibility shim.
    // ---------------------------------------------------------------------
    public BigDecimal getRealizedPnl() {
        return BigDecimal.ZERO;
    }

    public void setRealizedPnl(BigDecimal realizedPnl) {}

    public BigDecimal getUnrealizedPnl() {
        return portfolioValue != null && investedAmount != null ? portfolioValue.subtract(investedAmount) : BigDecimal.ZERO;
    }

    public void setUnrealizedPnl(BigDecimal unrealizedPnl) {}
}
