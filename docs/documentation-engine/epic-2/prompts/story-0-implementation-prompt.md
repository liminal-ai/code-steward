# Story 0 Implementation Prompt

## Task

Implement exactly `../stories/story-0.md`.

This is Epic 2 foundation work only: orchestration types, `RunContext`, the
Agent SDK adapter boundary, mock fixtures/helpers, constants, and prompt-builder
stubs. Do not start wiring the actual planning or generation pipeline in this
story.

## Read These First

- `../stories/story-0.md`
- `../tech-design.md` with emphasis on `Chunk 0: Orchestration Infrastructure`, the orchestration type sections, and the Agent SDK adapter design
- `../test-plan.md` with emphasis on the Agent SDK mock boundary, response fixtures, and test-helper sections
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-0.md`, the Chunk 0 and adapter/type sections of `../tech-design.md`, and the mock/fixture setup in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Establish the orchestration-side type surface and shared runtime primitives that later stories depend on.
- Add the real Agent SDK adapter interface and implementation behind a typed boundary, plus the mock fixtures/helper structure the test plan expects.
- Add prompt-builder stubs only; full prompt-builder implementation belongs to later stories.
- Extend the error model with `ORCHESTRATION_ERROR` and keep the new types importable through the intended module boundaries.
- Avoid stage logic, planning logic, generation logic, or quality-review logic in this story.

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
