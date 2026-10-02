# Research Intelligence Database Update

## Summary

Migrations `V18__research_intelligence_foundation.sql` through `V21__map_live_research_parameters.sql` add the storage foundation for governed investment research runs.

## Tables Added

### `research_analysis_runs`

Stores one point-in-time research run per symbol and methodology version.

Key fields:

- `symbol`
- `as_of`
- `methodology_version`
- `data_version`
- `status`
- `confidence`
- `coverage`
- `warnings`
- `user_id` — required owner of the snapshot; all history queries filter by it

### `research_parameter_observations`

Stores parameter-level observations captured during a research run.

Key fields:

- `run_id`
- `parameter_code`
- `raw_value`
- `normalized_score`
- `state`
- `evidence_status`
- `data_quality`
- `effective_weight`
- `warnings`
- `source_name`, `source_url`, `observed_at`, and `source_fields` — point-in-time provenance retained with the observation

### `research_parameter_definitions`

Stores the seeded 3,600-row structural dictionary.

Key fields:

- `code`
- `module_id`
- `concept_index`
- `lens`
- `concept`
- `definition_text`
- `activation_condition`
- `role`
- `base_weight`
- `catalog_status`
- `methodology_version`

## Catalog Import and Integrity

`V19` creates the complete 3,600-code structural skeleton. An Admin then imports the approved DOCX dictionary through `POST /api/v1/research/catalog/import`.

- The importer parses only `word/document.xml` inside the DOCX, with external XML entities disabled.
- It accepts only the exact 3,600 codes `M1-001` through `M12-300`; partial, duplicate, or malformed files fail before any row is changed.
- The operation is an atomic upsert, does not retain the uploaded document, and writes an `IMPORT` audit-log entry.
- Imported rows are marked `DOCUMENTED_PENDING_SOURCE_MAPPING`. Documentation does not imply a live data mapping or a score contribution.

## Privacy and Provenance

- `V20` makes `research_analysis_runs.user_id` mandatory. A run belongs to the caller who created it; repository queries use `(user_id, symbol, as_of)`.
- `V21` applies the approved `IIE-0.2` live-provider proxy mappings to `M7-001` (P/E), `M7-011` (P/B), `M6-006` (ROE), `M6-001` (ROIC), `M10-156` (beta), and `M7-036` (dividend yield). These rows are `SOURCE_MAPPED_PROXY`; the other rows remain pending a source mapping.
- A research `GET` is read-only. Only `POST /api/v1/research/{symbol}/runs` creates a persisted run.
- Provider name, direct source URL, exact source field, and retrieval timestamp are stored per observation. One provider response is selected for a run, so each live proxy has field-level attribution rather than an ambiguous merged-provider chain.

## Governance Notes

- Coverage and confidence are stored explicitly and must not be inferred from final score alone.
- Missing observations are preserved as first-class outcomes rather than silently defaulted.
- This foundation supports future auditability of why a research score was or was not issued.
- A score remains a research aid, not a trading instruction, profit guarantee, or factual price prediction.
