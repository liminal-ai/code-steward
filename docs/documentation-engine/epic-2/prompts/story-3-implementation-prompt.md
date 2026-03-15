# Story 3 Implementation Prompt

## Task

Implement exactly `../stories/story-3.md`.

Deliver typed progress events, `runId` correlation, success-path result
assembly, warning aggregation, and all-or-nothing cost tracking for the
full-generation pipeline. Keep this story focused on progress and result
assembly, not on update-specific stages/counts, quality-review stage events, or
failure-result expansion.

## Read These First

- `../stories/story-3.md`
- `../tech-design.md` with emphasis on `Flow 1` progress annotations, `Chunk 3: Progress & Result Assembly`, and the callback/cost sections
- `../test-plan.md` with emphasis on `Chunk 3: Progress & Result Assembly`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-3.md`, `Chunk 3` in `../tech-design.md`, and `Chunk 3` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Emit stage-aware progress events from the existing full-generation pipeline surfaces this story owns, while keeping the shared contracts reusable by Story 5.
- Keep `runId` consistent across events and the final result.
- Assemble the successful result shape completely, including warning aggregation and the all-or-nothing `costUsd` behavior.
- Preserve defensive behavior around absent callbacks and callback failures.
- Implement the mapped tests in `test/orchestration/progress.test.ts`.

## Non-Goals / Boundaries

- Update-specific progress stages and update-mode per-module counts from Story 5
- Quality-review stage events from Story 4
- Full failure-result assembly from Story 6
- Reworking the core generation pipeline from Story 2

## Verification Expectations

- Run the targeted progress/result test file and `tsc --noEmit` if feasible.
- Verify stage ordering, module-level counts, `runId` correlation, and cost behavior.
- Keep failure-result behavior aligned with the story boundary; if a test crosses into Story 6 ownership, note that explicitly.
- Report what was verified versus not verified.

## Expected Deliverable

- Progress and success-result implementation
- Matching tests for mapped TC and non-TC cases
- Short verification summary
- Note blockers or partials
