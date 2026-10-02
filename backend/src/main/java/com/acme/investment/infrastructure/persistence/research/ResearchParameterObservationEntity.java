package com.acme.investment.infrastructure.persistence.research;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "research_parameter_observations")
public class ResearchParameterObservationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "run_id", nullable = false)
    private UUID runId;

    @Column(name = "parameter_code", nullable = false, length = 100)
    private String parameterCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_value", columnDefinition = "jsonb")
    private Map<String, Object> rawValue;

    @Column(name = "normalized_score")
    private Double normalizedScore;

    @Column(nullable = false, length = 16)
    private String state;

    @Column(name = "evidence_status", nullable = false, length = 16)
    private String evidenceStatus;

    @Column(name = "data_quality", nullable = false)
    private double dataQuality;

    @Column(name = "effective_weight", nullable = false)
    private double effectiveWeight;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<String> warnings = List.of();

    @Column(name = "source_name", length = 160)
    private String sourceName;

    @Column(name = "source_url")
    private String sourceUrl;

    @Column(name = "observed_at")
    private OffsetDateTime observedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "source_fields", nullable = false, columnDefinition = "jsonb")
    private List<String> sourceFields = List.of();

    public UUID getId() { return id; }
    public UUID getRunId() { return runId; }
    public void setRunId(UUID runId) { this.runId = runId; }
    public String getParameterCode() { return parameterCode; }
    public void setParameterCode(String parameterCode) { this.parameterCode = parameterCode; }
    public Map<String, Object> getRawValue() { return rawValue; }
    public void setRawValue(Map<String, Object> rawValue) { this.rawValue = rawValue; }
    public Double getNormalizedScore() { return normalizedScore; }
    public void setNormalizedScore(Double normalizedScore) { this.normalizedScore = normalizedScore; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getEvidenceStatus() { return evidenceStatus; }
    public void setEvidenceStatus(String evidenceStatus) { this.evidenceStatus = evidenceStatus; }
    public double getDataQuality() { return dataQuality; }
    public void setDataQuality(double dataQuality) { this.dataQuality = dataQuality; }
    public double getEffectiveWeight() { return effectiveWeight; }
    public void setEffectiveWeight(double effectiveWeight) { this.effectiveWeight = effectiveWeight; }
    public List<String> getWarnings() { return warnings; }
    public void setWarnings(List<String> warnings) { this.warnings = warnings == null ? List.of() : List.copyOf(warnings); }
    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
    public OffsetDateTime getObservedAt() { return observedAt; }
    public void setObservedAt(OffsetDateTime observedAt) { this.observedAt = observedAt; }
    public List<String> getSourceFields() { return sourceFields; }
    public void setSourceFields(List<String> sourceFields) { this.sourceFields = sourceFields == null ? List.of() : List.copyOf(sourceFields); }
}
