# Epic: Generation & Update Orchestration

This epic defines the complete requirements for the Documentation Engine's
inference-driven generation and update workflows. It serves as the source of
truth for the Tech Lead's design work.

---

## User Profile

**Primary User:** Code Steward server code, CLI operator, or test author consuming the Documentation Engine SDK
**Context:** Invoking long-running documentation generation or update workflows that use Claude Agent SDK internally, receiving stage-aware progress events, and consuming structured run results — after Epic 1's deterministic foundation is in place
**Mental Model:** "I submit a run request with a repo path and mode. The engine handles analysis, planning, generation, validation, and quality review internally. I get progress events while it runs and a structured result when it finishes. If something fails, the result tells me which stage failed and why."
**Key Constraint:** Runs locally. Requires Claude Agent SDK availability for inference steps. Depends on Epic 1 operations for environment checks, structural analysis, validation, and metadata. Generation quality varies with inference, but output structure is deterministic.

---

## Feature Overview

After this epic ships, the Documentation Engine can:

- execute a full documentation generation workflow from analysis through validated output
- cluster analyzed components into a module plan using structural analysis and inference
- generate module-level documentation and a repo overview using Claude Agent SDK
- execute an incremental update workflow that regenerates only affected modules
- emit typed, stage-aware progress events during long-running workflows
- run a bounded post-generation quality review to fix obvious validation issues
- return structured run results with generated files, validation state, duration, and best-effort cost tracking

The engine uses Epic 1's operations (environment check, analysis, validation,
metadata) as building blocks. Epic 2 adds the orchestration layer that
coordinates those operations with Claude Agent SDK inference to produce
documentation.

Manual edit preservation during update mode is not supported in v1.
Update mode may replace affected module docs entirely. This is a known
limitation documented in the Out of Scope section.

---

## Scope

### In Scope

The inference-driven orchestration layer for documentation generation and updates:

- Full documentation generation workflow (analysis → planning → generation → validation → quality review → metadata)
- Module planning and clustering from structural analysis results
- Per-module documentation generation using Claude Agent SDK
- Repo overview synthesis using Claude Agent SDK
- Incremental update workflow with changed-file detection and affected-module mapping
- Typed progress events by stage with module-level granularity
- Bounded post-generation quality review (self-review and optional second-model review)
- Structured run results with cost (best-effort), duration, warnings, and validation findings
- Run lifecycle management (run ID, state tracking, result assembly)

### Out of Scope

- CLI surface wrapping the SDK (Epic 3)
- Code Steward app integration and SQLite persistence (Epic 3)
- Publish workflow — branch, commit, push, PR (Epic 3)
- Manual edit preservation during update mode (future enhancement)
- Open-ended repair loops or iterative improvement beyond the bounded quality review
- Re-clustering during quality review
- Multi-repo generation in a single run
- Interactive or conversational generation sessions

### Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A6 | Claude Agent SDK is available locally and can be invoked programmatically | Unvalidated | Engine reports missing SDK as a structured error |
| A7 | Agent SDK supports structured output schemas for clustering and generation results | Unvalidated | Fallback to parsing unstructured output adds brittleness |
| A8 | Agent SDK provides token usage or cost information per session | Unvalidated | `costUsd` is null when unavailable; missing cost does not fail the run |
| A9 | Module clustering produces reasonable groupings for TypeScript repos up to ~500 components | Unvalidated | Quality bar is TypeScript-first; larger repos may need subdivision |
| A10 | Epic 1 operations (checkEnvironment, analyzeRepository, validateDocumentation, writeMetadata, readMetadata, getDocumentationStatus) are available and working | Validated | Epic 2 depends on Epic 1 |

---

## Flows & Requirements

### 1. Full Documentation Generation

The engine executes a bounded generation workflow that takes a repository from
analysis through validated, metadata-tracked documentation output. The caller
submits a `DocumentationRunRequest` with `mode: "full"`. The engine handles
every stage internally and returns a `DocumentationRunResult`.

The generation workflow consumes Epic 1 operations for environment checking,
structural analysis, output validation, and metadata writing. Epic 2 adds
module planning, inference-driven content generation, overview synthesis, and
quality review.

1. Caller invokes generate with a `DocumentationRunRequest` (mode: "full")
2. Engine resolves configuration from request fields, config file, and defaults
3. Engine runs environment check (Epic 1)
4. Engine runs structural analysis (Epic 1)
5. Engine produces a `ModulePlan` by clustering components into modules
6. Engine generates documentation for each module using Claude Agent SDK
7. Engine generates a repo overview using Claude Agent SDK
8. Engine writes `module-tree.json` reflecting the module plan
9. Engine runs validation (Epic 1)
10. Engine runs bounded quality review if validation finds fixable issues
11. Engine writes metadata (Epic 1)
12. Engine returns a `DocumentationRunResult`

#### Acceptance Criteria

**AC-1.1:** Generate accepts a `DocumentationRunRequest` with `mode: "full"` and returns a `DocumentationRunResult`.

- **TC-1.1a: Successful full generation**
  - Given: Valid repo path, environment checks pass, Agent SDK is available
  - When: Caller invokes generate with mode "full"
  - Then: `DocumentationRunResult` returned with `success: true`, `mode: "full"`, populated `generatedFiles`, populated `modulePlan`, and `commitHash` matching repo HEAD
- **TC-1.1b: Run ID assigned**
  - Given: Caller invokes generate
  - When: Run starts
  - Then: `DocumentationRunResult.runId` is a unique, non-empty string; all progress events for this run share the same `runId`

**AC-1.2:** Engine resolves configuration by merging the run request, config file, and defaults before execution begins.

- **TC-1.2a: Request fields override config file**
  - Given: Config file sets `outputPath: "docs/generated"`; run request sets `outputPath: "docs/custom"`
  - When: Generation runs
  - Then: Output is written to `docs/custom`
- **TC-1.2b: Defaults fill unset fields**
  - Given: Run request omits `excludePatterns`; no config file exists
  - When: Generation runs
  - Then: Default exclude patterns (node_modules, .git) are applied
- **TC-1.2c: Invalid request produces structured error**
  - Given: Run request has `repoPath: ""` (empty)
  - When: Caller invokes generate
  - Then: Structured error returned with code `CONFIGURATION_ERROR`; no stages execute

**AC-1.3:** Engine produces a `ModulePlan` that maps analyzed components to named modules.

- **TC-1.3a: Components grouped into modules**
  - Given: Analysis returns 20 components across 3 directories
  - When: Module planning completes
  - Then: `ModulePlan.modules` contains multiple `PlannedModule` entries; every analyzed component appears in exactly one module's `components` array or in `unmappedComponents`, but not both and not in multiple modules
- **TC-1.3b: Small repo bypass**
  - Given: Analysis returns a component count at or below the clustering threshold (threshold value determined in Tech Design)
  - When: Module planning runs
  - Then: A valid `ModulePlan` is produced (may be a single module containing all components); clustering inference is not required
- **TC-1.3c: Module plan includes names and descriptions**
  - Given: Module planning completes
  - When: Caller inspects the module plan
  - Then: Each `PlannedModule` has a non-empty `name` and `description`
- **TC-1.3d: Unmapped components tracked**
  - Given: Analysis includes components that cannot be meaningfully grouped (e.g., standalone config files)
  - When: Module planning completes
  - Then: `ModulePlan.unmappedComponents` lists the file paths of ungrouped components

**AC-1.4:** Engine generates one markdown documentation page per module in the module plan.

- **TC-1.4a: Module pages written**
  - Given: Module plan contains modules "core", "api", "utils"
  - When: Module generation completes
  - Then: Output directory contains `core.md`, `api.md`, `utils.md` (or equivalent page names derived from module names)
- **TC-1.4b: Module page content references module components**
  - Given: Module "core" contains components at `src/core/engine.ts` and `src/core/config.ts`
  - When: Module generation completes
  - Then: `core.md` references both component files in its content
- **TC-1.4c: Empty module handled**
  - Given: Module plan includes a module with zero components (edge case from clustering)
  - When: Module generation runs
  - Then: Module is either omitted from generation or produces a minimal placeholder page; no hard failure

**AC-1.5:** Engine generates a repo overview after module documentation exists.

- **TC-1.5a: Overview written**
  - Given: Module documentation generation completes successfully
  - When: Overview generation completes
  - Then: `overview.md` exists in the output directory
- **TC-1.5b: Overview references modules**
  - Given: Module plan contains modules "core", "api", "utils"
  - When: Overview generation completes
  - Then: `overview.md` references each module by name
- **TC-1.5c: Overview includes Mermaid diagram**
  - Given: Overview generation completes
  - When: Caller reads `overview.md`
  - Then: File contains at least one Mermaid code block representing repository structure

**AC-1.6:** Engine writes `module-tree.json` reflecting the module plan.

- **TC-1.6a: Module tree matches plan**
  - Given: Module plan contains modules "core", "api", "utils"
  - When: Generation completes
  - Then: `module-tree.json` contains entries for each module with `name` and `page` fields matching generated pages
- **TC-1.6b: Hierarchical modules preserved**
  - Given: Module plan contains a module "core" with child module "core/config"
  - When: Generation completes
  - Then: `module-tree.json` represents the parent-child relationship via `children` nesting

**AC-1.7:** Output directory follows a deterministic structural convention: one markdown page per module (named after the module), `overview.md`, `module-tree.json`, `.doc-meta.json`, and `.module-plan.json`. File names are derived from module names in the plan.

- **TC-1.7a: Structural convention followed**
  - Given: Module plan contains modules "core", "api", "utils"
  - When: Full generation completes
  - Then: Output directory contains `core.md`, `api.md`, `utils.md`, `overview.md`, `module-tree.json`, `.doc-meta.json`, and `.module-plan.json`; no unexpected files are created
- **TC-1.7b: File names derived from module names**
  - Given: Module plan contains a module named "auth-middleware"
  - When: Generation completes
  - Then: Output contains a page with a filename derived from "auth-middleware" (e.g., `auth-middleware.md`)

**AC-1.8:** Validation runs automatically before the run reports complete.

- **TC-1.8a: Validation runs post-generation**
  - Given: Module docs and overview are generated
  - When: Generation pipeline reaches the validation stage
  - Then: Epic 1 validation runs against the output directory; `DocumentationRunResult.validationResult` reflects the findings
- **TC-1.8b: Validation warnings do not block completion**
  - Given: Validation finds warnings but no errors after quality review
  - When: Run completes
  - Then: `success` is `true`; `validationResult` includes warnings; `warnings` array surfaces them
- **TC-1.8c: Validation errors after quality review block completion**
  - Given: Validation finds errors after quality review that could not be fixed
  - When: Run evaluates final validation state
  - Then: `success` is `false`; `failedStage: "validating-output"`; metadata is not written

**AC-1.9:** Metadata is written after successful generation.

- **TC-1.9a: Metadata reflects generation**
  - Given: Full generation completes with mode "full"
  - When: Run finishes
  - Then: `.doc-meta.json` in the output directory contains `mode: "full"`, current commit hash, ISO 8601 timestamp, and list of generated files

**AC-1.10:** The module plan is persisted in the output directory so subsequent update runs can map changed files to modules.

- **TC-1.10a: Module plan persisted**
  - Given: Full generation completes
  - When: Caller inspects the output directory
  - Then: A module plan file exists (e.g., `.module-plan.json`) containing the `ModulePlan` used for generation
- **TC-1.10b: Persisted plan matches run result**
  - Given: Full generation completes
  - When: Caller reads the persisted module plan and the run result's `modulePlan`
  - Then: Both contain the same modules and component assignments

---

### 2. Incremental Update

The engine supports an update mode that regenerates only modules affected by
code changes since the last generation. The caller submits a
`DocumentationRunRequest` with `mode: "update"`. The engine determines what
changed, identifies affected modules, regenerates those modules, and optionally
regenerates the overview.

Update mode replaces affected module documentation entirely. Manual edits to
generated module pages are not preserved. This is a known v1 limitation.

Update mode works within the bounds of the existing module plan. The engine
reruns structural analysis to get a fresh view of the repo, then compares old
and new analysis to determine what changed. New files are mapped to existing
modules when fresh analysis places them in a directory or import chain covered
by that module. New files that cannot be mapped to any existing module are
noted in warnings but not regenerated — the caller should run full generation
to produce a fresh plan. Update mode cannot create new modules; that requires
full generation.

1. Caller invokes generate with a `DocumentationRunRequest` (mode: "update")
2. Engine resolves configuration
3. Engine reads prior metadata (Epic 1)
4. Engine verifies prior metadata is valid
5. Engine compares stored commit hash to current HEAD
6. Engine computes changed files since the last generation commit
7. Engine reruns structural analysis (Epic 1)
8. Engine loads the persisted module plan from the output directory and maps changed files to affected modules
9. Engine detects structural changes (new files, deleted files, relationship changes)
10. Engine regenerates affected modules using Claude Agent SDK in update mode
11. Engine regenerates overview if module structure changed
12. Engine runs validation (Epic 1)
13. Engine runs bounded quality review
14. Engine writes updated metadata (Epic 1)
15. Engine returns a `DocumentationRunResult`

#### Acceptance Criteria

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

---

### 3. Progress & Run Reporting

Generation and update workflows are long-running. The engine emits typed,
stage-aware progress events so the caller can render meaningful UI (Code
Steward's Documentation tab) or log status during CLI execution.

#### Acceptance Criteria

**AC-3.1:** Engine emits typed `DocumentationProgressEvent` events during generation and update.

- **TC-3.1a: Progress events emitted per stage**
  - Given: Full generation runs
  - When: Each stage begins
  - Then: A progress event is emitted with the corresponding `stage` value
- **TC-3.1b: Stage sequence for full generation**
  - Given: Full generation runs to completion
  - When: Caller collects all progress events
  - Then: Events appear in order: `checking-environment`, `analyzing-structure`, `planning-modules`, `generating-module` (one or more), `generating-overview`, `validating-output`, (optional `quality-review`), `writing-metadata`, `complete`
- **TC-3.1c: Stage sequence for update**
  - Given: Update runs to completion with affected modules
  - When: Caller collects all progress events
  - Then: Events include `computing-changes` and `planning-modules` stages before module generation

**AC-3.2:** Module-level progress events include the module name and completion count.

- **TC-3.2a: Per-module progress**
  - Given: Module plan contains 5 modules
  - When: Module generation runs
  - Then: `generating-module` events fire with `moduleName`, `completed` (incrementing from 1), and `total: 5`
- **TC-3.2b: Update mode per-module progress**
  - Given: 2 of 5 modules are affected
  - When: Update generation runs
  - Then: `generating-module` events fire with `total: 2` (only affected modules counted)

**AC-3.3:** Every progress event includes the `runId` so the caller can associate events with a specific run.

- **TC-3.3a: Run ID consistent across events**
  - Given: A generation run emits multiple progress events
  - When: Caller inspects events
  - Then: All events share the same `runId`; this `runId` matches `DocumentationRunResult.runId`

**AC-3.4:** Run result includes success/failure, output path, generated files, module plan, validation state, duration, cost (best-effort), warnings, and commit hash.

- **TC-3.4a: Complete successful result**
  - Given: Full generation completes
  - When: Caller inspects result
  - Then: `success: true`, `outputPath` is the resolved output directory, `generatedFiles` lists all output files, `modulePlan` is the plan used, `validationResult` is the final validation state, `durationSeconds` is positive, `commitHash` matches HEAD
- **TC-3.4b: Cost when available**
  - Given: Agent SDK returns token/cost information
  - When: Run completes
  - Then: `costUsd` is a positive number reflecting total inference cost
- **TC-3.4c: Cost when unavailable**
  - Given: Agent SDK does not return cost information
  - When: Run completes
  - Then: `costUsd` is `null`; run completes normally
- **TC-3.4d: Warnings surfaced in result**
  - Given: Validation finds warnings; some modules had thin content
  - When: Run completes
  - Then: `warnings` array contains descriptive entries for each warning

**AC-3.5:** Failed run results include diagnostic information identifying the failure stage.

- **TC-3.5a: Failed result structure**
  - Given: Generation fails during module generation stage
  - When: Caller inspects result
  - Then: `success: false`; `failedStage` identifies `"generating-module"`; `error` contains a structured `EngineError` with code and message

---

### 4. Validation & Quality Review

After generation or update produces output, the engine runs deterministic
validation (Epic 1) and then a bounded quality review. The quality review
is limited to obvious, non-controversial fixes and is capped at two passes
total.

The quality review addresses issues that the generating model can fix without
re-clustering or architectural changes. It is not an open-ended improvement
loop.

1. Generation or update produces output files
2. Engine runs deterministic validation (Epic 1)
3. If validation finds fixable issues and self-review is enabled: engine runs one self-review pass
4. Engine reruns deterministic validation
5. If fixable issues remain and second-model review is enabled: engine runs one second-model review pass
6. Engine reruns deterministic validation
7. Final validation state is included in the run result

#### Acceptance Criteria

**AC-4.1:** Deterministic validation (Epic 1) runs automatically after generation or update output is written.

- **TC-4.1a: Validation runs post-generation**
  - Given: Module docs and overview are written to the output directory
  - When: Validation stage begins
  - Then: Epic 1 validation runs against the full output directory
- **TC-4.1b: Validation runs post-update**
  - Given: Affected modules are regenerated
  - When: Validation stage begins
  - Then: Epic 1 validation runs against the full output directory (not just updated files)

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

---

### 5. Recovery & Failure Handling

The engine fails in a bounded and inspectable way. Each stage can fail
independently. Failures are reported with the stage where they occurred, a
structured error, and any partial diagnostic information available.

#### Acceptance Criteria

**AC-5.1:** Environment check or analysis failure stops the run before inference begins.

- **TC-5.1a: Environment check failure**
  - Given: Python is not installed
  - When: Caller invokes generate
  - Then: Run result has `success: false`; `failedStage: "checking-environment"`; error code `DEPENDENCY_MISSING`; no Agent SDK invocation occurs
- **TC-5.1b: Analysis failure**
  - Given: Structural analysis adapter crashes
  - When: Generation reaches analysis stage
  - Then: Run result has `success: false`; `failedStage: "analyzing-structure"`; error code `ANALYSIS_ERROR`; no inference runs

**AC-5.2:** Agent SDK failure during generation reports the stage and partial context.

- **TC-5.2a: Module generation failure**
  - Given: Agent SDK fails while generating module "api" (3rd of 5 modules)
  - When: Failure occurs
  - Then: Run result has `success: false`; `failedStage: "generating-module"`; error identifies the failing module; progress events show the first 2 modules completed
- **TC-5.2b: Overview generation failure**
  - Given: Agent SDK fails during overview synthesis
  - When: Failure occurs
  - Then: Run result has `success: false`; `failedStage: "generating-overview"`; module docs that were successfully generated remain on disk
- **TC-5.2c: Clustering failure**
  - Given: Agent SDK fails during module planning
  - When: Failure occurs
  - Then: Run result has `success: false`; `failedStage: "planning-modules"`; error code `ORCHESTRATION_ERROR`

**AC-5.3:** Validation outcome after quality review determines run success. Warnings are non-blocking; errors are blocking.

- **TC-5.3a: Validation warnings do not fail the run**
  - Given: Validation after quality review finds only warnings (no errors)
  - When: Run completes
  - Then: `success: true`; warnings appear in `validationResult` and `warnings` array
- **TC-5.3b: Validation errors after quality review fail the run**
  - Given: Validation after quality review finds errors that quality review could not fix
  - When: Run completes
  - Then: `success: false`; `failedStage: "validating-output"`; `validationResult` contains the unresolved error findings; metadata is not written; partial output remains on disk for inspection

**AC-5.4:** Partial outputs from failed runs are handled predictably.

- **TC-5.4a: Failed run leaves partial output on disk**
  - Given: Generation fails after writing 3 of 5 module pages
  - When: Run result is returned
  - Then: The 3 written module pages remain on disk; no metadata is written (run was not successful); `generatedFiles` in the result lists the partial files if available
- **TC-5.4b: No metadata written for failed runs**
  - Given: Generation fails at any stage
  - When: Run result is returned
  - Then: `.doc-meta.json` is not written or updated; prior metadata (if any) remains unchanged

**AC-5.5:** A `"failed"` progress event is emitted when a run fails.

- **TC-5.5a: Failed event emitted**
  - Given: Run fails at any stage
  - When: Failure occurs
  - Then: A progress event with `stage: "failed"` is emitted as the final event

---

## Data Contracts

### DocumentationRunRequest

```typescript
interface DocumentationRunRequest {
  repoPath: string;
  mode: "full" | "update";
  outputPath?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  focusDirs?: string[];
  qualityReview?: QualityReviewConfig;
}

interface QualityReviewConfig {
  selfReview?: boolean;          // default: true
  secondModelReview?: boolean;   // default: false
}
```

### DocumentationProgressEvent

```typescript
interface DocumentationProgressEvent {
  runId: string;
  stage: DocumentationStage;
  moduleName?: string;           // present when stage is "generating-module"
  completed?: number;            // modules completed so far
  total?: number;                // total modules to generate
  timestamp: string;             // ISO 8601 UTC
}

type DocumentationStage =
  | "checking-environment"
  | "analyzing-structure"
  | "computing-changes"          // update mode only
  | "planning-modules"
  | "generating-module"
  | "generating-overview"
  | "validating-output"
  | "quality-review"
  | "writing-metadata"
  | "complete"
  | "failed";
```

### DocumentationRunResult

The run result is a discriminated union on `success`. The success shape
includes all final artifacts. The failure shape includes only fields
guaranteed to exist at the point of failure, plus optional partial artifacts
for diagnostics.

```typescript
type DocumentationRunResult = DocumentationRunSuccess | DocumentationRunFailure;

interface DocumentationRunResultBase {
  mode: "full" | "update";
  runId: string;
  durationSeconds: number;
  warnings: string[];
}

interface DocumentationRunSuccess extends DocumentationRunResultBase {
  success: true;
  outputPath: string;
  generatedFiles: string[];
  modulePlan: ModulePlan;
  validationResult: ValidationResult;
  qualityReviewPasses: number;           // 0, 1, or 2
  costUsd: number | null;                // null when cost unavailable
  commitHash: string;
  // update-mode fields
  updatedModules?: string[];             // modules regenerated (update mode)
  unchangedModules?: string[];           // modules left untouched (update mode)
  overviewRegenerated?: boolean;         // whether overview was regenerated (update mode)
}

interface DocumentationRunFailure extends DocumentationRunResultBase {
  success: false;
  failedStage: DocumentationStage;
  error: EngineError;
  // partial artifacts available for diagnostics; absent when failure occurs before these stages
  outputPath?: string;                   // present if configuration resolved
  commitHash?: string;                   // present if repo was accessible
  generatedFiles?: string[];             // present if any files were written before failure
  modulePlan?: ModulePlan;               // present if planning completed before failure
  validationResult?: ValidationResult;   // present if validation ran before failure
  qualityReviewPasses?: number;
  costUsd?: number | null;
}
```

### ModulePlan

```typescript
interface ModulePlan {
  modules: PlannedModule[];
  unmappedComponents: string[];          // file paths not assigned to any module
}

interface PlannedModule {
  name: string;
  description: string;
  components: string[];                  // file paths of components in this module
  parentModule?: string;                 // name of parent module for hierarchical grouping
}
```

### Error Types (Extensions to Epic 1)

Epic 2 extends Epic 1's error code set with one additional code for
inference-related failures.

| Code | Description |
|------|-------------|
| `ORCHESTRATION_ERROR` | Agent SDK session failed, structured output parsing failed, or generation pipeline failed |

```typescript
// Extended from Epic 1
type EngineErrorCode =
  | "ENVIRONMENT_ERROR"
  | "DEPENDENCY_MISSING"
  | "ANALYSIS_ERROR"
  | "METADATA_ERROR"
  | "VALIDATION_ERROR"
  | "CONFIGURATION_ERROR"
  | "PATH_ERROR"
  | "ORCHESTRATION_ERROR";
```

---

## Dependencies

Technical dependencies:

- Epic 1 operations: checkEnvironment, analyzeRepository, validateDocumentation, writeMetadata, readMetadata, getDocumentationStatus
- Claude Agent SDK (for clustering, module generation, overview synthesis, and quality review)
- Git (for changed-file computation between commits in update mode)

Process dependencies:

- Epic 1 must be complete before Epic 2 execution begins
- Agent SDK integration must be verified as locally invocable

---

## Non-Functional Requirements

### Performance
- Progress events surface within 1 second of run start
- Update runs avoid full regeneration when changes are localized to a subset of modules
- Quality review passes are bounded: maximum 2 total (1 self-review + 1 second-model)

### Reliability
- Inference failures are structured and machine-readable; no untyped exceptions propagate to the caller
- Agent SDK session boundaries are managed by the engine; the caller does not manage sessions
- Partial output from failed runs does not corrupt prior valid state (metadata is only written on success)

### Cost
- Missing cost data from Agent SDK does not fail or degrade the run
- Quality review passes are inference-bounded: each pass is a single targeted review, not an iterative loop

### Testability
- Orchestration logic is testable with mocked Agent SDK responses
- Module planning, change detection, and affected-module mapping are testable with fixture data without live inference

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. How should Agent SDK sessions be bounded? One session per module, per batch of modules, or per stage? What batch size balances throughput against context quality?
2. How should oversized modules be subdivided? Should the module plan include a size threshold that triggers sub-module decomposition, or should this be deferred?
3. What structured output schemas should be used for clustering results and module generation summaries? How should schema validation failures be handled?
4. How should the engine detect "fixable" issues during quality review? Should the review model receive the validation findings and the relevant files, or should the engine pre-filter findings?
5. For the second-model review pass, should the engine use a different model entirely (e.g., a faster model for review) or the same model with a different system prompt?
6. How should the engine track cost across multiple Agent SDK sessions within a single run? Aggregate token counts per session, or rely on a single cost report?
7. In update mode, how should the engine handle cases where the prior module plan's component-to-module mapping no longer makes sense (e.g., major directory restructuring)? Fall back to full regeneration, or attempt partial re-planning?
8. What is the right progress event delivery mechanism for the SDK? Callback function on the run request, EventEmitter, async iterator, or something else?
9. What is the right clustering threshold for the small-repo bypass? Below this component count, the engine produces a direct module plan without invoking inference for clustering.

---

## Recommended Story Breakdown

### Story 0: Orchestration Foundation

Run lifecycle model (runId generation, state tracking), `DocumentationRunRequest`
validation and configuration resolution (merging request + config file + defaults),
progress event infrastructure (emitter type, listener registration),
`DocumentationProgressEvent` and `DocumentationRunResult` types, `ModulePlan`
and `PlannedModule` types, `QualityReviewConfig` type, `ORCHESTRATION_ERROR`
code addition, mock Agent SDK response fixtures for testing.

### Story 1: Module Planning & Clustering

**Delivers:** Engine can produce a `ModulePlan` from structural analysis results, using inference for clustering when the component count warrants it and a direct mapping for small repos.
**Prerequisite:** Story 0
**ACs covered:**
- AC-1.3 (module plan generation, small repo bypass, unmapped components)

**Estimated test count:** 14 tests

### Story 2: Core Generation Flow

**Delivers:** Engine can execute the core generation pipeline — module page generation, overview synthesis, module-tree and metadata writing, and module plan persistence — producing a complete output directory from a run request.
**Prerequisite:** Story 1 (module plan needed for generation)
**ACs covered:**
- AC-1.1 (generate accepts request, returns result)
- AC-1.2 (configuration resolution for run)
- AC-1.4 (module page generation)
- AC-1.5 (overview generation)
- AC-1.6 (module-tree.json)
- AC-1.7 (deterministic output structure)
- AC-1.8 (validation runs post-generation)
- AC-1.9 (metadata written)
- AC-1.10 (module plan persisted for update mode)

**Estimated test count:** 23 tests

### Story 3: Progress & Result Assembly

**Delivers:** Engine emits typed stage-aware progress events during full-generation runs and assembles complete structured run results with cost (best-effort), duration, warnings, and validation state, establishing contracts Story 5 reuses in update mode.
**Prerequisite:** Story 2 (generation pipeline to emit progress from)
**ACs covered:**
- AC-3.1 (progress events emitted per stage)
- AC-3.2 (full-generation module-level progress with name and counts; update-specific counts land in Story 5)
- AC-3.3 (runId consistency across events)
- AC-3.4 (complete run result shape)

**Estimated test count:** 12 tests

### Story 4: Validation & Quality Review

**Delivers:** Engine runs bounded post-generation quality review, fixing obvious issues and revalidating, with configurable self-review and second-model review passes.
**Prerequisite:** Story 2 (generation output needed for review)
**ACs covered:**
- AC-1.8 (post-review success/failure semantics)
- AC-4.1 (validation runs post-generation; update-path verification lands in Story 5)
- AC-4.2 (self-review pass)
- AC-4.3 (fix scope limits)
- AC-4.4 (revalidation after each pass)
- AC-4.5 (optional second-model review)
- AC-4.6 (final validation state in result)

**Estimated test count:** 21 tests

### Story 5: Incremental Update Flow

**Delivers:** Engine can execute an incremental update that regenerates only affected modules, with change detection, affected-module mapping via fresh analysis comparison, selective overview regeneration, update-specific progress counts, and post-update validation against the full output directory.
**Prerequisite:** Story 2 (generation mechanics reused), Story 3 (shared progress/result contracts), Story 4 (quality review integrated)
**ACs covered:**
- AC-2.1 (metadata and plan required for update)
- AC-2.2 (changed file computation)
- AC-2.3 (affected module mapping via fresh analysis comparison)
- AC-2.4 (targeted regeneration)
- AC-2.5 (structural change handling)
- AC-2.6 (overview regeneration on module removal; no new modules in update mode)
- AC-2.7 (metadata updated)
- AC-2.8 (update-specific result fields)
- AC-3.1 (update-stage sequencing)
- AC-3.2 (update-mode per-module progress counts)
- AC-4.1 (post-update validation against the full output directory)

**Estimated test count:** 28 tests

### Story 6: Recovery & Failure Handling

**Delivers:** Engine handles failures at every stage with structured diagnostics, emits failed events, preserves partial output predictably, and returns complete run results including best-effort cost tracking.
**Prerequisite:** Stories 2-5 (all flows need failure handling)
**ACs covered:**
- AC-3.5 (failed result diagnostics)
- AC-5.1 (pre-inference failure stops run)
- AC-5.2 (agent failure reports stage and context)
- AC-5.3 (validation failure severity)
- AC-5.4 (partial output handling)
- AC-5.5 (failed progress event)

**Estimated test count:** 14 tests

---

## Validation Checklist

- [x] User Profile has all four fields + Feature Overview
- [x] Flows cover all paths (happy, alternate, error)
- [x] Every AC is testable (no vague terms)
- [x] Every AC has at least one TC
- [x] TCs cover happy path, edge cases, and errors
- [x] Data contracts are fully typed
- [x] Scope boundaries are explicit (in/out/assumptions)
- [x] Story breakdown covers all ACs
- [x] Stories sequence logically (foundation → planning → core generation → progress/reporting → quality review → update → recovery)
- [x] All validator issues addressed (round 1: self-review fixes; round 2: external verifier fixes)
- [x] Validation rounds complete (2 rounds)
- [x] Self-review complete
