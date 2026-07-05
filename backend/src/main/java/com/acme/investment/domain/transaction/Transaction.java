package com.acme.investment.domain.transaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record Transaction(
    UUID id, UUID portfolioId,
    String assetSymbol, String assetName,
    String type, BigDecimal quantity, BigDecimal price,
    String currency, LocalDate transactionDate,
    String notes, OffsetDateTime createdAt,
    BigDecimal fee, BigDecimal realizedPnl, String taxLotMethod
) {}