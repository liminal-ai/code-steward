# Story 5 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-5.md`.

Deliver incremental update mode: prior-state validation, change detection,
affected-module mapping, selective regeneration, overview-regeneration rules,
update-specific result fields, update-specific progress sequencing, update-mode
per-module progress counts, and post-update validation against the full output
directory. Stay within update mode and do not turn this into re-clustering or
manual-edit preservation work.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-5.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md` with emphasis on `Flow 5: Update Mode — Change Detection and Mapping` and `Chunk 5: Incremental Update`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md` with emphasis on `Chunk 5: Incremental Update`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-5.md`, `Flow 5` and `Chunk 5` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md`, and `Chunk 5` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Implement `mode: "update"` on top of the settled generation, progress, and quality-review foundations from prior stories.
- Use stored metadata and stored module plans to compute affected modules and drive selective regeneration.
- Implement the update-specific progress stages, affected-module progress counts, full-output validation reuse, and result fields this story owns.
- Keep git/change-detection behavior aligned with the designed adapter boundaries.
- Implement the mapped tests in `test/orchestration/update.test.ts`.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

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
