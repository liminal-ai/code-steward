# Story 1 Implementation Prompt

## Task

Implement exactly `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-1.md`.

Deliver module planning and clustering only: the small-repo bypass,
inference-driven clustering path, plan validation, and the clustering prompt
builder needed for this stage. Do not broaden into full generation or overview
generation.

Use this prompt as the primary scoped handoff artifact. Start by inspecting `/Users/leemoore/code/code-steward/code-wiki-gen/` and implement the story there unless the story explicitly requires a different location. Repo-relative implementation and test paths in this prompt are relative to `/Users/leemoore/code/code-steward/code-wiki-gen/`; story/design/test-plan references below are absolute so a fresh agent can open them directly. Use the surrounding authorities to confirm behavior and verification details, not to widen scope.

## Read These First

- `/Users/leemoore/code/code-steward/code-wiki-gen/` first; inspect the live implementation package, especially `/Users/leemoore/code/code-steward/code-wiki-gen/package.json`, `/Users/leemoore/code/code-steward/code-wiki-gen/tsconfig.json`, and the existing `src/` and `test/` layout before editing.
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-1.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md` with emphasis on `Flow 2: Module Planning & Clustering`, `Chunk 1: Module Planning`, and the Agent SDK adapter section
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md` with emphasis on `Chunk 1: Module Planning`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
- `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Primary Authorities

- Primary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-1.md`, `Flow 2` and `Chunk 1` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md`, and `Chunk 1` in `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md`
- Secondary: `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
- Global constraints: `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md` and `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`

## Implementation Expectations

- Implement module planning from structural analysis results, including deterministic small-repo grouping and structured-output clustering for larger repos.
- Enforce semantic validation of the resulting `ModulePlan`.
- Implement the clustering prompt builder required by this story and keep it consistent with the typed adapter contract.
- Use the mocked Agent SDK boundary and response fixtures the test plan defines.
- Implement the mapped tests in `test/orchestration/module-planning.test.ts` and the relevant prompt-builder structural tests.
- Keep the implementation aligned with the live `/Users/leemoore/code/code-steward/code-wiki-gen/` package baseline: Node `>=24`, ESM-only TypeScript, `tsc` for builds/typecheck, `tsx` for local scripts, Vitest for tests, Biome for lint/format, `citty` for CLI layers, and `zod` for runtime contracts.

## Non-Goals / Boundaries

- Full generation pipeline wiring
- Module document generation or overview generation
- Quality review, update mode, or failure orchestration
- Expanding prompt-builder implementation beyond what this story directly needs

## Verification Expectations

- Run the targeted module-planning tests, relevant prompt-builder tests, and `tsc --noEmit` if feasible.
- Verify both the small-repo bypass and the Agent SDK clustering path.
- Call out any ambiguity between this story’s clustering prompt work and later prompt builders instead of quietly expanding scope.
- Report what was verified versus not verified.

## Expected Deliverable

- Module-planning implementation
- Matching tests for mapped TC and non-TC cases
- Short verification summary
- Note blockers or partials
