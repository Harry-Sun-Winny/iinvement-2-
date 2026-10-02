package com.acme.investment.application.intelligence;

import com.acme.investment.application.audit.AuditLogService;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

/** Imports the user-supplied 3,600-parameter DOCX without storing arbitrary uploads on the server. */
@Service
public class ResearchCatalogImportService {
    private static final String WORDPROCESSING_XML = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    private static final String DOCUMENT_XML = "word/document.xml";
    private static final int EXPECTED_ENTRY_COUNT = 3_600;
    private static final int MAX_DOCUMENT_XML_BYTES = 20 * 1024 * 1024;
    private static final Pattern CODE = Pattern.compile("M(1[0-2]|[1-9])-(\\d{3})");
    private static final List<ProviderMappedParameter> PROVIDER_MAPPED_PARAMETERS = List.of(
            new ProviderMappedParameter("M7-001", .22),
            new ProviderMappedParameter("M7-011", .12),
            new ProviderMappedParameter("M6-006", .22),
            new ProviderMappedParameter("M6-001", .22),
            new ProviderMappedParameter("M10-156", .10),
            new ProviderMappedParameter("M7-036", .12));
    private static final String UPSERT = """
            INSERT INTO research_parameter_definitions
                (code, module_id, concept_index, lens, concept, definition_text, activation_condition, role,
                 catalog_status, methodology_version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DOCUMENTED_PENDING_SOURCE_MAPPING', ?)
            ON CONFLICT (code) DO UPDATE SET
                module_id = EXCLUDED.module_id,
                concept_index = EXCLUDED.concept_index,
                lens = EXCLUDED.lens,
                concept = EXCLUDED.concept,
                definition_text = EXCLUDED.definition_text,
                activation_condition = EXCLUDED.activation_condition,
                role = EXCLUDED.role,
                catalog_status = EXCLUDED.catalog_status,
                methodology_version = EXCLUDED.methodology_version
            """;

    private final JdbcTemplate jdbcTemplate;
    private final AuditLogService auditLogService;

    public ResearchCatalogImportService(JdbcTemplate jdbcTemplate, AuditLogService auditLogService) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public CatalogImportSummary importDocument(InputStream document, UUID actorId) {
        List<CatalogEntry> entries = parseDocument(document);
        validateCompleteCatalog(entries);
        jdbcTemplate.batchUpdate(UPSERT, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement statement, int index) throws SQLException {
                CatalogEntry entry = entries.get(index);
                statement.setString(1, entry.code());
                statement.setString(2, entry.moduleId());
                statement.setInt(3, entry.conceptIndex());
                statement.setString(4, entry.lens());
                statement.setString(5, entry.concept());
                statement.setString(6, entry.definition());
                statement.setString(7, entry.activationCondition());
                statement.setString(8, entry.role());
                statement.setString(9, ResearchIntelligenceService.METHODOLOGY_VERSION);
            }

            @Override
            public int getBatchSize() {
                return entries.size();
            }
        });
        applyProviderMappings();

        CatalogImportSummary summary = new CatalogImportSummary(entries.size(), ResearchIntelligenceService.METHODOLOGY_VERSION,
                OffsetDateTime.now(), "DOCUMENTED_PENDING_SOURCE_MAPPING");
        auditLogService.log(actorId, "RESEARCH_PARAMETER_CATALOG", UUID.randomUUID(), "IMPORT", null, summary);
        return summary;
    }

    private void applyProviderMappings() {
        jdbcTemplate.batchUpdate("""
                UPDATE research_parameter_definitions
                SET base_weight = ?, catalog_status = 'SOURCE_MAPPED_PROXY', methodology_version = ?
                WHERE code = ?
                """, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement statement, int index) throws SQLException {
                ProviderMappedParameter parameter = PROVIDER_MAPPED_PARAMETERS.get(index);
                statement.setDouble(1, parameter.baseWeight());
                statement.setString(2, ResearchIntelligenceService.METHODOLOGY_VERSION);
                statement.setString(3, parameter.code());
            }

            @Override
            public int getBatchSize() {
                return PROVIDER_MAPPED_PARAMETERS.size();
            }
        });
    }

    List<CatalogEntry> parseDocument(InputStream document) {
        try {
            byte[] xml = extractDocumentXml(document);
            Document parsed = secureDocumentBuilder().newDocumentBuilder().parse(new ByteArrayInputStream(xml));
            NodeList rows = parsed.getElementsByTagNameNS(WORDPROCESSING_XML, "tr");
            List<CatalogEntry> entries = new ArrayList<>();
            for (int rowIndex = 0; rowIndex < rows.getLength(); rowIndex++) {
                List<String> cells = cells((Element) rows.item(rowIndex));
                if (cells.size() < 6) {
                    continue;
                }
                Matcher matcher = CODE.matcher(cells.get(0));
                if (!matcher.matches()) {
                    continue;
                }
                int moduleNumber = Integer.parseInt(matcher.group(1));
                int parameterNumber = Integer.parseInt(matcher.group(2));
                if (parameterNumber < 1 || parameterNumber > 300) {
                    throw new IllegalArgumentException("Catalog parameter code is outside the 001-300 range: " + cells.get(0));
                }
                entries.add(new CatalogEntry(cells.get(0), "M" + moduleNumber, (parameterNumber - 1) / 5 + 1,
                        toLens(cells.get(2)), cells.get(1), cells.get(3), cells.get(4), cells.get(5)));
            }
            return entries;
        } catch (IOException | ParserConfigurationException | SAXException exception) {
            throw new IllegalArgumentException("The uploaded file is not a readable DOCX research catalog.", exception);
        }
    }

    private byte[] extractDocumentXml(InputStream document) throws IOException {
        try (ZipInputStream zip = new ZipInputStream(document)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (DOCUMENT_XML.equals(entry.getName())) {
                    ByteArrayOutputStream content = new ByteArrayOutputStream();
                    byte[] buffer = new byte[8_192];
                    int total = 0;
                    int read;
                    while ((read = zip.read(buffer)) != -1) {
                        total += read;
                        if (total > MAX_DOCUMENT_XML_BYTES) {
                            throw new IllegalArgumentException("The DOCX document.xml exceeds the import safety limit.");
                        }
                        content.write(buffer, 0, read);
                    }
                    return content.toByteArray();
                }
            }
        }
        throw new IllegalArgumentException("The uploaded file has no Word document payload.");
    }

    private DocumentBuilderFactory secureDocumentBuilder() throws ParserConfigurationException {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        return factory;
    }

    private List<String> cells(Element row) {
        List<String> cells = new ArrayList<>();
        NodeList children = row.getChildNodes();
        for (int childIndex = 0; childIndex < children.getLength(); childIndex++) {
            Node child = children.item(childIndex);
            if (child instanceof Element cell && "tc".equals(cell.getLocalName()) && WORDPROCESSING_XML.equals(cell.getNamespaceURI())) {
                NodeList textNodes = cell.getElementsByTagNameNS(WORDPROCESSING_XML, "t");
                StringBuilder text = new StringBuilder();
                for (int textIndex = 0; textIndex < textNodes.getLength(); textIndex++) {
                    text.append(textNodes.item(textIndex).getTextContent());
                }
                cells.add(normalize(text.toString()));
            }
        }
        return cells;
    }

    private String toLens(String sourceLens) {
        return switch (sourceLens) {
            case "Mức hiện tại" -> "CURRENT";
            case "Xu hướng" -> "TREND";
            case "So sánh ngành" -> "PEER";
            case "Độ bền" -> "DURABILITY";
            case "Kịch bản" -> "SCENARIO";
            default -> throw new IllegalArgumentException("Unsupported catalog lens: " + sourceLens);
        };
    }

    private void validateCompleteCatalog(List<CatalogEntry> entries) {
        if (entries.size() != EXPECTED_ENTRY_COUNT) {
            throw new IllegalArgumentException("Expected exactly 3,600 catalog rows but found " + entries.size() + ".");
        }
        Set<String> codes = new HashSet<>();
        for (CatalogEntry entry : entries) {
            if (!codes.add(entry.code())) {
                throw new IllegalArgumentException("Duplicate catalog code: " + entry.code());
            }
        }
        for (int module = 1; module <= 12; module++) {
            for (int parameter = 1; parameter <= 300; parameter++) {
                String code = "M" + module + "-" + String.format(Locale.ROOT, "%03d", parameter);
                if (!codes.contains(code)) {
                    throw new IllegalArgumentException("Missing catalog code: " + code);
                }
            }
        }
    }

    private String normalize(String value) {
        return value.replaceAll("\\s+", " ").trim();
    }

    public record CatalogEntry(String code, String moduleId, int conceptIndex, String lens, String concept,
                               String definition, String activationCondition, String role) { }

    public record CatalogImportSummary(int importedEntries, String methodologyVersion, OffsetDateTime importedAt,
                                       String catalogStatus) { }

    private record ProviderMappedParameter(String code, double baseWeight) { }
}
