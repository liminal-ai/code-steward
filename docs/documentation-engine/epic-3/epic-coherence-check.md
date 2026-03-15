# Epic 3 Coherence Check

Run a full coherence review for **Epic 3** of the Documentation Engine.

This is a review-and-fix task, not a rewrite task.

## Goal

Confirm that Epic 3 is internally coherent across:
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

Epic 3 primary artifacts:
4. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/epic.md`
5. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/tech-design.md`
6. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/test-plan.md`
7. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories.md`

Epic 3 story files:
8. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-0.md`
9. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-1.md`
10. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-2.md`
11. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-3.md`
12. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-4.md`
13. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-5.md`
14. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/stories/story-6.md`

Epic 3 implementation prompts:
15. Review every file under `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-3/prompts/`

## What to check

### 1. Epic ↔ Tech Design coherence
- Every important Epic 3 AC is accounted for in the tech design.
- Every Epic 3 Tech Design Question is answered.
- CLI thin-shell behavior remains consistent with the epic.
- Publish behavior, branch-preservation behavior, and integration-surface behavior align across docs.

### 2. Tech Design ↔ Test Plan coherence
- Every Epic 3 TC maps cleanly to tests.
- CLI subprocess tests vs SDK-import tests are consistently described.
- CI-safe vs environment-gated behavior is coherent.
- Publish integration testing, local bare-remote fixtures, and worktree behavior are consistent with the design.

### 3. Stories coherence
- Story prerequisites are dependency-correct.
- Story boundaries cleanly separate:
  - CLI shell/output
  - progress rendering
  - SDK/public integration contract
  - publish flow
  - test/eval harness
  - failure/recovery/operator feedback
- Combined `stories.md` and per-story files say the same thing.
- No story overclaims beyond its scope.

### 4. Prompt coherence
- Each implementation prompt points to the correct current file paths.
- Each prompt matches its story’s scope and does not bleed into later stories.
- Prompt guidance aligns with CLI thin-shell, SDK-first behavior, and the settled Node/tooling stack.
- Environment-gated CLI inference tests are called out where relevant.

### 5. Cross-artifact consistency
- Terminology is consistent across all Epic 3 artifacts.
- No stale references remain to the pre-reorg file paths.
- AC/TC counts and story/test counts are internally consistent where summarized.
- CLI contract language is consistent between epic, design, tests, stories, and prompts.

## Fixes you should make directly

Apply non-controversial fixes directly, including:
- stale path references
- count mismatches
- story prerequisite mismatches
- prompt/story scope mismatches
- inconsistent CI/environment-gating language
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
   - whether the Epic 3 implementation prompts are fit for fresh implementation agents

5. **Final Verdict**
   - whether Epic 3 is coherent enough to proceed into implementation

