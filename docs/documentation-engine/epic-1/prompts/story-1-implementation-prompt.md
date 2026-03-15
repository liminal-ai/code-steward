# Story 1 Implementation Prompt

## Task

Implement exactly `../stories/story-1.md`.

Deliver configuration resolution only: defaults, optional repo-root config file
loading, caller overrides, merged validation, and typed failure handling. Stay
inside Story 1 and do not broaden into environment checks or downstream
consumers.

## Read These First

- `../stories/story-1.md`
- `../tech-design.md` with emphasis on `Flow 1: Configuration Resolution` and `Chunk 1: Configuration`
- `../test-plan.md` with emphasis on `Chunk 1: Configuration`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-1.md`, `Flow 1` in `../tech-design.md`, and `Chunk 1` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Implement `resolveConfiguration()` and the full three-level merge model the story defines.
- Honor the settled config-file behavior and validation rules from the story and tech design.
- Return typed results and typed errors rather than throwing or silently falling back.
- Add the tests mapped in `test/config/resolver.test.ts`, including the non-TC config parse and unknown-field cases called out by the test plan.
- Preserve the chosen stack and prefer built-in Node facilities over helper libraries unless clearly needed.

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
