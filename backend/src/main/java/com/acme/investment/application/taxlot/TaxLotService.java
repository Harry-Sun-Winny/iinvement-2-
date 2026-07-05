package com.acme.investment.application.taxlot;

import com.acme.investment.infrastructure.persistence.transaction.TransactionEntity;
import com.acme.investment.infrastructure.persistence.transaction.TransactionJpaRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.UUID;

@Service
public class TaxLotService {

    private final TransactionJpaRepository transactionRepository;

    public TaxLotService(TransactionJpaRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    private record Lot(BigDecimal quantity, BigDecimal unitCost) {}

    /**
     * Replays transaction ledger chronologically using FIFO matching.
     * Computes cost basis and realized P&L, storing realized P&L directly in database.
     */
    public BigDecimal recomputeForSymbol(UUID portfolioId, String symbol) {
        List<TransactionEntity> txns = transactionRepository
                .findByPortfolioIdAndAssetSymbolOrderByTransactionDateAscCreatedAtAsc(portfolioId, symbol);

        Deque<Lot> openLots = new ArrayDeque<>();
        BigDecimal cumulativeRealized = BigDecimal.ZERO;

        for (TransactionEntity t : txns) {
            if ("BUY".equalsIgnoreCase(t.getType())) {
                openLots.addLast(new Lot(t.getQuantity(), t.getPrice()));
                t.setRealizedPnl(BigDecimal.ZERO);
                t.setTaxLotMethod("FIFO");
                continue;
            }

            if (!"SELL".equalsIgnoreCase(t.getType())) {
                continue;
            }

            BigDecimal remainingToSell = t.getQuantity();
            BigDecimal proceedsPerShare = t.getPrice();
            BigDecimal realized = BigDecimal.ZERO;

            while (remainingToSell.signum() > 0 && !openLots.isEmpty()) {
                Lot lot = openLots.peekFirst();
                BigDecimal consumeQty = lot.quantity().min(remainingToSell);

                BigDecimal gain = proceedsPerShare.subtract(lot.unitCost())
                        .multiply(consumeQty);
                realized = realized.add(gain);

                BigDecimal remainingLotQty = lot.quantity().subtract(consumeQty);
                openLots.pollFirst();
                if (remainingLotQty.signum() > 0) {
                    openLots.addFirst(new Lot(remainingLotQty, lot.unitCost()));
                }

                remainingToSell = remainingToSell.subtract(consumeQty);
            }

            if (remainingToSell.signum() > 0) {
                throw new IllegalStateException(String.format(
                        "FIFO short-sell detected for portfolio=%s symbol=%s txn=%s: " +
                        "selling %s more shares than currently held lots cover",
                        portfolioId, symbol, t.getId(), remainingToSell));
            }

            realized = realized.subtract(t.getFee() == null ? BigDecimal.ZERO : t.getFee());
            t.setRealizedPnl(realized.setScale(8, RoundingMode.HALF_UP));
            t.setTaxLotMethod("FIFO");
            cumulativeRealized = cumulativeRealized.add(realized);
        }

        transactionRepository.saveAll(txns);
        return cumulativeRealized;
    }

    public BigDecimal recomputeForPortfolio(UUID portfolioId) {
        List<String> symbols = transactionRepository.findDistinctAssetSymbolsByPortfolioId(portfolioId);
        BigDecimal total = BigDecimal.ZERO;
        for (String symbol : symbols) {
            total = total.add(recomputeForSymbol(portfolioId, symbol));
        }
        return total;
    }
}
