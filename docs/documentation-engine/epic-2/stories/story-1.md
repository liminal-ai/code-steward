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
