## Story 6: Failure, Recovery, and Operator Feedback

### Objective

Engine failures surface consistently through all consumption paths — CLI and
SDK produce the same error code and message for the same failure. Failed
operations report which stage failed and provide actionable guidance for
recovery. After a failed generation or update, the output directory state is
inspectable so the caller can determine the appropriate recovery action. After
this story, operators and Code Steward can diagnose failures, understand what
state the output is in, and know what to do next.

### Scope

#### In Scope

- Verification that CLI and SDK produce identical error codes and messages for the same failure condition
- Verification that CLI exit codes correctly reflect SDK errors
- Verification that failed operations identify the stage that failed (`failedStage`)
- Verification that missing dependency errors include install/setup guidance
- Verification that update-mode failures suggest running full generation as recovery
- Verification that failed generation leaves no metadata (or preserves prior valid metadata in update mode)
- Verification that status queries after failure return actionable state
- Verification that publish failure leaves the output directory unchanged
- Verification that multiple sequential failures do not corrupt state

#### Out of Scope

- Implementing error handling (already implemented in SDK operations from Epics 1/2 and in CLI from Story 1)
- Implementing publish error handling (already implemented in Story 4)
- Creating new error types (using existing `EngineError` and `EngineErrorCode`)

### Dependencies / Prerequisites

- Story 1 complete — CLI error rendering and exit codes
- Story 3 complete — SDK integration contract (error shape in results)
- Story 4 complete — publish error handling

### Acceptance Criteria

**AC-6.1:** Engine failures surface consistently whether consumed through CLI or SDK. Both paths produce the same error code and message for the same failure.

- **TC-6.1a: SDK error and CLI error match**
  - Given: A repo path that does not exist
  - When: Code Steward calls `generateDocumentation()` AND operator runs `docs generate --json --repo-path /nonexistent`
  - Then: Both return `error.code: "PATH_ERROR"` with equivalent error messages
- **TC-6.1b: CLI exit code reflects SDK error**
  - Given: An environment check fails
  - When: Operator runs `docs check --repo-path ./my-repo`
  - Then: CLI prints the error information and exits with code 1

**AC-6.2:** Failed operations report which stage failed and provide actionable guidance for recovery.

- **TC-6.2a: Failed stage identified**
  - Given: Generation fails during the analysis stage
  - When: Caller inspects the error
  - Then: `failedStage` is `"analyzing-structure"`; error code is `ANALYSIS_ERROR`
- **TC-6.2b: Missing dependency includes install guidance**
  - Given: Python is not installed
  - When: Operator runs `docs check`
  - Then: Error message identifies Python and indicates it is required for structural analysis
- **TC-6.2c: Update-mode failure suggests recovery path**
  - Given: Update fails because the persisted module plan is missing
  - When: Caller inspects the error
  - Then: Error code is `METADATA_ERROR`; message recommends running full generation to create a new module plan

**AC-6.3:** After a failed generation or update, the output directory state is inspectable so the caller can determine the appropriate recovery action.

- **TC-6.3a: Failed generation leaves no metadata**
  - Given: Generation fails at the module generation stage
  - When: Caller checks the output directory
  - Then: `.doc-meta.json` does not exist (or retains prior valid metadata if update mode); partial module files may exist on disk
- **TC-6.3b: Prior valid state preserved on update failure**
  - Given: Update mode fails after some modules are regenerated
  - When: Caller queries `getDocumentationStatus()`
  - Then: Status reflects the prior generation's metadata (commit hash and timestamp), not the failed update; `state` may be `"stale"` relative to HEAD
- **TC-6.3c: Status query after failure returns actionable state**
  - Given: Generation has never succeeded for this repo
  - When: Caller queries `getDocumentationStatus()` after a failed generation attempt
  - Then: `state` is `"not_generated"`; caller knows to retry full generation

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Nonexistent repo path | `PATH_ERROR` — same code and message via CLI and SDK |
| Python missing | `DEPENDENCY_MISSING` — install guidance in message |
| Analysis failure during generation | `ANALYSIS_ERROR` — `failedStage: "analyzing-structure"` |
| Missing module plan during update | `METADATA_ERROR` — suggests full generation |
| Publish failure | `PUBLISH_ERROR` — output directory unchanged |

### Definition of Done

- [ ] All AC-6.1 through AC-6.3 TCs verified
- [ ] CLI and SDK error codes are identical for every tested failure condition
- [ ] Failed operations include actionable recovery guidance in error messages
- [ ] Output directory state is correct after each failure scenario
- [ ] Multiple sequential failures produce clean state each time
- [ ] PO accepts

**Estimated test count:** 10 tests (8 TC + 2 non-TC)

---
