# Story 0 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-0.md`.

This is Epic 3 foundation work only: CLI/publish types, contracts, package
configuration, publish fixtures, and helper scaffolding. Do not start
implementing commands, progress rendering, SDK re-exports, or publish
orchestration in this story.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-0.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/tech-design.md` with emphasis on `Chunk 0: Infrastructure`, package configuration, CLI types, publish types, and publish contracts
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/test-plan.md` with emphasis on fixture architecture, helper setup, and `Chunk 0: Infrastructure`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-0.md`, the Chunk 0 and low-altitude contract sections of `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/tech-design.md`, and the fixture/helper guidance in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Add the Epic 3 types, `PUBLISH_ERROR`, Zod contracts, exit-code constants, package `bin`/`exports` setup, publish fixtures, and CLI/publish helpers the story requires.
- Keep the package baseline aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` stack: Node `>=24`, ESM-only TypeScript, `tsc`, `tsx`, Vitest, Biome, `citty`, and `zod`.
- Reuse Epic 1 and Epic 2 test infrastructure where the story says to reuse it.
- Keep this story foundational; it should unblock later CLI/publish stories without pre-implementing them.
- There is no dedicated heavy TC chunk here, so do not inflate the scope with later-story tests.

## Non-Goals / Boundaries

- CLI command implementations
- CLI progress rendering
- SDK public entry-point re-exports
- Publish orchestration logic
- Broad integration coverage that belongs to later stories

## Verification Expectations

- Run `tsc --noEmit` and the repo’s verification path if available.
- Verify the new types and contracts compile and the helper/fixture scaffolding is usable.
- Add only narrow tests if they are genuinely needed to lock down helper or contract behavior; keep them story-local.
- Report what you verified and what remains unverified.

## Expected Deliverable

- Foundation code, fixtures, and helpers for Epic 3
- Any narrow helper/contract tests you added
- Short verification summary
- Note blockers or partials
