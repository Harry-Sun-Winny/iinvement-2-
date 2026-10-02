CREATE TABLE research_analysis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(32) NOT NULL,
    as_of TIMESTAMPTZ NOT NULL,
    methodology_version VARCHAR(40) NOT NULL,
    data_version VARCHAR(80) NOT NULL,
    status VARCHAR(32) NOT NULL,
    confidence NUMERIC(8,6) NOT NULL,
    coverage NUMERIC(8,6) NOT NULL,
    warnings JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_research_runs_symbol_as_of ON research_analysis_runs(symbol, as_of DESC);

CREATE TABLE research_parameter_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES research_analysis_runs(id) ON DELETE CASCADE,
    parameter_code VARCHAR(100) NOT NULL,
    raw_value JSONB,
    normalized_score NUMERIC(8,4),
    state VARCHAR(16) NOT NULL,
    evidence_status VARCHAR(16) NOT NULL,
    data_quality NUMERIC(8,6) NOT NULL,
    effective_weight NUMERIC(12,8) NOT NULL,
    warnings JSONB NOT NULL DEFAULT '[]'
);
CREATE INDEX idx_research_observations_run ON research_parameter_observations(run_id);
