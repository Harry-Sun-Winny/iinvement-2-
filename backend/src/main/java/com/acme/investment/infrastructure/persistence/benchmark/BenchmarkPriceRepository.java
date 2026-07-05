package com.acme.investment.infrastructure.persistence.benchmark;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public interface BenchmarkPriceRepository extends JpaRepository<BenchmarkPriceEntity, UUID> {

    List<BenchmarkPriceEntity> findBySymbolAndPriceDateIn(String symbol, List<LocalDate> dates);

    default Map<LocalDate, java.math.BigDecimal> findCloseMapByBenchmarkCodeAndDates(
            String symbol, List<LocalDate> dates) {
        return findBySymbolAndPriceDateIn(symbol, dates).stream()
                .collect(Collectors.toMap(BenchmarkPriceEntity::getPriceDate, BenchmarkPriceEntity::getClosePrice));
    }
}
