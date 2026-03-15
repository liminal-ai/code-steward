# Epic: CLI & Code Steward Integration

This epic defines the complete requirements for the Documentation Engine's CLI
surface, application integration contract, publish workflow, and test/eval
harness. It serves as the source of truth for the Tech Lead's design work.

---

## User Profile

**Primary User:** Code Steward server code consuming the SDK, CLI operator running documentation commands manually or from scripts, test/integration author verifying the engine outside the app, tech lead validating end-to-end documentation workflows
**Context:** Calling the engine through its public surfaces — either programmatically from Code Steward's server-side routes, via CLI for manual runs and debugging, or through test suites that exercise the full pipeline without the application runtime
**Mental Model:** "I call a command or import a function. I get structured data back — status, progress, results, errors. I don't need to know how the engine works internally. I need to know what I can ask it to do, what it gives back, and how to handle failures."
**Key Constraint:** The SDK is the primary product surface. The CLI is a thin wrapper. Code Steward consumes structured results, not terminal output. Publish is a separate operation from generation. The engine does not depend on SQLite or the Code Steward application runtime.

---

## Feature Overview

After this epic ships, the Documentation Engine can be:

- operated manually through a thin CLI that wraps every SDK operation
- integrated into Code Steward's server-side code through a stable import surface
- consumed by the Documentation tab for status display, progress rendering, and result persistence
- used to publish generated documentation back to the repo as a branch and optional PR
- verified end-to-end through CLI smoke tests and SDK integration tests against fixture repos

Epic 1 built the deterministic foundation. Epic 2 built the inference-driven
generation and update pipeline. This epic exposes those capabilities through
the surfaces that actual consumers use — the CLI, the app integration, and
the publish workflow — and ensures the engine is verifiable outside the
application.

---

## Scope

### In Scope

The consumer-facing integration layer for the Documentation Engine:

- Thin CLI commands wrapping each SDK operation via `citty`
- JSON and human-readable CLI output modes
- CLI configuration resolution from arguments, config file, and defaults
- Public SDK entry point re-exporting all consumer-facing operations and types
- Code Steward integration contract: status for tab render, progress for UI stages, results for SQLite persistence
- Publish workflow: branch creation, commit, push, optional PR via `gh` CLI
- CLI exit code semantics for scripting and automation
- Test/eval harness requirements for verifying the engine outside the app
- Failure surfacing and recovery feedback through all consumption paths

### Out of Scope

- Epic 1 deterministic foundation internals (environment checks, analysis adapter, metadata, validation)
- Epic 2 orchestration internals (clustering, module generation, quality review)
- Code Steward Documentation tab UI implementation (owned by the main Code Steward PRD)
- Code Steward SQLite schema design (owned by the main Code Steward PRD)
- GitHub Pages setup (deferred; caveated for enterprise compatibility)
- Documentation viewer or markdown rendering (owned by the main Code Steward PRD)
- Plugin ecosystem or extensibility surface
- Multi-repo publish operations
- Interactive CLI modes or prompts

### Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A11 | Epic 1 and Epic 2 SDK operations are available and working | Validated | This epic wraps them; does not reimplement |
| A12 | Code Steward server code can import the engine package directly as a dependency | Unvalidated | Monorepo or linked package; confirm during Tech Design |
| A13 | `gh` CLI is available on machines that need PR creation | Unvalidated | `gh` is already a Code Steward dependency; publish surfaces a structured error if missing |
| A14 | Git remote is configured and the user has push permissions for publish operations | Unvalidated | Publish checks and reports structured errors for missing remote or permission failures |
| A15 | The seven CLI commands defined in the technical architecture remain the right set | Validated | check, analyze, generate, update, validate, status, publish |

---

## Flows & Requirements

### 1. Thin CLI Command Surface

The CLI provides seven commands, each wrapping a single SDK operation. The
CLI's job is argument parsing, configuration loading, SDK invocation, and
output formatting. It does not contain orchestration logic, prompt logic, or
generation behavior.

Commands:

| Command | SDK Operation | Primary Argument | Purpose |
|---------|--------------|------------------|---------|
| `docs check` | `checkEnvironment()` | `--repo-path` (optional) | Verify environment readiness |
| `docs analyze` | `analyzeRepository()` | `--repo-path` | Run structural analysis |
| `docs generate` | `generateDocumentation({ mode: "full" })` | `--repo-path` | Full documentation generation |
| `docs update` | `generateDocumentation({ mode: "update" })` | `--repo-path` | Incremental update |
| `docs validate` | `validateDocumentation()` | `--output-path` | Validate existing output |
| `docs status` | `getDocumentationStatus()` | `--repo-path` | Query documentation state |
| `docs publish` | `publishDocumentation()` | `--repo-path` | Publish docs to repo |

`docs validate` is intentionally output-path-centric. It validates a
documentation output directory directly, not a repository. The operator
provides `--output-path` pointing to the directory containing generated docs
(e.g., `docs/wiki/`). This differs from most other commands which take
`--repo-path` and derive the output location from configuration. The
distinction exists because validation checks the output artifacts, not the
source repository — and the output directory may be inspected independently
of the repo that produced it.

1. Operator invokes a CLI command with arguments
2. CLI parses arguments and loads configuration
3. CLI calls the corresponding SDK operation
4. CLI formats the SDK result for output
5. CLI exits with an appropriate exit code

#### Acceptance Criteria

**AC-1.1:** CLI provides seven commands, each mapping to a single SDK operation.

- **TC-1.1a: Each command is invocable**
  - Given: CLI is built and available
  - When: Operator runs each of the seven commands with `--help`
  - Then: Each command responds with usage information; no command produces an "unknown command" error
- **TC-1.1b: Unknown command rejected**
  - Given: CLI is available
  - When: Operator runs `docs nonexistent`
  - Then: CLI outputs an error indicating the command is not recognized; exits with usage error code
- **TC-1.1c: No-argument invocation shows help**
  - Given: CLI is available
  - When: Operator runs `docs` with no subcommand
  - Then: CLI displays available commands and general usage

**AC-1.2:** Each command accepts arguments corresponding to its SDK operation's request type.

- **TC-1.2a: `generate` accepts repo path and output path**
  - Given: CLI is available
  - When: Operator runs `docs generate --repo-path ./my-repo --output-path docs/wiki`
  - Then: SDK receives `repoPath` and `outputPath` matching the provided values
- **TC-1.2b: `check` accepts optional repo path**
  - Given: CLI is available
  - When: Operator runs `docs check` without `--repo-path`
  - Then: SDK receives no `repoPath`; only runtime dependency checks run
- **TC-1.2c: Required argument missing produces error**
  - Given: CLI is available
  - When: Operator runs `docs generate` without `--repo-path`
  - Then: CLI outputs an error identifying the missing argument; exits with usage error code
- **TC-1.2d: `publish` accepts publish-specific arguments**
  - Given: CLI is available
  - When: Operator runs `docs publish --repo-path ./my-repo --branch-name docs/update --create-pr`
  - Then: SDK receives `branchName` and `createPullRequest: true` matching the provided values
- **TC-1.2e: Include/exclude/focus patterns accepted by `generate` and `update`**
  - Given: CLI is available
  - When: Operator runs `docs generate --repo-path ./my-repo --include "src/**" --exclude "**/*.test.ts" --focus src/core`
  - Then: SDK receives matching `includePatterns`, `excludePatterns`, and `focusDirs`

**AC-1.3:** CLI resolves configuration by merging command-line arguments (highest priority), config file, and built-in defaults (lowest priority) before invoking the SDK.

- **TC-1.3a: CLI argument overrides config file**
  - Given: Config file sets `outputPath: "docs/generated"`; operator provides `--output-path docs/custom`
  - When: CLI invokes the SDK
  - Then: SDK receives `outputPath: "docs/custom"`
- **TC-1.3b: Config file value used when CLI argument omitted**
  - Given: Config file sets `outputPath: "docs/generated"`; operator does not provide `--output-path`
  - When: CLI invokes the SDK
  - Then: SDK receives `outputPath: "docs/generated"`
- **TC-1.3c: Defaults apply when both config file and CLI arguments omitted**
  - Given: No config file exists; operator does not provide `--output-path`
  - When: CLI invokes the SDK
  - Then: SDK receives default output path (`"docs/wiki"`)

**AC-1.4:** CLI delegates entirely to SDK operations. The CLI produces the same result as calling the SDK directly with equivalent parameters.

- **TC-1.4a: CLI `generate` result matches direct SDK call**
  - Given: A repo path and configuration
  - When: Operator runs `docs generate --json` with those parameters AND a test calls `generateDocumentation()` directly with equivalent parameters
  - Then: The result payloads contain the same fields and values (modulo timestamps and run IDs)
- **TC-1.4b: CLI `status` result matches direct SDK call**
  - Given: A repo with existing documentation
  - When: Operator runs `docs status --json` AND a test calls `getDocumentationStatus()` directly
  - Then: Both return the same `state`, `lastGeneratedAt`, `lastGeneratedCommitHash`, and `currentHeadCommitHash`

---

### 2. CLI Output and Error Behavior

The CLI supports two output modes: JSON (for automation, testing, and
programmatic consumption) and human-readable (for manual operator use). Both
modes wrap SDK results consistently. Long-running commands display incremental
progress in human-readable mode.

#### Acceptance Criteria

**AC-2.1:** `--json` flag produces machine-readable JSON output wrapped in a `CliResultEnvelope`.

- **TC-2.1a: Successful result in JSON mode**
  - Given: Operator runs `docs status --json --repo-path ./my-repo`
  - When: SDK returns a successful `DocumentationStatus`
  - Then: stdout contains a valid JSON object with `success: true` and `result` containing the `DocumentationStatus` fields
- **TC-2.1b: Error result in JSON mode**
  - Given: Operator runs `docs generate --json --repo-path /nonexistent`
  - When: SDK returns a structured error
  - Then: stdout contains a valid JSON object with `success: false` and `error` containing `code` and `message`
- **TC-2.1c: JSON output is a single parseable object**
  - Given: Any command with `--json`
  - When: Command completes
  - Then: stdout contains exactly one JSON object; no interleaved log lines or progress text

**AC-2.2:** Default human-readable mode renders results in a scannable terminal format.

- **TC-2.2a: Status displayed readably**
  - Given: Operator runs `docs status --repo-path ./my-repo` without `--json`
  - When: Documentation exists and is current
  - Then: Output includes the status state, last generated date, and commit hash in a human-scannable format (not raw JSON)
- **TC-2.2b: Validation findings listed readably**
  - Given: Operator runs `docs validate --output-path ./my-repo/docs/wiki` without `--json`; validation finds 2 warnings
  - When: Command completes
  - Then: Each finding is printed on its own line with severity, category, and message

**AC-2.3:** Long-running commands (`generate`, `update`) display incremental progress in human-readable mode.

- **TC-2.3a: Stage transitions visible during generation**
  - Given: Operator runs `docs generate --repo-path ./my-repo` without `--json`
  - When: Generation progresses through stages
  - Then: Each stage name is printed as it begins (e.g., "Analyzing structure...", "Generating module: core...")
- **TC-2.3b: Module-level progress visible**
  - Given: A repo with multiple modules
  - When: Generation reaches the module generation stage
  - Then: Progress includes module name and completion count (e.g., "Generating module: core (2/5)")
- **TC-2.3c: JSON mode suppresses incremental progress**
  - Given: Operator runs `docs generate --json --repo-path ./my-repo`
  - When: Generation completes
  - Then: stdout contains only the final `CliResultEnvelope`; no intermediate progress lines

**AC-2.4:** CLI exit codes distinguish success, operational failure, and usage error.

- **TC-2.4a: Exit code 0 on success**
  - Given: Any command that completes successfully
  - When: Command finishes
  - Then: Process exits with code 0
- **TC-2.4b: Exit code 1 on operational failure**
  - Given: `docs generate` where the environment check fails
  - When: Engine returns a structured error
  - Then: Process exits with code 1
- **TC-2.4c: Exit code 2 on usage error**
  - Given: `docs generate` without required `--repo-path`
  - When: CLI detects missing argument
  - Then: Process exits with code 2
- **TC-2.4d: Exit code 1 when validation finds errors**
  - Given: `docs validate` against documentation with broken links
  - When: Validation result has `status: "fail"`
  - Then: Process exits with code 1

**AC-2.5:** Error output includes the error code, message, and relevant context.

- **TC-2.5a: Structured error rendered in human mode**
  - Given: Operator runs `docs check` and Python is missing
  - When: Engine returns `DEPENDENCY_MISSING` error
  - Then: Output includes the error code (`DEPENDENCY_MISSING`), the message, and identifies Python by name
- **TC-2.5b: Structured error in JSON mode**
  - Given: Operator runs `docs check --json` and Python is missing
  - When: Engine returns a structured error
  - Then: JSON envelope contains `error.code`, `error.message`, and `error.details` if present

---

### 3. Code Steward Integration Contract

Code Steward server code consumes the Documentation Engine as an imported
package. It calls SDK functions directly, receives typed results, and uses
those results to render the Documentation tab and persist state to SQLite.

The engine does not depend on Code Steward's runtime, database, or UI
framework. It returns structured data. Code Steward decides what to persist,
display, and act on.

#### Acceptance Criteria

**AC-3.1:** The SDK exposes a public entry point that re-exports all consumer-facing operations and types.

- **TC-3.1a: Operations importable**
  - Given: Code Steward server code imports from the engine package
  - When: Import statement runs
  - Then: `checkEnvironment`, `analyzeRepository`, `generateDocumentation`, `getDocumentationStatus`, `validateDocumentation`, and `publishDocumentation` are all available as named exports
- **TC-3.1b: Types importable**
  - Given: Code Steward server code imports types from the engine package
  - When: Import statement runs
  - Then: Consumer-facing type exports are available, including `EnvironmentCheckRequest`, `AnalysisOptions`, `DocumentationRunRequest`, `DocumentationRunResult`, `DocumentationProgressEvent`, `DocumentationStatusRequest`, `DocumentationStatus`, `ValidationRequest`, `ValidationResult`, `PublishRequest`, `PublishResult`, and `EngineError`

**AC-3.2:** Progress events from `generateDocumentation` and the `mode: "update"` path provide enough information for stage-aware UI rendering in the Documentation tab.

- **TC-3.2a: Each progress event identifies the current stage**
  - Given: Code Steward calls `generateDocumentation()` with a progress callback
  - When: Progress events arrive
  - Then: Each event has a `stage` field from the defined set of stages
- **TC-3.2b: Module-level progress includes name and completion count**
  - Given: A repo with 5 modules
  - When: Generation reaches the `generating-module` stage
  - Then: Progress events include `moduleName`, `completed`, and `total` fields
- **TC-3.2c: Final event signals completion or failure**
  - Given: Generation runs to completion or fails
  - When: Last progress event arrives
  - Then: Event stage is `"complete"` (success) or `"failed"` (failure)

**AC-3.3:** `getDocumentationStatus()` returns enough information for the Documentation tab's initial render state.

- **TC-3.3a: Not-generated state provides empty-state data**
  - Given: Repo has no generated documentation
  - When: Code Steward calls `getDocumentationStatus()`
  - Then: Result has `state: "not_generated"`, null timestamps and commit hashes, and the configured output path
- **TC-3.3b: Stale state provides comparison data**
  - Given: Documentation exists but is behind HEAD
  - When: Code Steward calls `getDocumentationStatus()`
  - Then: Result has `state: "stale"`, `lastGeneratedCommitHash`, and `currentHeadCommitHash` both populated
- **TC-3.3c: Current state provides generation metadata**
  - Given: Documentation is current
  - When: Code Steward calls `getDocumentationStatus()`
  - Then: Result has `state: "current"`, `lastGeneratedAt` with ISO 8601 timestamp, and matching commit hashes

Epic 1's status contract also includes `state: "invalid"` for malformed
metadata. Story 3 preserves that inherited state for consumers.

**AC-3.4:** `DocumentationRunResult` from generate/update provides all fields Code Steward needs to persist a documentation run to SQLite.

- **TC-3.4a: Successful result includes persistence-ready fields**
  - Given: Full generation completes
  - When: Code Steward inspects the result
  - Then: `mode`, `commitHash`, `durationSeconds`, `costUsd`, `generatedFiles`, `warnings`, and `validationResult` are all present and typed
- **TC-3.4b: Failed result includes diagnostic fields**
  - Given: Generation fails at the analysis stage
  - When: Code Steward inspects the result
  - Then: `success: false`, `failedStage`, `error.code`, and `error.message` are present; Code Steward can persist the failure state
- **TC-3.4c: Cost is null when unavailable**
  - Given: Agent SDK does not provide token usage for a run
  - When: Code Steward reads `costUsd`
  - Then: Value is `null`, not `0` or `undefined`

**AC-3.5:** The engine communicates exclusively through return values and callback parameters. Code Steward never needs to parse console output, read side-effect files, or inspect stderr to determine operation results.

- **TC-3.5a: Status available without reading filesystem**
  - Given: Code Steward calls `getDocumentationStatus()`
  - When: Call returns
  - Then: All status information is in the return value; Code Steward does not need to read `.doc-meta.json` directly
- **TC-3.5b: Generation result available without reading output directory**
  - Given: Code Steward calls `generateDocumentation()`
  - When: Call returns
  - Then: Generated file list, validation result, and metadata are all in the return value; Code Steward does not need to scan the output directory

---

### 4. Publish Flow

After documentation is generated or updated, the operator or Code Steward can
publish it back to the repository. Publish is a separate operation from
generation — it operates on whatever documentation currently exists in the
output directory.

The publish flow creates a branch, stages documentation files, commits, pushes
to the remote, and optionally opens a pull request via the GitHub CLI.

Publish preserves the caller's current branch context. After publish
completes (or fails), the repo's checked-out branch is the same branch the
caller was on before publish started. Publish does not leave the repo switched
to the docs branch. The mechanism for achieving this (worktree, detached
checkout and restore, or equivalent) is a Tech Design decision; the
user-visible guarantee is that the caller's working state is not disturbed.

1. Caller invokes publish with a repo path and publish options
2. Engine verifies documentation output exists and has valid metadata
3. Engine verifies git remote is configured
4. Engine creates a new branch from the detected default branch (or specified base)
5. Engine stages all files in the documentation output directory
6. Engine creates a commit with a descriptive message
7. Engine pushes the branch to the remote
8. Engine restores the caller's original branch context
9. If PR creation requested: engine invokes `gh pr create`
10. Engine returns a structured `PublishResult`

#### Acceptance Criteria

**AC-4.1:** Publish is a standalone SDK operation that does not trigger generation or update.

- **TC-4.1a: Publish without prior generation**
  - Given: Output directory has no documentation (status: `not_generated`)
  - When: Caller invokes `publishDocumentation()`
  - Then: Structured error returned with code `PUBLISH_ERROR`; message indicates no documentation to publish; no generation runs
- **TC-4.1b: Publish after generation**
  - Given: Documentation was previously generated successfully
  - When: Caller invokes `publishDocumentation()`
  - Then: Publish proceeds using existing output; no generation or update runs

**AC-4.2:** Publish creates a branch, commits documentation files, pushes to the remote, and optionally opens a PR.

- **TC-4.2a: Full publish with PR**
  - Given: Valid documentation output exists; `createPullRequest: true`
  - When: Caller invokes publish
  - Then: Branch created, docs committed, branch pushed, PR opened; `PublishResult` contains branch name, commit hash, and PR URL
- **TC-4.2b: Publish without PR**
  - Given: Valid documentation output exists; `createPullRequest: false`
  - When: Caller invokes publish
  - Then: Branch created, docs committed, branch pushed; `PublishResult` has `pullRequestUrl: null` and `pullRequestNumber: null`
- **TC-4.2c: Custom branch name used**
  - Given: Caller provides `branchName: "docs/my-update"`
  - When: Publish runs
  - Then: Branch name in the result is `"docs/my-update"`
- **TC-4.2d: Auto-generated branch name when not provided**
  - Given: Caller does not provide `branchName`
  - When: Publish runs
  - Then: Branch name follows a convention (e.g., `docs/update-{timestamp}`)
- **TC-4.2e: Branch name collision**
  - Given: Caller provides `branchName: "docs/my-update"`; that branch already exists locally or on the remote
  - When: Publish runs
  - Then: Structured error with code `PUBLISH_ERROR`; message indicates the branch already exists

**AC-4.3:** Publish verifies that documentation output exists and has valid metadata before proceeding.

- **TC-4.3a: No output directory**
  - Given: Output path does not exist
  - When: Caller invokes publish
  - Then: Structured error with code `PUBLISH_ERROR`; no branch created
- **TC-4.3b: Invalid metadata**
  - Given: Output directory exists but `.doc-meta.json` is malformed
  - When: Caller invokes publish
  - Then: Structured error with code `PUBLISH_ERROR`; message indicates invalid metadata
- **TC-4.3c: Valid output proceeds**
  - Given: Output directory has valid metadata and documentation files
  - When: Publish preflight checks run
  - Then: No errors; publish proceeds to branch creation

**AC-4.4:** Publish returns a structured `PublishResult` with branch, commit, file, and PR information.

- **TC-4.4a: All fields populated on success with PR**
  - Given: Publish completes with PR creation
  - When: Caller inspects result
  - Then: `branchName`, `commitHash`, `pushedToRemote: true`, `pullRequestUrl` (non-null), `pullRequestNumber` (non-null), and `filesCommitted` (non-empty) are all present
- **TC-4.4b: PR fields null when PR not created**
  - Given: Publish completes without PR creation
  - When: Caller inspects result
  - Then: `pullRequestUrl` is `null`; `pullRequestNumber` is `null`; all other fields populated

**AC-4.5:** Publish does not modify files outside the documentation output directory or mutate unrelated branches.

- **TC-4.5a: Caller's branch context preserved**
  - Given: Repo is on branch `main` with a clean or dirty working tree
  - When: Publish completes (success or failure)
  - Then: Repo's checked-out branch is still `main`; working tree state is unchanged; the docs branch exists as a separate ref
- **TC-4.5b: Only documentation files committed**
  - Given: Repo has uncommitted changes outside the output directory
  - When: Publish commits documentation
  - Then: Commit contains only files from the documentation output directory; uncommitted changes to other files remain uncommitted

**AC-4.6:** PR creation requires `gh` CLI availability. Missing `gh` when PR is requested produces a structured error. Push-only publish (without PR) does not require `gh`.

- **TC-4.6a: PR requested without `gh` CLI**
  - Given: `createPullRequest: true`; `gh` CLI is not available
  - When: Caller invokes publish
  - Then: Structured error with code `PUBLISH_ERROR`; message identifies `gh` as required for PR creation
- **TC-4.6b: Push-only publish without `gh` CLI**
  - Given: `createPullRequest: false`; `gh` CLI is not available
  - When: Caller invokes publish
  - Then: Publish completes; branch created, committed, and pushed; no error

**AC-4.7:** Publish fails with a structured error when git remote is not configured or push is rejected.

- **TC-4.7a: No remote configured**
  - Given: Repo has no remote configured
  - When: Caller invokes publish
  - Then: Structured error with code `PUBLISH_ERROR`; message indicates no remote
- **TC-4.7b: Push rejected**
  - Given: Remote is configured but push is rejected (e.g., permission denied)
  - When: Push step executes
  - Then: Structured error with code `PUBLISH_ERROR`; message includes the rejection reason from git

---

### 5. Test & Eval Harness

The engine must be verifiable outside the full Code Steward application. CLI
commands can exercise the engine against fixture repos for manual verification.
SDK operations are callable from test suites without the application runtime.
Output structure is stable enough for regression detection.

The harness is not a test runner — it is the set of capabilities and fixtures
that make the engine testable by test authors and verifiable by tech leads.

#### Acceptance Criteria

**AC-5.1:** CLI commands are exercisable against fixture repos for manual verification.

- **TC-5.1a: `status` against fixture repo**
  - Given: A fixture TypeScript repo with no generated documentation
  - When: Operator runs `docs status --json --repo-path <fixture-path>`
  - Then: Valid JSON returned with `state: "not_generated"`
- **TC-5.1b: `check` against fixture repo**
  - Given: A fixture TypeScript repo with all dependencies available
  - When: Operator runs `docs check --json --repo-path <fixture-path>`
  - Then: Valid JSON returned with `passed: true`
- **TC-5.1c: `validate` against fixture output**
  - Given: A valid fixture documentation output directory
  - When: Operator runs `docs validate --json --output-path <fixture-output-path>`
  - Then: Valid JSON returned with `status: "pass"`

**AC-5.2:** SDK operations are callable in test suites without the Code Steward application runtime.

- **TC-5.2a: All operations importable from package entry point**
  - Given: A standalone test file that imports the engine package
  - When: Import executes
  - Then: All six SDK operations (`checkEnvironment`, `analyzeRepository`, `generateDocumentation`, `getDocumentationStatus`, `validateDocumentation`, `publishDocumentation`) are available
- **TC-5.2b: Operations callable without application context**
  - Given: A test script with no Code Steward application running
  - When: Test calls `getDocumentationStatus()` with a fixture repo path
  - Then: Operation returns a valid result; no dependency on application server, database, or UI

**AC-5.3:** At least one TypeScript fixture repo supports full end-to-end verification of the generate-validate-publish pipeline.

- **TC-5.3a: Fixture repo has known component structure**
  - Given: The TypeScript fixture repo
  - When: Analysis runs
  - Then: Results match expected component count, language, and relationship structure
- **TC-5.3b: End-to-end generation produces expected output structure**
  - Given: The TypeScript fixture repo
  - When: Full generation runs against the fixture
  - Then: Output directory contains `overview.md`, `module-tree.json`, `.doc-meta.json`, `.module-plan.json`, and at least one module page

**AC-5.4:** Generated output structure is deterministic for the same repo state and configuration. File list and module tree are stable across runs.

- **TC-5.4a: File list deterministic**
  - Given: Same fixture repo at the same commit with the same configuration
  - When: Full generation runs twice
  - Then: Both runs produce the same set of output file names (prose content may vary due to inference)
- **TC-5.4b: Module tree structure deterministic**
  - Given: Same fixture repo at the same commit with the same configuration
  - When: Full generation runs twice
  - Then: Both `module-tree.json` files contain the same module entries (names and page fields)

---

### 6. Failure, Recovery, and Operator Feedback

Engine failures surface consistently through all consumption paths. Failed
operations provide enough diagnostic information for the operator or Code
Steward to determine what happened, what state the output is in, and what to
do next.

#### Acceptance Criteria

**AC-6.1:** Engine failures surface consistently whether consumed through CLI or SDK. Both paths produce the same error code and message for the same failure.

- **TC-6.1a: SDK error and CLI error match**
  - Given: A repo path that does not exist
  - When: Code Steward calls `generateDocumentation()` AND operator runs `docs generate --json --repo-path /nonexistent`
  - Then: Both return `error.code: "PATH_ERROR"` with equivalent error messages
- **TC-6.1b: CLI exit code reflects SDK error**
  - Given: An environment check fails
  - When: Operator runs `docs check --repo-path ./my-repo`
  - Then: CLI prints the error information and exits with code 1

**AC-6.2:** Failed operations report which stage failed and provide actionable guidance for recovery.

- **TC-6.2a: Failed stage identified**
  - Given: Generation fails during the analysis stage
  - When: Caller inspects the error
  - Then: `failedStage` is `"analyzing-structure"`; error code is `ANALYSIS_ERROR`
- **TC-6.2b: Missing dependency includes install guidance**
  - Given: Python is not installed
  - When: Operator runs `docs check`
  - Then: Error message identifies Python and indicates it is required for structural analysis
- **TC-6.2c: Update-mode failure suggests recovery path**
  - Given: Update fails because the persisted module plan is missing
  - When: Caller inspects the error
  - Then: Error code is `METADATA_ERROR`; message recommends running full generation to create a new module plan

**AC-6.3:** After a failed generation or update, the output directory state is inspectable so the caller can determine the appropriate recovery action.

- **TC-6.3a: Failed generation leaves no metadata**
  - Given: Generation fails at the module generation stage
  - When: Caller checks the output directory
  - Then: `.doc-meta.json` does not exist (or retains prior valid metadata if update mode); partial module files may exist on disk
- **TC-6.3b: Prior valid state preserved on update failure**
  - Given: Update mode fails after some modules are regenerated
  - When: Caller queries `getDocumentationStatus()`
  - Then: Status reflects the prior generation's metadata (commit hash and timestamp), not the failed update; `state` may be `"stale"` relative to HEAD
- **TC-6.3c: Status query after failure returns actionable state**
  - Given: Generation has never succeeded for this repo
  - When: Caller queries `getDocumentationStatus()` after a failed generation attempt
  - Then: `state` is `"not_generated"`; caller knows to retry full generation

---

## Data Contracts

### CliResultEnvelope

Wraps any SDK result for CLI JSON output. Used by all commands in `--json`
mode.

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
```

### PublishRequest

```typescript
interface PublishRequest {
  repoPath: string;
  outputPath?: string;          // defaults from resolved config
  branchName?: string;          // auto-generated if not provided
  commitMessage?: string;       // auto-generated if not provided
  createPullRequest?: boolean;  // defaults to true
  prTitle?: string;             // auto-generated if not provided
  prBody?: string;              // auto-generated if not provided
  baseBranch?: string;          // defaults to repo's default branch
}
```

### PublishResult

```typescript
interface PublishResult {
  branchName: string;
  commitHash: string;
  pushedToRemote: boolean;
  pullRequestUrl: string | null;
  pullRequestNumber: number | null;
  filesCommitted: string[];
}
```

### CLI Exit Codes

| Code | Meaning | When |
|------|---------|------|
| 0 | Success | Operation completed without errors |
| 1 | Operational failure | Engine error (dependency missing, analysis failed, publish failed, validation errors) |
| 2 | Usage error | Bad arguments, unknown command, invalid CLI input |

### Extended Error Code

Epic 3 adds one error code to the existing `EngineErrorCode` union:

| Code | Description |
|------|-------------|
| `PUBLISH_ERROR` | Publish operation failed — no documentation to publish, no remote configured, push rejected, PR creation failed, or `gh` CLI missing when PR requested |

```typescript
// Extends the EngineErrorCode union from Epic 1
type EngineErrorCode =
  | "ENVIRONMENT_ERROR"
  | "DEPENDENCY_MISSING"
  | "ANALYSIS_ERROR"
  | "METADATA_ERROR"
  | "VALIDATION_ERROR"
  | "CONFIGURATION_ERROR"
  | "PATH_ERROR"
  | "ORCHESTRATION_ERROR"
  | "PUBLISH_ERROR";
```

### Public SDK Entry Point

The package entry point re-exports all consumer-facing operations and types.
This is the integration surface for Code Steward and test authors.

```typescript
// Operations
export {
  checkEnvironment,
} from "./environment/check.js";
export {
  analyzeRepository,
} from "./analysis/analyze.js";
export {
  generateDocumentation,
} from "./orchestration/generate.js";
export {
  getDocumentationStatus,
} from "./metadata/status.js";
export {
  validateDocumentation,
} from "./validation/validate.js";
export {
  publishDocumentation,
} from "./publish/publish.js";

// Types
export type {
  // Epic 1
  EnvironmentCheckResult,
  RepositoryAnalysis,
  DocumentationStatus,
  ValidationResult,
  ResolvedConfiguration,
  GeneratedDocumentationMetadata,
  EngineError,
  EngineErrorCode,
  // Epic 2
  DocumentationRunRequest,
  DocumentationRunResult,
  DocumentationProgressEvent,
  ModulePlan,
  // Epic 3
  PublishRequest,
  PublishResult,
  CliResultEnvelope,
} from "./types/index.js";
```

### Referenced Contracts from Prior Epics

The following contracts are defined in earlier epics and used by Epic 3
without modification:

- `DocumentationRunRequest`, `DocumentationRunResult`, `DocumentationProgressEvent` (Epic 2)
- `DocumentationStatus`, `EnvironmentCheckResult`, `ValidationResult` (Epic 1)
- `GeneratedDocumentationMetadata`, `EngineError` (Epic 1)

---

## Dependencies

Technical dependencies:

- Epic 1 SDK operations: `checkEnvironment`, `analyzeRepository`, `getDocumentationStatus`, `validateDocumentation`, metadata read/write
- Epic 2 SDK operations: `generateDocumentation` (full and update modes), progress events, run result contracts
- Git CLI (for publish branch/commit/push operations)
- GitHub CLI `gh` (for PR creation in publish flow; optional when `createPullRequest: false`)
- `citty` (CLI argument parsing)
- `zod` (runtime validation of publish request/result)

Process dependencies:

- Epic 1 and Epic 2 must be complete before Epic 3 implementation begins
- Code Steward monorepo structure must support importing the engine package from server-side routes

---

## Non-Functional Requirements

### Performance
- CLI commands that wrap non-long-running SDK operations (`check`, `status`, `validate`) complete in under 3 seconds including CLI startup overhead
- CLI startup (argument parsing, config loading) adds less than 500ms before SDK invocation begins
- Progress events are forwarded to CLI output within 100ms of emission from the SDK

### Reliability
- CLI never swallows SDK errors; every SDK error surfaces through the CLI output and exit code
- Publish operations are atomic at the branch level: if push fails, the local branch still exists for retry; if PR creation fails, the pushed branch is not rolled back

### Testability
- CLI is testable by invoking the built binary with arguments and asserting on stdout/stderr and exit code
- SDK integration tests can run in CI without the Code Steward application server

### Operability
- `--json` output is stable enough for scripting; field additions are non-breaking
- CLI help text documents every command and its accepted arguments

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. Should the CLI binary be a separate package entry point (`bin` field in `package.json`) or a script that imports the SDK? What is the build and invocation path for `tsc`-compiled CLI code?
2. How should the CLI handle progress rendering in human-readable mode — inline updates (clearing lines), sequential log lines, or a simple spinner? What terminal capabilities can be assumed?
3. Should `publishDocumentation` be implemented in a `publish/` adapter module (wrapping git and gh CLI calls) or in the `sdk/` layer directly? Where does the git subprocess orchestration live?
4. For the package entry point, should all types be re-exported from a single `index.ts`, or should consumers import from subpaths (e.g., `documentation-engine/types`)? What does the `exports` field in `package.json` look like?
5. How should the CLI handle `--config` path resolution relative to the current working directory vs. the repo path?
6. Should publish auto-detect the default branch (via `git remote show origin`) or require explicit `baseBranch`? What is the fallback when remote metadata is unavailable?
7. How should the CLI handle long-running commands being interrupted (Ctrl+C) — should it attempt cleanup of partial state, or exit immediately?
8. Which test fixtures from Epics 1 and 2 can be reused for CLI smoke tests, and what new fixtures are needed for publish flow testing?

---

## Recommended Story Breakdown

### Story 0: Foundation (Infrastructure)

CLI package structure, `citty` setup, `CliResultEnvelope` type,
`PublishRequest`/`PublishResult` types, `PUBLISH_ERROR` error code, package
entry point with re-exports, CLI build configuration, test fixture
scaffolding for CLI and publish tests.

### Story 1: CLI Command Shell

**Delivers:** All seven CLI commands are invocable with argument parsing, config loading, help text, and exit codes. Commands delegate to SDK operations and produce equivalent results. JSON and human-readable output modes work for all non-progress commands (progress rendering is Story 2).
**Prerequisite:** Story 0
**ACs covered:**
- AC-1.1 (seven commands)
- AC-1.2 (argument parsing)
- AC-1.3 (config resolution)
- AC-1.4 (CLI-vs-SDK parity)
- AC-2.1 (JSON output mode)
- AC-2.2 (human-readable output)
- AC-2.4 (exit codes)
- AC-2.5 (error rendering)

**Boundary note:** This story proves the CLI shell is a correct, thin pass-through for all commands including `generate` and `update`. It does NOT implement incremental progress rendering for long-running commands — those commands return a final result but do not display stage-by-stage output until Story 2.

**Estimated test count:** 28 tests

### Story 2: CLI Progress Rendering

**Delivers:** `generate` and `update` CLI commands render incremental progress to the terminal in human-readable mode. JSON mode suppresses all intermediate output.
**Prerequisite:** Story 1
**ACs covered:**
- AC-2.3 (incremental progress display, JSON suppression)

**Boundary note:** This story owns only the CLI-side rendering of progress events — subscribing to the SDK's progress callback and printing stage transitions and module-level counts to the terminal. The SDK's progress event contract itself (what events exist, what fields they carry) is defined in Epic 2 and verified from the consumer perspective in Story 3. Story 2 does not test that the SDK emits correct events; it tests that the CLI renders whatever events it receives.

**Estimated test count:** 6 tests

### Story 3: Public SDK Integration Contract

**Delivers:** Public SDK entry point re-exports all operations and types. Integration tests verify the contract from Code Steward's perspective: status for tab render, progress events for UI stages, run results for SQLite persistence, and structured-data-only communication.
**Prerequisite:** Story 0 (types), Epic 2 complete (SDK operations)
**ACs covered:**
- AC-3.1 (public entry point and type exports)
- AC-3.2 (progress events carry enough information for stage-aware UI)
- AC-3.3 (status for tab render)
- AC-3.4 (result for SQLite persistence)
- AC-3.5 (structured data only, no console/file parsing)

**Boundary note:** This story owns the SDK-side integration surface — what Code Steward can import, what typed data it receives, and whether that data is sufficient for its UI and persistence needs. It does NOT own CLI rendering (Story 1 and Story 2) or the internal implementation of SDK operations (Epics 1 and 2). AC-3.2 tests that progress events carry the right fields for UI rendering; Story 2's AC-2.3 tests that the CLI prints those events to the terminal.

**Estimated test count:** 14 tests

### Story 4: Publish Flow

**Delivers:** `publishDocumentation()` SDK operation and `docs publish` CLI command. Creates branch, commits docs, pushes, optionally opens PR. Returns structured `PublishResult`.
**Prerequisite:** Story 0 (publish types/contracts), Story 1 (CLI shell), Story 3 (SDK entry point)
**ACs covered:**
- AC-4.1 (standalone publish)
- AC-4.2 (branch/commit/push/PR)
- AC-4.3 (output verification)
- AC-4.4 (structured result)
- AC-4.5 (no unrelated mutations)
- AC-4.6 (`gh` CLI dependency)
- AC-4.7 (remote/push errors)

**Estimated test count:** 23 tests

### Story 5: Test & Eval Harness

**Delivers:** CLI smoke test suite against fixture repos, SDK integration test suite runnable without the app, deterministic output verification for regression detection, and full pipeline sign-off by reusing Story 4 publish coverage.
**Prerequisite:** Story 1, Story 2, Story 3, Story 4
**ACs covered:**
- AC-5.1 (CLI fixture tests)
- AC-5.2 (SDK standalone tests)
- AC-5.3 (TypeScript fixture repo)
- AC-5.4 (deterministic output)

**Estimated test count:** 10 tests

### Story 6: Failure, Recovery, and Operator Feedback

**Delivers:** Consistent error surfacing across CLI and SDK paths. Actionable diagnostics for all failure modes. Output directory state inspectable after failures.
**Prerequisite:** Story 1, Story 3, Story 4
**ACs covered:**
- AC-6.1 (consistent error surfacing)
- AC-6.2 (actionable diagnostics)
- AC-6.3 (inspectable state after failure)

**Estimated test count:** 10 tests

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
- [x] Stories sequence logically (foundation → shell → progress → integration → publish → harness → failure)
- [x] All review issues addressed (round 1: self-review fixes; round 2: tightened Story 2/3 boundaries, clarified publish branch preservation, made validate output-path-centric explicit)
- [x] Validation rounds complete (2 rounds)
- [x] Self-review complete
