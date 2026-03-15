# Test Plan: Foundation & Analysis Runtime

## Purpose

This document defines the complete testing strategy for Epic 1. It maps every
TC from the epic to a specific test, defines the fixture architecture, and
establishes mock boundaries.

**Companion:** [tech-design.md](tech-design.md) — architecture, interfaces, module
breakdown. This plan references the tech design for implementation details.

---

## Testing Philosophy

Every SDK operation is tested at the **entry point** — the exported function
that callers import. Internal modules (normalizer, language detector, etc.)
are exercised through entry point tests, not mocked. Mocks exist only at
external boundaries: subprocess calls, filesystem reads for fixtures, and git
operations.

All test planning here assumes the final package baseline from the dependency
decision: Node 24 LTS, TypeScript 5.9.x, an ESM-only package shape, Vitest as
the runner, Biome for lint/format verification, `tsc` for typecheck/build, and
`tsx` only for development-side helper scripts.

This is the service mock pattern applied to a library SDK. The "service" is
each exported function. The "boundary" is the local system (subprocess, fs).

```text
SDK Entry Point (exported function)             ← Test here
    ↓
Internal orchestration (resolver, normalizer)   ← Exercised, not mocked
    ↓
External boundary (subprocess, filesystem)      ← Mock here
```

---

## Mock Strategy

### What Gets Mocked

| Boundary | Mock? | Why |
|----------|-------|-----|
| `adapters/subprocess.ts` — `runSubprocess()` | Yes | Controls Python and git subprocess responses |
| `adapters/git.ts` — `getHeadCommitHash()`, `isGitRepository()` | Yes (when testing non-git flows) | Avoids real git dependency in non-git tests |
| `adapters/python.ts` — `isPythonAvailable()` | Yes | Controls whether Python "exists" in test |
| Filesystem reads in `config/file-loader.ts` | Yes (via fixture directories) | Config file presence controlled by fixture |
| Filesystem reads in `metadata/reader.ts` | Yes (via fixture directories) | Metadata file contents controlled by fixture |
| Filesystem writes in `metadata/writer.ts` | Yes (temp directory) | Verify writes without polluting fixtures |

### What Is NOT Mocked

| Module | Why Not |
|--------|---------|
| `config/resolver.ts` merge logic | Internal business logic — exercise through entry point |
| `config/defaults.ts` | Pure values — no reason to mock |
| `analysis/normalizer.ts` | Pure transformation — exercise through `analyzeRepository()` |
| `environment/language-detector.ts` | Exercise through `checkEnvironment()` with fixture repos |
| `validation/checks/*` | Pure functions — exercise through `validateDocumentation()` |

### Mock Setup Pattern

```typescript
import { vi, describe, test, expect, beforeEach } from "vitest";

// Mock at external boundary
vi.mock("../adapters/subprocess.js", () => ({
  runSubprocess: vi.fn(),
}));

import { runSubprocess } from "../adapters/subprocess.js";
const mockRunSubprocess = vi.mocked(runSubprocess);

beforeEach(() => {
  vi.clearAllMocks();
});
```

---

## Fixture Architecture

### Fixture Repos

Small, committed git repositories with known structure. Created during
Chunk 0 as part of test infrastructure.

| Fixture | Path | Contents | Used By |
|---------|------|----------|---------|
| `valid-ts` | `test/fixtures/repos/valid-ts/` | 3 TS files with classes, functions, imports. `package.json`, `tsconfig.json`. Initialized git repo with one commit. | Analysis tests, env check tests |
| `empty` | `test/fixtures/repos/empty/` | Initialized git repo. No source files. Only `.gitkeep`. | Analysis empty-repo tests |
| `multi-lang` | `test/fixtures/repos/multi-lang/` | `.ts` + `.py` files. Initialized git repo. | Language detection tests |
| `no-git` | `test/fixtures/repos/no-git/` | Directory with source files but no git initialization. | Git validation tests |

### Fixture Doc Outputs

Pre-built documentation output directories with known characteristics.

| Fixture | Path | Characteristics | Used By |
|---------|------|-----------------|---------|
| `valid` | `test/fixtures/docs-output/valid/` | Complete: `overview.md`, `module-tree.json`, `.doc-meta.json`, 3 module pages. All links valid. Mermaid blocks well-formed. | Validation happy path |
| `broken-links` | `test/fixtures/docs-output/broken-links/` | Valid structure but `auth.md` links to nonexistent `session.md`. | Cross-link check tests |
| `missing-overview` | `test/fixtures/docs-output/missing-overview/` | Missing `overview.md`. All other expected files present. | TC-4.2a |
| `missing-tree` | `test/fixtures/docs-output/missing-tree/` | Missing `module-tree.json`. All other expected files present. | TC-4.2b |
| `missing-meta` | `test/fixtures/docs-output/missing-meta/` | Missing `.doc-meta.json`. All other expected files present. | TC-4.2c |
| `warnings-only` | `test/fixtures/docs-output/warnings-only/` | All expected files present. `module-tree.json` has no missing page issues. Contains one malformed Mermaid block (warning) and one orphan page (warning). No errors. | TC-4.6b |
| `inconsistent-tree` | `test/fixtures/docs-output/inconsistent-tree/` | `module-tree.json` references `d.md` (doesn't exist). `e.md` exists but isn't in tree. | Module-tree consistency tests |
| `bad-mermaid` | `test/fixtures/docs-output/bad-mermaid/` | Pages with malformed Mermaid blocks (missing diagram type, unbalanced brackets). | Mermaid check tests |
| `corrupt-metadata` | `test/fixtures/docs-output/corrupt-metadata/` | `.doc-meta.json` is invalid JSON. | Metadata shape tests |
| `missing-metadata-fields` | `test/fixtures/docs-output/missing-metadata-fields/` | `.doc-meta.json` is valid JSON but missing `commitHash`. | Metadata shape tests |

### Fixture Configs

| Fixture | Path | Contents | Used By |
|---------|------|----------|---------|
| `valid-config` | `test/fixtures/config/valid-config/` | `.docengine.json` with `outputPath` and `excludePatterns` | Config file loading tests |
| `invalid-config` | `test/fixtures/config/invalid-config/` | `.docengine.json` with malformed JSON | Config error tests |
| `extra-fields-config` | `test/fixtures/config/extra-fields-config/` | `.docengine.json` with unknown fields | Non-TC: extra fields ignored |
| `no-config` | `test/fixtures/config/no-config/` | Directory with no `.docengine.json` | Config missing-file tests |

### Test Helpers

```typescript
// test/helpers/fixtures.ts
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FIXTURES_ROOT = path.resolve(__dirname, "../fixtures");
export const REPOS = {
  validTs: path.join(FIXTURES_ROOT, "repos/valid-ts"),
  empty: path.join(FIXTURES_ROOT, "repos/empty"),
  multiLang: path.join(FIXTURES_ROOT, "repos/multi-lang"),
  noGit: path.join(FIXTURES_ROOT, "repos/no-git"),
};
export const DOCS_OUTPUT = {
  valid: path.join(FIXTURES_ROOT, "docs-output/valid"),
  brokenLinks: path.join(FIXTURES_ROOT, "docs-output/broken-links"),
  missingOverview: path.join(FIXTURES_ROOT, "docs-output/missing-overview"),
  missingTree: path.join(FIXTURES_ROOT, "docs-output/missing-tree"),
  missingMeta: path.join(FIXTURES_ROOT, "docs-output/missing-meta"),
  warningsOnly: path.join(FIXTURES_ROOT, "docs-output/warnings-only"),
  inconsistentTree: path.join(FIXTURES_ROOT, "docs-output/inconsistent-tree"),
  badMermaid: path.join(FIXTURES_ROOT, "docs-output/bad-mermaid"),
  corruptMetadata: path.join(FIXTURES_ROOT, "docs-output/corrupt-metadata"),
  missingMetadataFields: path.join(FIXTURES_ROOT, "docs-output/missing-metadata-fields"),
};
```

```typescript
// test/helpers/temp.ts
/** Create a temp directory for write tests. Cleaned up in afterEach. */
export const createTempDir = (): string => { ... };
export const cleanupTempDir = (dir: string): void => { ... };
```

---

## TC-to-Test Mapping

### Chunk 1: Configuration

**Test File:** `test/config/resolver.test.ts`

Entry point: `resolveConfiguration()`

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-5.1a | TC-5.1a: defaults to docs/wiki output path when nothing configured | No config file, no caller options | `value.outputPath === "docs/wiki"` |
| TC-5.1b | TC-5.1b: applies default exclude patterns when none configured | No config file, no caller options | `value.excludePatterns` includes `node_modules`, `.git` |
| TC-5.2a | TC-5.2a: caller outputPath overrides default | Caller provides `outputPath: "docs/api-docs"` | `value.outputPath === "docs/api-docs"` |
| TC-5.2b | TC-5.2b: caller outputPath overrides config file | Config file sets `outputPath: "docs/generated"`; caller provides `outputPath: "docs/api-docs"` | `value.outputPath === "docs/api-docs"` |
| TC-5.2c | TC-5.2c: partial override preserves unset fields from config file | Config file sets both fields; caller provides only `outputPath` | `value.outputPath` from caller; `value.excludePatterns` from config file |
| TC-5.3a | TC-5.3a: config file value used when caller doesn't set field | Config file sets `outputPath: "docs/generated"` | `value.outputPath === "docs/generated"` |
| TC-5.3b | TC-5.3b: missing config file uses defaults without error | No config file fixture | `result.ok === true`; values match defaults |
| TC-5.4a | TC-5.4a: empty output path produces CONFIGURATION_ERROR | Caller provides `outputPath: ""` | `result.ok === false`; `error.code === "CONFIGURATION_ERROR"` |
| TC-5.4b | TC-5.4b: malformed glob produces CONFIGURATION_ERROR | Caller provides `includePatterns: ["[invalid"]` | `result.ok === false`; `error.code === "CONFIGURATION_ERROR"` |
| TC-5.5a | TC-5.5a: resolved config has all fields populated | Mixed sources | Every field on `ResolvedConfiguration` is defined and non-undefined |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| malformed JSON in config file returns CONFIGURATION_ERROR | Config file parse errors should be typed, not crash |
| unknown fields in config file are silently ignored | Forward compatibility — config from newer version shouldn't break older engine |

---

### Chunk 2: Environment & Dependency Checks

**Test File:** `test/environment/check.test.ts`

Entry point: `checkEnvironment()`

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-1.1a | TC-1.1a: all deps present returns passed true | Mock all deps available; use `valid-ts` fixture | `value.passed === true`; `value.findings` is empty |
| TC-1.1b | TC-1.1b: no repo path checks only runtime deps | No repoPath in request | `value.detectedLanguages` empty; no parser or git-repo findings |
| TC-1.2a | TC-1.2a: missing Python identified by name | Mock Python unavailable | Finding with `category: "missing-dependency"`, `dependencyName: "python"` |
| TC-1.2b | TC-1.2b: missing TS parser identified by name | Mock TS parser unavailable; use `valid-ts` fixture | Finding with `category: "missing-dependency"`, `dependencyName` contains "typescript" |
| TC-1.2c | TC-1.2c: multiple missing deps listed individually | Mock Python + parser unavailable | Two separate `missing-dependency` findings |
| TC-1.2d | TC-1.2d: missing Git identified by name | Mock Git unavailable | Finding with `category: "missing-dependency"`, `dependencyName: "git"` |
| TC-1.3a | TC-1.3a: TypeScript repo detected | Use `valid-ts` fixture | `value.detectedLanguages` includes `"typescript"` |
| TC-1.3b | TC-1.3b: multi-language repo detected | Use `multi-lang` fixture | `value.detectedLanguages` includes both `"typescript"` and `"python"` |
| TC-1.4a | TC-1.4a: valid git repo produces no git errors | Use `valid-ts` fixture (has git) | No findings with `category: "invalid-repo"` |
| TC-1.4b | TC-1.4b: directory without git produces error finding | Use `no-git` fixture | Finding with `severity: "error"`, `category: "invalid-repo"` |
| TC-1.4c | TC-1.4c: nonexistent path produces error finding | Non-existent path | Finding with `severity: "error"`, `category: "invalid-path"` |
| TC-1.5a | TC-1.5a: missing optional parser is warning | Mock Python parser unavailable for `.py` files in mixed repo | Finding with `severity: "warning"` for Python parser; `value.passed` still `true` |
| TC-1.5b | TC-1.5b: missing Python runtime is error | Mock Python unavailable | Finding with `severity: "error"`; `value.passed === false` |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| analysis scripts not executable returns error finding | Bundled scripts with permission issues should report clearly |
| mixed parser availability across multiple languages | Verify warnings for some and errors for none interact correctly |

---

### Chunk 3: Structural Analysis

**Test File:** `test/analysis/analyze.test.ts`

Entry point: `analyzeRepository()`

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-2.1a | TC-2.1a: successful TypeScript repo analysis | Mock adapter returns valid raw output | `value.components` populated; `value.relationships` populated; `value.summary` populated |
| TC-2.1b | TC-2.1b: repo with no source files | Mock adapter returns empty functions/relationships | `value.summary.totalComponents === 0`; `value.summary.totalRelationships === 0` |
| TC-2.2a | TC-2.2a: include pattern limits scope | Mock adapter receives include pattern; raw output filtered | Only `src/` components in normalized result |
| TC-2.2b | TC-2.2b: no include patterns includes all files | No includePatterns in options | All files from mock adapter appear in result |
| TC-2.3a | TC-2.3a: exclude pattern removes files | Mock adapter with exclude applied | No `generated/` components in result |
| TC-2.3b | TC-2.3b: include and exclude combined | Both patterns provided | `src/` included except `.test.ts` |
| TC-2.4a | TC-2.4a: focus dirs preserved in output | `focusDirs: ["src/core"]` in options | `value.focusDirs` equals `["src/core"]` |
| TC-2.4b | TC-2.4b: non-focus files still included | `focusDirs: ["src/core"]` in options | Components outside `src/core` present in result |
| TC-2.5a | TC-2.5a: component structure has required fields | Mock raw output with class + two functions | Component has `filePath`, `language: "typescript"`, 3 `exportedSymbols` with correct `kind` |
| TC-2.5b | TC-2.5b: file with no exports has empty symbols | Mock raw output with no exports | Component exists; `exportedSymbols` is `[]` |
| TC-2.6a | TC-2.6a: import relationship captured | Mock raw output with dependency edges | Relationship with correct `source`, `target`, `type: "import"` |
| TC-2.6b | TC-2.6b: no relationships returns empty array | Mock raw output with no relationships | `value.relationships` is `[]` |
| TC-2.7a | TC-2.7a: commit hash recorded | Mock git returns specific SHA | `value.commitHash` equals mocked SHA |
| TC-2.8a | TC-2.8a: Python unavailable returns DEPENDENCY_MISSING | Mock Python not available | `result.ok === false`; `error.code === "DEPENDENCY_MISSING"` |
| TC-2.8b | TC-2.8b: nonexistent repo path returns PATH_ERROR | Non-existent path | `result.ok === false`; `error.code === "PATH_ERROR"` |
| TC-2.8c | TC-2.8c: unsupported languages listed in languagesSkipped | Mock adapter with only `.rs` files | `value.summary.languagesSkipped` includes `"rust"` |
| TC-2.8d | TC-2.8d: partial language support reports both | Mock adapter with `.ts` + `.rs` | `languagesFound` has `"typescript"`; `languagesSkipped` has `"rust"` |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| adapter timeout returns ANALYSIS_ERROR | Long-running Python process should not hang the SDK |
| normalizer handles empty functions array | Edge case — no crash on empty input |
| normalizer deduplicates relationships between same file pair | Import + call edges between same files should collapse |

---

### Chunk 4: Metadata & Status

**Test File:** `test/metadata/status.test.ts`

Entry points: `getDocumentationStatus()`, `readMetadata()`, `writeMetadata()`

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-3.1a | TC-3.1a: nonexistent output dir returns not_generated | Non-existent path | `value.state === "not_generated"`; nulls for timestamps and hashes |
| TC-3.1b | TC-3.1b: output dir without metadata returns not_generated | Fixture dir with no `.doc-meta.json` | `value.state === "not_generated"` |
| TC-3.2a | TC-3.2a: matching commit hash returns current | Fixture with metadata; mock git returns matching hash | `value.state === "current"` |
| TC-3.3a | TC-3.3a: differing commit hash returns stale | Fixture with metadata hash `abc123`; mock git returns `def456` | `value.state === "stale"`; both hashes present |
| TC-3.4a | TC-3.4a: invalid JSON metadata returns invalid | `corrupt-metadata` fixture | `value.state === "invalid"` |
| TC-3.4b | TC-3.4b: metadata missing commitHash returns invalid | `missing-metadata-fields` fixture | `value.state === "invalid"` |
| TC-3.5a | TC-3.5a: write full generation metadata | Provide payload with `mode: "full"` | File written; re-read matches all fields including ISO 8601 timestamp |
| TC-3.5b | TC-3.5b: write update metadata replaces previous | Write full, then write update | Second read returns `mode: "update"` with new values |
| TC-3.6a | TC-3.6a: successful metadata read | `valid` docs fixture | Complete `GeneratedDocumentationMetadata` returned with all fields |
| TC-3.6b | TC-3.6b: corrupted metadata returns structured error | `corrupt-metadata` fixture | `result.ok === false`; `error.code === "METADATA_ERROR"` |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| write to nonexistent output directory creates it | Caller shouldn't have to mkdir first |
| read metadata with extra unknown fields succeeds | Forward compatibility with future metadata versions |
| write then read roundtrip preserves all fields | Integration test for serialization fidelity |

---

### Chunk 5: Validation

**Test File:** `test/validation/validate.test.ts`

Entry point: `validateDocumentation()`

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-4.1a | TC-4.1a: valid output directory returns pass | `valid` docs fixture | `value.status === "pass"`; counts are 0 |
| TC-4.1b | TC-4.1b: nonexistent directory returns fail | Non-existent path | `value.status === "fail"`; finding identifies missing directory |
| TC-4.2a | TC-4.2a: missing overview.md reported | `missing-overview` fixture | Finding with `category: "missing-file"` for `overview.md` |
| TC-4.2b | TC-4.2b: missing module-tree.json reported | `missing-tree` fixture | Finding with `category: "missing-file"` for `module-tree.json` |
| TC-4.2c | TC-4.2c: missing .doc-meta.json reported | `missing-meta` fixture | Finding with `category: "missing-file"` for `.doc-meta.json` |
| TC-4.3a | TC-4.3a: valid internal links produce no findings | `valid` fixture (all links resolve) | No `broken-link` findings |
| TC-4.3b | TC-4.3b: broken internal link reported as error | `broken-links` fixture | Finding with `severity: "error"`, `category: "broken-link"`, `filePath` and `target` populated |
| TC-4.4a | TC-4.4a: consistent tree produces no findings | `valid` fixture; `overview.md` excluded | No `module-tree` findings |
| TC-4.4b | TC-4.4b: module in tree with no page reported | `inconsistent-tree` fixture | Finding with `severity: "error"`, `category: "module-tree"` for missing page |
| TC-4.4c | TC-4.4c: orphan module page reported as warning | `inconsistent-tree` fixture | Finding with `severity: "warning"`, `category: "module-tree"` for orphan page |
| TC-4.4d | TC-4.4d: overview.md excluded from orphan check | `valid` fixture; `overview.md` not in tree | No orphan warning for `overview.md` |
| TC-4.5a | TC-4.5a: valid Mermaid block produces no findings | `valid` fixture | No `mermaid` findings |
| TC-4.5b | TC-4.5b: malformed Mermaid block reported as warning | `bad-mermaid` fixture | Finding with `severity: "warning"`, `category: "mermaid"` |
| TC-4.6a | TC-4.6a: all checks pass → pass summary | `valid` fixture | `status: "pass"`, `errorCount: 0`, `warningCount: 0` |
| TC-4.6b | TC-4.6b: warnings only → warn summary | `warnings-only` fixture | `status: "warn"`, `errorCount: 0`, `warningCount > 0` |
| TC-4.6c | TC-4.6c: errors present → fail summary | Fixture with error-severity findings | `status: "fail"`, `errorCount > 0` |
| TC-4.6d | TC-4.6d: invalid metadata JSON reported as metadata error | `corrupt-metadata` fixture | Finding with `severity: "error"`, `category: "metadata"`, `filePath` for `.doc-meta.json`; `status === "fail"` |
| TC-4.6e | TC-4.6e: metadata missing required fields reported as metadata error | `missing-metadata-fields` fixture | Finding with `severity: "error"`, `category: "metadata"`, `filePath` for `.doc-meta.json`; `status === "fail"` |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| output directory with no markdown files (degenerate) | Ensure validation doesn't crash on empty/unusual directories |
| nested module-tree with children resolved correctly | Verify recursive tree traversal collects all pages |
| Mermaid block with no diagram type keyword | Ensure check catches blocks that are just random text in mermaid fence |
| multiple broken links in same file all reported | Ensure checker doesn't stop at first link failure per file |

---

## Test Organization

```text
test/
├── config/
│   └── resolver.test.ts              # Chunk 1: 12 tests
├── environment/
│   └── check.test.ts                 # Chunk 2: 15 tests
├── analysis/
│   └── analyze.test.ts               # Chunk 3: 20 tests
├── metadata/
│   └── status.test.ts                # Chunk 4: 13 tests
├── validation/
│   └── validate.test.ts              # Chunk 5: 22 tests
├── fixtures/
│   ├── repos/
│   │   ├── valid-ts/
│   │   ├── empty/
│   │   ├── multi-lang/
│   │   └── no-git/
│   ├── docs-output/
│   │   ├── valid/
│   │   ├── broken-links/
│   │   ├── missing-overview/
│   │   ├── missing-tree/
│   │   ├── missing-meta/
│   │   ├── warnings-only/
│   │   ├── inconsistent-tree/
│   │   ├── bad-mermaid/
│   │   ├── corrupt-metadata/
│   │   └── missing-metadata-fields/
│   └── config/
│       ├── valid-config/
│       ├── invalid-config/
│       ├── extra-fields-config/
│       └── no-config/
└── helpers/
    ├── fixtures.ts                    # Fixture path constants
    ├── temp.ts                        # Temp directory management
    └── git.ts                         # Git test utilities
```

---

## Running Totals

| Chunk | TC Tests | Non-TC Tests | Total | Running Total |
|-------|----------|-------------|-------|---------------|
| 0: Infrastructure | 0 | 0 | 0 | 0 |
| 1: Configuration | 10 | 2 | 12 | 12 |
| 2: Environment | 13 | 2 | 15 | 27 |
| 3: Analysis | 17 | 3 | 20 | 47 |
| 4: Metadata | 10 | 3 | 13 | 60 |
| 5: Validation | 18 | 4 | 22 | 82 |
| **Total** | **68** | **14** | **82** | |

Previous tests must keep passing as each chunk completes. Regression = stop and
fix before proceeding.
