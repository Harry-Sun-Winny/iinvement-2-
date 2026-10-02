ALTER TABLE research_analysis_runs
    ADD COLUMN user_id UUID REFERENCES users(id);

ALTER TABLE research_analysis_runs
    ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX idx_research_runs_user_symbol_as_of
    ON research_analysis_runs(user_id, symbol, as_of DESC);

ALTER TABLE research_parameter_observations
    ADD COLUMN source_name VARCHAR(160),
    ADD COLUMN source_url TEXT,
    ADD COLUMN observed_at TIMESTAMPTZ,
    ADD COLUMN source_fields JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN research_analysis_runs.user_id IS
    'Owner of the private research snapshot. Historical research must never be shared across users.';
COMMENT ON COLUMN research_parameter_observations.source_name IS
    'Provider or source system that produced the observation.';
COMMENT ON COLUMN research_parameter_observations.source_url IS
    'Provider documentation or source URL when attribution is available.';
