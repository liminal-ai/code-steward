# Story 6 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-6.md`.

Deliver failure handling across all pipeline stages: typed diagnostics,
`failedStage`, partial-output preservation, failed progress events, and failure
result assembly. This story wraps the existing pipeline; it should not redesign
the pipeline itself.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-6.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md` with emphasis on the error-response contracts, `Chunk 6: Recovery & Failure Handling`, and the `RunContext` failure-assembly notes
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md` with emphasis on `Chunk 6: Recovery & Failure Handling`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-6.md`, `Chunk 6` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md`, and `Chunk 6` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Add failure handling at each orchestration stage without breaking the settled success path.
- Preserve partial outputs as specified, avoid writing metadata on failed runs, and emit the final `"failed"` progress event.
- Assemble the discriminated-union failure result with the diagnostic fields the story requires.
- Keep shared result-shape concerns aligned with Story 3 where ownership overlaps.
- Implement the mapped tests in `test/orchestration/failure.test.ts`.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

## Non-Goals / Boundaries

- Retry logic
- Cleanup of partial output
- Redesigning existing generation, update, or quality-review stage behavior beyond failure wrapping

## Verification Expectations

- Run the targeted failure-handling test file and `tsc --noEmit` if feasible.
- Verify per-stage failures, partial-output preservation, final failed events, and shared `TC-3.5a` behavior where applicable.
- Keep stage failures driven by mocks as the test plan expects instead of introducing hard-to-control live dependencies.
- Report what was verified versus not verified.

## Expected Deliverable

- Failure-handling implementation
- Matching tests for mapped TC and non-TC cases
- Short verification summary
- Note blockers or partials
