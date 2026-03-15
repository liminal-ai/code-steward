# Story 6 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-6.md`.

Deliver failure, recovery, and operator-feedback verification across CLI and
SDK consumption paths. This story is mostly about making existing error and
state behavior consistent and testable, not about inventing new runtime error
systems.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-6.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/tech-design.md` with emphasis on `Flow 5: Failure, Recovery, and Operator Feedback` and `Chunk 6: Failure, Recovery, and Operator Feedback`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/test-plan.md` with emphasis on `Chunk 6: Failure, Recovery, and Operator Feedback`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-6.md`, `Flow 5` and `Chunk 6` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/tech-design.md`, and `Chunk 6` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Make CLI and SDK failure surfacing consistent for the scenarios the story owns.
- Preserve and expose actionable recovery information, including `failedStage`, guidance text, and post-failure status behavior.
- Reuse the existing `EngineError` and `EngineErrorCode` model instead of inventing parallel error types.
- Keep this work focused on consistency and verification across existing modules; new modules should be minimal or unnecessary.
- Implement the mapped tests in `test/cli/failure.test.ts` and `test/integration/failure.test.ts`.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

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
