# Documentation Engine Technical Architecture

## Purpose

This document defines the architecture for the Documentation Engine that powers documentation generation inside Code Steward.

The Documentation Engine is a local, TypeScript-first subsystem responsible for generating, updating, validating, and preparing publication-ready wiki documentation for repositories managed by Code Steward.

It is intentionally separate from the main Code Steward application architecture. Code Steward owns the product shell, repo management, UI, persistence, and user workflows. The Documentation Engine owns the documentation-generation runtime.

## Position in the System

Code Steward is the workstation.

The Documentation Engine is one internal service/subsystem of that workstation.

It is not a standalone wiki product, and it is not just a Claude skill. It is a bounded local runtime that:

- performs structural analysis
- invokes Claude Agent SDK internally for inference-heavy steps
- writes and updates documentation artifacts
- returns structured progress and result data to the app

## Architectural Decision

The chosen architecture is:

- TypeScript SDK first
- Thin local CLI second
- Node 24 LTS runtime target
- ESM-only package
- No plugin layer required
- Claude Agent SDK used internally by the SDK
- Python used only where it is still the most practical path for AST analysis

This means the primary product surface is a library/API consumed by Code Steward. The CLI exists for development, testing, manual use, and future automation, but it is not the core product abstraction.

## Runtime and Tooling Baseline

V1 should follow the dependency decision document exactly:

| Area | Decision |
|------|----------|
| Runtime | Node 24 LTS with `engines: >=24 <25` |
| Language | TypeScript 5.9.x |
| Module system | ESM-only with `"type": "module"` and `NodeNext` settings |
| Build | `tsc` |
| Dev execution | `tsx` |
| Testing | Vitest |
| Lint + format | Biome |
| CLI parser | `citty` |
| Runtime schemas/contracts | `zod` |

The package should be Node-first, not Bun-first. Helper libraries for config,
path handling, subprocesses, git, and globbing are intentionally minimized in
v1. Prefer built-in `node:fs`, `node:path`, `node:child_process`, the git CLI,
and Node 24 built-ins unless implementation proves a gap. For glob/path
behavior, prefer `fs.promises.glob()` and `path.matchesGlob()` before adding a
helper library.

The docs should remain package-manager-neutral. Script names and tool choices
matter here; `npm`, `pnpm`, or `bun` usage in examples is secondary and should
not be treated as a product requirement.

The Python-backed analyzer remains part of the baseline, but it should be
described honestly as a short-term mixed-runtime compromise made to preserve
analysis quality for v1.

## Why This Architecture

This architecture is preferred over a skill-only or external-agent-driven design because Code Steward needs a product-grade documentation workflow, not an ad hoc prompt workflow.

The Documentation tab in the PRD needs:

- predictable stages
- status and progress reporting
- stable output locations
- metadata and staleness tracking
- incremental update behavior
- clean error handling
- easy attachment of outputs to UI elements

Those requirements are better satisfied by a bounded SDK runtime than by a loose agent session invoking tools from outside.

## Goals

- Generate wiki-quality documentation for repositories managed by Code Steward
- Use structural analysis inspired by CodeWiki, not naive whole-repo prompting
- Support TypeScript-first repositories as the primary initial target
- Expose a stable programmatic interface for the Code Steward web app
- Provide a small CLI surface for manual runs and debugging
- Support incremental updates against previously generated docs
- Return structured progress, warnings, and results
- Preserve room for future expansion without requiring a rewrite

## Non-Goals

- Replacing CodeWiki as a standalone product
- Rebuilding DeepWiki as a standalone interactive wiki service
- Supporting every language equally well in v1
- Providing an open-ended chat interface inside the engine
- Becoming a general-purpose RAG platform
- Building a plugin ecosystem in v1

## External Inspirations

### CodeWiki

CodeWiki contributes the core generation philosophy:

- AST-aware repository analysis
- dependency-informed module decomposition
- module-level documentation generation
- repo overview synthesis
- incremental update thinking

### DeepWiki-Open

DeepWiki contributes mostly UX inspiration:

- strong markdown rendering
- wiki tree navigation
- Mermaid rendering patterns
- pleasant browser-based reading experience

DeepWiki's backend architecture is not the target architecture for Code Steward's documentation engine.

## High-Level System Shape

```text
Code Steward UI
    |
    v
Code Steward API Route / Server Action
    |
    v
Documentation Engine SDK
    |
    +--> Environment / dependency checks
    +--> Structural analysis adapter (Python subprocess initially)
    +--> Claude Agent SDK orchestration
    +--> Validation pipeline
    +--> Metadata + output management
    +--> Publish helpers
    |
    v
Repository docs output (default: docs/wiki/)
```

## Core Architectural Principle

Keep deterministic work in code.

Use Claude Agent SDK only for the steps that actually require judgment:

- clustering components into modules
- writing module documentation
- synthesizing repository overviews
- reasoning about updates when structure or responsibilities change

Everything else should be deterministic and testable.

## Main Components

### 1. SDK Layer

The SDK is the primary interface.

It should expose a small set of high-level operations:

- `checkEnvironment()`
- `analyzeRepository()`
- `generateDocumentation()` — accepts `mode: "full" | "update"` to handle both generation and incremental updates
- `validateDocumentation()`
- `getDocumentationStatus()`
- `publishDocumentation()`

The SDK should be usable from:

- Code Steward server code
- tests
- the local CLI
- future automation scripts

### 2. CLI Layer

The CLI is intentionally thin and should be implemented with `citty`.

Its job is:

- parsing arguments
- loading config
- invoking SDK methods
- printing human or JSON output

The CLI should not contain generation logic, orchestration logic, or prompt logic.

Recommended commands:

- `docs check`
- `docs analyze`
- `docs generate`
- `docs update`
- `docs validate`
- `docs status`
- `docs publish`

### 3. Structural Analysis Adapter

V1 should use a pragmatic adapter around the existing CodeWiki-derived analysis scripts rather than attempting a full TypeScript-native AST engine immediately.

This is an intentional mixed-runtime compromise for the first implementation
pass: Node 24 + TypeScript remain the primary package/runtime baseline, while
Python is retained only for the analyzer subprocess.

Responsibilities:

- check Python availability
- check parser dependency availability
- invoke the analysis subprocess
- normalize JSON output into engine-native types
- fail loudly on invalid or incomplete analysis states

This layer is intentionally an adapter, so the engine can later replace the subprocess with a more native TypeScript implementation without changing the rest of the system.

### 4. Agent Orchestration Layer

This layer owns the inference-heavy workflow using Claude Agent SDK.

Responsibilities:

- create bounded generation/update sessions
- provide system prompts and structured task instructions
- optionally spawn subagents for module-level fanout
- capture results, costs, timing, and failures
- emit progress events to the caller

This layer must be product-workflow-oriented, not open-ended. It should behave like a guided pipeline, not a freeform coding session.

### 5. Validation Layer

The engine validates outputs after inference.

Responsibilities:

- verify expected files exist
- verify cross-links resolve
- verify metadata shape
- verify module-tree consistency
- perform basic Mermaid sanity checks
- surface warnings and failures in structured form

Validation should be deterministic wherever possible.

### 6. Metadata and State Layer

The engine maintains documentation-specific metadata in the repo output and returns additional run metadata to Code Steward for SQLite persistence.

Two state domains exist:

- repo-local generation metadata in the output folder
- app-level tracking data in Code Steward's SQLite database

## Package Structure

Target end-state layout by the end of Epic 3:

```text
packages/
  documentation-engine/
    package.json
    tsconfig.json
    biome.json
    vitest.config.ts
    src/
      index.ts
      cli.ts
      commands/
      sdk/
      orchestration/
      analysis/
      validation/
      metadata/
      publish/
      prompts/
      config/
      contracts/
      adapters/
        python/
        agent-sdk/
        git/
        filesystem/
      types/
    test/
```

Epic 1 should not treat this as a prescriptive file-by-file scaffold. The
concrete foundational layout for Epic 1 lives in
`docs/documentation-engine/epic-1/tech-design.md` and should take precedence
for Epic 1 implementation work. Later epics can introduce the broader CLI,
orchestration, publish, and prompt folders without invalidating that
foundation.

### Folder Intent

- `sdk/`: public high-level orchestration API
- `commands/`: CLI wrappers only
- `analysis/`: analysis normalization and structural-model building
- `orchestration/`: Agent SDK workflows and stage coordination
- `validation/`: output checks
- `metadata/`: read/write metadata and status comparison helpers
- `publish/`: branch/commit/push/PR helpers
- `prompts/`: internal prompt builders and templates
- `adapters/`: boundary code to Python, git, Agent SDK, filesystem, and other Node built-in integrations
- `contracts/`: stable result/event/input schemas and `zod` validators

## Primary Runtime Workflow

### Generate

1. Check environment
2. Check documentation output configuration
3. Run structural analysis
4. Normalize analysis into engine types
5. Decide module plan
6. Invoke Agent SDK to cluster if needed
7. Invoke Agent SDK to generate module docs
8. Invoke Agent SDK to synthesize overview
9. Run validation
10. Write metadata
11. Return structured result

### Update

1. Load prior metadata and persisted module plan
2. Compare stored commit hash to current HEAD
3. Compute changed files
4. Re-run structural analysis
5. Compare old vs new structural state
6. Identify affected modules
7. Invoke Agent SDK in update mode
8. Validate output
9. Write updated metadata
10. Return structured result

### Validate

1. Load metadata and output files
2. Check expected pages
3. Check module tree consistency
4. Check links
5. Run Mermaid sanity checks
6. Return pass/warn/fail summary

## Inference Boundaries

### Deterministic

These steps should be code-only:

- environment checks
- parser dependency checks
- repo scanning
- structural analysis invocation
- git diff and commit hash retrieval
- metadata persistence
- output path handling
- validation
- publish operations

### Inference-Driven

These steps use Claude Agent SDK:

- module clustering
- sub-module decomposition for oversized groups
- module documentation generation
- repo overview generation
- update-time content rewrite decisions

## Agent SDK Design

The engine should use Claude Agent SDK internally in a bounded way.

### Session Style

Prefer short-lived bounded sessions for major workflow stages rather than one giant conversation.

Examples:

- clustering session
- module-doc generation session per module or per batch
- overview synthesis session
- update session for affected modules

### Subagents

Use subagents when:

- modules can be generated independently
- the repo is large enough to justify fanout
- work can be bounded to clear file/component subsets

Do not use subagents for small repos where orchestration overhead is not worth it.

### Structured Outputs

Use structured output schemas for:

- cluster plans
- module tree revisions
- per-module generation summaries
- validation report ingestion from agent-repair passes

This reduces brittleness and makes progress reporting easier.

### Permissions

The engine should run the Agent SDK with tightly scoped permissions and known working directories.

The agent should not be allowed to wander freely across the filesystem.

## Progress Model

The SDK should emit typed progress events during long-running workflows.

Recommended event model:

```ts
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

This is important because Code Steward's Documentation tab needs stage-aware UI, not just a spinner.

## Contracts

### Input Contract

Generate/update operations should accept explicit option objects.

Example fields:

- repo path
- output path
- mode
- include patterns
- exclude patterns
- focus areas
- quality review settings

### Output Contract

Operations should return structured results, not freeform text.

Example result fields:

- success/failure with a discriminated union
- run ID
- output path
- generated files
- module plan
- changed modules / unchanged modules for update mode
- warnings
- validation result
- failed stage and structured error on failure
- commit hash
- cost/time

### Repo Output Contract

V1 should use the skill-style output contract already aligned for Code Steward:

- `docs/wiki/overview.md`
- `docs/wiki/module-tree.json`
- `docs/wiki/.doc-meta.json`
- `docs/wiki/.module-plan.json`
- module markdown pages

This remains intentionally separate from CodeWiki's native output format unless an explicit compatibility decision is made later.

## TypeScript-First Repository Concerns

Because TypeScript projects are the primary initial target, the engine should explicitly account for:

- `.ts`, `.tsx`, `.js`, `.jsx`
- `package.json`
- `tsconfig.json`
- workspace/monorepo layouts
- common source roots like `src/`, `packages/`, `apps/`
- path aliases and package boundaries where practical

V1 does not need full TypeScript compiler-resolution parity, but it should incorporate repo layout clues so documentation quality is strong on common TS projects.

## Configuration Model

Configuration should exist at three levels:

1. built-in defaults
2. app-provided options
3. optional engine config file for local/manual CLI use

Code Steward app integration should generally pass configuration explicitly instead of relying on ambient config.

The repo-local config file should remain a simple `.docengine.json` loaded with
built-in filesystem utilities plus `JSON.parse` and validated with `zod`. V1
should not introduce a config helper layer such as `c12`.

## Error Model

The SDK should use typed errors or typed failure results.

Important error classes:

- environment error
- dependency missing error
- analysis error
- orchestration error
- validation error
- publish error

The app should never have to parse human-readable stderr to know what happened.

## Persistence Boundaries

### In Repo

The engine writes:

- generated docs
- repo-local metadata

### In Code Steward SQLite

The app records:

- last generated timestamp
- last generated commit hash
- doc generation runs
- duration and cost
- warnings/failure state
- publish history

The engine should return the data needed for SQLite, but should not depend on SQLite itself.

## Publish Architecture

Publishing is a separate concern from generation.

The publish flow should:

1. create or switch to a docs branch
2. add generated files
3. commit
4. push
5. optionally open a PR

This should be callable separately, not implicitly bundled into generate/update.

## Testing Strategy

Vitest is the default runner for all automated tests in this package. Biome and
`tsc` provide the lint/format and typecheck gates around those tests.

Testing should happen at four layers:

### 1. Unit tests

- path resolution
- metadata handling
- diff logic
- focus matching
- output validation helpers

### 2. Adapter tests

- Python subprocess invocation
- parser dependency detection
- git command wrappers

### 3. Orchestration tests

- prompt assembly
- stage transitions
- structured output parsing
- failure handling with mocked Agent SDK responses

### 4. Integration tests

- small TypeScript fixture repo
- update flow against changed files
- validation against intentionally broken output

## Phased Delivery

### Phase 1: Engine Foundation

- package skeleton
- SDK surface
- Python analysis adapter
- metadata/status contracts
- validation basics

### Phase 2: Generation and Update

- Agent SDK clustering
- module documentation generation
- overview generation
- update mode
- structured progress events

### Phase 3: Code Steward Integration

- thin CLI
- app-facing service wrapper
- docs tab status/progress integration
- publish hooks
- stronger validation and recovery

## Key Tradeoffs

### Why not a skill-only solution

Skills are useful operator aids but weak as the primary runtime abstraction for a product subsystem. They are harder to test, less structured, and less natural for tight UI integration.

### Why not a CLI-only solution

A CLI-only solution is workable but makes app integration more indirect. For Code Steward, the documentation engine should be a library first and a CLI second.

### Why keep Python in the loop

Because structural analysis quality matters more than language purity in v1. Wrapping the proven analysis path is cheaper and safer than rebuilding AST analysis immediately in TypeScript.

### Why not DeepWiki-style RAG first

Because Code Steward's documentation tab wants publishable wiki artifacts and controlled update behavior more than it wants an exploratory code chat system.

## Open Design Questions

1. Should v1 output remain flat, or should nested directory output be supported later?
2. How should manual edits to generated docs be preserved during update runs?
3. When focus areas are supplied, should the engine bias clustering as well as writing depth?
4. How aggressive should subagent fanout be for medium-size repos?
5. Should publish support GitHub Pages setup in v1 or remain a follow-on feature?
6. At what point does it become worth replacing the Python analysis adapter with a more native TypeScript analysis layer?

## Implementation Artifacts

The Documentation Engine PRD and epic stack are complete. Refer to the following documents for implementation:

- `PRD.md` — subsystem scope, flows, contracts, and acceptance boundaries
- `epic-1/` — Foundation & Analysis Runtime (Stories 0–5)
- `epic-2/` — Generation & Update Orchestration (Stories 0–6)
- `epic-3/` — CLI & Code Steward Integration (Stories 0–6)
