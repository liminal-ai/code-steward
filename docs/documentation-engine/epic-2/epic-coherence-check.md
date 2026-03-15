# Epic 2 Coherence Check

Run a full coherence review for **Epic 2** of the Documentation Engine.

This is a review-and-fix task, not a rewrite task.

## Goal

Confirm that Epic 2 is internally coherent across:
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

Epic 2 primary artifacts:
4. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/epic.md`
5. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md`
6. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md`
7. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories.md`

Epic 2 story files:
8. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-0.md`
9. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-1.md`
10. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-2.md`
11. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-3.md`
12. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-4.md`
13. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-5.md`
14. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/stories/story-6.md`

Epic 2 implementation prompts:
15. Review every file under `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/prompts/`

## What to check

### 1. Epic ↔ Tech Design coherence
- Every important Epic 2 AC is accounted for in the tech design.
- Every Epic 2 Tech Design Question is answered.
- The bounded quality-review design still matches the epic.
- Run-result contracts, progress-event contracts, and module-plan contracts align across docs.

### 2. Tech Design ↔ Test Plan coherence
- Every Epic 2 TC maps cleanly to tests.
- Mock boundaries match the Agent SDK adapter design.
- Environment-gated vs CI-safe tests are coherent.
- Prompt-builder test strategy, orchestration tests, and update-mode tests are aligned with the design.

### 3. Stories coherence
- Story prerequisites are dependency-correct.
- Story boundaries cleanly separate:
  - clustering / planning
  - generation
  - progress reporting
  - quality review
  - recovery/failure handling
- Combined `stories.md` and per-story files say the same thing.
- No story claims work owned by a later story.

### 4. Prompt coherence
- Each implementation prompt points to the correct current file paths.
- Each prompt matches its story’s scope and prerequisite chain.
- Prompt guidance preserves the settled Epic 2 architecture.
- Environment-gated tests are correctly called out where needed.

### 5. Cross-artifact consistency
- Terminology is consistent across all Epic 2 artifacts.
- No stale references remain to the pre-reorg file paths.
- AC/TC counts and story/test counts are internally consistent where summarized.
- Update-mode rules are consistent across epic, design, tests, stories, and prompts.

## Fixes you should make directly

Apply non-controversial fixes directly, including:
- stale path references
- count mismatches
- story prerequisite mismatches
- prompt/story scope mismatches
- inconsistent environment-gating guidance
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
   - whether the Epic 2 implementation prompts are fit for fresh implementation agents

5. **Final Verdict**
   - whether Epic 2 is coherent enough to proceed into implementation

