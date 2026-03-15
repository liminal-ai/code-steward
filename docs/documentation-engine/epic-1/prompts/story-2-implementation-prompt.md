# Story 2 Implementation Prompt

## Task

Implement exactly `../stories/story-2.md`.

Deliver the environment and dependency checking operation for runtime
dependencies and repo-aware parser support. Stay within Story 2: this story
verifies availability and reports typed findings; it does not perform structural
analysis.

## Read These First

- `../stories/story-2.md`
- `../tech-design.md` with emphasis on `Flow 2: Environment & Dependency Check` and `Chunk 2: Environment & Dependency Checks`
- `../test-plan.md` with emphasis on `Chunk 2: Environment & Dependency Checks`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-2.md`, `Flow 2` in `../tech-design.md`, and `Chunk 2` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Implement `checkEnvironment()` with the typed finding model, severity rules, detected-languages behavior, and repo validation the story defines.
- Respect the adapter boundaries in the test plan: subprocess, Python, and git checks should remain mockable rather than hard-wired into the core logic.
- Distinguish always-checked runtime dependencies from repo-aware parser checks.
- Use the fixture repos and dependency-mocking patterns called out in the test plan.
- Implement the mapped tests in `test/environment/check.test.ts`.

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
