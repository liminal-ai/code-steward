# Story 3 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-3.md`.

Deliver typed progress events, `runId` correlation, success-path result
assembly, warning aggregation, and all-or-nothing cost tracking for the
full-generation pipeline. Keep this story focused on progress and result
assembly, not on update-specific stages/counts, quality-review stage events, or
failure-result expansion.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-3.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md` with emphasis on `Flow 1` progress annotations, `Chunk 3: Progress & Result Assembly`, and the callback/cost sections
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md` with emphasis on `Chunk 3: Progress & Result Assembly`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-3.md`, `Chunk 3` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md`, and `Chunk 3` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Emit stage-aware progress events from the existing full-generation pipeline surfaces this story owns, while keeping the shared contracts reusable by Story 5.
- Keep `runId` consistent across events and the final result.
- Assemble the successful result shape completely, including warning aggregation and the all-or-nothing `costUsd` behavior.
- Preserve defensive behavior around absent callbacks and callback failures.
- Implement the mapped tests in `test/orchestration/progress.test.ts`.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

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
