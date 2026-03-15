# Story 6 Implementation Prompt

## Task

Implement exactly `../stories/story-6.md`.

Deliver failure, recovery, and operator-feedback verification across CLI and
SDK consumption paths. This story is mostly about making existing error and
state behavior consistent and testable, not about inventing new runtime error
systems.

## Read These First

- `../stories/story-6.md`
- `../tech-design.md` with emphasis on `Flow 5: Failure, Recovery, and Operator Feedback` and `Chunk 6: Failure, Recovery, and Operator Feedback`
- `../test-plan.md` with emphasis on `Chunk 6: Failure, Recovery, and Operator Feedback`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-6.md`, `Flow 5` and `Chunk 6` in `../tech-design.md`, and `Chunk 6` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Make CLI and SDK failure surfacing consistent for the scenarios the story owns.
- Preserve and expose actionable recovery information, including `failedStage`, guidance text, and post-failure status behavior.
- Reuse the existing `EngineError` and `EngineErrorCode` model instead of inventing parallel error types.
- Keep this work focused on consistency and verification across existing modules; new modules should be minimal or unnecessary.
- Implement the mapped tests in `test/cli/failure.test.ts` and `test/integration/failure.test.ts`.

## Non-Goals / Boundaries

- Re-implementing the core error handling already delivered by earlier stories
- New error-type hierarchies
- Publish implementation work beyond failure verification of the existing publish path

## Verification Expectations

- Run the mapped failure tests, `tsc --noEmit`, and the relevant build step if feasible.
- Verify CLI/SDK parity, recovery guidance, metadata/status preservation, and repeated-failure behavior.
- Keep failure scenarios driven by the controlled mocked/test-fixture setup from the test plan.
- Report what was verified versus not verified.

## Expected Deliverable

- Failure/recovery consistency updates
- Matching CLI and integration failure tests
- Short verification summary
- Note blockers or partials
