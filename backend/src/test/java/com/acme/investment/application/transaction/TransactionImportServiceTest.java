package com.acme.investment.application.transaction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class TransactionImportServiceTest {
    private final TransactionImportService service = new TransactionImportService();

    @Test
    void previewNormalizesVietnameseBuyAndDefaultsFee() {
        var preview = service.preview(List.of(new TransactionImportService.ImportRow(
                " btc-usd ", "Bitcoin", "mua", BigDecimal.TEN, BigDecimal.valueOf(65000),
                " usd ", LocalDate.of(2025, 1, 10), "broker import", null)));

        assertTrue(preview.isReadyToImport());
        assertEquals(1, preview.validRows());
        var row = preview.rows().get(0);
        assertEquals("BTC-USD", row.assetSymbol());
        assertEquals("BUY", row.type());
        assertEquals("USD", row.currency());
        assertEquals(BigDecimal.ZERO, row.fee());
    }

    @Test
    void previewReportsInvalidRowsAndNeverMarksThemReady() {
        var preview = service.preview(List.of(new TransactionImportService.ImportRow(
                "", "", "HOLD", BigDecimal.ZERO, BigDecimal.valueOf(-1), "US", null, null, BigDecimal.valueOf(-2))));

        assertFalse(preview.isReadyToImport());
        assertEquals(0, preview.validRows());
        assertEquals(1, preview.invalidRows());
        assertEquals(7, preview.issues().size());
    }

    @Test
    void previewRejectsMoreThanFiveHundredRows() {
        var row = new TransactionImportService.ImportRow("AAPL", "Apple", "BUY", BigDecimal.ONE,
                BigDecimal.ONE, "USD", LocalDate.of(2025, 1, 1), null, BigDecimal.ZERO);
        var preview = service.preview(java.util.Collections.nCopies(501, row));

        assertFalse(preview.isReadyToImport());
        assertEquals(501, preview.invalidRows());
        assertEquals(1, preview.issues().size());
    }
}