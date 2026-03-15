# Epic 1 Coherence Check

Run a full coherence review for **Epic 1** of the Documentation Engine.

This is a review-and-fix task, not a rewrite task.

## Goal

Confirm that Epic 1 is internally coherent across:
- epic
- tech design
- test plan
- combined stories doc
- per-story files
- implementation prompts

Apply non-controversial fixes directly. Report anything else.

## Read these files first

Global context:
1. `/Users/leemoore/code/code-steward/docs/documentation-engine/PRD.md`
2. `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`
3. `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`

Epic 1 primary artifacts:
4. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/epic.md`
5. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md`
6. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md`
7. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories.md`

Epic 1 story files:
8. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-0.md`
9. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-1.md`
10. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-2.md`
11. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-3.md`
12. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-4.md`
13. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/stories/story-5.md`

Epic 1 implementation prompts:
14. Review every file under `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/prompts/`

## What to check

### 1. Epic ↔ Tech Design coherence
- Every important Epic 1 AC is accounted for in the tech design.
- Every Epic 1 Tech Design Question is answered.
- No major design behavior contradicts the epic.
- No stale tooling or dependency assumptions remain.

### 2. Tech Design ↔ Test Plan coherence
- Every Epic 1 TC maps cleanly to tests.
- Chunk boundaries in the test plan match implementation boundaries in the tech design.
- CI-safe vs environment-gated behavior is coherent.
- Mock boundaries are consistent with the design.

### 3. Stories coherence
- Story boundaries match the epic and tech design.
- Prerequisites are dependency-correct.
- AC/TC ownership across stories is clean.
- Combined `stories.md` and per-story files say the same thing.
- No story overclaims beyond its scope.

### 4. Prompt coherence
- Each implementation prompt points to the correct current file paths.
- Each prompt matches its story’s scope and does not pull in future-story work.
- Prompt guidance aligns with the settled architecture and dependency stack.
- Prompts are specific enough to guide implementation without over-constraining it.

### 5. Cross-artifact consistency
- Terminology is consistent across all Epic 1 artifacts.
- File/module naming is consistent.
- No stale references remain to the pre-reorg file paths.
- Test counts / AC counts / TC counts are internally consistent where summarized.

## Fixes you should make directly

Apply non-controversial fixes directly, including:
- stale path references
- count mismatches
- story prerequisite mismatches
- obvious prompt/story scope mismatches
- inconsistent tooling wording
- stale terminology where the intended meaning is already clear

Do not make controversial scope or architecture changes without reporting them first.

## Report format

Return:

1. **Overall Assessment**
   - `READY` or `NOT READY` for implementation coherence

2. **Fixes Applied Directly**
   - what you changed
   - which files changed

3. **Remaining Issues**
   - critical
   - major
   - minor

4. **Prompt Quality Notes**
   - whether the Epic 1 implementation prompts are fit for fresh implementation agents

5. **Final Verdict**
   - whether Epic 1 is coherent enough to proceed into implementation

