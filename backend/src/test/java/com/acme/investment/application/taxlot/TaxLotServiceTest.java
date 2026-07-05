package com.acme.investment.application.taxlot;

import com.acme.investment.infrastructure.persistence.transaction.TransactionEntity;
import com.acme.investment.infrastructure.persistence.transaction.TransactionJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class TaxLotServiceTest {

    private TransactionJpaRepository transactionRepo;
    private TaxLotService taxLotService;

    @BeforeEach
    public void setUp() {
        transactionRepo = mock(TransactionJpaRepository.class);
        taxLotService = new TaxLotService(transactionRepo);
    }

    @Test
    public void testFifoRealizedPnlCalculation() {
        UUID portfolioId = UUID.randomUUID();
        String symbol = "AAPL";

        List<TransactionEntity> txns = new ArrayList<>();
        
        // Buy 10 AAPL at $100
        TransactionEntity buy1 = new TransactionEntity();
        buy1.setId(UUID.randomUUID());
        buy1.setType("BUY");
        buy1.setQuantity(new BigDecimal("10"));
        buy1.setPrice(new BigDecimal("100"));
        buy1.setAssetSymbol(symbol);
        buy1.setTransactionDate(LocalDate.now().minusDays(5));
        txns.add(buy1);

        // Buy 5 AAPL at $120
        TransactionEntity buy2 = new TransactionEntity();
        buy2.setId(UUID.randomUUID());
        buy2.setType("BUY");
        buy2.setQuantity(new BigDecimal("5"));
        buy2.setPrice(new BigDecimal("120"));
        buy2.setAssetSymbol(symbol);
        buy2.setTransactionDate(LocalDate.now().minusDays(4));
        txns.add(buy2);

        // Sell 12 AAPL at $130
        // FIFO consumption: 10 shares from buy1 ($100), 2 shares from buy2 ($120)
        // Profit: (130-100)*10 + (130-120)*2 = 300 + 20 = $320
        TransactionEntity sell = new TransactionEntity();
        sell.setId(UUID.randomUUID());
        sell.setType("SELL");
        sell.setQuantity(new BigDecimal("12"));
        sell.setPrice(new BigDecimal("130"));
        sell.setFee(new BigDecimal("5")); // $5 fee
        sell.setAssetSymbol(symbol);
        sell.setTransactionDate(LocalDate.now().minusDays(2));
        txns.add(sell);

        when(transactionRepo.findByPortfolioIdAndAssetSymbolOrderByTransactionDateAscCreatedAtAsc(portfolioId, symbol))
                .thenReturn(txns);

        BigDecimal totalRealized = taxLotService.recomputeForSymbol(portfolioId, symbol);

        // Realized PNL: $320 gain - $5 fee = $315
        assertEquals(0, new BigDecimal("315.00000000").compareTo(sell.getRealizedPnl()));
        assertEquals(0, new BigDecimal("315.00000000").compareTo(totalRealized));
        verify(transactionRepo, times(1)).saveAll(any());
    }
}
