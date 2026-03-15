# Stories: Generation & Update Orchestration

Functional story sharding for Epic 2. These are acceptance artifacts — the Tech
Lead adds technical implementation sections during Story Technical Enrichment.

---

## Tech Design Validation

Before sharding, validated the tech design is shard-ready:

- [x] Interfaces clear enough to identify logical AC groupings
- [x] TC-to-test mapping complete (112 tests across 7 chunks)
- [x] Logical AC groupings identifiable — flows map to coherent story scopes
- [x] Dependency chains traceable — foundation → planning → generation → progress/review → update → failure

No issues found. Proceeding with sharding.

---

## Related Documents

- [Epic](epic.md)
- [Tech Design](tech-design.md)
- [Test Plan](test-plan.md)

## Story Index

- [Story 0: Orchestration Foundation](stories/story-0.md)
- [Story 1: Module Planning & Clustering](stories/story-1.md)
- [Story 2: Core Generation Pipeline](stories/story-2.md)
- [Story 3: Progress Events & Result Assembly](stories/story-3.md)
- [Story 4: Validation & Quality Review](stories/story-4.md)
- [Story 5: Incremental Update](stories/story-5.md)
- [Story 6: Recovery & Failure Handling](stories/story-6.md)

## Story 0: Orchestration Foundation

### Objective

Establish the shared type system, run lifecycle primitives, real Agent SDK
adapter boundary, mock infrastructure, and prompt builder stubs that all
subsequent stories build on. After this story, every Epic 2 type compiles, the
real and mock SDK adapters are available behind the same typed boundary, and
test fixtures are loadable for all downstream story tests.

### Scope

#### In Scope

- All Epic 2 type definitions: `DocumentationRunRequest`, `DocumentationRunResult` (discriminated union), `DocumentationProgressEvent`, `DocumentationStage`, `ModulePlan`, `PlannedModule`, `QualityReviewConfig`, `ProgressCallback`
- `RunContext` class for run lifecycle state
- Agent SDK adapter interface and real implementation for session execution, structured output calls, and usage capture
- `moduleNameToFileName` utility function
- `CLUSTERING_THRESHOLD` and `LARGE_REPO_MODULE_THRESHOLD` constants
- `ORCHESTRATION_ERROR` code added to `EngineErrorCode`
- Zod contract schemas for clustering output, module generation output, and review patch payloads
- Mock Agent SDK response fixtures (JSON files for clustering, module gen, overview, review)
- Mock Agent SDK adapter helper for test setup
- Prompt builder stub functions (clustering, module-doc, overview, quality-review)

#### Out of Scope

- Prompt builder implementation (filled in during Stories 1, 2, 4)
- Any stage logic or pipeline orchestration (Stories 1-6)

### Dependencies / Prerequisites

- Epic 1 complete — types, error model, and test infrastructure in place

### Exit Criteria

- [ ] `typecheck` passes with all new types importable
- [ ] Real Agent SDK adapter is importable and callable behind the typed boundary
- [ ] Mock Agent SDK fixtures structured and loadable
- [ ] Mock SDK adapter helper returns configured responses
- [ ] `moduleNameToFileName` utility compiles (no tests yet — pure function tested in Story 1)

---

## Story 1: Module Planning & Clustering

### Objective

The engine can produce a `ModulePlan` from structural analysis results. Small
repos get a direct module plan without inference. Larger repos get
inference-driven clustering via the Agent SDK. After this story, calling the
planning stage with an analysis result returns a validated module plan.

### Scope

#### In Scope

- Small-repo bypass: deterministic directory-based grouping when component count is at or below the clustering threshold
- Inference clustering: Agent SDK session that returns a `ModulePlan` via structured output
- Plan validation: every component in exactly one module or in `unmappedComponents`, no duplicates, no empty modules array
- Prompt builder implementation for clustering

#### Out of Scope

- Full generation pipeline wiring (Story 2)
- Module doc generation (Story 2)
- Overview generation (Story 2)

### Dependencies / Prerequisites

- Story 0 complete — types, real and mock SDK adapters, and fixtures available

### Acceptance Criteria

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

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Agent SDK fails during clustering | `ORCHESTRATION_ERROR` — planning stage fails |
| Structured output fails schema validation | `ORCHESTRATION_ERROR` with raw response in details |
| Clustering returns plan where component appears in two modules | `ORCHESTRATION_ERROR` — plan validation rejects |

### Definition of Done

- [ ] All AC-1.3 TCs verified
- [ ] Small-repo bypass produces valid plan without Agent SDK call
- [ ] Clustering via Agent SDK produces valid plan with structured output
- [ ] Plan validation catches semantic errors (overlap, duplicates, empty)
- [ ] Prompt builder structural tests pass (clustering prompt includes component list and relationship graph)
- [ ] PO accepts

---

## Story 2: Core Generation Pipeline

### Objective

The engine can execute a full documentation generation run from start to finish.
A caller submits a `DocumentationRunRequest` with `mode: "full"` and receives a
`DocumentationRunResult` with generated module pages, an overview, module tree,
persisted metadata, and persisted module plan. After this story, the primary
happy-path generation flow works end to end.

This is the largest story because the pipeline stages are tightly coupled — module
generation, overview synthesis, tree writing, validation, and metadata persistence
must all exist for a complete run. No subset produces an independently acceptable
result.

### Scope

#### In Scope

- `generateDocumentation()` entry point accepting `DocumentationRunRequest`
- Request validation and configuration resolution (merge request + config file + defaults)
- Environment check stage (wrapping Epic 1)
- Structural analysis stage (wrapping Epic 1)
- Module doc generation: per-module Agent SDK sessions, markdown file output
- Overview generation: single Agent SDK session producing `overview.md` with Mermaid diagram
- Module tree writing: `module-tree.json` from plan (deterministic)
- Post-generation validation (wrapping Epic 1)
- Metadata persistence: `.doc-meta.json` and `.module-plan.json` written on success
- Deterministic output structure convention
- Prompt builder implementation for module-doc and overview

#### Out of Scope

- Progress event emission and `runId`/event correlation (Story 3 — pipeline runs silently in this story; `runId` is assigned but event correlation is not verified)
- Quality review passes (Story 4 — validation runs but review is not wired)
- Post-quality-review success/failure semantics: TC-1.8b and TC-1.8c (Story 4 — Story 2 treats validation errors as direct failures since review is not yet wired)
- Update mode (Story 5)
- Failure handling beyond basic try/catch (Story 6)
- Cost tracking in result (Story 3)

### Dependencies / Prerequisites

- Story 1 complete — module planning produces a `ModulePlan`

### Acceptance Criteria

**AC-1.1 (partial — TC-1.1a only; TC-1.1b moves to Story 3):** Generate accepts a `DocumentationRunRequest` with `mode: "full"` and returns a `DocumentationRunResult`.

- **TC-1.1a: Successful full generation**
  - Given: Valid repo path, environment checks pass, Agent SDK is available
  - When: Caller invokes generate with mode "full"
  - Then: `DocumentationRunResult` returned with `success: true`, `mode: "full"`, populated `generatedFiles`, populated `modulePlan`, and `commitHash` matching repo HEAD

> **Note:** TC-1.1b (run ID + progress event correlation) is owned by Story 3 because it depends on progress event infrastructure. Story 2 assigns a `runId` on the result but does not verify event correlation.

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

**AC-1.8 (partial — TC-1.8a only; TC-1.8b and TC-1.8c move to Story 4):** Validation runs automatically before the run reports complete.

- **TC-1.8a: Validation runs post-generation**
  - Given: Module docs and overview are generated
  - When: Generation pipeline reaches the validation stage
  - Then: Epic 1 validation runs against the output directory; `DocumentationRunResult.validationResult` reflects the findings

> **Note:** TC-1.8b (warnings non-blocking after quality review) and TC-1.8c (errors blocking after quality review) depend on quality review completion. They are owned by Story 4, which integrates quality review into the pipeline. In Story 2, validation runs but quality review is not yet wired — validation errors in Story 2 produce `success: false` directly.

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

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Invalid run request (empty repoPath) | `CONFIGURATION_ERROR` — no stages execute |
| Environment check fails | `DEPENDENCY_MISSING` — run stops before inference |
| Analysis adapter crashes | `ANALYSIS_ERROR` — run stops before inference |
| Module generation Agent SDK session fails | `ORCHESTRATION_ERROR` — partial output on disk |
| Overview generation Agent SDK session fails | `ORCHESTRATION_ERROR` — module docs remain |
| Validation finds errors (no quality review in this story) | `success: false`, `failedStage: "validating-output"` (Story 4 refines this with post-review semantics) |

### Definition of Done

- [ ] All ACs met (AC-1.1 partial, AC-1.2, AC-1.4-AC-1.10)
- [ ] All TC conditions verified (18 TCs — TC-1.1b moved to Story 3, TC-1.8b/c moved to Story 4)
- [ ] Full generation happy path produces complete output directory
- [ ] Output matches structural convention
- [ ] Metadata and module plan persist on success only
- [ ] PO accepts

---

## Story 3: Progress Events & Result Assembly

### Objective

The engine emits typed, stage-aware progress events during full-generation runs
and assembles complete structured run results including cost tracking. After
this story, a caller receives real-time stage notifications during a full run
and a fully populated success result, while the shared progress/result contracts
are ready for Story 5 to reuse in update mode.

### Scope

#### In Scope

- Progress event emission via `onProgress` callback at each pipeline stage
- Per-module progress events with `moduleName`, `completed`, and `total` fields
- `runId` consistency across all events and the final result
- Result assembly for success path: all fields populated
- Cost tracking: accumulate token usage across Agent SDK sessions, compute `costUsd`
- All-or-nothing cost: `null` when any session lacks usage data
- Warning aggregation in result

#### Out of Scope

- Failed result assembly (Story 6 — this story handles the success result path)
- Update-specific progress stages like `computing-changes` and update-mode per-module counts (Story 5 wires those in and verifies their sequencing)
- Quality review progress events (Story 4 — `quality-review` stage event added there)

### Dependencies / Prerequisites

- Story 2 complete — generation pipeline to emit progress from and assemble results for

### Acceptance Criteria

**AC-1.1 (partial — TC-1.1b only; TC-1.1a owned by Story 2):** Generate assigns a unique `runId` that correlates across progress events and the final result.

- **TC-1.1b: Run ID assigned**
  - Given: Caller invokes generate
  - When: Run starts
  - Then: `DocumentationRunResult.runId` is a unique, non-empty string; all progress events for this run share the same `runId`

**AC-3.1 (partial — TC-3.1a and TC-3.1b only; TC-3.1c owned by Story 5):** Engine emits typed `DocumentationProgressEvent` events during generation and update.

- **TC-3.1a: Progress events emitted per stage**
  - Given: Full generation runs
  - When: Each stage begins
  - Then: A progress event is emitted with the corresponding `stage` value
- **TC-3.1b: Stage sequence for full generation**
  - Given: Full generation runs to completion
  - When: Caller collects all progress events
  - Then: Events appear in order: `checking-environment`, `analyzing-structure`, `planning-modules`, `generating-module` (one or more), `generating-overview`, `validating-output`, `writing-metadata`, `complete`

> **Note:** TC-3.1c (update-stage sequencing) is owned by Story 5 because Story 5 introduces the update-specific stages and is the first story where that event order can be verified end to end.

**AC-3.2 (partial — TC-3.2a only; TC-3.2b owned by Story 5):** Module-level progress events include the module name and completion count.

- **TC-3.2a: Per-module progress**
  - Given: Module plan contains 5 modules
  - When: Module generation runs
  - Then: `generating-module` events fire with `moduleName`, `completed` (incrementing from 1), and `total: 5`

> **Note:** TC-3.2b (update-mode per-module progress) is owned by Story 5 because it depends on the update pipeline and affected-module calculation.

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

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| No `onProgress` callback provided | No error — progress events silently not emitted |
| Callback throws during progress emission | Should not crash the pipeline (defensive handling) |

### Definition of Done

- [ ] All ACs met (AC-1.1 partial TC-1.1b, AC-3.1 partial TC-3.1a/b, AC-3.2 partial TC-3.2a, AC-3.3, AC-3.4)
- [ ] All TC conditions verified (9 TCs — includes TC-1.1b moved from Story 2; TC-3.1c and TC-3.2b owned by Story 5)
- [ ] Progress events fire in correct order for full generation
- [ ] `runId` correlates across all progress events and the final result
- [ ] Module-level progress includes name and counts
- [ ] Cost tracking is all-or-nothing
- [ ] PO accepts

---

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

## Story 6: Recovery & Failure Handling

### Objective

The engine handles failures at every pipeline stage with structured diagnostics,
emits `"failed"` progress events, preserves partial output predictably, and
returns complete failure results using the discriminated union. After this story,
callers receive actionable failure information regardless of where the pipeline
breaks.

### Scope

#### In Scope

- Per-stage failure handling with `failedStage` identification
- Pre-inference gate: environment check or analysis failure stops run before Agent SDK
- Agent SDK failure at any inference stage (clustering, generation, overview)
- Validation error severity: warnings non-blocking, errors blocking
- Partial output preservation: written files stay on disk, no metadata written
- `"failed"` progress event as final event on failure
- Failed result assembly: `DocumentationRunFailure` shape with optional partial artifacts
- Failed result diagnostic fields: `error`, `failedStage`, optional `generatedFiles`, optional `modulePlan`

#### Out of Scope

- Retry logic for Agent SDK failures (deferred to future)
- Cleanup of partial output (files remain for inspection)

### Dependencies / Prerequisites

- Stories 2-5 complete — all pipeline paths exist for failure handling to wrap

### Acceptance Criteria

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

**AC-3.5:** Failed run results include diagnostic information identifying the failure stage.

- **TC-3.5a: Failed result structure**
  - Given: Generation fails during module generation stage
  - When: Caller inspects result
  - Then: `success: false`; `failedStage` identifies `"generating-module"`; `error` contains a structured `EngineError` with code and message

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

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Failure at metadata-write stage | `success: false`; all prior output exists but isn't tracked |
| Progress callback throws during failure event | Main failure result still returned |
| Double failure (stage fails, cleanup fails) | Primary failure reported; cleanup failure logged |

### Definition of Done

- [ ] All ACs met (AC-5.1 through AC-5.5, AC-3.5)
- [ ] All TC conditions verified (11 TCs)
- [ ] Every pipeline stage has a tested failure path
- [ ] Partial output preserved without metadata
- [ ] `"failed"` progress event always emitted as final event
- [ ] Discriminated union `DocumentationRunFailure` shape correct
- [ ] PO accepts

---

## Integration Path Trace

The two critical end-to-end paths are full generation and incremental update.

### Path 1: Full Generation (Happy Path)

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Caller → `generateDocumentation(request)` | Entry point with mode "full" | Story 2 | TC-1.1a |
| Request → config resolution | Merge request + config file + defaults | Story 2 | TC-1.2a |
| Config → environment check | Verify Python, Git, parsers | Story 2 | TC-1.8a (validation runs) |
| Env OK → structural analysis | Invoke Epic 1 analysis | Story 2 | TC-1.1a (analysis produces input for planning) |
| Analysis → module planning | Clustering or small-repo bypass | Story 1 | TC-1.3a |
| Plan → module generation | Per-module Agent SDK sessions | Story 2 | TC-1.4a |
| Modules → overview generation | Single Agent SDK session | Story 2 | TC-1.5a |
| Overview → module tree write | Deterministic JSON write | Story 2 | TC-1.6a |
| Tree → validation | Epic 1 validation pipeline | Story 2 | TC-1.8a |
| Validation → quality review | Self-review + optional second-model | Story 4 | TC-4.2a |
| Review → revalidation | Epic 1 validation reruns | Story 4 | TC-4.4a |
| Revalidation → success/failure decision | Warnings pass, errors fail | Story 4 | TC-1.8b, TC-1.8c |
| Success → metadata write | `.doc-meta.json` + `.module-plan.json` | Story 2 | TC-1.9a |
| Metadata → progress "complete" | Final progress event | Story 3 | TC-3.1b |
| Result assembly → caller | `DocumentationRunSuccess` returned | Story 3 | TC-3.4a |

No gaps. Every segment has an owning story.

### Path 2: Incremental Update (Happy Path)

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Caller → `generateDocumentation(request)` | Entry point with mode "update" | Story 5 | TC-2.1a (validates prior state) |
| Request → config resolution | Merge request + config file + defaults | Story 2 | TC-1.2a (shared) |
| Config → read prior metadata | Load `.doc-meta.json` | Story 5 | TC-2.1a |
| Config → read prior plan | Load `.module-plan.json` | Story 5 | TC-2.1c |
| Metadata → environment check | Verify Python, Git, parsers | Story 2 | (shared stage) |
| Env OK → structural analysis | Fresh analysis | Story 2 | (shared stage) |
| Analysis → change detection | Git diff between commits | Story 5 | TC-2.2a |
| Changes → affected module mapping | Map files to modules via plan + analysis | Story 5 | TC-2.3a |
| Mapping → selective module generation | Regenerate only affected modules | Story 5 | TC-2.4a |
| Generation → overview (if needed) | Regen if module removed | Story 5 | TC-2.6a |
| Output → validation + quality review | Full validation of output dir via the shared review stage | Story 5 | TC-4.1b |
| Review → metadata write | Updated `.doc-meta.json` + `.module-plan.json` | Story 5 | TC-2.7a |
| Result assembly → caller | With `updatedModules`, `unchangedModules` | Story 5 | TC-2.8a |

No gaps.

### Path 3: Generation Failure (Mid-Pipeline)

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Caller → `generateDocumentation(request)` | Entry point | Story 2 | TC-1.1a |
| Planning → module generation | 3rd module fails | Story 6 | TC-5.2a |
| Failure → partial output preserved | 2 modules on disk, no metadata | Story 6 | TC-5.4a |
| Failure → "failed" progress event | Final event | Story 6 | TC-5.5a |
| Failure → result assembly | `DocumentationRunFailure` with `failedStage` | Story 6 | TC-3.5a |

No gaps.

---

## Coverage Gate

Every AC and TC from Epic 2 assigned to exactly one story.

| AC | TC | Story |
|----|-----|-------|
| AC-1.1 | TC-1.1a | Story 2 |
| AC-1.1 | TC-1.1b | Story 3 |
| AC-1.2 | TC-1.2a | Story 2 |
| AC-1.2 | TC-1.2b | Story 2 |
| AC-1.2 | TC-1.2c | Story 2 |
| AC-1.3 | TC-1.3a | Story 1 |
| AC-1.3 | TC-1.3b | Story 1 |
| AC-1.3 | TC-1.3c | Story 1 |
| AC-1.3 | TC-1.3d | Story 1 |
| AC-1.4 | TC-1.4a | Story 2 |
| AC-1.4 | TC-1.4b | Story 2 |
| AC-1.4 | TC-1.4c | Story 2 |
| AC-1.5 | TC-1.5a | Story 2 |
| AC-1.5 | TC-1.5b | Story 2 |
| AC-1.5 | TC-1.5c | Story 2 |
| AC-1.6 | TC-1.6a | Story 2 |
| AC-1.6 | TC-1.6b | Story 2 |
| AC-1.7 | TC-1.7a | Story 2 |
| AC-1.7 | TC-1.7b | Story 2 |
| AC-1.8 | TC-1.8a | Story 2 |
| AC-1.8 | TC-1.8b | Story 4 |
| AC-1.8 | TC-1.8c | Story 4 |
| AC-1.9 | TC-1.9a | Story 2 |
| AC-1.10 | TC-1.10a | Story 2 |
| AC-1.10 | TC-1.10b | Story 2 |
| AC-2.1 | TC-2.1a | Story 5 |
| AC-2.1 | TC-2.1b | Story 5 |
| AC-2.1 | TC-2.1c | Story 5 |
| AC-2.2 | TC-2.2a | Story 5 |
| AC-2.2 | TC-2.2b | Story 5 |
| AC-2.2 | TC-2.2c | Story 5 |
| AC-2.2 | TC-2.2d | Story 5 |
| AC-2.3 | TC-2.3a | Story 5 |
| AC-2.3 | TC-2.3b | Story 5 |
| AC-2.3 | TC-2.3c | Story 5 |
| AC-2.3 | TC-2.3d | Story 5 |
| AC-2.4 | TC-2.4a | Story 5 |
| AC-2.4 | TC-2.4b | Story 5 |
| AC-2.5 | TC-2.5a | Story 5 |
| AC-2.5 | TC-2.5b | Story 5 |
| AC-2.5 | TC-2.5c | Story 5 |
| AC-2.6 | TC-2.6a | Story 5 |
| AC-2.6 | TC-2.6b | Story 5 |
| AC-2.6 | TC-2.6c | Story 5 |
| AC-2.7 | TC-2.7a | Story 5 |
| AC-2.8 | TC-2.8a | Story 5 |
| AC-3.1 | TC-3.1a | Story 3 |
| AC-3.1 | TC-3.1b | Story 3 |
| AC-3.1 | TC-3.1c | Story 5 |
| AC-3.2 | TC-3.2a | Story 3 |
| AC-3.2 | TC-3.2b | Story 5 |
| AC-3.3 | TC-3.3a | Story 3 |
| AC-3.4 | TC-3.4a | Story 3 |
| AC-3.4 | TC-3.4b | Story 3 |
| AC-3.4 | TC-3.4c | Story 3 |
| AC-3.4 | TC-3.4d | Story 3 |
| AC-3.5 | TC-3.5a | Story 6 |
| AC-4.1 | TC-4.1a | Story 4 |
| AC-4.1 | TC-4.1b | Story 5 |
| AC-4.2 | TC-4.2a | Story 4 |
| AC-4.2 | TC-4.2b | Story 4 |
| AC-4.2 | TC-4.2c | Story 4 |
| AC-4.2 | TC-4.2d | Story 4 |
| AC-4.3 | TC-4.3a | Story 4 |
| AC-4.3 | TC-4.3b | Story 4 |
| AC-4.3 | TC-4.3c | Story 4 |
| AC-4.4 | TC-4.4a | Story 4 |
| AC-4.4 | TC-4.4b | Story 4 |
| AC-4.5 | TC-4.5a | Story 4 |
| AC-4.5 | TC-4.5b | Story 4 |
| AC-4.5 | TC-4.5c | Story 4 |
| AC-4.6 | TC-4.6a | Story 4 |
| AC-4.6 | TC-4.6b | Story 4 |
| AC-4.6 | TC-4.6c | Story 4 |
| AC-5.1 | TC-5.1a | Story 6 |
| AC-5.1 | TC-5.1b | Story 6 |
| AC-5.2 | TC-5.2a | Story 6 |
| AC-5.2 | TC-5.2b | Story 6 |
| AC-5.2 | TC-5.2c | Story 6 |
| AC-5.3 | TC-5.3a | Story 6 |
| AC-5.3 | TC-5.3b | Story 6 |
| AC-5.4 | TC-5.4a | Story 6 |
| AC-5.4 | TC-5.4b | Story 6 |
| AC-5.5 | TC-5.5a | Story 6 |

**84 TCs assigned. 0 unmapped. 0 duplicated across stories.**

---

## Validation Checklist

- [x] Every AC from the epic is assigned to a story
- [x] Every TC from the epic is assigned to exactly one story
- [x] Stories sequence logically (foundation → planning → generation → progress → review → update → failure)
- [x] Each story has full Given/When/Then detail for all TCs
- [x] Integration path trace complete with no gaps (3 paths traced)
- [x] Coverage gate table complete (84 TCs mapped)
- [x] Error paths documented per story
- [x] Story 0 covers types, fixtures, error classes, project config
- [x] Each feature story is independently acceptable by a PO
- [x] Self-review complete
