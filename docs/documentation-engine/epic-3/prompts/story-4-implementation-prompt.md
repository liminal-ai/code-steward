# Story 4 Implementation Prompt

## Task

Implement exactly `../stories/story-4.md`.

Deliver the publish flow: `publishDocumentation()`, the `docs publish` CLI
path, preflight checks, worktree-based branch creation, push, optional PR
creation, and structured publish results. Keep publish separate from generation
or update.

## Read These First

- `../stories/story-4.md`
- `../tech-design.md` with emphasis on `Flow 4: Publish Flow`, the git/gh adapter sections, and `Chunk 4: Publish Flow`
- `../test-plan.md` with emphasis on `Chunk 4: Publish Flow`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-4.md`, `Flow 4` and `Chunk 4` in `../tech-design.md`, and `Chunk 4` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Implement publish as an operation over existing generated docs only; do not trigger generation or update from this story.
- Preserve the settled worktree-based branch-preservation model and structured publish result shape.
- Keep git and gh behavior behind adapters so the mapped tests can control them.
- Reuse the publish fixtures/helpers introduced in Story 0.
- Implement the mapped tests in `test/integration/publish.test.ts`.

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
