# Story 3 Implementation Prompt

## Task

Implement exactly `../stories/story-3.md`.

Deliver structural analysis as a typed SDK operation that invokes the
Python-based analyzer, normalizes its output, and returns engine-native results.
Stay within Story 3 and do not spill into Epic 2 orchestration or generation.

## Read These First

- `../stories/story-3.md`
- `../tech-design.md` with emphasis on `Flow 3: Structural Analysis` and `Chunk 3: Structural Analysis`
- `../test-plan.md` with emphasis on `Chunk 3: Structural Analysis`
- `../epic.md`
- `../../dependency-stack-decision.md`
- `../../technical-architecture.md`

## Primary Authorities

- Primary: `../stories/story-3.md`, `Flow 3` in `../tech-design.md`, and `Chunk 3` in `../test-plan.md`
- Secondary: `../epic.md`
- Global constraints: `../../dependency-stack-decision.md` and `../../technical-architecture.md`

## Implementation Expectations

- Implement `analyzeRepository()` and the adapter/normalizer flow settled in the story and design.
- Preserve the intentional mixed-runtime architecture: Node/TypeScript orchestration with a Python subprocess adapter for analysis.
- Normalize raw analyzer output into the engine-native result shape, including commit hash capture and typed failure paths.
- Keep subprocess and git boundaries mockable per the test plan.
- Implement the mapped tests in the analysis test file and cover the non-TC timeout/error-shape cases the test plan calls out.

## Non-Goals / Boundaries

- Agent-driven clustering, module planning, or documentation generation
- Repeating Story 2 environment logic except where this operation depends on its outputs or typed failures
- Replacing the analyzer with a different architecture

## Verification Expectations

- Run the targeted structural-analysis test file and `tsc --noEmit` if feasible.
- Exercise both successful normalization and adapter failure modes.
- If local analyzer smoke testing is environment-sensitive because of Python or parser installation, note that clearly; the mapped mocked tests remain authoritative.
- Report what was verified versus not verified.

## Expected Deliverable

- Structural-analysis implementation
- Matching tests for mapped TC and non-TC cases
- Short verification summary
- Note blockers or partials
