# Story 3 Implementation Prompt

## Task

Implement exactly `../stories/story-3.md`.

Deliver the public SDK integration contract: entry-point re-exports for
consumer-facing operations/types and integration verification from Code
Steward’s perspective. Stay at the contract layer; do not re-implement the
operations themselves.

## Read These First

- `../stories/story-3.md`
- `../tech-design.md` with emphasis on `Flow 3: Public SDK Integration Surface` and `Chunk 3: Public SDK Integration Contract`
- `../test-plan.md` with emphasis on `Chunk 3: Public SDK Integration Contract`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`
- `../../PRD.md`

## Primary Authorities

- Primary: `../stories/story-3.md`, `Flow 3` and `Chunk 3` in `../tech-design.md`, and `Chunk 3` in `../test-plan.md`
- Secondary: `../epic.md` and `../../PRD.md` for consumer-context expectations
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Re-export only the consumer-facing operations and types the story specifies.
- Keep internal modules internal; the test plan explicitly treats encapsulation as part of the contract.
- Ensure the public contract provides the status/result/progress information Code Steward needs without requiring filesystem peeking.
- Reuse existing SDK operations from Epics 1 and 2 rather than wrapping them in competing abstractions.
- Implement the mapped tests in `test/integration/sdk-contract.test.ts`.

## Non-Goals / Boundaries

- CLI progress rendering
- CLI command-shell behavior
- Publish SDK implementation
- Re-implementing Epic 1 or Epic 2 operations

## Verification Expectations

- Run the mapped integration-contract tests and `tsc --noEmit` if feasible.
- Verify both export availability and contract shape from the consumer perspective.
- Be explicit about any public-vs-internal export choices you left unchanged.
- Report what was verified versus not verified.

## Expected Deliverable

- Public SDK contract updates
- Matching integration-contract tests
- Short verification summary
- Note blockers or partials
