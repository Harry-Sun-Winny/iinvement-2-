package com.acme.investment.application.intelligence;

import com.acme.investment.infrastructure.persistence.UserJpaRepository;
import com.acme.investment.infrastructure.persistence.research.ResearchAnalysisRunEntity;
import com.acme.investment.infrastructure.persistence.research.ResearchAnalysisRunJpaRepository;
import com.acme.investment.infrastructure.persistence.research.ResearchParameterObservationEntity;
import com.acme.investment.infrastructure.persistence.research.ResearchParameterObservationJpaRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Stores immutable, user-scoped research snapshots. GET endpoints remain side-effect free. */
@Service
public class ResearchRunPersistenceService {
    private final ResearchAnalysisRunJpaRepository runRepository;
    private final ResearchParameterObservationJpaRepository observationRepository;
    private final UserJpaRepository userRepository;

    public ResearchRunPersistenceService(ResearchAnalysisRunJpaRepository runRepository,
                                         ResearchParameterObservationJpaRepository observationRepository,
                                         UserJpaRepository userRepository) {
        this.runRepository = runRepository;
        this.observationRepository = observationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public UUID record(UUID userId, ResearchIntelligenceService.ResearchResponse response) {
        ResearchAnalysisRunEntity run = new ResearchAnalysisRunEntity();
        run.setUser(userRepository.getReferenceById(userId));
        run.setSymbol(response.symbol());
        run.setAsOf(response.asOf());
        run.setMethodologyVersion(response.methodologyVersion());
        run.setDataVersion(response.dataVersion());
        run.setStatus(response.status());
        run.setConfidence(response.confidence());
        run.setCoverage(response.coverage());
        run.setWarnings(response.warnings());
        ResearchAnalysisRunEntity saved = runRepository.save(run);

        List<ResearchParameterObservationEntity> observations = response.parameterResults().stream()
                .map(observation -> toEntity(saved.getId(), observation))
                .toList();
        observationRepository.saveAll(observations);
        return saved.getId();
    }

    @Transactional(readOnly = true)
    public Optional<PersistedResearchRun> latest(UUID userId, String symbol) {
        return runRepository.findTopByUser_IdAndSymbolOrderByAsOfDesc(userId, symbol)
                .map(run -> new PersistedResearchRun(
                        run.getId(), run.getSymbol(), run.getAsOf(), run.getMethodologyVersion(), run.getDataVersion(),
                        run.getStatus(), run.getCoverage(), run.getConfidence(), run.getWarnings(),
                        observationRepository.findByRunIdOrderByParameterCode(run.getId()).stream().map(this::toSnapshot).toList()));
    }

    private ResearchParameterObservationEntity toEntity(UUID runId, ResearchIntelligenceService.Observation observation) {
        ResearchParameterObservationEntity entity = new ResearchParameterObservationEntity();
        entity.setRunId(runId);
        entity.setParameterCode(observation.parameterCode());
        entity.setRawValue(rawValue(observation.rawValue()));
        entity.setNormalizedScore(observation.normalizedScore());
        entity.setState(observation.state().name());
        entity.setEvidenceStatus(observation.evidenceStatus().name());
        entity.setDataQuality(observation.dataQuality());
        entity.setEffectiveWeight(observation.effectiveWeight());
        entity.setWarnings(observation.warnings());
        entity.setSourceName(observation.citation().sourceName());
        entity.setSourceUrl(observation.citation().sourceUrl());
        entity.setObservedAt(observation.citation().observedAt());
        entity.setSourceFields(observation.citation().sourceFields());
        return entity;
    }

    private Map<String, Object> rawValue(BigDecimal value) {
        return value == null ? null : Map.of("value", value);
    }

    private PersistedObservation toSnapshot(ResearchParameterObservationEntity observation) {
        return new PersistedObservation(observation.getParameterCode(), observation.getRawValue(), observation.getNormalizedScore(),
                observation.getState(), observation.getEvidenceStatus(), observation.getDataQuality(), observation.getEffectiveWeight(),
                observation.getWarnings(), new ResearchIntelligenceService.EvidenceCitation(observation.getSourceName(),
                observation.getSourceUrl(), observation.getObservedAt(), observation.getSourceFields()));
    }

    public record PersistedResearchRun(UUID id, String symbol, OffsetDateTime asOf, String methodologyVersion,
                                      String dataVersion, String status, double coverage, double confidence,
                                      List<String> warnings, List<PersistedObservation> observations) { }

    public record PersistedObservation(String parameterCode, Map<String, Object> rawValue, Double normalizedScore,
                                      String state, String evidenceStatus, double dataQuality, double effectiveWeight,
                                      List<String> warnings, ResearchIntelligenceService.EvidenceCitation citation) { }
}
