# Story 2 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-2.md`.

Deliver the environment and dependency checking operation for runtime
dependencies and repo-aware parser support. Stay within Story 2: this story
verifies availability and reports typed findings; it does not perform structural
analysis.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-2.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md` with emphasis on `Flow 2: Environment & Dependency Check` and `Chunk 2: Environment & Dependency Checks`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md` with emphasis on `Chunk 2: Environment & Dependency Checks`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-2.md`, `Flow 2` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md`, and `Chunk 2` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Implement `checkEnvironment()` with the typed finding model, severity rules, detected-languages behavior, and repo validation the story defines.
- Respect the adapter boundaries in the test plan: subprocess, Python, and git checks should remain mockable rather than hard-wired into the core logic.
- Distinguish always-checked runtime dependencies from repo-aware parser checks.
- Use the fixture repos and dependency-mocking patterns called out in the test plan.
- Implement the mapped tests in `test/environment/check.test.ts`.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

## Non-Goals / Boundaries

- Structural analysis or normalization logic
- Config-file resolution work from Story 1
- Untyped or ad hoc warning/error reporting

## Verification Expectations

- Run the targeted environment test file and `tsc --noEmit` if feasible.
- Validate both happy-path fixture behavior and mocked missing-dependency/error scenarios.
- If you attempt any real dependency smoke checks, note that Python, git, and parser availability may vary by machine; the authoritative coverage is still the mapped test plan with mocked boundaries.
- Report what was verified versus not verified.

## Expected Deliverable

- Environment-check implementation
- Matching tests for the mapped TC and non-TC cases
- Short verification summary
- Note blockers or partials
