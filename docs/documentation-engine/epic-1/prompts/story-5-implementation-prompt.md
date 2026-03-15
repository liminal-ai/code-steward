# Story 5 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-5.md`.

Deliver documentation validation for an existing output directory: presence,
cross-links, metadata shape, module-tree consistency, Mermaid sanity, and the
structured pass/warn/fail result model. Keep the scope strictly to deterministic
validation.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-5.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md` with emphasis on `Flow 5: Validation` and `Chunk 5: Validation`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md` with emphasis on `Chunk 5: Validation`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-5.md`, `Flow 5` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md`, and `Chunk 5` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Implement `validateDocumentation()` and the deterministic checks the story enumerates.
- Reuse the shared metadata-shape validation seam from Story 4 instead of creating a competing path.
- Preserve the typed finding model, severity handling, and output-status semantics defined in the story.
- Use the prepared docs-output fixtures from the test plan and implement the mapped tests in the validation test file.
- Cover both missing-metadata and malformed-metadata behavior: `.doc-meta.json` absence remains a `missing-file` concern, while present-but-invalid metadata must produce `category: "metadata"` error findings.
- Keep the implementation deterministic and local; no model-driven repair logic belongs here.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

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
