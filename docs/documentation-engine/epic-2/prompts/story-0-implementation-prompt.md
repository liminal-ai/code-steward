# Story 0 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-0.md`.

This is Epic 2 foundation work only: orchestration types, `RunContext`, the
Agent SDK adapter boundary, mock fixtures/helpers, constants, and prompt-builder
stubs. Do not start wiring the actual planning or generation pipeline in this
story.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-0.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md` with emphasis on `Chunk 0: Orchestration Infrastructure`, the orchestration type sections, and the Agent SDK adapter design
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md` with emphasis on the Agent SDK mock boundary, response fixtures, and test-helper sections
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-0.md`, the Chunk 0 and adapter/type sections of `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md`, and the mock/fixture setup in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Establish the orchestration-side type surface and shared runtime primitives that later stories depend on.
- Add the real Agent SDK adapter interface and implementation behind a typed boundary, plus the mock fixtures/helper structure the test plan expects.
- Add prompt-builder stubs only; full prompt-builder implementation belongs to later stories.
- Extend the error model with `ORCHESTRATION_ERROR` and keep the new types importable through the intended module boundaries.
- Avoid stage logic, planning logic, generation logic, or quality-review logic in this story.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

## Non-Goals / Boundaries

- Module planning and clustering
- Full generation pipeline wiring
- Progress/result assembly, quality review, update mode, or failure handling
- Live Agent SDK behavior in tests; the design expects mocked boundaries first

## Verification Expectations

- Run `tsc --noEmit` and the repo’s targeted verification path if available.
- Verify the new types/import surfaces compile and the mock fixtures/helpers are loadable.
- There is no dedicated TC-heavy story test chunk here; keep any added tests narrow and infrastructural.
- Report what you verified and what remains unverified.

## Expected Deliverable

- Orchestration foundation code
- Mock fixtures/helpers and prompt stubs
- Any narrow infrastructure tests you added
- Short verification summary
- Note blockers or partials
