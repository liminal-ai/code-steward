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
