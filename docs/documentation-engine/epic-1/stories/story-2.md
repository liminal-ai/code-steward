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
