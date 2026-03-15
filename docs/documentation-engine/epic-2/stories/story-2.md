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
