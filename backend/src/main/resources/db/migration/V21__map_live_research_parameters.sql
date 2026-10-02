UPDATE research_parameter_definitions
SET base_weight = CASE code
        WHEN 'M7-001' THEN 0.22
        WHEN 'M7-011' THEN 0.12
        WHEN 'M6-006' THEN 0.22
        WHEN 'M6-001' THEN 0.22
        WHEN 'M10-156' THEN 0.10
        WHEN 'M7-036' THEN 0.12
    END,
    catalog_status = 'SOURCE_MAPPED_PROXY',
    methodology_version = 'IIE-0.2'
WHERE code IN ('M7-001', 'M7-011', 'M6-006', 'M6-001', 'M10-156', 'M7-036');

COMMENT ON TABLE research_parameter_definitions IS
    '3,600-parameter research dictionary. Six parameters have an approved live provider proxy mapping in IIE-0.2.';
