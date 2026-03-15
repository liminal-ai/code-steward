# Test Plan: Generation & Update Orchestration

## Purpose

This document defines the complete testing strategy for Epic 2. It maps every TC
from the epic to a specific test, defines the fixture architecture for Agent SDK
mocks, and establishes how inference-driven operations are tested without live
model calls.

**Companion:** [tech-design.md](tech-design.md) — architecture, interfaces, module
breakdown. This plan references the tech design for implementation details.

---

## Testing Philosophy

Epic 2 introduces inference as an external boundary. The testing strategy extends
Epic 1's service mock pattern: test at the entry point (`generateDocumentation`),
exercise internal orchestration modules through it, and mock only at external
boundaries.

This plan also assumes the finalized package baseline: Node 24 LTS, TypeScript
5.9.x, an ESM-only package shape, Vitest for test execution, Biome for
lint/format verification, `tsc` for typecheck/build, and `tsx` only for local
development-side helper scripts.

The critical new boundary is the Agent SDK. Every Agent SDK interaction flows
through `adapters/agent-sdk.ts`. Tests mock this adapter — never the Agent SDK
package directly. This gives tests control over inference responses while
exercising real orchestration logic, stage sequencing, and error handling.

```text
generateDocumentation(request)                     ← Test here
    ↓
Orchestration stages (planning, generation, etc.)  ← Exercised, not mocked
    ↓
adapters/agent-sdk.ts                              ← Mock here
adapters/git.ts                                    ← Mock here (update mode)
Epic 1 operations                                  ← Partially mocked (analysis, env check)
```

### What is Unit vs Integration vs Contract Tested

| Layer | Strategy | Why |
|-------|----------|-----|
| `generateDocumentation()` entry point | Service mock (primary) | Full pipeline with mocked boundaries |
| Individual stages (planning, generation, etc.) | Service mock through entry point | Exercised via pipeline, not tested in isolation |
| `affected-module-mapper` | Unit test (pure function) | No I/O, complex logic, benefits from isolated edge-case coverage |
| `moduleNameToFileName` | Unit test (pure function) | Deterministic utility, edge cases |
| `change-detector` | Service mock (mocked git adapter) | Thin wrapper around git, tested through update flow |
| Prompt builders | Snapshot/assertion test | Verify prompt structure contains expected context |
| Agent SDK adapter (real) | Integration test (not in CI) | Verify real Agent SDK connectivity; run manually |

---

## Mock Strategy

### Agent SDK Mock

The Agent SDK adapter is the primary mock boundary. Tests inject a mock adapter
that returns pre-built responses for each session type.

```typescript
// test/helpers/agent-sdk-mock.ts

import type { AgentSDKAdapter, AgentQueryResult, TokenUsage } from "../../src/adapters/agent-sdk.js";
import type { EngineResult } from "../../src/types/common.js";

/**
 * Creates a mock Agent SDK adapter that returns configured responses.
 *
 * Usage:
 *   const mock = createMockSDK({
 *     clustering: { output: mockModulePlan, usage: { inputTokens: 1000, outputTokens: 500 } },
 *     moduleGeneration: { output: mockModuleResult, usage: { inputTokens: 2000, outputTokens: 1500 } },
 *     overview: { output: mockOverviewResult, usage: { inputTokens: 1500, outputTokens: 800 } },
 *   });
 */
export interface MockSDKConfig {
  clustering?: MockResponse<ModulePlan>;
  moduleGeneration?: MockResponse<ModuleGenerationResult> | MockResponse<ModuleGenerationResult>[];
  overview?: MockResponse<OverviewGenerationResult>;
  qualityReview?: MockResponse<ReviewFilePatch[]>;
  /** If set, all queries return this error */
  globalError?: EngineError;
  /** Per-call overrides indexed by call number */
  callOverrides?: Record<number, MockResponse<unknown> | EngineError>;
}

interface MockResponse<T> {
  output: T;
  usage?: TokenUsage;
}

export const createMockSDK = (config: MockSDKConfig): AgentSDKAdapter => { ... };
```

**How Agent SDK responses are mocked:**

The mock adapter inspects the `systemPrompt` or `outputSchema` to determine which
session type is being requested. It returns the configured response for that type.
This allows a single mock to serve an entire generation pipeline without
per-call indexing.

For tests that need specific failure at specific calls (e.g., "fail on the 3rd
module generation"), `callOverrides` provides per-invocation control.

### What Gets Mocked

| Boundary | Mock? | Why |
|----------|-------|-----|
| `adapters/agent-sdk.ts` — entire adapter | Yes | Controls all inference responses |
| `adapters/git.ts` — `getChangedFilesBetweenCommits` | Yes | Controls change detection in update tests |
| `adapters/git.ts` — `getHeadCommitHash` | Yes | Controls commit hash for result assertions |
| Epic 1 `analyzeRepository` | Yes (via subprocess mock from Epic 1) | Controls analysis output shape |
| Epic 1 `checkEnvironment` | Partially mocked | Some tests need failure; happy path uses fixture repos |
| Filesystem writes | Yes (temp directory) | Verify output without polluting fixtures |
| Filesystem reads for metadata | Yes (via fixture directories) | Control prior metadata and plan state |

### What Is NOT Mocked

| Module | Why Not |
|--------|---------|
| `orchestration/generate.ts` pipeline logic | That's what we're testing |
| `orchestration/stages/*` stage logic | Exercise through entry point |
| `orchestration/update/affected-module-mapper.ts` | Pure function — test with real data |
| `prompts/*` prompt builders | Exercise through pipeline; separate snapshot tests |
| `types/generation.ts` `moduleNameToFileName` | Pure function — no mocks needed |
| Epic 1 `validateDocumentation` | Exercise with real fixtures; validates real output |
| Epic 1 `writeMetadata` / `readMetadata` | Exercise with temp directories |

---

## Fixture Architecture

### Agent SDK Response Fixtures

Pre-built JSON response objects for each Agent SDK session type. These are the
"gold standard" responses that the mock adapter returns.

| Fixture | Path | Contents | Used By |
|---------|------|----------|---------|
| `clustering-3-modules` | `test/fixtures/agent-sdk/clustering-3-modules.json` | `ModulePlan` with modules "core", "api", "utils" and 2 unmapped components | Clustering tests, full generation happy path |
| `clustering-single-module` | `test/fixtures/agent-sdk/clustering-single-module.json` | `ModulePlan` with one module containing all components | Small-repo edge case |
| `clustering-invalid` | `test/fixtures/agent-sdk/clustering-invalid.json` | Invalid `ModulePlan` — component in two modules | Plan validation error test |
| `module-gen-core` | `test/fixtures/agent-sdk/module-gen-core.json` | `ModuleGenerationResult` for "core" module with markdown, title, crossLinks | Module generation tests |
| `module-gen-api` | `test/fixtures/agent-sdk/module-gen-api.json` | `ModuleGenerationResult` for "api" module | Module generation tests |
| `module-gen-utils` | `test/fixtures/agent-sdk/module-gen-utils.json` | `ModuleGenerationResult` for "utils" module | Module generation tests |
| `overview-success` | `test/fixtures/agent-sdk/overview-success.json` | `OverviewGenerationResult` with markdown content + Mermaid diagram | Overview generation tests |
| `review-fix-link` | `test/fixtures/agent-sdk/review-fix-link.json` | `ReviewFilePatch[]` fixing a broken cross-link | Quality review tests |
| `review-fix-mermaid` | `test/fixtures/agent-sdk/review-fix-mermaid.json` | `ReviewFilePatch[]` fixing malformed Mermaid | Quality review tests |
| `review-no-fixes` | `test/fixtures/agent-sdk/review-no-fixes.json` | Empty `ReviewFilePatch[]` — model couldn't fix anything | Quality review no-op test |

### Analysis Fixtures (from Epic 1, reused)

| Fixture | Used By |
|---------|---------|
| `valid-ts` repo fixture | Full generation pipeline, update mode |
| Raw analysis output mocks | Planning and generation stages |

### Update Mode Fixtures

| Fixture | Path | Contents | Used By |
|---------|------|----------|---------|
| `valid-prior-output` | `test/fixtures/update/valid-prior-output/` | Complete prior generation output: `overview.md`, 3 module pages, `module-tree.json`, `.doc-meta.json`, `.module-plan.json` | Update mode happy path |
| `stale-prior-output` | `test/fixtures/update/stale-prior-output/` | Same as above but `.doc-meta.json` has older commitHash | Update mode staleness test |
| `missing-plan-output` | `test/fixtures/update/missing-plan-output/` | Valid metadata but no `.module-plan.json` | TC-2.1c |
| `corrupt-metadata-output` | `test/fixtures/update/corrupt-metadata-output/` | Invalid `.doc-meta.json` | TC-2.1b |

### Config Fixtures (from Epic 1, reused)

Reuse `test/fixtures/config/*` from Epic 1 for configuration resolution tests.

### Test Helpers

```typescript
// test/helpers/agent-sdk-mock.ts — described above

// test/helpers/run-pipeline.ts
/**
 * Convenience wrapper: creates a mock SDK, runs generateDocumentation,
 * and returns result + collected progress events.
 */
export const runPipelineWithMocks = async (
  request: DocumentationRunRequest,
  sdkConfig: MockSDKConfig,
  options?: { analysisFixture?: string }
): Promise<{
  result: DocumentationRunResult;
  progressEvents: DocumentationProgressEvent[];
}> => { ... };

// test/helpers/assert-output.ts
/**
 * Assertion helpers for generated output directories.
 */
export const assertOutputContainsModulePage = (outputPath: string, moduleName: string): void => { ... };
export const assertOutputHasValidTree = (outputPath: string, expectedModules: string[]): void => { ... };
```

---

## TC-to-Test Mapping

### Chunk 1: Module Planning

**Test File:** `test/orchestration/module-planning.test.ts`

Entry point: `planModules()` (tested through `generateDocumentation` for
integration; direct calls for edge cases)

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-1.3a | TC-1.3a: components grouped into modules | Mock SDK returns 3-module plan; analysis has 20 components | Each component in exactly one module or unmapped; no overlap |
| TC-1.3b | TC-1.3b: small repo bypass | Analysis returns component count ≤ CLUSTERING_THRESHOLD | Valid plan returned; no Agent SDK call made |
| TC-1.3c | TC-1.3c: modules have names and descriptions | Mock SDK returns plan | Every `PlannedModule` has non-empty `name` and `description` |
| TC-1.3d | TC-1.3d: unmapped components tracked | Mock SDK returns plan with unmapped | `unmappedComponents` lists expected file paths |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| clustering returns invalid plan (overlap) | Schema validates but semantic check fails |
| clustering returns empty modules array | Edge case — no modules produced |
| plan validation rejects duplicate module names | Unique name invariant |
| small-repo bypass with flat layout | No `src/` directory, all files at root |

**Prompt Builder Structural Tests:**

**Test File:** `test/prompts/prompt-builders.test.ts`

These are lightweight structural assertion tests — not full-prompt snapshots.
Each test calls the prompt builder with a realistic fixture and asserts that the
output contains expected structural elements. Catches prompt regressions without
brittleness.

| Test Name | Builder | Assert |
|-----------|---------|--------|
| clustering prompt includes component list | `buildClusteringPrompt` | Output contains file paths from analysis fixture |
| clustering prompt includes relationship graph | `buildClusteringPrompt` | Output contains import/usage relationship references |
| module-doc prompt includes cross-module context | `buildModuleDocPrompt` | Output mentions dependent module names |
| overview prompt includes module summaries | `buildOverviewPrompt` | Output contains each module name and description |
| quality-review prompt includes fix scope constraints | `buildQualityReviewPrompt` | Output contains "broken link", "Mermaid", and explicit "do not re-cluster" constraint |
| quality-review prompt includes validation findings | `buildQualityReviewPrompt` | Output contains finding messages from fixture |

---

### Chunk 2: Core Generation Pipeline

**Test File:** `test/orchestration/generate.test.ts`

Entry point: `generateDocumentation()`

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-1.1a | TC-1.1a: successful full generation | Full mock pipeline | `success: true`, `mode: "full"`, populated files, modulePlan, commitHash |
| TC-1.2a | TC-1.2a: request fields override config | Config file + request with different outputPath | Output written to request's path |
| TC-1.2b | TC-1.2b: defaults fill unset fields | No config file, minimal request | Default excludePatterns applied |
| TC-1.2c | TC-1.2c: invalid request produces error | Empty repoPath | `ok: false`, `CONFIGURATION_ERROR`, no stages run |
| TC-1.4a | TC-1.4a: module pages written | 3-module plan | Output dir has `core.md`, `api.md`, `utils.md` |
| TC-1.4b | TC-1.4b: module page references components | Module "core" with 2 components | `core.md` content references both file paths |
| TC-1.4c | TC-1.4c: empty module handled | Plan with zero-component module | No crash; module omitted or minimal placeholder |
| TC-1.5a | TC-1.5a: overview written | Successful generation | `overview.md` exists in output |
| TC-1.5b | TC-1.5b: overview references modules | 3-module plan | `overview.md` content mentions each module name |
| TC-1.5c | TC-1.5c: overview includes Mermaid | Successful generation | `overview.md` contains `` ```mermaid `` block |
| TC-1.6a | TC-1.6a: module tree matches plan | 3-module plan | `module-tree.json` has entries for core, api, utils with page fields |
| TC-1.6b | TC-1.6b: hierarchical modules preserved | Plan with parent-child | `module-tree.json` has `children` nesting |
| TC-1.7a | TC-1.7a: structural convention | 3-module plan | Expected files present, no unexpected files |
| TC-1.7b | TC-1.7b: filenames from module names | Module "auth-middleware" | `auth-middleware.md` in output |
| TC-1.8a | TC-1.8a: validation runs post-generation | Full pipeline | `validationResult` present in result |
| TC-1.9a | TC-1.9a: metadata reflects generation | Successful run | `.doc-meta.json` has mode, commitHash, timestamp, files |
| TC-1.10a | TC-1.10a: module plan persisted | Successful run | `.module-plan.json` exists with plan contents |
| TC-1.10b | TC-1.10b: persisted plan matches result | Successful run | File contents match `result.modulePlan` |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| module generation session timeout | Agent SDK timeout at module level |
| overview with zero cross-links | Edge case in prompt building |
| filename collision (two modules same derived name) | Deterministic naming edge case |
| empty module plan | Clustering produces nothing |
| output directory creation | Should create if missing |

---

### Chunk 3: Progress & Result Assembly

**Test File:** `test/orchestration/progress.test.ts`

Entry point: `generateDocumentation()` with progress callback

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-1.1b | TC-1.1b: run ID assigned | Any valid run | `runId` non-empty; matches progress events |
| TC-3.1a | TC-3.1a: progress events per stage | Full generation | Each stage emits at least one event |
| TC-3.1b | TC-3.1b: stage sequence for full generation | Full generation to completion | Events in expected order |
| TC-3.2a | TC-3.2a: per-module progress | 5-module plan | `generating-module` events with names, `completed` 1→5, `total: 5` |
| TC-3.3a | TC-3.3a: runId consistent | Any run | All events have same `runId`; matches result |
| TC-3.4a | TC-3.4a: complete successful result | Full generation | All result fields populated correctly |
| TC-3.4b | TC-3.4b: cost when available | All sessions return usage | `costUsd` is positive number |
| TC-3.4c | TC-3.4c: cost when unavailable | One session lacks usage | `costUsd` is null |
| TC-3.4d | TC-3.4d: warnings surfaced | Validation warnings + thin module | `warnings` array contains entries |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| no progress callback provided | Should not throw |
| progress event timestamps ordered | Monotonically increasing |
| cost with mixed sessions (some with usage, some without) | Confirms all-or-nothing behavior |

---

### Chunk 4: Validation & Quality Review

**Test File:** `test/orchestration/quality-review.test.ts`

Entry point: `validateAndReview()` (tested directly and through full pipeline)

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-4.1a | TC-4.1a: validation runs post-generation | Full pipeline output | Epic 1 validation ran; results in `validationResult` |
| TC-4.2a | TC-4.2a: self-review fixes broken link | Output with broken link; mock returns fix patch | Link fixed after review; revalidation passes |
| TC-4.2b | TC-4.2b: self-review fixes malformed Mermaid | Output with bad Mermaid; mock returns fix | Mermaid fixed; revalidation clears warning |
| TC-4.2c | TC-4.2c: self-review skipped no issues | Clean output | No Agent SDK review session created |
| TC-4.2d | TC-4.2d: self-review skipped when disabled | `selfReview: false`; output has issues | No review session; issues remain |
| TC-4.3a | TC-4.3a: allowed fix categories | Review mock returns link + Mermaid fixes | Fixes applied (within scope) |
| TC-4.3b | TC-4.3b: no re-clustering | Review runs | `ModulePlan` unchanged after review |
| TC-4.3c | TC-4.3c: no unbounded iteration | Issues remain after self-review | Exactly 1 self-review pass; no second self-review |
| TC-4.4a | TC-4.4a: revalidation after self-review | Self-review modifies files | Validation reruns; new state replaces old |
| TC-4.4b | TC-4.4b: revalidation after second-model | Second-model modifies files | Validation reruns |
| TC-4.5a | TC-4.5a: second-model runs when enabled | `secondModelReview: true`; issues remain | Second review session created |
| TC-4.5b | TC-4.5b: second-model skipped when disabled | Default config | No second review session |
| TC-4.5c | TC-4.5c: second-model skipped no issues | Self-review fixed everything | No second review session |
| TC-4.6a | TC-4.6a: clean validation after review | Quality review fixed all issues | `validationResult.status: "pass"`; `qualityReviewPasses` reflects passes ran |
| TC-4.6b | TC-4.6b: warnings remain after review | Errors cleared but warnings remain | `validationResult` has warnings; `success: true` |
| TC-4.6c | TC-4.6c: errors remain after review | Errors could not be fixed | `success: false`; `failedStage: "validating-output"` |
| TC-1.8b | TC-4.6b / TC-1.8b: warnings don't block | Errors cleared but warnings remain | `validationResult` has warnings; `success: true` |
| TC-1.8c | TC-4.6c / TC-1.8c: errors after review block | Errors could not be fixed | `success: false`; `failedStage: "validating-output"` |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| quality-review progress event emitted when review runs | Covers Story 4's added stage event without splitting TC-3.1b again |
| review returns patches for nonexistent files | Should reject safely |
| review returns empty patches | No-op, proceed without error |
| self-review timeout | Agent SDK timeout during review |
| secondModelReview defaults to false | Config default verification |

---

### Chunk 5: Incremental Update

**Test File:** `test/orchestration/update.test.ts`

Entry point: `generateDocumentation({ mode: "update" })`

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-2.1a | TC-2.1a: no prior metadata | Empty output dir | `success: false`, `METADATA_ERROR` |
| TC-2.1b | TC-2.1b: invalid prior metadata | Corrupt `.doc-meta.json` | `success: false`, `METADATA_ERROR` |
| TC-2.1c | TC-2.1c: missing module plan | Valid metadata, no `.module-plan.json` | `success: false`, `METADATA_ERROR` |
| TC-3.1c | TC-3.1c: stage sequence for update | Update to completion | Includes `computing-changes` before `planning-modules` |
| TC-3.2b | TC-3.2b: update per-module progress | 2 of 5 affected | `generating-module` events with `total: 2` |
| TC-2.2a | TC-2.2a: changed files detected | Mock git returns 3 changed | 3 files in change set |
| TC-2.2b | TC-2.2b: no changes | Same commit hash | `success: true`, zero modules updated |
| TC-2.2c | TC-2.2c: new files added | Mock git returns 2 new files | New files in change set |
| TC-2.2d | TC-2.2d: files deleted | Mock git returns 1 deleted | Deleted file in change set |
| TC-2.3a | TC-2.3a: change maps to module | `src/core/engine.ts` changed; plan assigns to "core" | "core" in affected set |
| TC-2.3b | TC-2.3b: change in unmapped component | Changed file in `unmappedComponents` | Warning emitted; no module regenerated |
| TC-2.3c | TC-2.3c: new file maps to existing module | New file in `src/core/`; fresh analysis confirms | "core" affected; new file in regeneration |
| TC-2.3d | TC-2.3d: new file unmappable | New file not in any module's scope | Warning with recommendation for full generation |
| TC-2.4a | TC-2.4a: targeted regeneration | "core" affected; "api", "utils" not | Only `core.md` regenerated |
| TC-2.4b | TC-2.4b: multiple affected | "core" and "api" affected | Both regenerated; `utils.md` unchanged |
| TC-2.5a | TC-2.5a: new file triggers module regen | New file in "core" scope | "core" regenerated with new component |
| TC-2.5b | TC-2.5b: deleted file triggers regen | File in "api" deleted | "api" regenerated without deleted component |
| TC-2.5c | TC-2.5c: relationship change affects both | "core" adds import from "utils" | Both "core" and "utils" affected |
| TC-2.6a | TC-2.6a: module removed triggers overview | All "legacy" files deleted | `legacy.md` removed; overview regenerated |
| TC-2.6b | TC-2.6b: content changes skip overview | Content-only change | `overviewRegenerated: false` |
| TC-2.6c | TC-2.6c: unmappable files don't create modules | New files need new module | Warning; no new module; no overview regen |
| TC-2.7a | TC-2.7a: metadata updated | Successful update | `.doc-meta.json` has `mode: "update"`, new commitHash |
| TC-2.8a | TC-2.8a: update result fields | "core", "api" updated; "utils" unchanged | `updatedModules`, `unchangedModules` correct |
| TC-4.1b | TC-4.1b: validation runs post-update | Update pipeline output | Validation ran against full output dir |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| >50% components affected triggers warning | Major restructuring heuristic |
| renamed file maps to correct module | Rename handling in change detection |
| change detection with merge commits | Git history complexity |
| fresh analysis detects new relationship | Relationship comparison accuracy |

---

### Chunk 6: Recovery & Failure Handling

**Test File:** `test/orchestration/failure.test.ts`

Entry point: `generateDocumentation()` with failure-inducing mocks

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-5.1a | TC-5.1a: env check failure | Mock env check fails | `success: false`, `failedStage: "checking-environment"`, `DEPENDENCY_MISSING` |
| TC-5.1b | TC-5.1b: analysis failure | Mock analysis crashes | `success: false`, `failedStage: "analyzing-structure"`, `ANALYSIS_ERROR` |
| TC-5.2a | TC-5.2a: module generation failure | Mock SDK fails on 3rd of 5 modules | `success: false`, `failedStage: "generating-module"`, error identifies module |
| TC-5.2b | TC-5.2b: overview failure | Mock SDK fails during overview | `success: false`, `failedStage: "generating-overview"`, module docs remain on disk |
| TC-5.2c | TC-5.2c: clustering failure | Mock SDK fails during planning | `success: false`, `failedStage: "planning-modules"`, `ORCHESTRATION_ERROR` |
| TC-5.3a | TC-5.3a: validation warnings don't fail | Warnings-only validation | `success: true` |
| TC-5.3b | TC-5.3b: validation errors fail run | Errors remain after review | `success: false`, `failedStage: "validating-output"` |
| TC-5.4a | TC-5.4a: partial output on disk | Fail after 3 of 5 modules | 3 `.md` files on disk; no `.doc-meta.json` |
| TC-5.4b | TC-5.4b: no metadata for failed runs | Any failure | `.doc-meta.json` not written/updated |
| TC-5.5a | TC-5.5a: failed event emitted | Any failure | Final progress event has `stage: "failed"` |
| TC-3.5a | TC-3.5a: failed result structure | Module gen failure | `failedStage`, `error.code`, `error.message` all present |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| failure at metadata-write stage | Late-stage failure (everything succeeded but metadata write crashed) |
| Agent SDK network timeout at different stages | Verify each stage handles timeout |
| double failure (stage + progress) | Progress callback throws; main failure still reported |

---

### Pure Function Tests

**Test File:** `test/orchestration/pure-functions.test.ts`

These test pure functions in isolation, complementing the entry-point tests.

| Function | Tests | Rationale |
|----------|-------|-----------|
| `moduleNameToFileName` | "core" → "core.md", "Auth Middleware" → "auth-middleware.md", "my/module" → "mymodule.md", "" → ".md" (edge) | Deterministic naming used by generation and tree writing |
| `affected-module-mapper.mapToAffectedModules` | Various change sets against various plans | Complex mapping logic benefits from isolated edge-case coverage |

---

## Test Organization

```text
test/
├── orchestration/
│   ├── module-planning.test.ts           # Chunk 1: 8 tests
│   ├── generate.test.ts                  # Chunk 2: 23 tests
│   ├── progress.test.ts                  # Chunk 3: 12 tests
│   ├── quality-review.test.ts            # Chunk 4: 21 tests
│   ├── update.test.ts                    # Chunk 5: 28 tests
│   ├── failure.test.ts                   # Chunk 6: 14 tests (11 TC + 3 non-TC)
│   └── pure-functions.test.ts            # Pure function unit tests
├── prompts/
│   └── prompt-builders.test.ts           # Chunk 1: 6 prompt structural tests
├── fixtures/
│   ├── agent-sdk/                        # Mock Agent SDK responses
│   │   ├── clustering-3-modules.json
│   │   ├── clustering-single-module.json
│   │   ├── clustering-invalid.json
│   │   ├── module-gen-core.json
│   │   ├── module-gen-api.json
│   │   ├── module-gen-utils.json
│   │   ├── overview-success.json
│   │   ├── review-fix-link.json
│   │   ├── review-fix-mermaid.json
│   │   └── review-no-fixes.json
│   ├── update/
│   │   ├── valid-prior-output/
│   │   ├── stale-prior-output/
│   │   ├── missing-plan-output/
│   │   └── corrupt-metadata-output/
│   ├── repos/                            # Reuse from Epic 1
│   ├── docs-output/                      # Reuse from Epic 1
│   └── config/                           # Reuse from Epic 1
├── helpers/
│   ├── agent-sdk-mock.ts                 # Mock SDK adapter factory
│   ├── run-pipeline.ts                   # Pipeline execution helper
│   ├── assert-output.ts                  # Output assertion helpers
│   ├── fixtures.ts                       # Reuse from Epic 1
│   ├── temp.ts                           # Reuse from Epic 1
│   └── git.ts                            # Reuse from Epic 1
```

---

## How Key Scenarios Are Tested

### Progress Events Without Live Calls

Progress events are tested by passing a capturing callback to
`generateDocumentation`. The mock SDK returns instantly. The test collects all
events and asserts on sequence, completeness, and field values.

```typescript
const events: DocumentationProgressEvent[] = [];
const result = await generateDocumentation(request, (e) => events.push(e));
expect(events.map(e => e.stage)).toEqual([
  "checking-environment", "analyzing-structure", "planning-modules",
  "generating-module", "generating-module", "generating-module",
  "generating-overview", "validating-output", "writing-metadata", "complete"
]);
```

### Quality Review Without Live Model

Quality review is tested by mocking the Agent SDK adapter to return specific
file patches. The test verifies: (1) patches are applied, (2) validation reruns,
(3) the pass count is correct, (4) no additional review passes run.

The mock response fixtures contain realistic patches (e.g., fixing a broken link
by updating the target URL). The test can verify the file was actually modified
on disk.

### Failure States at Each Stage

Each stage failure is tested by configuring the mock to fail at a specific point.
The test verifies the discriminated union result: `success: false`,
`failedStage`, `error.code`, and the presence/absence of partial artifacts.

```typescript
const mockSDK = createMockSDK({
  callOverrides: { 2: { code: "ORCHESTRATION_ERROR", message: "timeout" } }
});
// The 3rd Agent SDK call (module gen) will fail
```

### Update Mode Change Detection

Change detection is tested by mocking `getChangedFilesBetweenCommits` to return
specific changed file sets. The `affected-module-mapper` is tested both through
the full pipeline and in isolation with pure function tests for edge cases
(cross-module relationships, renamed files, unmappable new files).

---

## Running Totals

| Chunk | TC Tests | Non-TC Tests | Total | Running Total |
|-------|----------|-------------|-------|---------------|
| 0: Infrastructure | 0 | 0 | 0 | 0 |
| 1: Module Planning + Prompts | 4 | 10 | 14 | 14 |
| 2: Core Generation | 18 | 5 | 23 | 37 |
| 3: Progress & Result | 9 | 3 | 12 | 49 |
| 4: Quality Review | 16 | 5 | 21 | 70 |
| 5: Update | 24 | 4 | 28 | 98 |
| 6: Failure Handling | 11 | 3 | 14 | 112 |
| **Total** | **82** | **30** | **112** | |

Note: TC-3.5a appears in Chunk 6 (failure handling) rather than Chunk 3 because
it tests failure result structure, which belongs with other failure tests.
TC count includes it once.

Previous Epic 1 tests (82) must keep passing as each chunk completes.
Regression = stop and fix before proceeding.
