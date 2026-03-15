# Story 0 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-0.md`.

This is the foundation story for Epic 1. Deliver the shared package skeleton,
type surface, result/error primitives, constants, fixtures, and helper
infrastructure that later stories depend on. Stay within Story 0 and do not
start implementing operational behavior from Stories 1-5.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-0.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md` with emphasis on Chunk 0 infrastructure, data contracts, and shared module boundaries
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md` with emphasis on fixture architecture, helper contracts, and downstream test layout
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-0.md`, the infrastructure and data-contract sections of `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md`, and the fixture/helper guidance in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Establish the shared `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline and project configuration this epic assumes, keeping Node `>=24`, ESM-only TypeScript, `tsc`, `tsx`, Vitest, Biome, `citty`, and `zod` aligned with the live package.
- Add the Story 0 type and helper surface, including `EngineResult<T>`, `EngineError`, `EngineErrorCode`, `NotImplementedError`, `ok()`, `err()`, and `STRUCTURAL_FILES`.
- Create the fixture repos, docs-output fixtures, config fixtures, and test helpers in the shapes the test plan expects.
- Keep module boundaries aligned with the tech design instead of inventing parallel foundations.
- Avoid operational logic from later stories.

## Non-Goals / Boundaries

- Configuration resolution, environment checks, structural analysis, metadata/status operations, or validation logic
- Premature TDD cycles for unfinished operations; this story is primarily foundation and scaffolding
- Extra dependencies beyond the settled stack unless the spec clearly requires them

## Verification Expectations

- Run `tsc --noEmit` and the project’s Biome-based verification path if available.
- Verify the new types export cleanly and the fixture directories/helpers match the test-plan layout.
- There is no dedicated story-sized TC chunk here; if you add narrow tests for helpers or schemas, keep them story-local and minimal.
- Report what you verified and what you could not verify yet.

## Expected Deliverable

- Foundation code and fixtures
- Any narrow helper/schema tests you added
- Short verification summary
- Note blockers or partials
