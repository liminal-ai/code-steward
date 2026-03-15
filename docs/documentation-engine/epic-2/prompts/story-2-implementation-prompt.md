# Story 2 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-2.md`.

Deliver the full-generation happy path: request handling, config resolution,
environment check, structural analysis, module generation, overview generation,
tree writing, validation invocation, and metadata/module-plan persistence. Keep
the pipeline silent for now; progress/event richness and quality-review behavior
belong to later stories.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-2.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md` with emphasis on `Flow 1: Full Generation — Stage Sequence`, `Flow 3: Module Documentation Generation`, and `Chunk 2: Core Generation Pipeline`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md` with emphasis on `Chunk 2: Core Generation Pipeline`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-2.md`, the generation flows and `Chunk 2` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md`, and `Chunk 2` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Implement `generateDocumentation()` for `mode: "full"` and wire the deterministic stages in the order the design settles.
- Reuse Epic 1 operations and Epic 2 Story 1 planning rather than creating parallel code paths.
- Implement the module-doc and overview prompt builders needed for this story.
- Persist `.doc-meta.json` and `.module-plan.json` only on successful runs, and keep output structure deterministic.
- Implement the mapped tests in `test/orchestration/generate.test.ts`, including the non-TC edge cases the test plan calls out.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

## Non-Goals / Boundaries

- Rich progress/event correlation and cost tracking from Story 3
- Quality-review passes and post-review success semantics from Story 4
- Update mode from Story 5
- Comprehensive failure-mode assembly from Story 6

## Verification Expectations

- Run the targeted generation test file and `tsc --noEmit` if feasible.
- Verify complete happy-path output structure and the specified direct-failure behavior when validation errors occur before quality review exists.
- Keep Agent SDK interactions behind the mocked adapter boundary the test plan expects.
- Report what was verified versus not verified.

## Expected Deliverable

- Core full-generation implementation
- Matching tests for mapped TC and non-TC cases
- Short verification summary
- Note blockers or partials
