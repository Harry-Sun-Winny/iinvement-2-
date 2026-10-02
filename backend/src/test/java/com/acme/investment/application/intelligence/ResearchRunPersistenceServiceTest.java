package com.acme.investment.application.intelligence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.acme.investment.infrastructure.persistence.UserEntity;
import com.acme.investment.infrastructure.persistence.UserJpaRepository;
import com.acme.investment.infrastructure.persistence.research.ResearchAnalysisRunEntity;
import com.acme.investment.infrastructure.persistence.research.ResearchAnalysisRunJpaRepository;
import com.acme.investment.infrastructure.persistence.research.ResearchParameterObservationEntity;
import com.acme.investment.infrastructure.persistence.research.ResearchParameterObservationJpaRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ResearchRunPersistenceServiceTest {
    @Test
    void recordsOwnerRunAndObservationProvenanceTogether() {
        ResearchAnalysisRunJpaRepository runRepository = mock(ResearchAnalysisRunJpaRepository.class);
        ResearchParameterObservationJpaRepository observationRepository = mock(ResearchParameterObservationJpaRepository.class);
        UserJpaRepository userRepository = mock(UserJpaRepository.class);
        ResearchRunPersistenceService service = new ResearchRunPersistenceService(runRepository, observationRepository, userRepository);
        UUID userId = UUID.randomUUID();
        UUID runId = UUID.randomUUID();
        UserEntity user = mock(UserEntity.class);
        ResearchAnalysisRunEntity savedRun = mock(ResearchAnalysisRunEntity.class);
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(runRepository.save(any(ResearchAnalysisRunEntity.class))).thenReturn(savedRun);
        when(savedRun.getId()).thenReturn(runId);

        OffsetDateTime asOf = OffsetDateTime.parse("2026-07-24T00:00:00+07:00");
        var citation = new ResearchIntelligenceService.EvidenceCitation("Provider", "https://example.test/source", asOf, List.of("pe"));
        var observation = new ResearchIntelligenceService.Observation("valuation.pe", "VALUATION", .22,
                BigDecimal.valueOf(12.3), 72d, ResearchIntelligenceService.State.ACTIVE,
                ResearchIntelligenceService.EvidenceStatus.PROXY, .7, .1232, List.of("Proxy"), citation);
        var response = new ResearchIntelligenceService.ResearchResponse("AAPL", asOf, "IIE-0.1", "provider-v1",
                new ResearchIntelligenceService.CompanyProfile("AAPL", "Technology", null, null, null, "OPERATING"),
                .5, .35, "PASS_WITH_WARNINGS", List.of("Coverage"), List.of(observation), List.of(), null);

        UUID result = service.record(userId, response);

        assertEquals(runId, result);
        ArgumentCaptor<ResearchAnalysisRunEntity> runCaptor = ArgumentCaptor.forClass(ResearchAnalysisRunEntity.class);
        verify(runRepository).save(runCaptor.capture());
        assertEquals(user, runCaptor.getValue().getUser());
        assertEquals("AAPL", runCaptor.getValue().getSymbol());
        assertEquals(.5, runCaptor.getValue().getCoverage());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ResearchParameterObservationEntity>> observations = ArgumentCaptor.forClass(List.class);
        verify(observationRepository).saveAll(observations.capture());
        ResearchParameterObservationEntity stored = observations.getValue().get(0);
        assertEquals(runId, stored.getRunId());
        assertEquals("Provider", stored.getSourceName());
        assertEquals("https://example.test/source", stored.getSourceUrl());
        assertEquals(List.of("pe"), stored.getSourceFields());
        assertEquals(BigDecimal.valueOf(12.3), stored.getRawValue().get("value"));
    }
}
