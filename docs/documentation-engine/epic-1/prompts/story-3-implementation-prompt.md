# Story 3 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-3.md`.

Deliver structural analysis as a typed SDK operation that invokes the
Python-based analyzer, normalizes its output, and returns engine-native results.
Stay within Story 3 and do not spill into Epic 2 orchestration or generation.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-3.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md` with emphasis on `Flow 3: Structural Analysis` and `Chunk 3: Structural Analysis`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md` with emphasis on `Chunk 3: Structural Analysis`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-3.md`, `Flow 3` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md`, and `Chunk 3` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Implement `analyzeRepository()` and the adapter/normalizer flow settled in the story and design.
- Preserve the intentional mixed-runtime architecture: Node/TypeScript orchestration with a Python subprocess adapter for analysis.
- Normalize raw analyzer output into the engine-native result shape, including commit hash capture and typed failure paths.
- Keep subprocess and git boundaries mockable per the test plan.
- Implement the mapped tests in the analysis test file and cover the non-TC timeout/error-shape cases the test plan calls out.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

## Non-Goals / Boundaries

- Agent-driven clustering, module planning, or documentation generation
- Repeating Story 2 environment logic except where this operation depends on its outputs or typed failures
- Replacing the analyzer with a different architecture

## Verification Expectations

- Run the targeted structural-analysis test file and `tsc --noEmit` if feasible.
- Exercise both successful normalization and adapter failure modes.
- If local analyzer smoke testing is environment-sensitive because of Python or parser installation, note that clearly; the mapped mocked tests remain authoritative.
- Report what was verified versus not verified.

## Expected Deliverable

- Structural-analysis implementation
- Matching tests for mapped TC and non-TC cases
- Short verification summary
- Note blockers or partials
