package com.acme.investment.infrastructure.persistence.research;

import com.acme.investment.infrastructure.persistence.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "research_analysis_runs")
public class ResearchAnalysisRunEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(nullable = false, length = 32)
    private String symbol;

    @Column(name = "as_of", nullable = false)
    private OffsetDateTime asOf;

    @Column(name = "methodology_version", nullable = false, length = 40)
    private String methodologyVersion;

    @Column(name = "data_version", nullable = false, length = 80)
    private String dataVersion;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(nullable = false)
    private double confidence;

    @Column(nullable = false)
    private double coverage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<String> warnings = List.of();

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    public UUID getId() { return id; }
    public UserEntity getUser() { return user; }
    public void setUser(UserEntity user) { this.user = user; }
    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public OffsetDateTime getAsOf() { return asOf; }
    public void setAsOf(OffsetDateTime asOf) { this.asOf = asOf; }
    public String getMethodologyVersion() { return methodologyVersion; }
    public void setMethodologyVersion(String methodologyVersion) { this.methodologyVersion = methodologyVersion; }
    public String getDataVersion() { return dataVersion; }
    public void setDataVersion(String dataVersion) { this.dataVersion = dataVersion; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public double getConfidence() { return confidence; }
    public void setConfidence(double confidence) { this.confidence = confidence; }
    public double getCoverage() { return coverage; }
    public void setCoverage(double coverage) { this.coverage = coverage; }
    public List<String> getWarnings() { return warnings; }
    public void setWarnings(List<String> warnings) { this.warnings = warnings == null ? List.of() : List.copyOf(warnings); }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
