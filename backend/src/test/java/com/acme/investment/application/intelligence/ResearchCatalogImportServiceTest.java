package com.acme.investment.application.intelligence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.isNull;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.acme.investment.application.audit.AuditLogService;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;

class ResearchCatalogImportServiceTest {
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final ResearchCatalogImportService service = new ResearchCatalogImportService(jdbcTemplate, auditLogService);

    @Test
    void parsesWordprocessingTableIntoAParameterDefinition() throws Exception {
        var entries = service.parseDocument(new ByteArrayInputStream(docx("Mức hiện tại")));

        assertEquals(1, entries.size());
        var entry = entries.get(0);
        assertEquals("M1-001", entry.code());
        assertEquals("M1", entry.moduleId());
        assertEquals(1, entry.conceptIndex());
        assertEquals("CURRENT", entry.lens());
        assertEquals("nguồn doanh thu chính", entry.concept());
        assertEquals("Bộ lọc kích hoạt", entry.role());
    }

    @Test
    void rejectsAnUnexpectedLensInsteadOfSilentlyMisclassifyingIt() throws Exception {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.parseDocument(new ByteArrayInputStream(docx("Không xác định"))));

        assertTrue(exception.getMessage().contains("Unsupported catalog lens"));
    }

    @Test
    void refusesAPartialCatalogBeforeWritingDefinitionsOrAuditRecords() throws Exception {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.importDocument(new ByteArrayInputStream(docx("Mức hiện tại")), java.util.UUID.randomUUID()));

        assertTrue(exception.getMessage().contains("Expected exactly 3,600"));
        verifyNoInteractions(jdbcTemplate, auditLogService);
    }

    @Test
    void acceptsTheExactCompleteCatalogBeforePerformingTheAtomicUpsert() throws Exception {
        var actorId = java.util.UUID.randomUUID();

        var summary = service.importDocument(new ByteArrayInputStream(completeCatalogDocx()), actorId);

        assertEquals(3_600, summary.importedEntries());
        assertEquals("DOCUMENTED_PENDING_SOURCE_MAPPING", summary.catalogStatus());
        verify(jdbcTemplate, times(2)).batchUpdate(anyString(), any(BatchPreparedStatementSetter.class));
        verify(auditLogService).log(eq(actorId), eq("RESEARCH_PARAMETER_CATALOG"), any(java.util.UUID.class),
                eq("IMPORT"), isNull(), any());
    }

    private byte[] docx(String lens) throws IOException {
        String xml = """
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                  <w:body><w:tbl><w:tr>
                    %s
                  </w:tr></w:tbl></w:body>
                </w:document>
                """.formatted(cells("M1-001", "nguồn doanh thu chính", lens,
                "Định nghĩa", "Điều kiện", "Bộ lọc kích hoạt"));
        return toDocx(xml);
    }

    private byte[] completeCatalogDocx() throws IOException {
        String[] lenses = {"Mức hiện tại", "Xu hướng", "So sánh ngành", "Độ bền", "Kịch bản"};
        StringBuilder rows = new StringBuilder();
        for (int module = 1; module <= 12; module++) {
            for (int parameter = 1; parameter <= 300; parameter++) {
                rows.append("<w:tr>").append(cells("M" + module + "-" + String.format("%03d", parameter),
                        "khái niệm " + parameter, lenses[(parameter - 1) % 5], "Định nghĩa", "Điều kiện", "Vai trò"))
                        .append("</w:tr>");
            }
        }
        return toDocx("""
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                  <w:body><w:tbl>%s</w:tbl></w:body>
                </w:document>
                """.formatted(rows));
    }

    private byte[] toDocx(String xml) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(output)) {
            zip.putNextEntry(new ZipEntry("word/document.xml"));
            zip.write(xml.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        return output.toByteArray();
    }

    private String cells(String... values) {
        StringBuilder cells = new StringBuilder();
        for (String value : values) {
            cells.append("<w:tc><w:p><w:r><w:t>").append(value)
                    .append("</w:t></w:r></w:p></w:tc>");
        }
        return cells.toString();
    }
}
