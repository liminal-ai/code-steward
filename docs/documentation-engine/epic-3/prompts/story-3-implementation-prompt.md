# Story 3 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-3.md`.

Deliver the public SDK integration contract: entry-point re-exports for
consumer-facing operations/types and integration verification from Code
Steward’s perspective. Stay at the contract layer; do not re-implement the
operations themselves.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-3.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/tech-design.md` with emphasis on `Flow 3: Public SDK Integration Surface` and `Chunk 3: Public SDK Integration Contract`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/test-plan.md` with emphasis on `Chunk 3: Public SDK Integration Contract`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/PRD.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-3.md`, `Flow 3` and `Chunk 3` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/tech-design.md`, and `Chunk 3` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/epic.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/PRD.md` for consumer-context expectations
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Re-export only the consumer-facing operations and types the story specifies.
- Keep internal modules internal; the test plan explicitly treats encapsulation as part of the contract.
- Ensure the public contract provides the status/result/progress information Code Steward needs without requiring filesystem peeking.
- Reuse existing SDK operations from Epics 1 and 2 rather than wrapping them in competing abstractions.
- Implement the mapped tests in `test/integration/sdk-contract.test.ts`.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

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
