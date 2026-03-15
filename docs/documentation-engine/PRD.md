# Documentation Engine — Product Requirements Document

A local, TypeScript-first documentation engine for Code Steward that generates,
updates, validates, and prepares publishable wiki documentation for managed
repositories.

This document defines the engine that powers Code Steward's documentation
generation workflows. It is a separate subsystem with its own scope and epics,
but it is not a standalone product.

---

## User Profile

**Primary User:** Tech lead or senior developer using Code Steward to keep repository documentation current
**Context:** Managing several repositories and needing documentation that stays aligned with code changes without requiring manual wiki maintenance
**Mental Model:** "I click generate or update, the system does the heavy lifting, and I get a structured wiki I can read in the browser and publish back to the repo"
**Key Constraint:** Runs locally. Inference happens through Claude Agent SDK inside the engine. Structural analysis may use bundled Python scripts initially. Output must integrate cleanly with Code Steward UI and state tracking.

---

## Feature Overview

This feature gives Code Steward a real runtime for documentation generation.
Today, documentation generation is represented in the main PRD as a workflow
that depends on a separate skill or engine implementation. After this engine
ships, Code Steward can generate wiki-quality docs from a repo, track what
commit those docs represent, detect when they are stale, update only affected
areas, validate outputs, and return structured results to the app for viewing
and publish workflows.

The engine is SDK-first. A thin CLI exists for manual operation, testing, and
debugging, but the primary consumer is the Code Steward application.

---

## Scope

### In Scope

- TypeScript SDK as the primary runtime surface
- Thin CLI that wraps the SDK
- Environment and dependency checks for documentation generation
- Structural repository analysis using a CodeWiki-derived analysis adapter
- Claude Agent SDK orchestration for clustering, generation, overview synthesis, and update reasoning
- Documentation metadata and staleness tracking
- Deterministic validation of generated outputs
- Structured progress events and result payloads for Code Steward UI
- Publish preparation helpers for committing and opening documentation PRs
- TypeScript-first repository support as the initial target

### Out of Scope

- Standalone documentation website product
- General-purpose RAG or repository Q&A in v1
- Multi-user or cloud-hosted execution
- Broad plugin ecosystem
- Full parity with CodeWiki internals or output format
- Full parity across every programming language in v1

### Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A1 | Claude Agent SDK is available locally on the machine running Code Steward | Unvalidated | Engine depends on local SDK/runtime availability |
| A2 | Bundled Python analysis scripts can be invoked locally from the engine runtime | Unvalidated | V1 keeps this as a deliberate mixed-runtime compromise rather than the desired long-term end state |
| A3 | Tree-sitter parsers cover the primary repo languages used by target teams | Unvalidated | TypeScript and JavaScript are the most important initial cases |
| A4 | Code Steward remains the only UI surface; the engine does not need its own frontend | Validated | Engine returns structured state to the app |
| A5 | Repo-local documentation output remains the default publishing model | Validated | Default output path remains `docs/wiki/` relative to repo root |

---

## Technical Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Node 24 LTS + TypeScript 5.9.x | Aligns with Code Steward backend, avoids Node 23 drift, and matches the chosen package baseline |
| Module Format | ESM-only package (`"type": "module"`, `NodeNext`) | Keeps SDK and CLI aligned on the same modern Node package shape |
| Build | `tsc` | Sufficient for the SDK + thin CLI output in v1 |
| Dev Execution | `tsx` | Fast local execution for development helpers and scripts without becoming the build system |
| Testing | Vitest | Best fit for the fixture-heavy and mock-heavy workflows in this engine |
| Lint + Format | Biome | One tool for both checks; no ESLint + Prettier split in v1 |
| Inference | Claude Agent SDK | Bounded orchestration for clustering, generation, and updates |
| Structural Analysis | CodeWiki-derived Python scripts (initially) | Reuse proven AST-aware analysis instead of rebuilding immediately; accepted as a short-term mixed-runtime compromise |
| CLI | Thin Node CLI with `citty` | Manual operation, debugging, testing, future automation |
| Contracts | TypeScript types + `zod` runtime schemas | Deterministic contracts for config, metadata, validation, and Agent SDK I/O |
| Validation | TypeScript validation layer | Deterministic checks for output structure and integrity |
| Output | Markdown + Mermaid + JSON metadata | Matches Code Steward documentation experience |
| Publish | Git + GitHub CLI | Consistent with existing Code Steward integration model |

---

## Epic Structure

Three epics, staged so the foundation lands before orchestration and app
integration:

```text
Epic 1: Foundation & Analysis Runtime
    │
    ├── Epic 2: Generation & Update Orchestration
    └── Epic 3: CLI & Code Steward Integration
```

Epic 1 establishes package structure, SDK contracts, analysis integration,
configuration, metadata conventions, and validation primitives. Epic 2 builds
the generation and update flows. Epic 3 exposes the engine through the CLI and
integrates it cleanly into Code Steward's application surfaces.

---

## Epic 1: Foundation & Analysis Runtime

### User Profile

**Primary User:** Developer building or maintaining the Documentation Engine so Code Steward can depend on it reliably

### Feature Overview

This epic delivers the engine skeleton and deterministic runtime foundation.
After this epic, the engine can check its environment, run structural analysis
on a repository, normalize the results into engine contracts, read and write
documentation metadata, and perform basic validation on an output directory. No
inference-driven generation is required yet.

### Flows & Requirements

#### 1. Environment & Dependency Check

Before a generation or update run begins, the engine must know whether the
local environment can execute the requested workflow.

Checks include:

1. Node 24 runtime available
2. Python available if using the analysis adapter
3. Parser dependencies available for repo languages
4. Git repository status available for staleness/update flows

**Acceptance criteria areas:**
- Engine can run a preflight check independently of generation
- Preflight returns a structured result with derived boolean readiness and typed findings
- Missing dependencies are reported precisely, not as generic execution errors
- TypeScript/JavaScript repos surface parser requirements clearly
- Repo-aware dependency checks supported

#### 2. Structural Analysis

The engine invokes the analysis adapter to extract components, relationships,
languages, and focus/scoping metadata from a repo.

The analysis output must be normalized into stable engine-native contracts so
later orchestration layers do not depend on raw script output.

**Acceptance criteria areas:**
- Analysis can run against a local repo path
- Include/exclude/focus options supported
- Analysis returns component structure, relationships, and summary counts
- Analysis fails clearly on unsupported or partially analyzable states
- Focus metadata preserved in normalized output

#### 3. Metadata & Status

The engine manages repo-local documentation metadata and supports status
queries: no docs yet, current, stale, invalid, or partially generated.

**Acceptance criteria areas:**
- Engine reads and writes repo-local metadata
- Metadata records generation mode, timestamp, commit hash, and output path
- Engine can compare current HEAD to stored commit hash
- Status can be queried without running generation
- Invalid or missing metadata produces structured status, not silent fallback

#### 4. Validation Primitives

The engine can validate a documentation output directory without invoking an
agent.

Validation checks include:

1. expected files exist
2. links resolve
3. metadata shape is valid
4. module-tree consistency holds
5. Mermaid blocks pass basic sanity checks

**Acceptance criteria areas:**
- Validation can run independently of generation
- Validation returns pass/warn/fail summary with actionable details
- Broken links are identified by file and target
- Missing pages or metadata are reported explicitly
- Mermaid sanity checks do not require external UI rendering

### Data Contracts

```typescript
interface EnvironmentCheckResult {
  passed: boolean;
  findings: EnvironmentCheckFinding[];
  detectedLanguages: string[];
}

interface EnvironmentCheckFinding {
  severity: "warning" | "error";
  category: "missing-dependency" | "invalid-repo" | "invalid-path" | "environment";
  message: string;
  dependencyName?: string;
  path?: string;
}

interface RepositoryAnalysis {
  repoPath: string;
  commitHash: string;
  summary: {
    totalFilesAnalyzed: number;
    totalComponents: number;
    totalRelationships: number;
    languagesFound: string[];
    languagesSkipped: string[];
  };
  components: Record<string, AnalyzedComponent>;
  relationships: AnalyzedRelationship[];
  focusDirs: string[];
}

interface DocumentationStatus {
  state: "not_generated" | "current" | "stale" | "invalid";
  outputPath: string;
  lastGeneratedAt: string | null;
  lastGeneratedCommitHash: string | null;
  currentHeadCommitHash: string | null;
}
```

### Non-Functional Requirements

- Preflight and status checks should complete in under 2 seconds for normal repos
- Analysis failures must be structured and machine-readable
- Validation must not require network access

### Tech Design Questions

1. How much normalization should happen immediately versus preserving raw analysis output for debugging?
2. Should v1 metadata remain `.doc-meta.json` and `module-tree.json`, or should output compatibility be revisited later?
3. What is the minimum Mermaid validation that provides value without excessive complexity?

### Recommended Story Breakdown

**Story 0: Foundation (Infrastructure)**
Package skeleton, shared result/error types, fixture scaffolding, and test setup.

**Story 1: Configuration**
Repo-local config loading, default resolution, and typed configuration contracts.

**Story 2: Environment & Dependency Checks**
Repo-aware dependency checks, structured environment reporting, and parser readiness.

**Story 3: Structural Analysis**
Python adapter invocation, normalized analysis contracts, focus/include/exclude support.

**Story 4: Metadata & Status**
Repo-local metadata read/write, status queries, and commit-hash comparison.

**Story 5: Validation**
Expected-file checks, module-tree consistency, link validation, and Mermaid sanity checks.

---

## Epic 2: Generation & Update Orchestration

### User Profile

**Primary User:** Tech lead using Code Steward to generate or refresh documentation with minimal manual coordination

### Feature Overview

This epic delivers the generation and update workflow. After this epic, the
engine can take analysis results, invoke Claude Agent SDK internally to cluster
code into modules, generate module documentation, synthesize a repo overview,
and update only affected areas when code changes.

### Flows & Requirements

#### 1. Full Documentation Generation

The engine executes a bounded generation workflow:

1. run analysis
2. determine module plan
3. invoke Claude for clustering if needed
4. invoke Claude for module documentation
5. invoke Claude for repo overview
6. validate
7. write metadata

**Acceptance criteria areas:**
- Generation is driven through the SDK, not ad hoc shell prompts
- Module clustering uses structural analysis as input
- Module docs are written to a stable wiki output directory
- Repo overview is generated after module docs exist
- Validation runs before the operation is reported complete
- Output is deterministic in structure even when inference varies in prose

#### 2. Incremental Update

The engine supports update mode when prior documentation exists.

Update flow:

1. read prior metadata
2. compare stored commit to HEAD
3. compute changed files
4. rerun structural analysis
5. determine affected modules and structural changes
6. invoke Claude in update mode
7. validate and rewrite metadata

**Acceptance criteria areas:**
- Update mode requires existing valid metadata
- Changed files are mapped to affected modules
- Unaffected modules are left untouched
- Structural changes trigger appropriate regeneration scope
- Updated metadata records the new commit hash and timestamp

#### 3. Progress & Run Reporting

Generation and update operations are long-running and must emit stage-aware
progress to the caller.

**Acceptance criteria areas:**
- SDK emits typed progress events by stage
- Caller can associate progress with a specific engine run
- Run result includes cost, duration, warnings, and generated files
- Failure states preserve partial diagnostic information

#### 4. Recovery & Failure Handling

The engine should fail in a bounded and inspectable way.

**Acceptance criteria areas:**
- Analysis failure stops the run before inference begins
- Agent failure reports stage and partial context
- Validation failure distinguishes between warnings and hard errors
- Partial outputs are either cleaned up or explicitly marked incomplete

### Data Contracts

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

interface DocumentationProgressEvent {
  runId: string;
  stage: DocumentationStage;
  moduleName?: string;
  completed?: number;
  total?: number;
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
  qualityReviewPasses: number;
  costUsd: number | null;
  commitHash: string;
  updatedModules?: string[];
  unchangedModules?: string[];
  overviewRegenerated?: boolean;
}

interface DocumentationRunFailure extends DocumentationRunResultBase {
  success: false;
  failedStage: DocumentationStage;
  error: EngineError;
  outputPath?: string;
  commitHash?: string;
  generatedFiles?: string[];
  modulePlan?: ModulePlan;
  validationResult?: ValidationResult;
  qualityReviewPasses?: number;
  costUsd?: number | null;
}

interface ModulePlan {
  modules: PlannedModule[];
  unmappedComponents: string[];
}

interface PlannedModule {
  name: string;
  description: string;
  components: string[];
  parentModule?: string;
}
```

### Non-Functional Requirements

- Generation workflow must surface progress within 1 second of start
- Update runs should avoid full-regeneration behavior when changes are localized
- Runs must be recoverable enough to support useful UI error states

### Tech Design Questions

1. When should module generation fan out to subagents versus remaining in a single bounded session?
2. How should oversized modules be subdivided in a repeatable way?
3. How should the engine preserve manual edits inside generated docs during update mode?

### Recommended Story Breakdown

**Story 0: Orchestration Foundation**
Run lifecycle model, prompt-builder skeletons, shared orchestration types, and Agent SDK adapter wiring.

**Story 1: Module Planning & Clustering**
Module-plan contracts, clustering session flow, and deterministic plan persistence.

**Story 2: Core Generation Flow**
Module generation, overview synthesis, output writing, and success-path validation/metadata handling.

**Story 3: Progress Events & Result Assembly**
`runId` correlation, typed progress events, cost tracking, and success result construction.

**Story 4: Validation & Quality Review**
Post-generation validation, bounded review passes, and review-aware success/failure semantics.

**Story 5: Incremental Update**
Diff handling, affected-module mapping, update-mode orchestration, and plan/overview rewrites.

**Story 6: Recovery & Failure Handling**
Per-stage failure mapping, partial-output rules, and failure-result diagnostics.

---

## Epic 3: CLI & Code Steward Integration

### User Profile

**Primary User:** Code Steward developer integrating the engine into the Documentation tab and related workflows

### Feature Overview

This epic exposes the engine through a thin CLI and defines the app-facing
integration contract. After this epic, the engine can be called from the app
cleanly, can be exercised manually through the CLI, and can support publish
workflows and status rendering without the UI needing to understand internal
engine details.

### Flows & Requirements

#### 1. Thin CLI Surface

The CLI wraps SDK operations with `citty`-based argument parsing, config
loading, and human or JSON output.

Recommended commands:

- `docs check`
- `docs analyze`
- `docs generate`
- `docs update`
- `docs validate`
- `docs status`
- `docs publish`

**Acceptance criteria areas:**
- CLI commands map directly to SDK operations
- CLI supports JSON output for automation and tests
- CLI does not contain independent orchestration logic
- CLI failures preserve structured error information

#### 2. Code Steward Integration Contract

The app invokes the engine through server-side code and consumes structured
results for UI presentation.

**Acceptance criteria areas:**
- App can call engine without parsing human console output
- Progress events map cleanly to Documentation tab stages
- Status calls support initial tab render and stale/current indicators
- Generate/update results provide enough information for viewer refresh
- Output path, commit hash, duration, and warnings are available for SQLite persistence

#### 3. Publish Flow

After docs are generated or updated, the engine can assist with publication
back to the repo.

Publish flow:

1. create docs branch
2. stage generated files
3. commit changes
4. push branch
5. optionally open a PR

**Acceptance criteria areas:**
- Publish is separate from generate/update
- Publish returns branch, commit, and PR information when available
- Failures surface clearly for permissions/network issues
- Flow remains consistent with broader Code Steward Git/GitHub usage

#### 4. Test & Eval Harness

The engine must be testable outside the full app.

**Acceptance criteria areas:**
- CLI is usable for local manual verification
- SDK integration tests can run without UI
- Fixture repos cover at least one TypeScript-first path
- Engine output can be benchmarked or regression-checked later

### Data Contracts

```typescript
interface CliResultEnvelope<T> {
  success: boolean;
  command: string;
  result?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface PublishResult {
  branchName: string;
  commitHash: string;
  pushedToRemote: boolean;
  pullRequestUrl: string | null;
  pullRequestNumber: number | null;
  filesCommitted: string[];
}
```

### Non-Functional Requirements

- CLI should remain simple enough for manual operator use
- App integration should not depend on terminal scraping
- Publish operations must not mutate unrelated repo state

### Tech Design Questions

1. Should the CLI be published as a package or remain internal to the Code Steward monorepo?
2. Is there any future need for packaging beyond the default `tsc` output for the SDK and thin CLI?
3. Which SDK events should be persisted in SQLite versus treated as transient UI state?

### Recommended Story Breakdown

**Story 0: Foundation / Package Wiring / Shared Types / Fixture Scaffolding**
CLI/package entry wiring, Epic 3 shared types, and publish/CLI fixture helpers.

**Story 1: CLI Command Shell + Output Modes + Exit Codes**
Argument parsing, JSON/human output, result envelopes, and command-to-SDK mapping.

**Story 2: CLI Progress Rendering**
Human-mode progress rendering and CLI-facing stage/exit behavior for long-running runs.

**Story 3: Public SDK Integration Contract**
Single package entry point, Code Steward server-facing imports, and persistence-ready result expectations.

**Story 4: Publish Flow**
Branching, worktree/push/PR helpers, publish preflight, and structured publish results.

**Story 5: Test & Eval Harness**
Fixture repos, CLI smoke paths, end-to-end generation coverage, and regression-ready outputs.

**Story 6: Failure, Recovery, and Operator Feedback**
Operator-facing recovery guidance, CLI/SDK failure consistency, and update-recovery scenarios.

---

## Engine Data Contracts

```typescript
interface RepoDocumentationState {
  repoPath: string;
  outputPath: string;
  lastGeneratedAt: string | null;
  lastGeneratedCommitHash: string | null;
  status: "not_generated" | "current" | "stale" | "invalid";
}

interface GeneratedDocumentationMetadata {
  generatedAt: string;
  commitHash: string;
  outputPath: string;
  filesGenerated: string[];
  componentCount: number;
  mode: "full" | "update";
}
```

The engine also persists the current `ModulePlan` to `.module-plan.json` in the
output directory so update-mode runs can compare fresh analysis results against
the prior documentation structure without reconstructing the old plan from
markdown alone.

## Non-Functional Requirements

- TypeScript-first repos must be treated as the primary quality bar in v1
- Engine runs must be locally executable without cloud infrastructure
- Progress and failure states must be structured enough for UI use
- Documentation output should be publishable as repo content without manual reshaping

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. How should the SDK package separate public API from internal orchestration modules?
2. How should Agent SDK sessions be bounded to balance determinism, cost, and output quality?
3. How much of the CodeWiki analysis adapter should be wrapped versus rewritten?
4. Should module tree persistence be flat-only in v1 or allow hierarchical output later?
5. What is the minimum viable validation set that still gives confidence in generated docs?

This PRD is intentionally narrower than the main Code Steward PRD. It defines
the documentation engine itself and leaves browser UI, repo card behavior, and
Documentation tab rendering responsibilities in the main product PRD.
