# Story 4 Implementation Prompt

## Task

Implement exactly `../stories/story-4.md`.

Deliver bounded post-generation quality review on top of deterministic
validation: self-review, optional second-model review, fix-scope enforcement,
revalidation, and final validation state updates. Keep the review bounded and do
not let it become open-ended regeneration.

## Read These First

- `../stories/story-4.md`
- `../tech-design.md` with emphasis on `Flow 4: Quality Review Pipeline`, `Chunk 4: Validation & Quality Review`, and the file-patch constraints
- `../test-plan.md` with emphasis on `Chunk 4: Validation & Quality Review`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-4.md`, `Flow 4` and `Chunk 4` in `../tech-design.md`, and `Chunk 4` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Integrate Epic 1 validation into the orchestration pipeline exactly where the story expects.
- Implement bounded self-review and optional second-model review using the designed patch/fix constraints.
- Revalidate after each review pass and update final run semantics accordingly.
- Keep module plans and overall structure stable; this story fixes obvious output issues, not planning decisions.
- Keep update-mode wiring itself in Story 5; this story should expose a shared validation-and-review stage that Story 5 can reuse.
- Implement the mapped tests in `test/orchestration/quality-review.test.ts`.

## Non-Goals / Boundaries

- Module planning or generation logic from Stories 1 and 2
- Update mode ownership and post-update path verification from Story 5
- Unbounded iteration, re-clustering, or structural rewrite behavior

## Verification Expectations

- Run the targeted quality-review test file, the relevant quality-review prompt-builder structural tests, and `tsc --noEmit` if feasible.
- Verify allowed-fix enforcement, `quality-review` stage event emission when a pass runs, disabled/default behavior, and revalidation after each pass.
- Keep Agent SDK review behavior behind the mocked adapter boundary from the test plan.
- Report what was verified versus not verified.

## Expected Deliverable

- Validation-and-quality-review integration
- Matching tests for mapped TC and non-TC cases
- Short verification summary
- Note blockers or partials
