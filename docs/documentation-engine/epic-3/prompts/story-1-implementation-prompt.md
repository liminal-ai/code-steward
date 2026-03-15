# Story 1 Implementation Prompt

## Task

Implement exactly `../stories/story-1.md`.

Deliver the CLI command shell, config merge behavior, JSON/human output modes,
and exit codes for all seven commands. Commands should delegate to SDK
operations; do not extend this story into progress rendering or publish
implementation.

## Read These First

- `../stories/story-1.md`
- `../tech-design.md` with emphasis on `Flow 1: CLI Command Surface`, `Flow 2: CLI Output & Progress Rendering`, and `Chunk 1: CLI Command Shell`
- `../test-plan.md` with emphasis on `Chunk 1: CLI Command Shell` and the CI/manual split at the bottom of the file
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-1.md`, the CLI command/output sections and `Chunk 1` in `../tech-design.md`, and `Chunk 1` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Implement the `citty` CLI entrypoint and subcommands so they map cleanly onto the existing SDK operations.
- Support the argument, config-merger, JSON/human output, and exit-code behaviors the story and test plan define.
- Preserve CLI-to-SDK parity rather than inventing CLI-only logic.
- Build the CLI binary using the settled package conventions before relying on subprocess tests.
- Implement the mapped tests in `test/cli/commands.test.ts` and `test/cli/output.test.ts`.

## Non-Goals / Boundaries

- Incremental progress rendering for `generate` or `update`
- SIGINT handling
- Publish SDK implementation
- Public SDK re-export work from Story 3

## Verification Expectations

- Run the mapped CLI command/output tests, `tsc --noEmit`, and the relevant build step if feasible.
- Note that CLI subprocess tests which invoke real `generate` or `update` flows are environment-gated and require a working authenticated Claude Agent SDK environment; report clearly which of those were run versus skipped.
- Verify CLI-to-SDK parity cases explicitly.
- Report what was verified versus not verified.

## Expected Deliverable

- CLI command-shell implementation
- Matching CLI command/output tests
- Short verification summary
- Note blockers or partials
