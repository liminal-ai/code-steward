# Story 4 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-4.md`.

Deliver bounded post-generation quality review on top of deterministic
validation: self-review, optional second-model review, fix-scope enforcement,
revalidation, and final validation state updates. Keep the review bounded and do
not let it become open-ended regeneration.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-4.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md` with emphasis on `Flow 4: Quality Review Pipeline`, `Chunk 4: Validation & Quality Review`, and the file-patch constraints
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md` with emphasis on `Chunk 4: Validation & Quality Review`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-4.md`, `Flow 4` and `Chunk 4` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md`, and `Chunk 4` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Integrate Epic 1 validation into the orchestration pipeline exactly where the story expects.
- Implement bounded self-review and optional second-model review using the designed patch/fix constraints.
- Revalidate after each review pass and update final run semantics accordingly.
- Keep module plans and overall structure stable; this story fixes obvious output issues, not planning decisions.
- Keep update-mode wiring itself in Story 5; this story should expose a shared validation-and-review stage that Story 5 can reuse.
- Implement the mapped tests in `test/orchestration/quality-review.test.ts`.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

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
