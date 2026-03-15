# Story 5 Implementation Prompt

## Task

Implement exactly `../stories/story-5.md`.

Deliver the test and evaluation harness as a real integration artifact: CLI
smoke coverage, SDK importability outside the app, end-to-end generation checks
with mocked Agent SDK, and determinism verification. Reuse existing fixtures;
do not turn this into a new-fixture or failure-testing story.

## Read These First

- `../stories/story-5.md`
- `../tech-design.md` with emphasis on `Chunk 5: Test & Eval Harness` and the fixture-reuse notes
- `../test-plan.md` with emphasis on `Chunk 5: Test & Eval Harness` and the CI/manual split
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-5.md`, `Chunk 5` in `../tech-design.md`, and `Chunk 5` plus the CI/manual notes in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Implement the mapped smoke, SDK import, E2E, and determinism coverage using the existing fixture sets from Epics 1 and 2.
- Keep the harness usable outside Code Steward app context, as the story intends.
- Treat this as a verification and packaging story, not a backdoor to redesign prior runtime behavior.
- Treat Story 4's local bare-remote publish coverage as the publish leg of the overall pipeline; do not duplicate publish-specific tests here.
- Preserve the mocked Agent SDK boundary for E2E and determinism tests where the test plan expects it.
- Implement the mapped tests in `test/cli/smoke.test.ts`, `test/integration/sdk-contract.test.ts`, `test/integration/e2e.test.ts`, and `test/integration/determinism.test.ts`.

## Non-Goals / Boundaries

- Creating new fixture repos when existing fixtures suffice
- Failure-scenario coverage from Story 6
- Publish-flow testing beyond the coverage already owned by Story 4
- Re-owning CLI progress rendering from Story 2

## Verification Expectations

- Run the mapped harness tests and `tsc --noEmit` if feasible.
- Note the environment split clearly: `status` and `validate` smoke tests are CI-safe, while `check` depends on Python/tree-sitter availability.
- Confirm E2E and determinism tests stay on mocked Agent SDK paths rather than live subprocess inference.
- Report what was verified versus not verified.

## Expected Deliverable

- Test/eval harness updates
- Matching smoke, integration, E2E, and determinism tests
- Short verification summary
- Note blockers or partials
