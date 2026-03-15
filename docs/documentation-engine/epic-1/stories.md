# Epic 1 Stories: Foundation & Analysis Runtime

Functional stories for the Documentation Engine's foundational runtime layer.
These are the acceptance artifacts — each story carries full AC/TC detail so a
PO can accept from the story alone without referencing the epic.

Technical implementation sections will be added by the Tech Lead during Story
Technical Enrichment.

**Source epic:** [epic.md](epic.md)
**Source tech design:** [tech-design.md](tech-design.md)
**Source test plan:** [test-plan.md](test-plan.md)

---

## Story Index

- [Story 0: Foundation](stories/story-0.md)
- [Story 1: Configuration Resolution](stories/story-1.md)
- [Story 2: Environment & Dependency Checks](stories/story-2.md)
- [Story 3: Structural Analysis](stories/story-3.md)
- [Story 4: Metadata & Status](stories/story-4.md)
- [Story 5: Documentation Validation](stories/story-5.md)

# Story 0: Foundation

## Objective

Establish the shared infrastructure that all subsequent stories build on. After
this story, the package compiles, all types are importable, test fixtures exist,
and the project is ready for TDD cycles.

## Scope

### In Scope

- Package skeleton (package.json, tsconfig.json, vitest.config.ts, biome.json)
- All type definitions from the epic's data contracts
- `EngineResult<T>` discriminated union, `EngineError`, `EngineErrorCode`
- `NotImplementedError` class for skeleton stubs
- `ok()` / `err()` result constructor helpers
- `STRUCTURAL_FILES` constant for validation
- Test fixture repos (valid-ts, empty, multi-lang, no-git)
- Test fixture doc outputs (valid, broken-links, missing-overview, missing-tree, missing-meta, warnings-only, inconsistent-tree, bad-mermaid, corrupt-metadata, missing-metadata-fields)
- Test fixture configs (valid-config, invalid-config, extra-fields-config, no-config)
- Test helper utilities (fixture paths, temp directory management, git helpers)
- Biome-based lint/format configuration and verification scripts

### Out of Scope

- Any SDK operation implementation (Stories 1-5)
- Any TDD cycle (types and fixtures don't need test-driven development)

## Dependencies / Prerequisites

- None — this is the first story

## Exit Criteria

- [ ] `typecheck` script (`tsc --noEmit`) passes
- [ ] All types importable from `src/types/index.ts`
- [ ] All fixture repos exist with expected directory structure and committed files
- [ ] All fixture doc output directories contain expected files with expected characteristics
- [ ] `red-verify` script passes (Biome + typecheck)

---

# Story 1: Configuration Resolution

## Objective

Callers can resolve configuration from built-in defaults, an optional config
file, and explicit caller-provided options. The three-level priority merge
produces a fully populated `ResolvedConfiguration` with no undefined fields.
Invalid configuration produces a typed error, not a crash or silent fallback.

## Scope

### In Scope

- `resolveConfiguration()` SDK operation
- Built-in default values
- Config file discovery and loading (`.docengine.json` in repo root)
- Three-level field-by-field merge (caller > config file > defaults)
- Validation of merged result (empty paths, malformed globs)
- `CONFIGURATION_ERROR` for invalid values

### Out of Scope

- Environment checks (Story 2)
- Any operation that consumes resolved configuration — this story delivers the resolution capability only

## Dependencies / Prerequisites

- Story 0 complete (types, fixtures, project skeleton)

## Acceptance Criteria

**AC-5.1:** Built-in defaults are applied when no explicit configuration or config file is provided.

- **TC-5.1a: Default output path**
  - Given: No output path configured anywhere
  - When: Engine resolves configuration
  - Then: Output path defaults to `"docs/wiki"` relative to repo root
- **TC-5.1b: Default exclude patterns**
  - Given: No exclude patterns configured anywhere
  - When: Engine resolves configuration
  - Then: Default exclude patterns are applied (at minimum: `node_modules`, `.git`, common build output directories)

**AC-5.2:** Caller-provided options take highest priority, overriding both config file values and defaults.

- **TC-5.2a: Explicit output path overrides default**
  - Given: No config file exists; caller provides `outputPath: "docs/api-docs"`
  - When: Engine resolves configuration
  - Then: Output path is `"docs/api-docs"`
- **TC-5.2b: Explicit option overrides config file**
  - Given: Config file sets `outputPath: "docs/generated"`; caller provides `outputPath: "docs/api-docs"`
  - When: Engine resolves configuration
  - Then: Output path is `"docs/api-docs"`
- **TC-5.2c: Partial override**
  - Given: Config file sets `outputPath: "docs/generated"` and `excludePatterns: ["**/test/**"]`; caller provides only `outputPath: "docs/custom"`
  - When: Engine resolves configuration
  - Then: Output path is `"docs/custom"`; exclude patterns come from config file

**AC-5.3:** Engine config file provides values when no caller-provided options are set for those fields.

- **TC-5.3a: Config file value used**
  - Given: Config file sets `outputPath: "docs/generated"`; caller does not set `outputPath`
  - When: Engine resolves configuration
  - Then: Output path is `"docs/generated"`
- **TC-5.3b: Missing config file is not an error**
  - Given: No config file exists in the repo root
  - When: Engine resolves configuration
  - Then: Built-in defaults used; no error returned

**AC-5.4:** Invalid configuration values produce a structured error identifying the field and the problem.

- **TC-5.4a: Invalid output path**
  - Given: Caller provides `outputPath: ""` (empty string)
  - When: Engine attempts to resolve configuration
  - Then: Structured error with code `CONFIGURATION_ERROR` identifying `outputPath` as invalid with reason
- **TC-5.4b: Invalid pattern syntax**
  - Given: Caller provides `includePatterns: ["[invalid"]` (malformed glob)
  - When: Engine attempts to resolve configuration
  - Then: Structured error with code `CONFIGURATION_ERROR` identifying the invalid pattern

**AC-5.5:** Resolved configuration is accessible as a typed `ResolvedConfiguration` object with all fields populated.

- **TC-5.5a: Complete resolution**
  - Given: Configuration resolved from a mix of caller options, config file, and defaults
  - When: Caller accesses the resolved configuration
  - Then: `ResolvedConfiguration` object has all fields populated with their resolved values; no fields are undefined

## Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Empty output path | `CONFIGURATION_ERROR` with field name and reason |
| Malformed glob pattern | `CONFIGURATION_ERROR` identifying the invalid pattern |
| Malformed JSON in config file | `CONFIGURATION_ERROR` with parse error detail |

## Definition of Done

- [ ] All ACs met (AC-5.1 through AC-5.5)
- [ ] All TC conditions verified (TC-5.1a through TC-5.5a)
- [ ] `verify` script passes

---

# Story 2: Environment & Dependency Checks

## Objective

Callers can verify that the local environment has the runtime dependencies and
repo-level parser support needed for documentation workflows. The check
distinguishes runtime dependencies (always checked) from repo-language parser
dependencies (checked only when a repo path is provided). Every finding is
typed with severity, category, and identifying details.

## Scope

### In Scope

- `checkEnvironment()` SDK operation
- Runtime dependency checks: Python, Git, bundled analysis scripts
- Repo-aware language detection from file extensions
- Repo-aware parser availability checks per detected language
- Git repository validation (when repo path provided)
- Typed `EnvironmentCheckFinding` objects with severity and category
- `passed` derived from findings (`false` when any error-severity finding exists; warnings remain in `findings` and do not create a separate status enum)

### Out of Scope

- Structural analysis (Story 3) — this story verifies the adapter is available, not that it works
- Config file resolution (Story 1)

## Dependencies / Prerequisites

- Story 0 complete (types, fixtures, project skeleton)
- Adapter executables (Python, Git) present on the test machine or mocked

## Acceptance Criteria

**AC-1.1:** Environment check runs as a standalone operation and returns a structured `EnvironmentCheckResult`.

- **TC-1.1a: All dependencies present**
  - Given: Python, parsers, and git are available
  - When: Caller invokes environment check with a valid repo path
  - Then: Result has `passed: true`, empty `findings`
- **TC-1.1b: Check without repo path**
  - Given: Caller invokes environment check without a repo path
  - When: Check completes
  - Then: Only runtime dependencies are checked (Python, Git, analysis scripts); `detectedLanguages` is empty; no parser-related or git-repository findings are produced

**AC-1.2:** Each missing dependency is identified by name in a typed finding, not reported as a generic execution error.

- **TC-1.2a: Missing Python reported by name**
  - Given: Python is not installed
  - When: Caller invokes environment check
  - Then: `findings` includes an entry with `category: "missing-dependency"` and `dependencyName: "python"`
- **TC-1.2b: Missing parser reported by name**
  - Given: TypeScript parser is not available
  - When: Caller invokes environment check for a TypeScript repo
  - Then: `findings` includes an entry with `category: "missing-dependency"` and `dependencyName` identifying the TypeScript parser
- **TC-1.2c: Multiple missing dependencies listed individually**
  - Given: Both Python and a parser are missing
  - When: Caller invokes environment check
  - Then: Both appear as separate `missing-dependency` findings
- **TC-1.2d: Missing Git reported by name**
  - Given: Git is not installed
  - When: Caller invokes environment check
  - Then: `findings` includes an entry with `category: "missing-dependency"` and `dependencyName: "git"`

**AC-1.3:** When a repo path is provided, the check detects languages present in the repo and includes them in `detectedLanguages`.

- **TC-1.3a: TypeScript repo detected**
  - Given: Repo contains `.ts` and `.tsx` files
  - When: Caller invokes environment check with repo path
  - Then: `detectedLanguages` includes `"typescript"`
- **TC-1.3b: Multi-language repo**
  - Given: Repo contains `.ts` and `.py` files
  - When: Caller invokes environment check with repo path
  - Then: `detectedLanguages` includes both `"typescript"` and `"python"`

**AC-1.4:** When a repo path is provided, the check verifies it is a valid git repository.

- **TC-1.4a: Valid git repo**
  - Given: Repo path points to a directory with an initialized git repository
  - When: Caller invokes environment check
  - Then: No git-related findings with `severity: "error"`
- **TC-1.4b: Not a git repo**
  - Given: Repo path points to a directory without git initialization
  - When: Caller invokes environment check
  - Then: `findings` includes an entry with `severity: "error"`, `category: "invalid-repo"`, and `path` identifying the directory
- **TC-1.4c: Path does not exist**
  - Given: Repo path points to a nonexistent directory
  - When: Caller invokes environment check
  - Then: `findings` includes an entry with `severity: "error"`, `category: "invalid-path"`, and `path` identifying the directory

**AC-1.5:** Non-blocking issues are returned as findings with `severity: "warning"`; blocking issues are returned as findings with `severity: "error"`. `passed` is `false` when any error finding exists.

- **TC-1.5a: Missing repo-language parser is a warning**
  - Given: Repo has `.py` files but the primary target is TypeScript; the Tree-sitter grammar for Python (repo-language parser) is not installed
  - When: Caller invokes environment check
  - Then: Missing Python language parser appears in a finding with `severity: "warning"`; `passed` remains `true` if all runtime dependencies are present
- **TC-1.5b: Missing runtime dependency is an error**
  - Given: Python runtime is not available (required by the analysis adapter)
  - When: Caller invokes environment check
  - Then: Entry appears in a finding with `severity: "error"`; `passed` is `false`

## Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Python not installed | Finding: `severity: "error"`, `category: "missing-dependency"`, `dependencyName: "python"` |
| Git not installed | Finding: `severity: "error"`, `category: "missing-dependency"`, `dependencyName: "git"` |
| Repo path doesn't exist | Finding: `severity: "error"`, `category: "invalid-path"` |
| Directory not a git repo | Finding: `severity: "error"`, `category: "invalid-repo"` |
| Optional parser missing | Finding: `severity: "warning"`, `category: "missing-dependency"` |

## Definition of Done

- [ ] All ACs met (AC-1.1 through AC-1.5)
- [ ] All TC conditions verified (TC-1.1a through TC-1.5b)
- [ ] `verify` script passes

---

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

# Story 4: Metadata & Status

## Objective

Callers can read and write documentation metadata and query staleness status
without running generation. Status is derived from metadata presence and commit
hash comparison — a four-state model (not_generated, current, stale, invalid)
that tells the caller exactly what state the documentation is in.

## Scope

### In Scope

- `getDocumentationStatus()` SDK operation
- `readMetadata()` SDK operation
- `writeMetadata()` SDK operation
- Four-state status derivation (not_generated / current / stale / invalid)
- `.doc-meta.json` read, write, and shape validation
- Commit hash comparison against current HEAD
- Shared metadata shape validation (via `metadata/validate-shape.ts`, also used by Story 5's validation pipeline)

### Out of Scope

- Validation pipeline (Story 5)
- Any generation workflow that would produce metadata (Epic 2)

## Dependencies / Prerequisites

- Story 1 complete (configuration provides resolved output path for metadata location)

## Acceptance Criteria

**AC-3.1:** Status query returns `"not_generated"` when no metadata file exists in the output directory.

- **TC-3.1a: Output directory does not exist**
  - Given: Output path does not exist on disk
  - When: Caller queries status
  - Then: `state` is `"not_generated"`; `lastGeneratedAt` and `lastGeneratedCommitHash` are `null`
- **TC-3.1b: Output directory exists but no metadata file**
  - Given: Output path exists but contains no `.doc-meta.json`
  - When: Caller queries status
  - Then: `state` is `"not_generated"`

**AC-3.2:** Status query returns `"current"` when metadata exists and stored commit hash matches current HEAD.

- **TC-3.2a: Documentation is current**
  - Given: `.doc-meta.json` exists with `commitHash` matching repo HEAD
  - When: Caller queries status
  - Then: `state` is `"current"`; `lastGeneratedCommitHash` and `currentHeadCommitHash` are equal

**AC-3.3:** Status query returns `"stale"` when metadata exists and stored commit hash differs from current HEAD.

- **TC-3.3a: Documentation is stale**
  - Given: `.doc-meta.json` has `commitHash: "abc123"`; repo HEAD is `"def456"`
  - When: Caller queries status
  - Then: `state` is `"stale"`; `lastGeneratedCommitHash` is `"abc123"`; `currentHeadCommitHash` is `"def456"`

**AC-3.4:** Status query returns `"invalid"` when metadata exists but its shape is malformed or required fields are missing.

- **TC-3.4a: Malformed metadata file**
  - Given: `.doc-meta.json` exists but is not valid JSON
  - When: Caller queries status
  - Then: `state` is `"invalid"`
- **TC-3.4b: Missing required fields**
  - Given: `.doc-meta.json` is valid JSON but missing `commitHash`
  - When: Caller queries status
  - Then: `state` is `"invalid"`

**AC-3.5:** Metadata write persists generation mode, ISO 8601 UTC timestamp, commit hash, output path, list of generated files, and component count to `.doc-meta.json`.

- **TC-3.5a: Write metadata for full generation mode**
  - Given: Caller provides a valid `GeneratedDocumentationMetadata` payload with `mode: "full"`
  - When: Engine writes metadata to the output directory
  - Then: `.doc-meta.json` contains `mode: "full"`, ISO 8601 `generatedAt`, `commitHash`, `outputPath`, populated `filesGenerated` array, and `componentCount`
- **TC-3.5b: Write metadata for update mode**
  - Given: Caller provides a valid `GeneratedDocumentationMetadata` payload with `mode: "update"`; a previous `.doc-meta.json` exists
  - When: Engine writes metadata to the output directory
  - Then: `.doc-meta.json` contains `mode: "update"` with the new commit hash and timestamp; previous metadata is replaced

**AC-3.6:** Metadata read returns the complete `GeneratedDocumentationMetadata` object or a structured error.

- **TC-3.6a: Successful read**
  - Given: Valid `.doc-meta.json` exists
  - When: Engine reads metadata
  - Then: Complete `GeneratedDocumentationMetadata` returned with all fields populated
- **TC-3.6b: Corrupted metadata**
  - Given: `.doc-meta.json` is corrupted or has an invalid shape
  - When: Engine reads metadata
  - Then: Structured error returned with code `METADATA_ERROR`; no silent fallback to default values

## Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Output directory doesn't exist | Status: `"not_generated"` (not an error) |
| `.doc-meta.json` is invalid JSON | Status: `"invalid"` (for status query); `METADATA_ERROR` (for readMetadata) |
| `.doc-meta.json` missing required fields | Status: `"invalid"` (for status query); `METADATA_ERROR` (for readMetadata) |

## Definition of Done

- [ ] All ACs met (AC-3.1 through AC-3.6)
- [ ] All TC conditions verified (TC-3.1a through TC-3.6b)
- [ ] `verify` script passes

---

# Story 5: Documentation Validation

## Objective

Callers can validate an existing documentation output directory and receive a
structured report of completeness, consistency, and quality issues. Validation
covers file presence, internal cross-links, metadata shape, module-tree
consistency, and basic Mermaid syntax. All checks run locally, no agent
involved.

## Scope

### In Scope

- `validateDocumentation()` SDK operation
- File presence checks (overview.md, module-tree.json, .doc-meta.json)
- Internal relative markdown link verification (narrow scope: generated pages only, no external URLs)
- Metadata shape validation (delegates to shared `validate-shape.ts` from Story 4)
- Module-tree ↔ page file consistency (structural files excluded from orphan check)
- Basic Mermaid syntax validation (regex-based: diagram type + bracket balance)
- Aggregate `ValidationResult` with status, counts, and findings
- Check gating: checks no-op when their target file is absent (no duplicate findings with file-presence check)

### Out of Scope

- Agent-driven validation repair (Epic 2)
- External URL validation

## Dependencies / Prerequisites

- Story 4 complete (shared metadata-shape validation utility)

## Acceptance Criteria

**AC-4.1:** Validation runs as a standalone operation and accepts an output directory path.

- **TC-4.1a: Valid output directory**
  - Given: Output directory contains valid generated documentation
  - When: Caller invokes validation
  - Then: `ValidationResult` returned with `status: "pass"`, zero errors, zero warnings
- **TC-4.1b: Nonexistent directory**
  - Given: Output path does not exist
  - When: Caller invokes validation
  - Then: `ValidationResult` returned with `status: "fail"` and a finding identifying the missing directory

**AC-4.2:** Missing expected files are reported individually with the missing file path.

- **TC-4.2a: Missing overview.md**
  - Given: Output directory exists but `overview.md` is missing
  - When: Validation runs
  - Then: Finding with `severity: "error"`, `category: "missing-file"`, identifying `overview.md`
- **TC-4.2b: Missing module-tree.json**
  - Given: Output directory exists but `module-tree.json` is missing
  - When: Validation runs
  - Then: Finding with `severity: "error"`, `category: "missing-file"`, identifying `module-tree.json`
- **TC-4.2c: Missing .doc-meta.json**
  - Given: Output directory exists but `.doc-meta.json` is missing
  - When: Validation runs
  - Then: Finding with `severity: "error"`, `category: "missing-file"`, identifying `.doc-meta.json`

**AC-4.3:** Internal relative markdown links between generated documentation pages are verified. Broken internal links are reported with source file and target path. External URLs are out of scope.

- **TC-4.3a: Valid cross-links**
  - Given: Page A links to Page B; both exist in the output directory
  - When: Validation runs
  - Then: No link-related findings
- **TC-4.3b: Broken cross-link**
  - Given: Page A contains a markdown link to `page-c.md`; `page-c.md` does not exist
  - When: Validation runs
  - Then: Finding with `severity: "error"`, `category: "broken-link"`, `filePath` identifying Page A, `target` identifying `page-c.md`

**AC-4.4:** Module-tree consistency is verified: every module in `module-tree.json` has a corresponding markdown page, and every markdown page that is not a known structural file (`overview.md`) has an entry in the module tree.

- **TC-4.4a: Consistent tree**
  - Given: `module-tree.json` references modules A, B, C; pages `a.md`, `b.md`, `c.md` exist; `overview.md` exists
  - When: Validation runs
  - Then: No module-tree findings (`overview.md` is excluded from orphan check)
- **TC-4.4b: Module in tree with no page**
  - Given: `module-tree.json` references module D; no corresponding `d.md` exists
  - When: Validation runs
  - Then: Finding with `severity: "error"`, `category: "module-tree"`, identifying module D
- **TC-4.4c: Module page exists but not in tree**
  - Given: `e.md` exists in the output directory; `module-tree.json` does not reference module E; `e.md` is not a known structural file
  - When: Validation runs
  - Then: Finding with `severity: "warning"`, `category: "module-tree"`, identifying orphaned page `e.md`
- **TC-4.4d: Structural files excluded from orphan check**
  - Given: `overview.md` exists in the output directory; `module-tree.json` does not reference it
  - When: Validation runs
  - Then: No orphan warning for `overview.md`

**AC-4.5:** Mermaid code blocks in documentation pages pass basic syntax validation.

- **TC-4.5a: Valid Mermaid block**
  - Given: A documentation page contains a well-formed Mermaid diagram
  - When: Validation runs
  - Then: No Mermaid-related findings for that page
- **TC-4.5b: Malformed Mermaid block**
  - Given: A documentation page contains a Mermaid block with syntax errors
  - When: Validation runs
  - Then: Finding with `severity: "warning"`, `category: "mermaid"`, identifying the page

**AC-4.6:** Validation returns a structured `ValidationResult` with overall status, counts, and individual findings.

- **TC-4.6a: Pass summary**
  - Given: All checks pass
  - When: Validation completes
  - Then: `status: "pass"`, `errorCount: 0`, `warningCount: 0`, empty `findings`
- **TC-4.6b: Warn summary**
  - Given: Warnings exist but no errors
  - When: Validation completes
  - Then: `status: "warn"`, `errorCount: 0`, `warningCount` matches warning count, `findings` lists each warning
- **TC-4.6c: Fail summary**
  - Given: At least one error exists
  - When: Validation completes
  - Then: `status: "fail"`, `errorCount` matches error count, `findings` lists all errors and warnings
- **TC-4.6d: Invalid metadata JSON contributes metadata finding**
  - Given: `.doc-meta.json` exists but is invalid JSON
  - When: Validation runs
  - Then: `findings` includes an entry with `severity: "error"`, `category: "metadata"`, and `filePath` identifying `.doc-meta.json`; `status` is `"fail"`
- **TC-4.6e: Metadata missing required fields contributes metadata finding**
  - Given: `.doc-meta.json` exists and is valid JSON but is missing required fields such as `commitHash`
  - When: Validation runs
  - Then: `findings` includes an entry with `severity: "error"`, `category: "metadata"`, and `filePath` identifying `.doc-meta.json`; `status` is `"fail"`

## Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Output directory doesn't exist | `status: "fail"` with finding identifying missing directory |
| `.doc-meta.json` missing | Finding: `severity: "error"`, `category: "missing-file"` (metadata-shape check no-ops) |
| `.doc-meta.json` invalid JSON | Finding: `severity: "error"`, `category: "metadata"`; `status: "fail"` |
| `.doc-meta.json` missing required fields | Finding: `severity: "error"`, `category: "metadata"`; `status: "fail"` |
| `module-tree.json` missing | Finding: `severity: "error"`, `category: "missing-file"` (module-tree check no-ops) |
| Broken internal link | Finding: `severity: "error"`, `category: "broken-link"` |
| Malformed Mermaid | Finding: `severity: "warning"`, `category: "mermaid"` |

## Definition of Done

- [ ] All ACs met (AC-4.1 through AC-4.6)
- [ ] All TC conditions verified (TC-4.1a through TC-4.6e)
- [ ] `verify` script passes

---

# Integration Path Trace

The epic describes five SDK operations. The primary integration path is a caller
using the full preflight → analysis → status check → validation sequence. Each
segment maps to exactly one story.

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Caller → `resolveConfiguration()` | Resolve merged config | Story 1 | TC-5.1a, TC-5.2a |
| Caller → `checkEnvironment()` | Verify runtime deps | Story 2 | TC-1.1a |
| `checkEnvironment()` → language detection | Detect repo languages | Story 2 | TC-1.3a |
| `checkEnvironment()` → parser checks | Verify parser availability | Story 2 | TC-1.2b |
| `checkEnvironment()` → git validation | Verify git repo | Story 2 | TC-1.4a |
| Caller → `analyzeRepository()` | Invoke analysis | Story 3 | TC-2.1a |
| `analyzeRepository()` → config resolution | Merge AnalysisOptions with config | Story 1 (resolution) / Story 3 (invocation) | TC-5.2c / TC-2.2a |
| `analyzeRepository()` → Python adapter | Subprocess invocation | Story 3 | TC-2.8a |
| Python adapter → normalizer | Raw output → engine types | Story 3 | TC-2.5a |
| `analyzeRepository()` → git adapter | Capture commit hash | Story 3 | TC-2.7a |
| Caller → `getDocumentationStatus()` | Query staleness | Story 4 | TC-3.2a |
| `getDocumentationStatus()` → metadata reader | Read .doc-meta.json | Story 4 | TC-3.6a |
| `getDocumentationStatus()` → git adapter | Get current HEAD | Story 4 | TC-3.3a |
| Caller → `writeMetadata()` | Persist metadata | Story 4 | TC-3.5a |
| Caller → `validateDocumentation()` | Validate output dir | Story 5 | TC-4.1a |
| `validateDocumentation()` → file-presence check | Check expected files | Story 5 | TC-4.2a |
| `validateDocumentation()` → cross-links check | Verify internal links | Story 5 | TC-4.3a |
| `validateDocumentation()` → metadata-shape check | Validate .doc-meta.json shape | Story 5 (check) / Story 4 (shared validate-shape) | TC-4.6d |
| `validateDocumentation()` → module-tree check | Tree ↔ page consistency | Story 5 | TC-4.4a |
| `validateDocumentation()` → mermaid check | Basic syntax validation | Story 5 | TC-4.5a |

**Shared boundary:** The `metadata/validate-shape.ts` utility is created in Story 4 and consumed by Story 5's validation check. This is the one cross-story seam. Story 4 owns the implementation; Story 5 depends on it via import.

**No gaps identified.** Every segment has a story owner and a relevant TC.

---

# Coverage Gate

| AC | TC | Story | Notes |
|----|-----|-------|-------|
| AC-1.1 | TC-1.1a | Story 2 | |
| AC-1.1 | TC-1.1b | Story 2 | |
| AC-1.2 | TC-1.2a | Story 2 | |
| AC-1.2 | TC-1.2b | Story 2 | |
| AC-1.2 | TC-1.2c | Story 2 | |
| AC-1.2 | TC-1.2d | Story 2 | |
| AC-1.3 | TC-1.3a | Story 2 | |
| AC-1.3 | TC-1.3b | Story 2 | |
| AC-1.4 | TC-1.4a | Story 2 | |
| AC-1.4 | TC-1.4b | Story 2 | |
| AC-1.4 | TC-1.4c | Story 2 | |
| AC-1.5 | TC-1.5a | Story 2 | |
| AC-1.5 | TC-1.5b | Story 2 | |
| AC-2.1 | TC-2.1a | Story 3 | |
| AC-2.1 | TC-2.1b | Story 3 | |
| AC-2.2 | TC-2.2a | Story 3 | |
| AC-2.2 | TC-2.2b | Story 3 | |
| AC-2.3 | TC-2.3a | Story 3 | |
| AC-2.3 | TC-2.3b | Story 3 | |
| AC-2.4 | TC-2.4a | Story 3 | |
| AC-2.4 | TC-2.4b | Story 3 | |
| AC-2.5 | TC-2.5a | Story 3 | |
| AC-2.5 | TC-2.5b | Story 3 | |
| AC-2.6 | TC-2.6a | Story 3 | |
| AC-2.6 | TC-2.6b | Story 3 | |
| AC-2.7 | TC-2.7a | Story 3 | |
| AC-2.8 | TC-2.8a | Story 3 | |
| AC-2.8 | TC-2.8b | Story 3 | |
| AC-2.8 | TC-2.8c | Story 3 | |
| AC-2.8 | TC-2.8d | Story 3 | |
| AC-3.1 | TC-3.1a | Story 4 | |
| AC-3.1 | TC-3.1b | Story 4 | |
| AC-3.2 | TC-3.2a | Story 4 | |
| AC-3.3 | TC-3.3a | Story 4 | |
| AC-3.4 | TC-3.4a | Story 4 | |
| AC-3.4 | TC-3.4b | Story 4 | |
| AC-3.5 | TC-3.5a | Story 4 | |
| AC-3.5 | TC-3.5b | Story 4 | |
| AC-3.6 | TC-3.6a | Story 4 | |
| AC-3.6 | TC-3.6b | Story 4 | |
| AC-4.1 | TC-4.1a | Story 5 | |
| AC-4.1 | TC-4.1b | Story 5 | |
| AC-4.2 | TC-4.2a | Story 5 | |
| AC-4.2 | TC-4.2b | Story 5 | |
| AC-4.2 | TC-4.2c | Story 5 | |
| AC-4.3 | TC-4.3a | Story 5 | |
| AC-4.3 | TC-4.3b | Story 5 | |
| AC-4.4 | TC-4.4a | Story 5 | |
| AC-4.4 | TC-4.4b | Story 5 | |
| AC-4.4 | TC-4.4c | Story 5 | |
| AC-4.4 | TC-4.4d | Story 5 | |
| AC-4.5 | TC-4.5a | Story 5 | |
| AC-4.5 | TC-4.5b | Story 5 | |
| AC-4.6 | TC-4.6a | Story 5 | |
| AC-4.6 | TC-4.6b | Story 5 | |
| AC-4.6 | TC-4.6c | Story 5 | |
| AC-4.6 | TC-4.6d | Story 5 | |
| AC-4.6 | TC-4.6e | Story 5 | |
| AC-5.1 | TC-5.1a | Story 1 | |
| AC-5.1 | TC-5.1b | Story 1 | |
| AC-5.2 | TC-5.2a | Story 1 | |
| AC-5.2 | TC-5.2b | Story 1 | |
| AC-5.2 | TC-5.2c | Story 1 | |
| AC-5.3 | TC-5.3a | Story 1 | |
| AC-5.3 | TC-5.3b | Story 1 | |
| AC-5.4 | TC-5.4a | Story 1 | |
| AC-5.4 | TC-5.4b | Story 1 | |
| AC-5.5 | TC-5.5a | Story 1 | |

**68 TCs across 30 ACs. All assigned to exactly one story. No gaps. No duplicates.**

---

# Validation Checklist

- [x] Every AC from the epic is assigned to a story
- [x] Every TC from the epic is assigned to exactly one story
- [x] Stories sequence logically (foundation → config → env checks → analysis → metadata → validation)
- [x] Each story has full Given/When/Then detail for all TCs
- [x] Integration path trace complete with no gaps
- [x] Coverage gate table complete
- [x] Error paths documented per story
- [x] Story 0 covers types, fixtures, error classes, project config
- [x] Each feature story is independently acceptable by a PO
- [ ] Tech Lead validates: can add technical sections to each story
