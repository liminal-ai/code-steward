# Story 5 Implementation Prompt

## Task

Implement exactly `../stories/story-5.md`.

Deliver incremental update mode: prior-state validation, change detection,
affected-module mapping, selective regeneration, overview-regeneration rules,
update-specific result fields, update-specific progress sequencing, update-mode
per-module progress counts, and post-update validation against the full output
directory. Stay within update mode and do not turn this into re-clustering or
manual-edit preservation work.

## Read These First

- `../stories/story-5.md`
- `../tech-design.md` with emphasis on `Flow 5: Update Mode — Change Detection and Mapping` and `Chunk 5: Incremental Update`
- `../test-plan.md` with emphasis on `Chunk 5: Incremental Update`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-5.md`, `Flow 5` and `Chunk 5` in `../tech-design.md`, and `Chunk 5` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Implement `mode: "update"` on top of the settled generation, progress, and quality-review foundations from prior stories.
- Use stored metadata and stored module plans to compute affected modules and drive selective regeneration.
- Implement the update-specific progress stages, affected-module progress counts, full-output validation reuse, and result fields this story owns.
- Keep git/change-detection behavior aligned with the designed adapter boundaries.
- Implement the mapped tests in `test/orchestration/update.test.ts`.

## Non-Goals / Boundaries

- Re-clustering during update mode
- Manual edit preservation
- New-module creation paths that require a fresh full generation
- Reworking earlier full-generation or quality-review semantics beyond what update mode directly needs

## Verification Expectations

- Run the targeted update test file and `tsc --noEmit` if feasible.
- Verify stale-state preconditions, changed-file mapping, selective regeneration, overview-regeneration triggers, update progress sequencing, and post-update validation against the full output directory.
- Keep mocked git/analysis/Agent SDK boundaries consistent with the test plan.
- Report what was verified versus not verified.

## Expected Deliverable

- Incremental-update implementation
- Matching tests for mapped TC and non-TC cases
- Short verification summary
- Note blockers or partials
