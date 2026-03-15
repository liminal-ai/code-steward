# Story 4 Implementation Prompt

## Task

Implement exactly `../stories/story-4.md`.

Deliver metadata read/write and documentation status computation. This story is
about metadata persistence and staleness/status reporting without running
generation. Keep the scope there.

## Read These First

- `../stories/story-4.md`
- `../tech-design.md` with emphasis on `Flow 4: Metadata & Status` and `Chunk 4: Metadata & Status`
- `../test-plan.md` with emphasis on `Chunk 4: Metadata & Status`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-4.md`, `Flow 4` in `../tech-design.md`, and `Chunk 4` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Implement metadata read/write behavior and the four-state status model exactly as specified.
- Keep the metadata shape validation utility shared and reusable, since Story 5 depends on it.
- Use the output-path and commit-hash comparison rules from the story and design.
- Implement the mapped tests in the metadata/status test file.
- Preserve the designed boundaries between metadata/status and the later validation or generation flows.

## Non-Goals / Boundaries

- Validation-pipeline behavior from Story 5
- Any generation or orchestration workflow that creates metadata
- Expanding the status model beyond the settled states and fields

## Verification Expectations

- Run the targeted metadata/status test file and `tsc --noEmit` if feasible.
- Verify read/write behavior, corrupt/missing metadata handling, and state transitions.
- Confirm any shared metadata-shape helper remains usable by later validation work.
- Report what was verified versus not verified.

## Expected Deliverable

- Metadata and status implementation
- Matching tests for mapped TC and non-TC cases
- Short verification summary
- Note blockers or partials
