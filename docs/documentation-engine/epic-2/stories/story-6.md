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
