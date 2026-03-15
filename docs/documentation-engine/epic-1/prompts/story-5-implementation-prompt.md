# Story 5 Implementation Prompt

## Task

Implement exactly `../stories/story-5.md`.

Deliver documentation validation for an existing output directory: presence,
cross-links, metadata shape, module-tree consistency, Mermaid sanity, and the
structured pass/warn/fail result model. Keep the scope strictly to deterministic
validation.

## Read These First

- `../stories/story-5.md`
- `../tech-design.md` with emphasis on `Flow 5: Validation` and `Chunk 5: Validation`
- `../test-plan.md` with emphasis on `Chunk 5: Validation`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-5.md`, `Flow 5` in `../tech-design.md`, and `Chunk 5` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Implement `validateDocumentation()` and the deterministic checks the story enumerates.
- Reuse the shared metadata-shape validation seam from Story 4 instead of creating a competing path.
- Preserve the typed finding model, severity handling, and output-status semantics defined in the story.
- Use the prepared docs-output fixtures from the test plan and implement the mapped tests in the validation test file.
- Cover both missing-metadata and malformed-metadata behavior: `.doc-meta.json` absence remains a `missing-file` concern, while present-but-invalid metadata must produce `category: "metadata"` error findings.
- Keep the implementation deterministic and local; no model-driven repair logic belongs here.

## Non-Goals / Boundaries

- Agent-driven repair or quality-review behavior from Epic 2
- External URL validation
- Reworking metadata/status ownership from Story 4

## Verification Expectations

- Run the targeted validation test file and `tsc --noEmit` if feasible.
- Verify happy-path, warnings-only, and failure fixtures, including `corrupt-metadata`, `missing-metadata-fields`, and tree inconsistencies.
- Note any checks you could not run locally.
- Report what was verified versus not verified.

## Expected Deliverable

- Validation implementation
- Matching tests for mapped TC and non-TC cases
- Short verification summary
- Note blockers or partials
