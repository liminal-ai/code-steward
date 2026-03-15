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
