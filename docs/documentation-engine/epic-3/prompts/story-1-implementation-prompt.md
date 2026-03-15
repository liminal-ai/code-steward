# Story 1 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-1.md`.

Deliver the CLI command shell, config merge behavior, JSON/human output modes,
and exit codes for all seven commands. Commands should delegate to SDK
operations; do not extend this story into progress rendering or publish
implementation.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-1.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/tech-design.md` with emphasis on `Flow 1: CLI Command Surface`, `Flow 2: CLI Output & Progress Rendering`, and `Chunk 1: CLI Command Shell`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/test-plan.md` with emphasis on `Chunk 1: CLI Command Shell` and the CI/manual split at the bottom of the file
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-1.md`, the CLI command/output sections and `Chunk 1` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/tech-design.md`, and `Chunk 1` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Implement the `citty` CLI entrypoint and subcommands so they map cleanly onto the existing SDK operations.
- Support the argument, config-merger, JSON/human output, and exit-code behaviors the story and test plan define.
- Preserve CLI-to-SDK parity rather than inventing CLI-only logic.
- Build the CLI binary using the settled package conventions before relying on subprocess tests.
- Implement the mapped tests in `test/cli/commands.test.ts` and `test/cli/output.test.ts`.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

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
