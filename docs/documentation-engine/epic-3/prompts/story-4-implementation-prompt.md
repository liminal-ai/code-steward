# Story 4 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-4.md`.

Deliver the publish flow: `publishDocumentation()`, the `docs publish` CLI
path, preflight checks, worktree-based branch creation, push, optional PR
creation, and structured publish results. Keep publish separate from generation
or update.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-4.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/tech-design.md` with emphasis on `Flow 4: Publish Flow`, the git/gh adapter sections, and `Chunk 4: Publish Flow`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/test-plan.md` with emphasis on `Chunk 4: Publish Flow`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-4.md`, `Flow 4` and `Chunk 4` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/tech-design.md`, and `Chunk 4` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Implement publish as an operation over existing generated docs only; do not trigger generation or update from this story.
- Preserve the settled worktree-based branch-preservation model and structured publish result shape.
- Keep git and gh behavior behind adapters so the mapped tests can control them.
- Reuse the publish fixtures/helpers introduced in Story 0.
- Implement the mapped tests in `test/integration/publish.test.ts`.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

## Non-Goals / Boundaries

- Generation or update triggering
- Publish progress rendering
- GitHub Pages setup
- Multi-repo or broader release workflows

## Verification Expectations

- Run the mapped publish tests, `tsc --noEmit`, and the relevant build step if feasible.
- Verify that the local bare-remote integration path works without network access and without GitHub credentials.
- Confirm branch preservation, doc-file scoping, preflight failures, and optional PR behavior.
- Report what was verified versus not verified.

## Expected Deliverable

- Publish-flow implementation
- Matching publish tests
- Short verification summary
- Note blockers or partials
