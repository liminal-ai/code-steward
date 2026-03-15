## Story 3: Public SDK Integration Contract

### Objective

The Documentation Engine's public SDK entry point re-exports all consumer-facing
operations and types. Integration tests verify the contract from Code Steward's
perspective: status provides enough data for tab render, progress events carry
enough information for stage-aware UI, run results contain all fields needed for
SQLite persistence, and the engine communicates exclusively through return values.
After this story, Code Steward can import the engine and integrate without
needing to inspect console output, side-effect files, or stderr.

### Scope

#### In Scope

- `src/index.ts` updated to re-export all six SDK operations and all consumer-facing types (Epic 1, 2, and 3)
- `src/types/index.ts` updated to re-export Epic 3 types alongside Epic 1/2 types
- Integration tests verifying: operations importable, types importable, progress events carry stage/module/count fields, status returns empty-state/stale/current data, run results carry persistence-ready fields, failed results carry diagnostic fields, cost is `null` when unavailable
- Verification that all information is in return values (no filesystem reads, no console parsing needed by consumers)

#### Out of Scope

- CLI rendering of progress events (Story 2 — Story 3 verifies the SDK emits the right data; Story 2 verifies the CLI renders it)
- CLI command implementations (Story 1)
- Publish SDK operation implementation (Story 4)
- Implementation of SDK operations themselves (Epic 1 and 2)

### Dependencies / Prerequisites

- Story 0 complete — Epic 3 types defined and exportable
- Epic 2 complete — SDK operations and progress events implemented

### Acceptance Criteria

**AC-3.1:** The SDK exposes a public entry point that re-exports all consumer-facing operations and types.

- **TC-3.1a: Operations importable**
  - Given: Code Steward server code imports from the engine package
  - When: Import statement runs
  - Then: `checkEnvironment`, `analyzeRepository`, `generateDocumentation`, `getDocumentationStatus`, `validateDocumentation`, and `publishDocumentation` are all available as named exports
- **TC-3.1b: Types importable**
  - Given: Code Steward server code imports types from the engine package
  - When: Import statement runs
  - Then: Consumer-facing type exports are available, including `EnvironmentCheckRequest`, `AnalysisOptions`, `DocumentationRunRequest`, `DocumentationRunResult`, `DocumentationProgressEvent`, `DocumentationStatusRequest`, `DocumentationStatus`, `ValidationRequest`, `ValidationResult`, `PublishRequest`, `PublishResult`, and `EngineError`

**AC-3.2:** Progress events from `generateDocumentation` and the `mode: "update"` path provide enough information for stage-aware UI rendering.

- **TC-3.2a: Each progress event identifies the current stage**
  - Given: Code Steward calls `generateDocumentation()` with a progress callback
  - When: Progress events arrive
  - Then: Each event has a `stage` field from the defined set of stages
- **TC-3.2b: Module-level progress includes name and completion count**
  - Given: A repo with 5 modules
  - When: Generation reaches the `generating-module` stage
  - Then: Progress events include `moduleName`, `completed`, and `total` fields
- **TC-3.2c: Final event signals completion or failure**
  - Given: Generation runs to completion or fails
  - When: Last progress event arrives
  - Then: Event stage is `"complete"` (success) or `"failed"` (failure)

**AC-3.3:** `getDocumentationStatus()` returns enough information for the Documentation tab's initial render state.

- **TC-3.3a: Not-generated state provides empty-state data**
  - Given: Repo has no generated documentation
  - When: Code Steward calls `getDocumentationStatus()`
  - Then: Result has `state: "not_generated"`, null timestamps and commit hashes, and the configured output path
- **TC-3.3b: Stale state provides comparison data**
  - Given: Documentation exists but is behind HEAD
  - When: Code Steward calls `getDocumentationStatus()`
  - Then: Result has `state: "stale"`, `lastGeneratedCommitHash`, and `currentHeadCommitHash` both populated
- **TC-3.3c: Current state provides generation metadata**
  - Given: Documentation is current
  - When: Code Steward calls `getDocumentationStatus()`
  - Then: Result has `state: "current"`, `lastGeneratedAt` with ISO 8601 timestamp, and matching commit hashes

Epic 1's status contract also includes `state: "invalid"` for malformed
metadata. Story 3 preserves that inherited state for consumers.

**AC-3.4:** `DocumentationRunResult` from generate/update provides all fields Code Steward needs to persist a documentation run to SQLite.

- **TC-3.4a: Successful result includes persistence-ready fields**
  - Given: Full generation completes
  - When: Code Steward inspects the result
  - Then: `mode`, `commitHash`, `durationSeconds`, `costUsd`, `generatedFiles`, `warnings`, and `validationResult` are all present and typed
- **TC-3.4b: Failed result includes diagnostic fields**
  - Given: Generation fails at the analysis stage
  - When: Code Steward inspects the result
  - Then: `success: false`, `failedStage`, `error.code`, and `error.message` are present; Code Steward can persist the failure state
- **TC-3.4c: Cost is null when unavailable**
  - Given: Agent SDK does not provide token usage for a run
  - When: Code Steward reads `costUsd`
  - Then: Value is `null`, not `0` or `undefined`

**AC-3.5:** The engine communicates exclusively through return values and callback parameters. Code Steward never needs to parse console output, read side-effect files, or inspect stderr to determine operation results.

- **TC-3.5a: Status available without reading filesystem**
  - Given: Code Steward calls `getDocumentationStatus()`
  - When: Call returns
  - Then: All status information is in the return value; Code Steward does not need to read `.doc-meta.json` directly
- **TC-3.5b: Generation result available without reading output directory**
  - Given: Code Steward calls `generateDocumentation()`
  - When: Call returns
  - Then: Generated file list, validation result, and metadata are all in the return value; Code Steward does not need to scan the output directory

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Import of nonexistent operation from package | TypeScript compilation error (compile-time check) |
| SDK operation fails | `EngineError` with `code`, `message`, and `failedStage` in result — no stderr parsing |

### Definition of Done

- [ ] All AC-3.1 through AC-3.5 TCs verified
- [ ] All six operations importable from single entry point
- [ ] All consumer-facing types importable from single entry point
- [ ] Package entry point does not leak internal modules (orchestration/, adapters/)
- [ ] PO accepts

**Estimated test count:** 14 tests (13 TC + 1 non-TC)

---
