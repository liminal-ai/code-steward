# Story 1 Implementation Prompt

## Task

Implement exactly `../stories/story-1.md`.

Deliver module planning and clustering only: the small-repo bypass,
inference-driven clustering path, plan validation, and the clustering prompt
builder needed for this stage. Do not broaden into full generation or overview
generation.

## Read These First

- `../stories/story-1.md`
- `../tech-design.md` with emphasis on `Flow 2: Module Planning & Clustering`, `Chunk 1: Module Planning`, and the Agent SDK adapter section
- `../test-plan.md` with emphasis on `Chunk 1: Module Planning`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-1.md`, `Flow 2` and `Chunk 1` in `../tech-design.md`, and `Chunk 1` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Implement module planning from structural analysis results, including deterministic small-repo grouping and structured-output clustering for larger repos.
- Enforce semantic validation of the resulting `ModulePlan`.
- Implement the clustering prompt builder required by this story and keep it consistent with the typed adapter contract.
- Use the mocked Agent SDK boundary and response fixtures the test plan defines.
- Implement the mapped tests in `test/orchestration/module-planning.test.ts` and the relevant prompt-builder structural tests.

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
