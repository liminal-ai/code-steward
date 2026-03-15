# Story 0 Implementation Prompt

## Task

Implement exactly `../stories/story-0.md`.

This is Epic 3 foundation work only: CLI/publish types, contracts, package
configuration, publish fixtures, and helper scaffolding. Do not start
implementing commands, progress rendering, SDK re-exports, or publish
orchestration in this story.

## Read These First

- `../stories/story-0.md`
- `../tech-design.md` with emphasis on `Chunk 0: Infrastructure`, package configuration, CLI types, publish types, and publish contracts
- `../test-plan.md` with emphasis on fixture architecture, helper setup, and `Chunk 0: Infrastructure`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-0.md`, the Chunk 0 and low-altitude contract sections of `../tech-design.md`, and the fixture/helper guidance in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Add the Epic 3 types, `PUBLISH_ERROR`, Zod contracts, exit-code constants, package `bin`/`exports` setup, publish fixtures, and CLI/publish helpers the story requires.
- Keep the package baseline aligned with the settled Node 24, TypeScript, ESM, Vitest, Biome, `tsc`, and `citty` stack.
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
