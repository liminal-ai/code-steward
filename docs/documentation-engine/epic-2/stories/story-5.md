## Story 5: Incremental Update

### Objective

The engine can incrementally update documentation by regenerating only modules
affected by code changes since the last generation. After this story, a caller
with existing generated documentation can submit a `mode: "update"` request
and get targeted module regeneration, leaving unchanged modules untouched.

### Scope

#### In Scope

- Update mode entry: `generateDocumentation({ mode: "update" })`
- Prior metadata and module plan loading and validation
- Changed file computation between stored commit and current HEAD
- Update-specific progress stages and sequencing for `computing-changes` and update-mode `planning-modules`
- Update-mode per-module progress counts based on the affected-module set
- Affected module mapping using persisted plan and fresh analysis
- Cross-module relationship change detection (both sides affected)
- New file mapping to existing modules (via fresh analysis comparison)
- Unmappable new file warnings (recommend full generation)
- Selective module regeneration (only affected modules)
- Module removal when all components deleted
- Overview regeneration when module structure changes (module removed)
- Overview unchanged when only content changes
- Post-update validation/review against the full output directory
- Updated metadata and module plan persistence
- Update-specific result fields: `updatedModules`, `unchangedModules`, `overviewRegenerated`

#### Out of Scope

- New module creation in update mode (requires full generation)
- Manual edit preservation (v1 limitation)
- Re-clustering during update

### Dependencies / Prerequisites

- Story 2 complete — generation mechanics reused for selective regeneration
- Story 3 complete — progress event infrastructure exists for update-specific stages
- Story 4 complete — quality review integrated into the update pipeline

### Acceptance Criteria

**AC-2.1:** Update mode requires existing valid metadata. Missing or invalid metadata produces a structured error.

- **TC-2.1a: No prior metadata**
  - Given: Output directory has no `.doc-meta.json`
  - When: Caller invokes generate with mode "update"
  - Then: Structured error returned with code `METADATA_ERROR`; no generation runs
- **TC-2.1b: Invalid prior metadata**
  - Given: `.doc-meta.json` exists but is malformed
  - When: Caller invokes generate with mode "update"
  - Then: Structured error returned with code `METADATA_ERROR`
- **TC-2.1c: Missing persisted module plan**
  - Given: `.doc-meta.json` is valid but `.module-plan.json` is missing from the output directory
  - When: Caller invokes generate with mode "update"
  - Then: Structured error returned with code `METADATA_ERROR`; message indicates the module plan is required for update mode

**AC-3.1 (partial — TC-3.1c only; TC-3.1a and TC-3.1b owned by Story 3):** Update mode emits the additional progress stages needed for update-specific work before regeneration begins.

- **TC-3.1c: Stage sequence for update**
  - Given: Update runs to completion with affected modules
  - When: Caller collects all progress events
  - Then: Events include `computing-changes` and `planning-modules` stages before module generation

**AC-3.2 (partial — TC-3.2b only; TC-3.2a owned by Story 3):** Update-mode module progress reflects only the modules being regenerated.

- **TC-3.2b: Update mode per-module progress**
  - Given: 2 of 5 modules are affected
  - When: Update generation runs
  - Then: `generating-module` events fire with `total: 2` (only affected modules counted)

**AC-2.2:** Engine computes changed files between the stored commit hash and current HEAD.

- **TC-2.2a: Files changed since last generation**
  - Given: Prior metadata records commit `abc123`; current HEAD is `def456`; three files changed between them
  - When: Change detection runs
  - Then: Engine identifies the three changed files
- **TC-2.2b: No changes since last generation**
  - Given: Prior metadata commit hash matches current HEAD
  - When: Change detection runs
  - Then: Engine detects zero changed files; update completes with `success: true` and zero modules updated
- **TC-2.2c: New files added**
  - Given: Two new files exist that were not present at the prior commit
  - When: Change detection runs
  - Then: New files appear in the changed set
- **TC-2.2d: Files deleted**
  - Given: A file present at the prior commit has been deleted
  - When: Change detection runs
  - Then: Deleted file appears in the changed set

**AC-2.3:** Changed files are mapped to affected modules using the persisted module plan from the output directory.

- **TC-2.3a: Change maps to specific module**
  - Given: `src/core/engine.ts` changed; prior module plan assigns it to module "core"
  - When: Affected module detection runs
  - Then: Module "core" is identified as affected
- **TC-2.3b: Change in unmapped component**
  - Given: A changed file was in `ModulePlan.unmappedComponents`
  - When: Affected module detection runs
  - Then: The change is noted in `warnings`; no module is regenerated for this file; run does not fail
- **TC-2.3c: New file mappable to existing module**
  - Given: A newly added file is not in the prior module plan, but fresh analysis places it in a directory covered by module "core"
  - When: Affected module detection runs
  - Then: Module "core" is identified as affected; the new file is included in the regenerated module documentation
- **TC-2.3d: New file not mappable to any existing module**
  - Given: A newly added file is not in the prior module plan and fresh analysis does not place it in any existing module's scope
  - When: Affected module detection runs
  - Then: The new file is noted in `warnings`; it is not included in any module's regeneration; caller can run full generation to produce a fresh plan

**AC-2.4:** Only affected modules are regenerated. Unaffected modules are left untouched.

- **TC-2.4a: Targeted regeneration**
  - Given: Module "core" is affected; modules "api" and "utils" are not
  - When: Update generation completes
  - Then: `core.md` is regenerated; `api.md` and `utils.md` are unchanged (file modification time unchanged)
- **TC-2.4b: Multiple affected modules**
  - Given: Changes affect modules "core" and "api"
  - When: Update generation completes
  - Then: Both `core.md` and `api.md` are regenerated; `utils.md` is unchanged

**AC-2.5:** Structural changes trigger appropriate regeneration scope.

- **TC-2.5a: New file in existing module scope triggers regeneration**
  - Given: A new file is added to a directory covered by module "core"; fresh analysis maps it to "core"'s component space
  - When: Update runs
  - Then: Module "core" is regenerated; the new component is reflected in the updated module documentation
- **TC-2.5b: Deleted file triggers module regeneration**
  - Given: A file assigned to module "api" is deleted
  - When: Update runs
  - Then: Module "api" is regenerated without the deleted component
- **TC-2.5c: Relationship changes affect both sides**
  - Given: A file in module "core" adds a new import from module "utils"; no files in "utils" changed
  - When: Update runs
  - Then: Both "core" and "utils" are identified as affected; "core" because its code changed, "utils" because a new cross-module relationship means its documentation should reflect the updated dependency context

**AC-2.6:** Overview is regenerated when module structure changes (module removed). Overview is left untouched when only module content changes. Update mode cannot create new modules — that requires full generation.

- **TC-2.6a: Module removed triggers overview regeneration**
  - Given: All files in module "legacy" are deleted
  - When: Update runs
  - Then: `legacy.md` is removed from output; `module-tree.json` and `.module-plan.json` are updated; overview is regenerated; `overviewRegenerated` is `true`
- **TC-2.6b: Content-only changes skip overview**
  - Given: Changes affect module "core" content but no modules are removed or structurally altered
  - When: Update completes
  - Then: `overview.md` is unchanged; `overviewRegenerated` is `false`
- **TC-2.6c: New files that require a new module produce a warning, not a new module**
  - Given: New files exist that fresh analysis cannot map to any existing module (would require a new module)
  - When: Update completes
  - Then: No new module is created; files appear in `warnings` with a recommendation to run full generation; `overviewRegenerated` is `false` (unless other changes triggered it)

**AC-2.7:** Updated metadata records the new commit hash and timestamp.

- **TC-2.7a: Metadata updated after successful update**
  - Given: Update completes successfully
  - When: Caller reads metadata
  - Then: `.doc-meta.json` has `mode: "update"`, current HEAD commit hash, new ISO 8601 timestamp

**AC-2.8:** Update result identifies which modules were updated and which were unchanged.

- **TC-2.8a: Update-specific result fields**
  - Given: Update regenerated modules "core" and "api"; "utils" was unchanged
  - When: Caller inspects run result
  - Then: `updatedModules` contains `["core", "api"]`; `unchangedModules` contains `["utils"]`

**AC-4.1 (partial — TC-4.1b only; TC-4.1a owned by Story 4):** The shared validation-and-review stage runs against the full output directory after update-mode writes complete.

- **TC-4.1b: Validation runs post-update**
  - Given: Affected modules are regenerated
  - When: Validation stage begins
  - Then: Epic 1 validation runs against the full output directory (not just updated files)

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| No prior metadata | `METADATA_ERROR` — no generation runs |
| Missing `.module-plan.json` | `METADATA_ERROR` — module plan required for update |
| Invalid prior metadata | `METADATA_ERROR` |
| Change detection git failure | `ANALYSIS_ERROR` or `ORCHESTRATION_ERROR` — run fails |
| >50% components affected | Warning recommending full generation (run still completes) |

### Definition of Done

- [ ] All ACs met (AC-2.1 through AC-2.8, AC-3.1 partial TC-3.1c, AC-3.2 partial TC-3.2b, AC-4.1 partial TC-4.1b)
- [ ] All TC conditions verified (24 TCs — includes TC-3.1c, TC-3.2b, and TC-4.1b for update-path sequencing and validation reuse)
- [ ] Update mode regenerates only affected modules
- [ ] Cross-module relationship changes affect both sides
- [ ] Module removal triggers overview regeneration
- [ ] Unmappable new files produce warnings without failing
- [ ] Update progress events include `computing-changes` before module regeneration begins
- [ ] Update-mode module progress counts reflect only affected modules
- [ ] Post-update validation runs against the full output directory
- [ ] PO accepts

---
