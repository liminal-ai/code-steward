# Epic: Foundation & Analysis Runtime

This epic defines the complete requirements for the Documentation Engine's
foundational runtime layer. It serves as the source of truth for the Tech
Lead's design work.

---

## User Profile

**Primary User:** Code Steward server code, CLI operator, or test author consuming the Documentation Engine SDK
**Context:** Calling SDK operations to check environment readiness, analyze a repository's structure, query documentation status, validate existing documentation output, or resolve configuration — before any inference-driven generation occurs
**Mental Model:** "I call a function, pass it a repo path and options, and get back a typed result I can act on. If something is missing or broken, the result tells me exactly what and why."
**Key Constraint:** Runs locally on the same machine as Code Steward. No network access required for core operations (environment checks, analysis, metadata, validation). The analysis adapter depends on Python being available locally.

---

## Feature Overview

After this epic ships, the Documentation Engine can:

- verify that a local environment has the prerequisites for documentation generation
- run structural analysis on a repository to extract components and their relationships
- read and write documentation metadata to track generation state and staleness
- validate an existing documentation output directory for completeness and consistency
- resolve configuration from multiple sources with deterministic priority ordering

No inference-driven generation or update workflows are included — those are Epic 2.

Every SDK operation accepts explicit typed inputs and returns structured typed
results. Operational failures are typed and machine-readable. Check operations
return structured results with explicit findings or summary fields rather than
console-oriented message lists. The caller never needs to parse console output
or infer state from side effects.

---

## Scope

### In Scope

The deterministic runtime foundation for the Documentation Engine:

- Environment and dependency preflight checks
- Structural repository analysis via an adapter that normalizes output into engine-native contracts
- Documentation metadata read/write and staleness status queries
- Deterministic validation of documentation output directories
- Configuration resolution from built-in defaults, config files, and caller-provided options
- Typed error model for all failure cases
- SDK surface exposing all operations as importable functions

### Out of Scope

- Claude Agent SDK orchestration for clustering, generation, or updates (Epic 2)
- CLI surface wrapping the SDK (Epic 3)
- Code Steward app integration and SQLite persistence (Epic 3)
- Publish workflow — branch, commit, push, PR (Epic 3)
- Documentation viewer or rendering (main Code Steward PRD, Epic 3)
- Progress event emission during long-running workflows (Epic 2)

### Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A1 | Python 3.11+ is available on machines that need structural analysis | Unvalidated | Engine reports missing Python as a structured error; does not install it |
| A2 | CodeWiki-derived analysis scripts can be bundled and invoked as a subprocess | Unvalidated | V1 wraps proven analysis rather than rebuilding in TypeScript |
| A3 | Tree-sitter parsers for TypeScript and JavaScript are the minimum required set | Unvalidated | Other languages are supported but TS/JS is the quality bar |
| A4 | Git is available and the target directory is a valid git repository | Unvalidated | Engine checks for this and reports structured errors if missing |
| A5 | Documentation output follows the `docs/wiki/` convention with `overview.md`, `module-tree.json`, and `.doc-meta.json` | Validated | Defined in technical architecture |

---

## Flows & Requirements

### 1. Environment & Dependency Check

The engine verifies that the local environment can execute documentation
workflows. This check runs independently of any generation or analysis
operation.

The check distinguishes two categories of dependencies:

- **Runtime dependencies** — Python, Git, bundled analysis scripts. Checked in
  all modes (with or without a repo path).
- **Repo-language parser dependencies** — Tree-sitter grammars for specific
  languages (TypeScript, JavaScript, Python, etc.). Checked only when a repo
  path is provided, scoped to the languages detected in that repo.

When no repo path is provided, only runtime dependencies are checked.
`detectedLanguages` is empty and no parser-related findings are produced.

1. Caller invokes environment check, optionally providing a repo path
2. Engine checks runtime dependencies (Python, Git, analysis scripts)
3. If repo path provided: engine detects languages in the repo and checks parser availability per detected language
4. If repo path provided: engine verifies the path is a valid git repository
5. Engine returns a structured result with derived boolean `passed`, detected languages, and typed findings

#### Acceptance Criteria

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

---

### 2. Structural Analysis

The engine invokes the analysis adapter to extract components, relationships,
languages, and scoping metadata from a repository. The raw adapter output is
normalized into stable engine-native contracts so downstream consumers
(Epic 2's orchestration layer) do not depend on raw script output.

1. Caller invokes analysis with a repo path and optional include/exclude/focus options
2. Engine invokes the analysis adapter
3. Engine normalizes raw output into engine contracts
4. Engine returns a `RepositoryAnalysis` result

#### Acceptance Criteria

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

---

### 3. Metadata & Status

The engine reads and writes repo-local documentation metadata (stored in the
output directory) and reports documentation status. Status is derived from
metadata presence and commit hash comparison — no network access or agent
invocation required.

1. Caller invokes status check with repo path and output path
2. Engine looks for metadata file in the output directory
3. If metadata exists, engine compares stored commit hash to current HEAD
4. Engine returns a structured `DocumentationStatus`

#### Acceptance Criteria

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
  - Then: Structured error returned; no silent fallback to default values

---

### 4. Validation

The engine validates a documentation output directory deterministically,
without invoking any agent. Validation covers file presence, cross-link
integrity, metadata shape, module-tree consistency, update-readiness artifacts,
and basic Mermaid syntax checks. All checks are local — no network access
required.

1. Caller invokes validation with an output directory path
2. Engine checks for expected files (`overview.md`, `module-tree.json`, `.doc-meta.json`, `.module-plan.json`)
3. Engine verifies cross-links between documentation pages
4. Engine validates metadata shape when `.doc-meta.json` exists
5. Engine checks module-tree consistency against actual pages
6. Engine runs Mermaid syntax sanity checks on code blocks
7. Engine returns a structured `ValidationResult`

#### Acceptance Criteria

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
- **TC-4.2d: Missing .module-plan.json**
  - Given: Output directory exists but `.module-plan.json` is missing
  - When: Validation runs
  - Then: Finding with `severity: "error"`, `category: "missing-file"`, identifying `.module-plan.json`

**AC-4.3:** Internal relative markdown links between generated documentation pages are verified. Broken internal links are reported with source file and target path. External URLs are out of scope for this validation flow.

- **TC-4.3a: Valid cross-links**
  - Given: Page A links to Page B; both exist in the output directory
  - When: Validation runs
  - Then: No link-related findings
- **TC-4.3b: Broken cross-link**
  - Given: Page A contains a markdown link to `page-c.md`; `page-c.md` does not exist
  - When: Validation runs
  - Then: Finding with `severity: "error"`, `category: "broken-link"`, `filePath` identifying Page A, `target` identifying `page-c.md`

**AC-4.4:** Module-tree consistency is verified: every module in `module-tree.json` has a corresponding markdown page, and every markdown page in the output directory that is not a known structural file (`overview.md`) has an entry in the module tree.

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

---

### 5. Configuration

The engine resolves configuration from three levels in priority order:
caller-provided options (highest), engine config file, and built-in defaults
(lowest). Caller-facing operation inputs are partial. The engine merges them
with config-file values and defaults to produce a fully populated
`ResolvedConfiguration` before any operation executes. Invalid configuration
produces a structured error, not a silent fallback.

1. Caller invokes an operation with explicit options (or no options)
2. Engine checks for caller-provided configuration
3. Engine checks for an engine config file (`.docengine.json`) in the repo root
4. Engine applies built-in defaults for any unset values
5. Resolved configuration is used for the operation

#### Acceptance Criteria

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
  - Then: Structured error identifying `outputPath` as invalid with reason
- **TC-5.4b: Invalid pattern syntax**
  - Given: Caller provides `includePatterns: ["[invalid"]` (malformed glob)
  - When: Engine attempts to resolve configuration
  - Then: Structured error identifying the invalid pattern

**AC-5.5:** Resolved configuration is accessible as a typed `ResolvedConfiguration` object with all fields populated.

- **TC-5.5a: Complete resolution**
  - Given: Configuration resolved from a mix of caller options, config file, and defaults
  - When: Caller accesses the resolved configuration
  - Then: `ResolvedConfiguration` object has all fields populated with their resolved values; no fields are undefined

---

## Data Contracts

### EnvironmentCheckResult

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
```

### RepositoryAnalysis

```typescript
interface RepositoryAnalysis {
  repoPath: string;
  commitHash: string;
  summary: AnalysisSummary;
  components: Record<string, AnalyzedComponent>;  // keyed by file path
  relationships: AnalyzedRelationship[];
  focusDirs: string[];
}

interface AnalysisSummary {
  totalFilesAnalyzed: number;
  totalComponents: number;
  totalRelationships: number;
  languagesFound: string[];
  languagesSkipped: string[];
}

interface AnalyzedComponent {
  filePath: string;
  language: string;
  exportedSymbols: ExportedSymbol[];
  linesOfCode: number;
}

interface ExportedSymbol {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "variable" | "enum" | "constant" | "other";
  lineNumber: number;
}

interface AnalyzedRelationship {
  source: string;       // file path of the source component
  target: string;       // file path of the target component
  type: "import" | "inheritance" | "implementation" | "composition" | "usage";
}
```

### DocumentationStatus

```typescript
interface DocumentationStatus {
  state: "not_generated" | "current" | "stale" | "invalid";
  outputPath: string;
  lastGeneratedAt: string | null;       // ISO 8601 UTC
  lastGeneratedCommitHash: string | null;
  currentHeadCommitHash: string | null;
}
```

### GeneratedDocumentationMetadata

```typescript
interface GeneratedDocumentationMetadata {
  generatedAt: string;       // ISO 8601 UTC
  commitHash: string;
  outputPath: string;
  filesGenerated: string[];
  componentCount: number;
  mode: "full" | "update";
}
```

### ModuleTree

```typescript
interface ModuleTreeEntry {
  name: string;
  page: string;              // filename of the corresponding markdown page
  children?: ModuleTreeEntry[];
}

// module-tree.json is an array of top-level ModuleTreeEntry objects
type ModuleTree = ModuleTreeEntry[];
```

### ValidationResult

```typescript
interface ValidationResult {
  status: "pass" | "warn" | "fail";
  errorCount: number;
  warningCount: number;
  findings: ValidationFinding[];
}

interface ValidationFinding {
  severity: "error" | "warning";
  category: "missing-file" | "broken-link" | "metadata" | "module-tree" | "mermaid";
  message: string;
  filePath?: string;       // source file where the issue was found
  target?: string;         // target reference that failed (e.g., broken link destination)
}
```

### ResolvedConfiguration

```typescript
interface ResolvedConfiguration {
  outputPath: string;
  includePatterns: string[];
  excludePatterns: string[];
  focusDirs: string[];
}
```

### AnalysisOptions

```typescript
// Caller-facing partial input. The engine merges this with config-file values
// and built-in defaults to produce ResolvedConfiguration before execution.
interface AnalysisOptions {
  repoPath: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  focusDirs?: string[];
}
```

### Operation Requests

```typescript
interface EnvironmentCheckRequest {
  repoPath?: string;
}

interface DocumentationStatusRequest {
  repoPath: string;
  outputPath?: string;
}

interface ValidationRequest {
  outputPath: string;
}

interface MetadataWriteRequest {
  outputPath: string;
  metadata: GeneratedDocumentationMetadata;
}
```

### Error Types

The SDK uses typed error results. Each error includes a machine-readable code
and a human-readable message. Callers match on `code` to determine handling;
`message` is for logging and display.

| Code | Description |
|------|-------------|
| `ENVIRONMENT_ERROR` | General environment problem (e.g., git not initialized, unsupported OS) |
| `DEPENDENCY_MISSING` | A specific named dependency is not installed (Python, a parser, Git) |
| `ANALYSIS_ERROR` | Structural analysis adapter failed or returned invalid output |
| `METADATA_ERROR` | Documentation metadata is missing, corrupted, or has an invalid shape |
| `VALIDATION_ERROR` | Validation operation itself failed to execute (distinct from validation findings) |
| `CONFIGURATION_ERROR` | Configuration value is invalid or unresolvable |
| `PATH_ERROR` | Specified file or directory path does not exist or is not accessible |

```typescript
type EngineErrorCode =
  | "ENVIRONMENT_ERROR"
  | "DEPENDENCY_MISSING"
  | "ANALYSIS_ERROR"
  | "METADATA_ERROR"
  | "VALIDATION_ERROR"
  | "CONFIGURATION_ERROR"
  | "PATH_ERROR";

interface EngineError {
  code: EngineErrorCode;
  message: string;
  details?: unknown;
}
```

---

## Dependencies

Technical dependencies:

- Node 24 LTS runtime
- Python 3.11+ (for structural analysis adapter)
- Tree-sitter parsers for target languages (TypeScript/JavaScript at minimum)
- Git (for commit hash retrieval and repository validation)

Process dependencies:

- CodeWiki-derived analysis scripts must be extracted, bundled, and verified as invocable before Story 3 (Structural Analysis)

---

## Non-Functional Requirements

### Performance
- Environment check and status query complete in under 2 seconds for repos up to 50,000 files
- Normalization of analysis results into engine types adds less than 1 second of overhead beyond the analysis adapter's own execution time

### Reliability
- Analysis failures are structured and machine-readable; no untyped exceptions propagate to the caller
- Validation runs entirely offline with no network access

### Testability
- Every SDK operation is independently testable with fixture repos
- No operation depends on agent availability or API keys

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. How much normalization should happen immediately in the analysis adapter versus preserving raw analysis output for debugging? Should the raw output be accessible alongside the normalized result?
2. Should v1 metadata remain `.doc-meta.json` and `module-tree.json`, or should the file naming convention be revisited?
3. What is the minimum Mermaid validation that provides value without excessive complexity? Regex-based syntax checks, a parsing library, or something else?
4. Where should the engine config file live? Repo root (e.g., `.docengine.json`), a standard XDG config location, or both with a search order?
5. Should `AnalyzedComponent` include internal (non-exported) symbols, or only exports? Internal symbols add noise but may improve clustering quality in Epic 2.
6. How should the adapter handle repos with mixed workspace/monorepo layouts — analyze each package independently or as a single unit?

---

## Recommended Story Breakdown

### Story 0: Foundation (Infrastructure)

Types, error classes, `EngineError` structure, `ResolvedConfiguration` type,
test fixture scaffolding (small TypeScript fixture repo with known structure),
package skeleton, `tsconfig.json`, development scripts.

### Story 1: Configuration

**Delivers:** Callers can resolve configuration from defaults, config files, and explicit options with correct priority ordering and validation.
**Prerequisite:** Story 0
**ACs covered:**
- AC-5.1 (built-in defaults)
- AC-5.2 (caller-provided override priority)
- AC-5.3 (config file resolution)
- AC-5.4 (invalid configuration errors)
- AC-5.5 (typed resolved configuration)

**Estimated test count:** 12 tests

### Story 2: Environment & Dependency Checks

**Delivers:** Callers can verify that the local environment is ready for documentation workflows, with structured reporting of what's available and what's missing.
**Prerequisite:** Story 0
**ACs covered:**
- AC-1.1 (standalone check with structured result)
- AC-1.2 (named dependency identification)
- AC-1.3 (repo-aware language detection)
- AC-1.4 (git repository verification)
- AC-1.5 (warning vs error severity)

**Estimated test count:** 15 tests

### Story 3: Structural Analysis

**Delivers:** Callers can analyze a repository and receive normalized component/relationship data in engine-native types.
**Prerequisite:** Stories 1 and 2 (configuration resolution and environment checks)
**ACs covered:**
- AC-2.1 (basic analysis and normalized result)
- AC-2.2 (include pattern filtering)
- AC-2.3 (exclude pattern filtering)
- AC-2.4 (focus directory preservation)
- AC-2.5 (component structure shape)
- AC-2.6 (relationship structure shape)
- AC-2.7 (commit hash capture)
- AC-2.8 (structured error on failure)

**Estimated test count:** 20 tests

### Story 4: Metadata & Status

**Delivers:** Callers can read/write documentation metadata and query staleness status without running generation.
**Prerequisite:** Story 1 (configuration provides resolved output path for metadata location)
**ACs covered:**
- AC-3.1 (not_generated status)
- AC-3.2 (current status)
- AC-3.3 (stale status)
- AC-3.4 (invalid status)
- AC-3.5 (metadata write)
- AC-3.6 (metadata read)

**Estimated test count:** 13 tests

### Story 5: Validation

**Delivers:** Callers can validate an existing documentation output directory and receive a structured report of issues.
**Prerequisite:** Story 4 (shared metadata-shape validation utility is used by validation)
**ACs covered:**
- AC-4.1 (standalone validation)
- AC-4.2 (missing file detection)
- AC-4.3 (cross-link verification)
- AC-4.4 (module-tree consistency)
- AC-4.5 (Mermaid syntax checks)
- AC-4.6 (structured validation result)

**Estimated test count:** 22 tests

---

## Validation Checklist

- [x] User Profile has all four fields + Feature Overview
- [x] Flows cover all paths (happy, alternate, error)
- [x] Every AC is testable (no vague terms)
- [x] Every AC has at least one TC
- [x] TCs cover happy path, edge cases, and errors
- [x] Data contracts are fully typed
- [x] Scope boundaries are explicit (in/out/assumptions)
- [x] Story breakdown covers all ACs
- [x] Stories sequence logically (foundation → configuration → checks → analysis → metadata → validation)
- [x] All validator issues addressed (round 1: self-review fixes; round 2: external verifier fixes)
- [x] Validation rounds complete (2 rounds)
- [x] Self-review complete
