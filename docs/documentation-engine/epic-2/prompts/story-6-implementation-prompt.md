# Story 6 Implementation Prompt

## Task

Implement exactly `../stories/story-6.md`.

Deliver failure handling across all pipeline stages: typed diagnostics,
`failedStage`, partial-output preservation, failed progress events, and failure
result assembly. This story wraps the existing pipeline; it should not redesign
the pipeline itself.

## Read These First

- `../stories/story-6.md`
- `../tech-design.md` with emphasis on the error-response contracts, `Chunk 6: Recovery & Failure Handling`, and the `RunContext` failure-assembly notes
- `../test-plan.md` with emphasis on `Chunk 6: Recovery & Failure Handling`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-6.md`, `Chunk 6` in `../tech-design.md`, and `Chunk 6` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Add failure handling at each orchestration stage without breaking the settled success path.
- Preserve partial outputs as specified, avoid writing metadata on failed runs, and emit the final `"failed"` progress event.
- Assemble the discriminated-union failure result with the diagnostic fields the story requires.
- Keep shared result-shape concerns aligned with Story 3 where ownership overlaps.
- Implement the mapped tests in `test/orchestration/failure.test.ts`.

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
