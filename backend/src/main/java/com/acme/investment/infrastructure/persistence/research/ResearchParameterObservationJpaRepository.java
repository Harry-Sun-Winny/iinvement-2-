package com.acme.investment.infrastructure.persistence.research;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResearchParameterObservationJpaRepository extends JpaRepository<ResearchParameterObservationEntity, UUID> {
    List<ResearchParameterObservationEntity> findByRunIdOrderByParameterCode(UUID runId);
}
