# Story 2 Implementation Prompt

## Task

Implement exactly `../stories/story-2.md`.

Deliver human-readable progress rendering for `docs generate` and `docs update`
in CLI human mode, with JSON mode suppressing all intermediate progress output.
Keep this story strictly on CLI-side rendering of already-defined SDK events.

## Read These First

- `../stories/story-2.md`
- `../tech-design.md` with emphasis on `Flow 2: CLI Output & Progress Rendering`, the explicit Story 2 vs Story 3 boundary, and `Chunk 2: CLI Progress Rendering`
- `../test-plan.md` with emphasis on `Chunk 2: CLI Progress Rendering` and the environment-gated test notes
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-2.md`, the progress-rendering sections and `Chunk 2` in `../tech-design.md`, and `Chunk 2` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Render SDK progress events to stderr in human mode only, with the sequencing and module-progress detail the story specifies.
- Keep the renderer defensive around unknown stages and incomplete module fields.
- Implement the Story 2 SIGINT behavior: `Ctrl+C` requests cancellation, waits for the current SDK operation to return, then exits with code `130`.
- Preserve the explicit architecture boundary: Story 2 renders events; it does not redefine the SDK event contract.
- Wire the behavior into `generate` and `update` without broadening other commands.
- Implement the mapped tests in `test/cli/progress.test.ts`.

## Non-Goals / Boundaries

- Changing SDK progress event shapes or ownership
- Verifying the SDK event contract itself beyond what the CLI needs to render
- Publish flow work
- Reworking the CLI command shell from Story 1

## Verification Expectations

- Run the mapped progress tests, `tsc --noEmit`, and the CLI build step if feasible.
- Note that these CLI progress tests are environment-gated because subprocess `generate` and `update` paths require a working authenticated Claude Agent SDK environment.
- Verify JSON-mode suppression and stderr-only progress behavior explicitly.
- Verify SIGINT behavior explicitly, including exit code `130` after the current operation completes.
- Report what was verified versus not verified.

## Expected Deliverable

- CLI progress-rendering implementation
- Matching progress tests
- Short verification summary
- Note blockers or partials
