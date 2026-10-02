package com.acme.investment.application.transaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/** Validates and normalizes broker rows. This service never writes financial data. */
@Service
public class TransactionImportService {
    private static final int MAX_ROWS = 500;
    private static final Pattern SYMBOL = Pattern.compile("[A-Z0-9._^=-]{1,32}");
    private static final Pattern CURRENCY = Pattern.compile("[A-Z]{3,5}");

    public ImportPreview preview(List<ImportRow> rows) {
        List<ImportIssue> issues = new ArrayList<>();
        List<NormalizedImportRow> normalizedRows = new ArrayList<>();
        if (rows == null || rows.isEmpty()) {
            return new ImportPreview(0, 0, 0, List.of(), List.of(new ImportIssue(0, "rows", "Can it nhat mot giao dich de nhap.")));
        }
        if (rows.size() > MAX_ROWS) {
            return new ImportPreview(rows.size(), 0, rows.size(), List.of(), List.of(new ImportIssue(0, "rows", "Moi lan chi duoc nhap toi da " + MAX_ROWS + " dong.")));
        }
        for (int index = 0; index < rows.size(); index++) {
            ImportRow row = rows.get(index);
            int rowNumber = index + 1;
            String symbol = normalize(row == null ? null : row.assetSymbol());
            String type = normalizeType(row == null ? null : row.type());
            String currency = normalize(row == null ? null : row.currency());
            int issueCountBefore = issues.size();
            if (symbol == null || !SYMBOL.matcher(symbol).matches()) issues.add(new ImportIssue(rowNumber, "assetSymbol", "Ma tai san khong hop le."));
            if (type == null) issues.add(new ImportIssue(rowNumber, "type", "Loai giao dich chi nhan MUA/BUY hoac BAN/SELL."));
            if (row == null || row.quantity() == null || row.quantity().signum() <= 0) issues.add(new ImportIssue(rowNumber, "quantity", "So luong phai lon hon 0."));
            if (row == null || row.price() == null || row.price().signum() < 0) issues.add(new ImportIssue(rowNumber, "price", "Gia khong duoc am."));
            if (currency == null || !CURRENCY.matcher(currency).matches()) issues.add(new ImportIssue(rowNumber, "currency", "Tien te phai la ma ISO, vi du USD hoac VND."));
            if (row == null || row.transactionDate() == null) issues.add(new ImportIssue(rowNumber, "transactionDate", "Thieu ngay giao dich."));
            if (row != null && row.fee() != null && row.fee().signum() < 0) issues.add(new ImportIssue(rowNumber, "fee", "Phi khong duoc am."));
            if (issues.size() == issueCountBefore) {
                String name = row.assetName() == null || row.assetName().isBlank() ? symbol : row.assetName().trim();
                normalizedRows.add(new NormalizedImportRow(symbol, name, type, row.quantity(), row.price(), currency,
                        row.transactionDate(), row.notes(), row.fee() == null ? BigDecimal.ZERO : row.fee()));
            }
        }
        return new ImportPreview(rows.size(), normalizedRows.size(), rows.size() - normalizedRows.size(), List.copyOf(normalizedRows), List.copyOf(issues));
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeType(String value) {
        String normalized = normalize(value);
        if ("BUY".equals(normalized) || "MUA".equals(normalized)) return "BUY";
        if ("SELL".equals(normalized) || "BAN".equals(normalized)) return "SELL";
        return null;
    }

    public record ImportRow(String assetSymbol, String assetName, String type, BigDecimal quantity, BigDecimal price,
                            String currency, LocalDate transactionDate, String notes, BigDecimal fee) {}
    public record NormalizedImportRow(String assetSymbol, String assetName, String type, BigDecimal quantity,
                                      BigDecimal price, String currency, LocalDate transactionDate, String notes,
                                      BigDecimal fee) {}
    public record ImportIssue(int row, String field, String message) {}
    public record ImportPreview(int totalRows, int validRows, int invalidRows,
                                List<NormalizedImportRow> rows, List<ImportIssue> issues) {
        public boolean isReadyToImport() { return invalidRows == 0 && validRows > 0; }
    }
}