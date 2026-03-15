# Story 2 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-2.md`.

Deliver human-readable progress rendering for `docs generate` and `docs update`
in CLI human mode, with JSON mode suppressing all intermediate progress output.
Keep this story strictly on CLI-side rendering of already-defined SDK events.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-2.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/tech-design.md` with emphasis on `Flow 2: CLI Output & Progress Rendering`, the explicit Story 2 vs Story 3 boundary, and `Chunk 2: CLI Progress Rendering`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/test-plan.md` with emphasis on `Chunk 2: CLI Progress Rendering` and the environment-gated test notes
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-2.md`, the progress-rendering sections and `Chunk 2` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/tech-design.md`, and `Chunk 2` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Render SDK progress events to stderr in human mode only, with the sequencing and module-progress detail the story specifies.
- Keep the renderer defensive around unknown stages and incomplete module fields.
- Implement the Story 2 SIGINT behavior: `Ctrl+C` requests cancellation, waits for the current SDK operation to return, then exits with code `130`.
- Preserve the explicit architecture boundary: Story 2 renders events; it does not redefine the SDK event contract.
- Wire the behavior into `generate` and `update` without broadening other commands.
- Implement the mapped tests in `test/cli/progress.test.ts`.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

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
