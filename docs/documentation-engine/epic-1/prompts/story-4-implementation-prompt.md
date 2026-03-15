# Story 4 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-4.md`.

Deliver metadata read/write and documentation status computation. This story is
about metadata persistence and staleness/status reporting without running
generation. Keep the scope there.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-4.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md` with emphasis on `Flow 4: Metadata & Status` and `Chunk 4: Metadata & Status`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md` with emphasis on `Chunk 4: Metadata & Status`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-4.md`, `Flow 4` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md`, and `Chunk 4` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Implement metadata read/write behavior and the four-state status model exactly as specified.
- Keep the metadata shape validation utility shared and reusable, since Story 5 depends on it.
- Use the output-path and commit-hash comparison rules from the story and design.
- Implement the mapped tests in the metadata/status test file.
- Preserve the designed boundaries between metadata/status and the later validation or generation flows.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

## Non-Goals / Boundaries

- Validation-pipeline behavior from Story 5
- Any generation or orchestration workflow that creates metadata
- Expanding the status model beyond the settled states and fields

## Verification Expectations

- Run the targeted metadata/status test file and `tsc --noEmit` if feasible.
- Verify read/write behavior, corrupt/missing metadata handling, and state transitions.
- Confirm any shared metadata-shape helper remains usable by later validation work.
- Report what was verified versus not verified.

## Expected Deliverable

- Metadata and status implementation
- Matching tests for mapped TC and non-TC cases
- Short verification summary
- Note blockers or partials
