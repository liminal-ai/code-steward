# Story 3: Structural Analysis

## Objective

Callers can analyze a repository and receive normalized component and
relationship data in engine-native types. The analysis adapter invokes the
Python-based structural analysis scripts, and the normalizer transforms raw
output into the `RepositoryAnalysis` contract. Include/exclude patterns filter
scope. Focus directories are preserved for downstream use by Epic 2.

## Scope

### In Scope

- `analyzeRepository()` SDK operation
- Python analysis adapter invocation via subprocess
- Raw output normalization into engine types (`AnalyzedComponent`, `AnalyzedRelationship`, `AnalysisSummary`)
- Include/exclude pattern filtering
- Focus directory passthrough
- Git commit hash capture at analysis time
- Structured errors for adapter failures (`DEPENDENCY_MISSING`, `PATH_ERROR`, `ANALYSIS_ERROR`)
- Graceful handling of unsupported/partially supported languages

### Out of Scope

- Agent-driven clustering or generation (Epic 2)
- Environment checks (Story 2 — analysis assumes environment is ready or reports dependency errors)

## Dependencies / Prerequisites

- Stories 1 and 2 complete (configuration resolution and environment checks)
- CodeWiki-derived analysis scripts bundled and invocable

## Acceptance Criteria

**AC-2.1:** Analysis accepts a repo path and returns a normalized `RepositoryAnalysis` result.

- **TC-2.1a: Successful analysis of a TypeScript repo**
  - Given: Repo path points to a valid TypeScript project with source files
  - When: Caller invokes analysis
  - Then: `RepositoryAnalysis` returned with populated `components`, `relationships`, and `summary`
- **TC-2.1b: Repo with no source files**
  - Given: Repo path points to a git repo with no analyzable source files (e.g., only markdown)
  - When: Caller invokes analysis
  - Then: `RepositoryAnalysis` returned with `summary.totalComponents: 0` and `summary.totalRelationships: 0`

**AC-2.2:** Include patterns filter which files are analyzed. Only files matching at least one include pattern are processed.

- **TC-2.2a: Include pattern limits scope**
  - Given: Repo has source files in `src/` and `test/`
  - When: Caller invokes analysis with `includePatterns: ["src/**"]`
  - Then: Only components from `src/` appear in results
- **TC-2.2b: No include patterns means all files included**
  - Given: Caller invokes analysis without `includePatterns`
  - When: Analysis runs
  - Then: All analyzable files in the repo are included

**AC-2.3:** Exclude patterns remove matching files from analysis.

- **TC-2.3a: Exclude pattern removes files**
  - Given: Repo has source files in `src/` and `src/generated/`
  - When: Caller invokes analysis with `excludePatterns: ["**/generated/**"]`
  - Then: Components from `src/generated/` do not appear in results
- **TC-2.3b: Include and exclude combined**
  - Given: Caller provides `includePatterns: ["src/**"]` and `excludePatterns: ["**/*.test.ts"]`
  - When: Analysis runs
  - Then: Files in `src/` are included except those matching `*.test.ts`

**AC-2.4:** Focus directories are preserved in the normalized output for downstream use by clustering and generation. Non-focus files are still analyzed.

- **TC-2.4a: Focus directories preserved in output**
  - Given: Caller invokes analysis with `focusDirs: ["src/core"]`
  - When: Analysis completes
  - Then: `RepositoryAnalysis.focusDirs` contains `["src/core"]`
- **TC-2.4b: Non-focus files still included**
  - Given: Caller invokes analysis with `focusDirs: ["src/core"]`
  - When: Analysis completes
  - Then: Components from directories outside `src/core` still appear in results

**AC-2.5:** Each component in the normalized output includes its file path, language, exported symbols (with name, kind, and line number), and lines of code.

- **TC-2.5a: TypeScript component structure**
  - Given: Repo contains a TypeScript file exporting a class and two functions
  - When: Analysis completes
  - Then: Component for that file includes `filePath`, `language: "typescript"`, three entries in `exportedSymbols` with correct `kind` values, and `linesOfCode`
- **TC-2.5b: File with no exports**
  - Given: Repo contains a TypeScript file with no exports (e.g., a script with side effects only)
  - When: Analysis completes
  - Then: Component exists with `exportedSymbols` as an empty array

**AC-2.6:** Each relationship in the normalized output identifies source component, target component, and relationship type.

- **TC-2.6a: Import relationship captured**
  - Given: File A imports from File B
  - When: Analysis completes
  - Then: `relationships` includes an entry with `source` pointing to A's path, `target` pointing to B's path, `type: "import"`
- **TC-2.6b: No relationships**
  - Given: Repo contains files with no cross-file references
  - When: Analysis completes
  - Then: `relationships` is an empty array

**AC-2.7:** The analysis records the git commit hash at time of execution in `commitHash`.

- **TC-2.7a: Commit hash recorded**
  - Given: Repo HEAD is at a specific commit
  - When: Analysis completes
  - Then: `RepositoryAnalysis.commitHash` equals the full SHA of that commit

**AC-2.8:** Analysis returns a structured error for hard failures and a valid result with diagnostic information for unsupported or partially supported repos.

- **TC-2.8a: Analysis adapter not available**
  - Given: Python is not installed
  - When: Caller invokes analysis
  - Then: Structured error returned with code `DEPENDENCY_MISSING`; no partial result
- **TC-2.8b: Invalid repo path**
  - Given: Repo path points to a nonexistent directory
  - When: Caller invokes analysis
  - Then: Structured error returned with code `PATH_ERROR`
- **TC-2.8c: No supported languages found**
  - Given: Repo contains only file types not supported by any parser (e.g., only `.rs` files)
  - When: Analysis completes
  - Then: Result returned with `summary.totalComponents: 0`; `summary.languagesSkipped` lists the unsupported languages found
- **TC-2.8d: Partial language support**
  - Given: Repo contains both `.ts` (supported) and `.rs` (unsupported) files
  - When: Analysis completes
  - Then: Supported files are analyzed; `summary.languagesFound` includes `"typescript"`; `summary.languagesSkipped` includes `"rust"`

## Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Python not installed | `DEPENDENCY_MISSING` error |
| Nonexistent repo path | `PATH_ERROR` error |
| Adapter subprocess crashes | `ANALYSIS_ERROR` with stderr in details |
| Adapter returns invalid JSON | `ANALYSIS_ERROR` with parse error |
| No supported languages | Success with `totalComponents: 0` and `languagesSkipped` populated |

## Definition of Done

- [ ] All ACs met (AC-2.1 through AC-2.8)
- [ ] All TC conditions verified (TC-2.1a through TC-2.8d)
- [ ] `verify` script passes

---
