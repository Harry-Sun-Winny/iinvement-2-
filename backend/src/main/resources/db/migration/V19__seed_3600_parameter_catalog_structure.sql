CREATE TABLE research_parameter_definitions (
    code VARCHAR(16) PRIMARY KEY,
    module_id VARCHAR(8) NOT NULL,
    concept_index SMALLINT NOT NULL,
    lens VARCHAR(16) NOT NULL,
    concept VARCHAR(255),
    definition_text TEXT,
    activation_condition TEXT,
    role VARCHAR(64),
    base_weight NUMERIC(12,8) NOT NULL DEFAULT 0,
    catalog_status VARCHAR(32) NOT NULL DEFAULT 'MISSING_DATA_MAPPING',
    methodology_version VARCHAR(40) NOT NULL DEFAULT 'IIE-0.1',
    UNIQUE(module_id, concept_index, lens)
);

WITH modules AS (
    SELECT generate_series(1, 12) AS module_no
), parameters AS (
    SELECT module_no, generate_series(1, 300) AS parameter_no
    FROM modules
)
INSERT INTO research_parameter_definitions (code, module_id, concept_index, lens)
SELECT
    format('M%s-%s', module_no, lpad(parameter_no::text, 3, '0')),
    format('M%s', module_no),
    ((parameter_no - 1) / 5) + 1,
    CASE ((parameter_no - 1) % 5)
        WHEN 0 THEN 'CURRENT'
        WHEN 1 THEN 'TREND'
        WHEN 2 THEN 'PEER'
        WHEN 3 THEN 'DURABILITY'
        ELSE 'SCENARIO'
    END
FROM parameters;

COMMENT ON TABLE research_parameter_definitions IS
    'Structural import of the 3,600-parameter dictionary. Rows require source/data mapping before activation.';
