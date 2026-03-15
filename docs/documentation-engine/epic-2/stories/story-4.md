## Story 4: Validation & Quality Review

### Objective

The engine runs a bounded post-generation quality review that fixes obvious
validation issues without re-clustering or unbounded iteration. After this story,
generated documentation goes through an automatic fix-up pass for broken links,
malformed Mermaid, and other deterministically detectable issues before the result
is finalized.

### Scope

#### In Scope

- Post-generation validation integration (Epic 1 validation wired into the pipeline)
- Self-review pass: single Agent SDK session, constrained fix scope
- Deterministic revalidation after self-review
- Optional second-model review pass: single Agent SDK session with review-only prompt
- Deterministic revalidation after second-model review
- Fix scope enforcement: broken links, missing sections, malformed Mermaid, thin summaries only
- No re-clustering, no new content generation, no structural changes
- `qualityReviewPasses` count in result
- `quality-review` progress event
- Prompt builder implementation for quality-review

#### Out of Scope

- Module planning (Story 1)
- Module generation (Story 2)
- Update-orchestrator wiring and update-specific validation-path verification (Story 5)

### Dependencies / Prerequisites

- Story 2 complete — generation pipeline produces output to review

### Acceptance Criteria

**AC-4.1 (partial — TC-4.1a only; TC-4.1b owned by Story 5):** Deterministic validation (Epic 1) runs automatically after generation or update output is written.

- **TC-4.1a: Validation runs post-generation**
  - Given: Module docs and overview are written to the output directory
  - When: Validation stage begins
  - Then: Epic 1 validation runs against the full output directory

> **Note:** TC-4.1b (post-update validation against the full output directory) is owned by Story 5 because it depends on the update pipeline being wired end to end.

**AC-4.2:** If validation finds fixable issues, the engine runs up to one self-review pass by the generating model.

- **TC-4.2a: Self-review fixes broken link**
  - Given: Validation finds a broken internal cross-link in `core.md`
  - When: Self-review pass runs
  - Then: The broken link is corrected; subsequent validation no longer reports it
- **TC-4.2b: Self-review fixes malformed Mermaid**
  - Given: Validation finds a malformed Mermaid block in `overview.md`
  - When: Self-review pass runs
  - Then: The Mermaid block is corrected or removed
- **TC-4.2c: Self-review skipped when no fixable issues**
  - Given: Validation finds zero issues
  - When: Quality review stage runs
  - Then: No self-review pass executes; run proceeds to metadata writing
- **TC-4.2d: Self-review is skipped when disabled**
  - Given: Run request sets `qualityReview.selfReview: false`
  - When: Validation finds fixable issues
  - Then: No self-review pass executes

**AC-4.3:** Self-review is limited to obvious, non-controversial fixes.

- **TC-4.3a: Allowed fix categories**
  - Given: Self-review pass runs
  - When: Model proposes fixes
  - Then: Fixes are limited to: broken internal links, missing expected pages or sections, malformed Mermaid blocks, and thin or empty summary sections
- **TC-4.3b: Re-clustering not performed**
  - Given: Self-review pass runs
  - When: Model proposes fixes
  - Then: Module plan is not modified; no re-clustering occurs
- **TC-4.3c: No unbounded iteration**
  - Given: Self-review pass completes
  - When: Issues remain after self-review
  - Then: No additional self-review passes run; remaining issues carry forward

**AC-4.4:** Deterministic validation reruns after each quality pass.

- **TC-4.4a: Revalidation after self-review**
  - Given: Self-review pass modifies output files
  - When: Self-review completes
  - Then: Epic 1 validation reruns; new validation state replaces the prior state
- **TC-4.4b: Revalidation after second-model review**
  - Given: Second-model review pass modifies output files
  - When: Second-model review completes
  - Then: Epic 1 validation reruns

**AC-4.5:** Optionally, a second-model review pass runs if configured and fixable issues remain.

- **TC-4.5a: Second-model review runs when enabled**
  - Given: `qualityReview.secondModelReview: true`; fixable issues remain after self-review
  - When: Second-model review stage runs
  - Then: A review pass executes using a different model perspective
- **TC-4.5b: Second-model review skipped when disabled**
  - Given: `qualityReview.secondModelReview: false` (default)
  - When: Quality review stage runs
  - Then: No second-model review pass executes
- **TC-4.5c: Second-model review skipped when no issues remain**
  - Given: Self-review fixed all issues
  - When: Quality review stage evaluates
  - Then: No second-model review pass executes

**AC-1.8 (partial — TC-1.8b and TC-1.8c only; TC-1.8a owned by Story 2):** Post-quality-review validation outcome determines run success.

- **TC-1.8b: Validation warnings do not block completion**
  - Given: Validation finds warnings but no errors after quality review
  - When: Run completes
  - Then: `success` is `true`; `validationResult` includes warnings; `warnings` array surfaces them
- **TC-1.8c: Validation errors after quality review block completion**
  - Given: Validation finds errors after quality review that could not be fixed
  - When: Run evaluates final validation state
  - Then: `success` is `false`; `failedStage: "validating-output"`; metadata is not written

**AC-4.6:** Final run result includes the validation state after all quality passes complete.

- **TC-4.6a: Clean validation after quality review**
  - Given: Quality review fixed all issues
  - When: Run result is assembled
  - Then: `validationResult.status` is `"pass"`; `qualityReviewPasses` reflects the number of passes that ran
- **TC-4.6b: Remaining warnings after quality review**
  - Given: Quality review reduced errors to zero but warnings remain
  - When: Run result is assembled
  - Then: `validationResult` contains the remaining warnings; `qualityReviewPasses` reflects passes that ran; `success` is `true`
- **TC-4.6c: Remaining errors after quality review**
  - Given: Quality review could not resolve all validation errors
  - When: Run result is assembled
  - Then: `success` is `false`; `failedStage: "validating-output"`; `validationResult` contains the unresolved error findings; `qualityReviewPasses` reflects passes that ran

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Self-review Agent SDK session fails | `ORCHESTRATION_ERROR` — `success: false`, `failedStage: "quality-review"`. Agent SDK session failures are run failures per the epic and tech design error model. |
| Second-model review Agent SDK session fails | `ORCHESTRATION_ERROR` — `success: false`, `failedStage: "quality-review"`. Same error model as all other Agent SDK failures. |
| Review model proposes patches for nonexistent files | Patches for nonexistent files are silently skipped; valid patches are applied; no run failure. |

### Definition of Done

- [ ] All ACs met (AC-1.8 partial TC-1.8b/c, AC-4.1 partial TC-4.1a, AC-4.2 through AC-4.6)
- [ ] All TC conditions verified (18 TCs — includes TC-1.8b and TC-1.8c moved from Story 2; TC-4.1b owned by Story 5)
- [ ] Self-review fixes broken links and malformed Mermaid in test fixtures
- [ ] No re-clustering occurs during review
- [ ] Bounded: max 1 self-review + 1 second-model review
- [ ] `qualityReviewPasses` correctly counts passes executed
- [ ] `quality-review` progress event emits when a review pass runs
- [ ] Prompt builder structural tests pass for quality-review prompt
- [ ] PO accepts

---
