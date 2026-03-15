# Story 0 Implementation Prompt

## Task

Implement exactly `../stories/story-0.md`.

This is the foundation story for Epic 1. Deliver the shared package skeleton,
type surface, result/error primitives, constants, fixtures, and helper
infrastructure that later stories depend on. Stay within Story 0 and do not
start implementing operational behavior from Stories 1-5.

## Read These First

- `../stories/story-0.md`
- `../tech-design.md` with emphasis on Chunk 0 infrastructure, data contracts, and shared module boundaries
- `../test-plan.md` with emphasis on fixture architecture, helper contracts, and downstream test layout
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-0.md`, the infrastructure and data-contract sections of `../tech-design.md`, and the fixture/helper guidance in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Establish the Node 24, TypeScript 5.9, ESM-only package baseline and shared project configuration this epic assumes.
- Add the Story 0 type and helper surface, including `EngineResult<T>`, `EngineError`, `EngineErrorCode`, `NotImplementedError`, `ok()`, `err()`, and `STRUCTURAL_FILES`.
- Create the fixture repos, docs-output fixtures, config fixtures, and test helpers in the shapes the test plan expects.
- Keep module boundaries aligned with the tech design instead of inventing parallel foundations.
- Avoid operational logic from later stories.

## Non-Goals / Boundaries

- Configuration resolution, environment checks, structural analysis, metadata/status operations, or validation logic
- Premature TDD cycles for unfinished operations; this story is primarily foundation and scaffolding
- Extra dependencies beyond the settled stack unless the spec clearly requires them

## Verification Expectations

- Run `tsc --noEmit` and the project’s Biome-based verification path if available.
- Verify the new types export cleanly and the fixture directories/helpers match the test-plan layout.
- There is no dedicated story-sized TC chunk here; if you add narrow tests for helpers or schemas, keep them story-local and minimal.
- Report what you verified and what you could not verify yet.

## Expected Deliverable

- Foundation code and fixtures
- Any narrow helper/schema tests you added
- Short verification summary
- Note blockers or partials
