
package com.acme.investment.application.holding;

import com.acme.investment.domain.holding.Holding;
import com.acme.investment.infrastructure.persistence.asset.AssetEntity;
import com.acme.investment.infrastructure.persistence.asset.AssetJpaRepository;
import com.acme.investment.infrastructure.persistence.holding.PortfolioPositionEntity;
import com.acme.investment.infrastructure.persistence.holding.PortfolioPositionJpaRepository;
import com.acme.investment.infrastructure.persistence.portfolio.PortfolioEntity;
import com.acme.investment.infrastructure.persistence.portfolio.PortfolioJpaRepository;
import com.acme.investment.infrastructure.persistence.transaction.TransactionEntity;
import com.acme.investment.infrastructure.persistence.transaction.TransactionJpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class HoldingService {
    private final PortfolioPositionJpaRepository positionRepo;
    private final TransactionJpaRepository transactionRepo;
    private final PortfolioJpaRepository portfolioRepo;
    private final AssetJpaRepository assetRepo;

    public HoldingService(PortfolioPositionJpaRepository positionRepo,
                          TransactionJpaRepository transactionRepo,
                          PortfolioJpaRepository portfolioRepo,
                          AssetJpaRepository assetRepo) {
        this.positionRepo = positionRepo;
        this.transactionRepo = transactionRepo;
        this.portfolioRepo = portfolioRepo;
        this.assetRepo = assetRepo;
    }

    @Transactional(readOnly = true)
    public List<Holding> listByPortfolio(UUID portfolioId, UUID userId) {
        requireOwnedPortfolio(portfolioId, userId);
        return positionRepo.findByPortfolioId(portfolioId).stream()
                .map(PortfolioPositionEntity::toDomain).toList();
    }

    @Transactional
    public void recalculate(UUID portfolioId) {
        PortfolioEntity portfolio = portfolioRepo.findById(portfolioId).orElseThrow();
        positionRepo.deleteByPortfolioId(portfolioId);
        positionRepo.flush();

        List<TransactionEntity> txs = transactionRepo.findByPortfolioId(portfolioId);
        txs.sort(Comparator.comparing(TransactionEntity::getTransactionDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(TransactionEntity::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));

        Map<String, BigDecimal> qty = new HashMap<>();
        Map<String, BigDecimal> costBasis = new HashMap<>();

        for (TransactionEntity tx : txs) {
            String symbol = tx.getAssetSymbol().toUpperCase();
            BigDecimal q = tx.getQuantity();
            if ("BUY".equals(tx.getType())) {
                BigDecimal prevQty = qty.getOrDefault(symbol, BigDecimal.ZERO);
                BigDecimal prevCost = costBasis.getOrDefault(symbol, BigDecimal.ZERO);
                BigDecimal addedCost = q.multiply(tx.getPrice());
                BigDecimal newQty = prevQty.add(q);
                costBasis.put(symbol, prevCost.add(addedCost));
                qty.put(symbol, newQty);
            } else if ("SELL".equals(tx.getType())) {
                BigDecimal prevQty = qty.getOrDefault(symbol, BigDecimal.ZERO);
                if (q.compareTo(prevQty) > 0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Sell quantity exceeds holdings for " + symbol);
                }
                BigDecimal prevCost = costBasis.getOrDefault(symbol, BigDecimal.ZERO);
                if (prevQty.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal costReduction = prevCost.multiply(q)
                            .divide(prevQty, 8, RoundingMode.HALF_UP);
                    costBasis.put(symbol, prevCost.subtract(costReduction));
                }
                qty.put(symbol, prevQty.subtract(q));
            }
        }

        for (Map.Entry<String, BigDecimal> entry : qty.entrySet()) {
            BigDecimal quantity = entry.getValue();
            if (quantity.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            AssetEntity asset = assetRepo.findBySymbolIgnoreCase(entry.getKey()).orElse(null);
            if (asset == null) {
                continue;
            }
            BigDecimal totalCost = costBasis.getOrDefault(entry.getKey(), BigDecimal.ZERO);
            BigDecimal avgCost = totalCost.divide(quantity, 8, RoundingMode.HALF_UP);

            PortfolioPositionEntity pos = new PortfolioPositionEntity();
            pos.setPortfolio(portfolio);
            pos.setAsset(asset);
            pos.setQuantity(quantity);
            pos.setAverageCost(avgCost);
            positionRepo.saveAndFlush(pos);
        }
    }

    private PortfolioEntity requireOwnedPortfolio(UUID portfolioId, UUID userId) {
        return portfolioRepo.findById(portfolioId)
                .filter(p -> p.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}



