# Story 1 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-1.md`.

Deliver configuration resolution only: defaults, optional repo-root config file
loading, caller overrides, merged validation, and typed failure handling. Stay
inside Story 1 and do not broaden into environment checks or downstream
consumers.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-1.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md` with emphasis on `Flow 1: Configuration Resolution` and `Chunk 1: Configuration`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md` with emphasis on `Chunk 1: Configuration`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-1.md`, `Flow 1` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md`, and `Chunk 1` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Implement `resolveConfiguration()` and the full three-level merge model the story defines.
- Honor the settled config-file behavior and validation rules from the story and tech design.
- Return typed results and typed errors rather than throwing or silently falling back.
- Add the tests mapped in `test/config/resolver.test.ts`, including the non-TC config parse and unknown-field cases called out by the test plan.
- Preserve the chosen stack and prefer built-in Node facilities over helper libraries unless clearly needed.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

## Non-Goals / Boundaries

- Environment and dependency checking
- Any operation that consumes resolved configuration beyond this story’s own API
- Alternative configuration systems beyond what the story and design already settle

## Verification Expectations

- Run the targeted configuration test file and `tsc --noEmit` if feasible.
- Run Biome or the repo’s verification script if available.
- Report whether config-file discovery, merge precedence, and invalid-config paths were exercised directly.
- Call out anything you could not verify locally.

## Expected Deliverable

- Configuration-resolution implementation
- Matching tests in the mapped config test file
- Short verification summary
- Note blockers or partials
