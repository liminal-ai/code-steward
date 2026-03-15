# Stories: CLI & Code Steward Integration

Functional story sharding for Epic 3. These stories carry full acceptance
criteria with Given/When/Then detail so the PO can accept from the story alone.
The Tech Lead adds technical implementation sections during Story Technical
Enrichment.

---

## Tech Design Validation

Before sharding, validated the tech design is shard-ready:

- [x] Interfaces clear enough to identify logical AC groupings
- [x] TC-to-test mapping complete (91 tests across 7 chunks)
- [x] Logical AC groupings identifiable — CLI shell, progress rendering, SDK contract, publish, test harness, and failure/recovery each form coherent scopes
- [x] Dependency chains traceable — foundation → shell + contract + publish → progress → harness → failure/recovery
- [x] Story 2 / Story 3 ownership boundary clear: Story 2 owns CLI-side rendering of progress events; Story 3 owns verifying SDK progress events carry enough data for UI
- [x] Publish stays isolated from generate/update — separate SDK operation, separate story
- [x] Test/eval harness story is a real integration deliverable (fixtures, smoke tests, determinism verification), not "write tests"

No issues found. Proceeding with sharding.

---

## Related Documents

- [Epic](epic.md)
- [Tech Design](tech-design.md)
- [Test Plan](test-plan.md)

## Story Index

- [Story 0: Foundation / Package Wiring / Shared Types / Fixture Scaffolding](stories/story-0.md)
- [Story 1: CLI Command Shell + Output Modes + Exit Codes](stories/story-1.md)
- [Story 2: CLI Progress Rendering](stories/story-2.md)
- [Story 3: Public SDK Integration Contract](stories/story-3.md)
- [Story 4: Publish Flow](stories/story-4.md)
- [Story 5: Test & Eval Harness](stories/story-5.md)
- [Story 6: Failure, Recovery, and Operator Feedback](stories/story-6.md)

## Story 0: Foundation / Package Wiring / Shared Types / Fixture Scaffolding

### Objective

Establish the shared types, zod contracts, test fixtures, CLI build
configuration, and test helpers that all subsequent Epic 3 stories build on.
After this story, every Epic 3 type compiles, the CLI binary is buildable (even
if commands are stubs), publish fixtures are scaffolded, and the CLI test runner
helper is available for downstream story tests.

### Scope

#### In Scope

- `CliResultEnvelope<T>` type and `CliExitCode` type (`types/cli.ts`)
- `PublishRequest` and `PublishResult` types (`types/publish.ts`)
- `PUBLISH_ERROR` added to `EngineErrorCode` union
- Zod schemas for publish request and result (`contracts/publish.ts`)
- Exit code constants (`EXIT_SUCCESS`, `EXIT_OPERATIONAL_FAILURE`, `EXIT_USAGE_ERROR`, `EXIT_SIGINT`) in `cli/exit-codes.ts`
- `package.json` updates: `bin` field mapping `docs` to `./dist/cli.js`, `exports` field with single entry point
- Types re-export updates in `src/types/index.ts` for Epic 3 types
- CLI test runner helper (`test/helpers/cli-runner.ts`): `runCli()` and `runCliJson()` subprocess helpers
- Publish test fixture helpers (`test/helpers/publish-fixtures.ts`): `createMockGitForPublish()`, `createMockGh()`, `createPublishTestEnv()`
- Pre-built publish fixture directory (`test/fixtures/publish/valid-output-for-publish/`) with `overview.md`, module pages, `module-tree.json`, `.doc-meta.json`, and `.module-plan.json`

#### Out of Scope

- CLI command implementations (Story 1)
- Progress rendering (Story 2)
- SDK entry point re-exports of operations (Story 3)
- Publish orchestration logic (Story 4)
- Integration tests (Stories 5, 6)

### Dependencies / Prerequisites

- Epic 1 and Epic 2 complete — types, error model, SDK operations, and test infrastructure in place

### Exit Criteria

- [ ] All Epic 3 type definitions compile (`tsc` clean)
- [ ] `CliResultEnvelope`, `PublishRequest`, `PublishResult` importable from `types/`
- [ ] `PUBLISH_ERROR` is a valid `EngineErrorCode`
- [ ] Zod schemas parse valid and reject invalid publish request/result shapes
- [ ] `package.json` has `bin` and `exports` fields
- [ ] `runCli()` helper invokes `dist/cli.js` as subprocess and captures stdout, stderr, exit code
- [ ] Publish mock helpers (`createMockGitForPublish`, `createMockGh`) return properly shaped mocks
- [ ] Publish fixture directory contains valid doc output with valid metadata
- [ ] Biome lint passes on all new files

---

## Story 1: CLI Command Shell + Output Modes + Exit Codes

### Objective

All seven CLI commands are invocable with argument parsing, configuration
loading, help text, JSON and human-readable output modes, and exit codes.
Commands delegate entirely to SDK operations and produce equivalent results.
After this story, an operator can run any `docs` command, get structured or
readable output, and receive appropriate exit codes for success, failure, and
usage errors.

This story does NOT implement incremental progress rendering for long-running
commands (`generate`, `update`) — those commands invoke the SDK and return a
final result, but do not display stage-by-stage progress until Story 2.

### Scope

#### In Scope

- `cli.ts` main entrypoint with `citty` and seven subcommands
- All seven command modules (`commands/check.ts`, `commands/analyze.ts`, `commands/generate.ts`, `commands/update.ts`, `commands/validate.ts`, `commands/status.ts`, `commands/publish.ts`)
- CLI argument parsing for each command's parameters
- `validate` command is output-path-centric (`--output-path`), not repo-path-centric
- Config merger (`cli/config-merger.ts`): merge CLI args, `--config` file (resolved relative to CWD), and defaults
- Output formatters (`cli/output.ts`): JSON mode (`CliResultEnvelope`), human-readable mode for status, validation, run results, publish results, errors
- Exit code mapping (`cli/exit-codes.ts` `mapToExitCode()`): 0 for success, 1 for operational failure, 2 for usage error
- No-argument invocation shows help
- Unknown command produces error with exit code 2
- `--help` works for every command
- Error rendering: human mode prints code + message + details to stderr; JSON mode includes error in envelope
- CLI-to-SDK parity: `--json` output matches direct SDK call results

#### Out of Scope

- Incremental progress rendering for `generate`/`update` (Story 2)
- SDK entry point re-export changes (Story 3)
- Publish SDK operation implementation (Story 4 — the CLI `publish` command delegates to the SDK, which returns a structured not-yet-implemented error until Story 4)
- SIGINT handler (Story 2)

### Dependencies / Prerequisites

- Story 0 complete — types, exit codes, CLI test runner, package configuration

### Acceptance Criteria

**AC-1.1:** CLI provides seven commands, each mapping to a single SDK operation.

- **TC-1.1a: Each command is invocable**
  - Given: CLI is built and available
  - When: Operator runs each of the seven commands with `--help`
  - Then: Each command responds with usage information; no command produces an "unknown command" error
- **TC-1.1b: Unknown command rejected**
  - Given: CLI is available
  - When: Operator runs `docs nonexistent`
  - Then: CLI outputs an error indicating the command is not recognized; exits with code 2
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
  - Then: CLI outputs an error identifying the missing argument; exits with code 2
- **TC-1.2d: `publish` accepts publish-specific arguments**
  - Given: CLI is available
  - When: Operator runs `docs publish --repo-path ./my-repo --branch-name docs/update --create-pr`
  - Then: SDK receives `branchName` and `createPullRequest: true` matching the provided values
- **TC-1.2e: Include/exclude/focus patterns accepted by `generate` and `update`**
  - Given: CLI is available
  - When: Operator runs `docs generate --repo-path ./my-repo --include "src/**" --exclude "**/*.test.ts" --focus src/core`
  - Then: SDK receives matching `includePatterns`, `excludePatterns`, and `focusDirs`

**AC-1.3:** CLI resolves configuration by merging command-line arguments (highest priority), config file, and built-in defaults (lowest priority).

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

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Unknown command | Error message + exit code 2 |
| Missing required argument | Error message identifying the argument + exit code 2 |
| SDK returns operational error | Error rendered (human or JSON) + exit code 1 |
| Validation finds errors | Findings rendered + exit code 1 |
| Config file not found at `--config` path | Error message + exit code 1 |
| Config file contains invalid JSON | Error message + exit code 1 |

### Definition of Done

- [ ] All AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-2.1, AC-2.2, AC-2.4, AC-2.5 TCs verified
- [ ] Every command accepts `--help` and produces usage text
- [ ] JSON mode produces a single parseable `CliResultEnvelope` for every command
- [ ] Human mode produces scannable text for every command
- [ ] Exit codes are correct for all three categories (0, 1, 2)
- [ ] PO accepts

**Estimated test count:** 28 tests (24 TC + 4 non-TC)

---

## Story 2: CLI Progress Rendering

### Objective

`generate` and `update` CLI commands render incremental progress to the terminal
in human-readable mode. Each stage transition prints a sequential line to stderr.
Module-level progress includes module name and completion count. JSON mode
suppresses all intermediate output — stdout contains only the final result.
After this story, an operator running `docs generate` sees real-time stage
progression.

### Scope

#### In Scope

- Progress renderer (`cli/progress.ts`): subscribes to SDK `onProgress` callback, writes sequential lines to stderr
- Stage transition display (e.g., "Analyzing structure...", "Generating module: core (2/5)")
- JSON mode suppression — no stderr output when `--json` is active
- SIGINT handler: sets cancellation flag, waits for current SDK operation, exits with code 130
- Forward-compatible default case for unknown stage names
- Integration of progress callback into `commands/generate.ts` and `commands/update.ts`

#### Out of Scope

- SDK progress event shape definition (owned by Epic 2)
- Verifying that SDK emits correct progress events (Story 3 verifies this from the consumer perspective)
- CLI commands other than `generate` and `update` (already complete in Story 1)
- Publish flow (Story 4)

### Dependencies / Prerequisites

- Story 1 complete — CLI command shell with `generate` and `update` commands working (final result mode)

### Acceptance Criteria

**AC-2.3:** Long-running commands (`generate`, `update`) display incremental progress in human-readable mode.

- **TC-2.3a: Stage transitions visible during generation**
  - Given: Operator runs `docs generate --repo-path ./my-repo` without `--json`
  - When: Generation progresses through stages
  - Then: Each stage name is printed to stderr as it begins (e.g., "Analyzing structure...", "Generating module: core...")
- **TC-2.3b: Module-level progress visible**
  - Given: A repo with multiple modules
  - When: Generation reaches the module generation stage
  - Then: Progress includes module name and completion count (e.g., "Generating module: core (2/5)")
- **TC-2.3c: JSON mode suppresses incremental progress**
  - Given: Operator runs `docs generate --json --repo-path ./my-repo`
  - When: Generation completes
  - Then: stdout contains only the final `CliResultEnvelope`; stderr is empty

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Unknown stage name in progress event | Logged as raw stage name; no crash |
| Empty `moduleName` in `generating-module` event | Handled gracefully; line still prints |
| Ctrl+C during generation | Current SDK operation completes; CLI exits with code 130 |

### Definition of Done

- [ ] All AC-2.3 TCs verified
- [ ] Progress lines appear on stderr, not stdout
- [ ] JSON mode produces clean stdout with no interleaved stderr
- [ ] SIGINT exits with code 130 after current operation completes
- [ ] Unknown stage names do not crash the renderer
- [ ] PO accepts

**Estimated test count:** 6 tests (3 TC + 3 non-TC)

---

## Story 3: Public SDK Integration Contract

### Objective

The Documentation Engine's public SDK entry point re-exports all consumer-facing
operations and types. Integration tests verify the contract from Code Steward's
perspective: status provides enough data for tab render, progress events carry
enough information for stage-aware UI, run results contain all fields needed for
SQLite persistence, and the engine communicates exclusively through return values.
After this story, Code Steward can import the engine and integrate without
needing to inspect console output, side-effect files, or stderr.

### Scope

#### In Scope

- `src/index.ts` updated to re-export all six SDK operations and all consumer-facing types (Epic 1, 2, and 3)
- `src/types/index.ts` updated to re-export Epic 3 types alongside Epic 1/2 types
- Integration tests verifying: operations importable, types importable, progress events carry stage/module/count fields, status returns empty-state/stale/current data, run results carry persistence-ready fields, failed results carry diagnostic fields, cost is `null` when unavailable
- Verification that all information is in return values (no filesystem reads, no console parsing needed by consumers)

#### Out of Scope

- CLI rendering of progress events (Story 2 — Story 3 verifies the SDK emits the right data; Story 2 verifies the CLI renders it)
- CLI command implementations (Story 1)
- Publish SDK operation implementation (Story 4)
- Implementation of SDK operations themselves (Epic 1 and 2)

### Dependencies / Prerequisites

- Story 0 complete — Epic 3 types defined and exportable
- Epic 2 complete — SDK operations and progress events implemented

### Acceptance Criteria

**AC-3.1:** The SDK exposes a public entry point that re-exports all consumer-facing operations and types.

- **TC-3.1a: Operations importable**
  - Given: Code Steward server code imports from the engine package
  - When: Import statement runs
  - Then: `checkEnvironment`, `analyzeRepository`, `generateDocumentation`, `getDocumentationStatus`, `validateDocumentation`, and `publishDocumentation` are all available as named exports
- **TC-3.1b: Types importable**
  - Given: Code Steward server code imports types from the engine package
  - When: Import statement runs
  - Then: Consumer-facing type exports are available, including `EnvironmentCheckRequest`, `AnalysisOptions`, `DocumentationRunRequest`, `DocumentationRunResult`, `DocumentationProgressEvent`, `DocumentationStatusRequest`, `DocumentationStatus`, `ValidationRequest`, `ValidationResult`, `PublishRequest`, `PublishResult`, and `EngineError`

**AC-3.2:** Progress events from `generateDocumentation` and the `mode: "update"` path provide enough information for stage-aware UI rendering.

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

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Import of nonexistent operation from package | TypeScript compilation error (compile-time check) |
| SDK operation fails | `EngineError` with `code`, `message`, and `failedStage` in result — no stderr parsing |

### Definition of Done

- [ ] All AC-3.1 through AC-3.5 TCs verified
- [ ] All six operations importable from single entry point
- [ ] All consumer-facing types importable from single entry point
- [ ] Package entry point does not leak internal modules (orchestration/, adapters/)
- [ ] PO accepts

**Estimated test count:** 14 tests (13 TC + 1 non-TC)

---

## Story 4: Publish Flow

### Objective

The `publishDocumentation()` SDK operation and `docs publish` CLI command are
fully functional. After this story, a caller can publish generated documentation
to a repository by creating a branch, committing doc files, pushing to the
remote, and optionally opening a pull request. The caller's current branch
context is preserved throughout via the git worktree mechanism. Publish is
standalone — it does not trigger generation or update.

### Scope

#### In Scope

- `publishDocumentation()` orchestrator (`publish/publish.ts`)
- Preflight checks (`publish/preflight.ts`): output directory exists, `.doc-meta.json` valid, git remote configured, branch name not already taken
- Branch manager (`publish/branch-manager.ts`): worktree creation, branch checkout, doc file copy, stage, commit, push, worktree cleanup
- PR creator (`publish/pr-creator.ts`): `gh pr create` invocation, PR URL and number parsing
- Base branch detector (`publish/base-branch-detector.ts`): `symbolic-ref` → `main` → `master` fallback, explicit override
- GitHub CLI adapter (`adapters/gh.ts`): `isGhAvailable()`, `createPullRequest()`
- Git adapter extensions (`adapters/git.ts`): `createWorktree()`, `removeWorktree()`, `createBranch()`, `stageFiles()`, `commit()`, `pushBranch()`, `getRemoteUrl()`, `branchExists()`, `getDefaultBranch()`
- Auto-generated branch name (`docs/update-<timestamp>`) when not provided
- Auto-generated commit message when not provided
- Structured `PublishResult` with all fields
- Re-export of `publishDocumentation` from `src/index.ts` (coordinate with Story 3)

#### Out of Scope

- Generation or update triggering from publish (explicitly excluded — publish operates on existing output)
- CLI progress rendering for publish (publish is fast enough to not need stage progress)
- GitHub Pages setup
- Multi-repo publish

### Dependencies / Prerequisites

- Story 0 complete — publish types, zod contracts, mock helpers, fixtures
- Story 1 complete — CLI command shell including `docs publish` argument parsing
- Story 3 complete — SDK entry point re-exports (so `publishDocumentation` can be added to the export surface)

### Acceptance Criteria

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
  - Then: Branch name follows the `docs/update-<timestamp>` convention
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

**AC-4.6:** PR creation requires `gh` CLI availability. Missing `gh` when PR is requested produces a structured error. Push-only publish does not require `gh`.

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

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| No documentation to publish | `PUBLISH_ERROR` — no branch created |
| No remote configured | `PUBLISH_ERROR` — no branch created |
| Branch already exists | `PUBLISH_ERROR` — no worktree created |
| Invalid metadata | `PUBLISH_ERROR` — no branch created |
| Push rejected | `PUBLISH_ERROR` — local branch exists for retry |
| PR creation fails | `PUBLISH_ERROR` — branch pushed but no PR; caller can retry PR |
| Worktree cleanup fails | Warning (non-fatal) — publish result still succeeds |
| `gh` CLI missing when PR requested | `PUBLISH_ERROR` identifying `gh` as required |

### Definition of Done

- [ ] All AC-4.1 through AC-4.7 TCs verified
- [ ] Worktree mechanism preserves caller's branch context
- [ ] Worktree is cleaned up on both success and failure
- [ ] Publish result contains all specified fields
- [ ] Auto-generated branch names follow convention
- [ ] Base branch detection works via symbolic-ref with main/master fallback
- [ ] PO accepts

**Estimated test count:** 23 tests (18 TC + 5 non-TC)

---

## Story 5: Test & Eval Harness

### Objective

The engine is verifiable outside the Code Steward application. CLI commands
are exercisable against fixture repos for manual verification. SDK operations
are callable from standalone test suites without the application runtime.
Generated output structure is stable enough for regression detection. After this
story, a tech lead can verify the fixture-backed generate/validate side of the
pipeline without Code Steward running and rely on Story 4's local bare-remote
coverage for the publish leg.

This story is a real integration and verification deliverable — it produces
executable test suites and fixture infrastructure that prove the engine works
end-to-end, not just "write tests for existing code." The publish leg of the
overall pipeline is reused from Story 4's local bare-remote coverage rather
than duplicated here.

### Scope

#### In Scope

- CLI smoke test suite (`test/cli/smoke.test.ts`): `status`, `check`, `validate` against fixture repos, producing valid JSON output
- SDK standalone test suite additions (`test/integration/sdk-contract.test.ts`): all six operations importable and callable without application context
- End-to-end generation test (`test/integration/e2e.test.ts`): full generation against TypeScript fixture repo produces expected output structure (`overview.md`, `module-tree.json`, `.doc-meta.json`, `.module-plan.json`, module pages)
- Determinism tests (`test/integration/determinism.test.ts`): same fixture + same config + mocked Agent SDK produces identical file list and module tree across two runs
- TypeScript fixture repo verification: confirm fixture repo has known component structure for analysis assertions

#### Out of Scope

- Creating new fixture repos (reuse Epic 1/2 fixtures)
- Testing failure scenarios (Story 6)
- Testing publish flow (already tested in Story 4)
- Testing CLI progress rendering (already tested in Story 2)

### Dependencies / Prerequisites

- Story 1 complete — CLI command shell for smoke tests
- Story 2 complete — CLI surface finalized before harness sign-off
- Story 3 complete — SDK entry point for standalone import tests
- Story 4 complete — publish coverage reused for full pipeline sign-off

### Acceptance Criteria

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
  - Then: All six SDK operations are available as named exports
- **TC-5.2b: Operations callable without application context**
  - Given: A test script with no Code Steward application running
  - When: Test calls `getDocumentationStatus()` with a fixture repo path
  - Then: Operation returns a valid result; no dependency on application server, database, or UI

**AC-5.3:** At least one TypeScript fixture repo supports full end-to-end verification of the generate-validate-publish pipeline.

Story 5 covers the fixture, generation, and determinism side of that pipeline.
The publish leg is exercised through Story 4's local bare-remote publish tests
so the full flow is covered without duplicating publish-specific cases here.

- **TC-5.3a: Fixture repo has known component structure**
  - Given: The TypeScript fixture repo
  - When: Analysis runs
  - Then: Results match expected component count, language, and relationship structure
- **TC-5.3b: End-to-end generation produces expected output structure**
  - Given: The TypeScript fixture repo
  - When: Full generation runs against the fixture
  - Then: Output directory contains `overview.md`, `module-tree.json`, `.doc-meta.json`, `.module-plan.json`, and at least one module page

**AC-5.4:** Generated output structure is deterministic for the same repo state and configuration.

- **TC-5.4a: File list deterministic**
  - Given: Same fixture repo at the same commit with the same configuration
  - When: Full generation runs twice
  - Then: Both runs produce the same set of output file names (prose content may vary due to inference)
- **TC-5.4b: Module tree structure deterministic**
  - Given: Same fixture repo at the same commit with the same configuration
  - When: Full generation runs twice
  - Then: Both `module-tree.json` files contain the same module entries (names and page fields)

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Fixture repo missing | Test setup fails with clear message (test infrastructure, not product error) |
| CLI binary not built before tests | Test setup fails — `dist/cli.js` not found |

### Definition of Done

- [ ] All AC-5.1 through AC-5.4 TCs verified
- [ ] CLI smoke tests pass against fixture repos
- [ ] SDK operations callable from standalone test files
- [ ] E2E generation produces expected output structure
- [ ] Determinism verified across two identical runs
- [ ] PO accepts

**Estimated test count:** 10 tests (9 TC + 1 non-TC)

---

## Story 6: Failure, Recovery, and Operator Feedback

### Objective

Engine failures surface consistently through all consumption paths — CLI and
SDK produce the same error code and message for the same failure. Failed
operations report which stage failed and provide actionable guidance for
recovery. After a failed generation or update, the output directory state is
inspectable so the caller can determine the appropriate recovery action. After
this story, operators and Code Steward can diagnose failures, understand what
state the output is in, and know what to do next.

### Scope

#### In Scope

- Verification that CLI and SDK produce identical error codes and messages for the same failure condition
- Verification that CLI exit codes correctly reflect SDK errors
- Verification that failed operations identify the stage that failed (`failedStage`)
- Verification that missing dependency errors include install/setup guidance
- Verification that update-mode failures suggest running full generation as recovery
- Verification that failed generation leaves no metadata (or preserves prior valid metadata in update mode)
- Verification that status queries after failure return actionable state
- Verification that publish failure leaves the output directory unchanged
- Verification that multiple sequential failures do not corrupt state

#### Out of Scope

- Implementing error handling (already implemented in SDK operations from Epics 1/2 and in CLI from Story 1)
- Implementing publish error handling (already implemented in Story 4)
- Creating new error types (using existing `EngineError` and `EngineErrorCode`)

### Dependencies / Prerequisites

- Story 1 complete — CLI error rendering and exit codes
- Story 3 complete — SDK integration contract (error shape in results)
- Story 4 complete — publish error handling

### Acceptance Criteria

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

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Nonexistent repo path | `PATH_ERROR` — same code and message via CLI and SDK |
| Python missing | `DEPENDENCY_MISSING` — install guidance in message |
| Analysis failure during generation | `ANALYSIS_ERROR` — `failedStage: "analyzing-structure"` |
| Missing module plan during update | `METADATA_ERROR` — suggests full generation |
| Publish failure | `PUBLISH_ERROR` — output directory unchanged |

### Definition of Done

- [ ] All AC-6.1 through AC-6.3 TCs verified
- [ ] CLI and SDK error codes are identical for every tested failure condition
- [ ] Failed operations include actionable recovery guidance in error messages
- [ ] Output directory state is correct after each failure scenario
- [ ] Multiple sequential failures produce clean state each time
- [ ] PO accepts

**Estimated test count:** 10 tests (8 TC + 2 non-TC)

---

## Integration Path Trace

### Path 1: Operator generates docs via CLI and publishes to repo

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Operator → `docs generate` | CLI parses args, loads config | Story 1 | TC-1.1a, TC-1.2a |
| CLI → config-merger | Args + config file + defaults merged | Story 1 | TC-1.3a |
| CLI → `generateDocumentation()` | SDK invoked with merged options | Story 1 | TC-1.4a |
| SDK → progress events → CLI | Stage transitions rendered to stderr | Story 2 | TC-2.3a, TC-2.3b |
| SDK → `DocumentationRunResult` | Result returned to CLI | Story 1 | TC-2.1a |
| CLI → stdout | Result formatted as JSON or human text | Story 1 | TC-2.1a, TC-2.2a |
| CLI → exit code | Exit code set from result | Story 1 | TC-2.4a |
| Operator → `docs publish` | CLI parses publish args | Story 1 | TC-1.2d |
| CLI → `publishDocumentation()` | Preflight, worktree, commit, push, PR | Story 4 | TC-4.2a |
| Publish → `PublishResult` → CLI | Result formatted and printed | Story 1 | TC-2.1a |

### Path 2: Code Steward renders Documentation tab and triggers generation

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Server → `import { getDocumentationStatus }` | Operation imported from entry point | Story 3 | TC-3.1a |
| Server → `getDocumentationStatus()` | Status queried for tab render | Story 3 | TC-3.3a, TC-3.3b, TC-3.3c |
| Server → `generateDocumentation()` with `onProgress` | Generation triggered with progress callback | Story 3 | TC-3.2a, TC-3.2b |
| Progress callback → UI | Stage and module count forwarded to browser | Story 3 | TC-3.2a, TC-3.2b, TC-3.2c |
| `DocumentationRunResult` → SQLite | Result fields persisted | Story 3 | TC-3.4a |
| Server → `publishDocumentation()` | Publish triggered after generation | Story 4 | TC-4.1b, TC-4.2a |
| `PublishResult` → UI | Branch and PR URL displayed | Story 4 | TC-4.4a |

### Path 3: Generation fails and operator recovers

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Operator → `docs generate` | CLI invokes SDK | Story 1 | TC-1.1a |
| SDK → analysis fails | Error returned with `failedStage` | Story 6 | TC-6.2a |
| CLI → error rendered | Error code + message to stderr; exit code 1 | Story 1 (rendering), Story 6 (consistency) | TC-2.5a, TC-6.1a, TC-6.1b |
| Operator → `docs status` | Status queried after failure | Story 6 | TC-6.3c |
| Status returns `not_generated` | Operator knows to retry | Story 6 | TC-6.3c |
| Operator fixes Python → `docs check` | Environment verified | Story 1 | TC-1.1a |
| Operator retries → `docs generate` | Generation succeeds | Story 1, Story 2 | TC-1.4a, TC-2.3a |

No integration gaps found. Every segment has a story owner and relevant TC.

---

## Coverage Gate

| AC | TC | Story | Notes |
|----|-----|-------|-------|
| AC-1.1 | TC-1.1a | Story 1 | |
| AC-1.1 | TC-1.1b | Story 1 | |
| AC-1.1 | TC-1.1c | Story 1 | |
| AC-1.2 | TC-1.2a | Story 1 | |
| AC-1.2 | TC-1.2b | Story 1 | |
| AC-1.2 | TC-1.2c | Story 1 | |
| AC-1.2 | TC-1.2d | Story 1 | |
| AC-1.2 | TC-1.2e | Story 1 | |
| AC-1.3 | TC-1.3a | Story 1 | |
| AC-1.3 | TC-1.3b | Story 1 | |
| AC-1.3 | TC-1.3c | Story 1 | |
| AC-1.4 | TC-1.4a | Story 1 | |
| AC-1.4 | TC-1.4b | Story 1 | |
| AC-2.1 | TC-2.1a | Story 1 | |
| AC-2.1 | TC-2.1b | Story 1 | |
| AC-2.1 | TC-2.1c | Story 1 | |
| AC-2.2 | TC-2.2a | Story 1 | |
| AC-2.2 | TC-2.2b | Story 1 | |
| AC-2.3 | TC-2.3a | Story 2 | |
| AC-2.3 | TC-2.3b | Story 2 | |
| AC-2.3 | TC-2.3c | Story 2 | |
| AC-2.4 | TC-2.4a | Story 1 | |
| AC-2.4 | TC-2.4b | Story 1 | |
| AC-2.4 | TC-2.4c | Story 1 | |
| AC-2.4 | TC-2.4d | Story 1 | |
| AC-2.5 | TC-2.5a | Story 1 | |
| AC-2.5 | TC-2.5b | Story 1 | |
| AC-3.1 | TC-3.1a | Story 3 | |
| AC-3.1 | TC-3.1b | Story 3 | |
| AC-3.2 | TC-3.2a | Story 3 | |
| AC-3.2 | TC-3.2b | Story 3 | |
| AC-3.2 | TC-3.2c | Story 3 | |
| AC-3.3 | TC-3.3a | Story 3 | |
| AC-3.3 | TC-3.3b | Story 3 | |
| AC-3.3 | TC-3.3c | Story 3 | |
| AC-3.4 | TC-3.4a | Story 3 | |
| AC-3.4 | TC-3.4b | Story 3 | |
| AC-3.4 | TC-3.4c | Story 3 | |
| AC-3.5 | TC-3.5a | Story 3 | |
| AC-3.5 | TC-3.5b | Story 3 | |
| AC-4.1 | TC-4.1a | Story 4 | |
| AC-4.1 | TC-4.1b | Story 4 | |
| AC-4.2 | TC-4.2a | Story 4 | |
| AC-4.2 | TC-4.2b | Story 4 | |
| AC-4.2 | TC-4.2c | Story 4 | |
| AC-4.2 | TC-4.2d | Story 4 | |
| AC-4.2 | TC-4.2e | Story 4 | |
| AC-4.3 | TC-4.3a | Story 4 | |
| AC-4.3 | TC-4.3b | Story 4 | |
| AC-4.3 | TC-4.3c | Story 4 | |
| AC-4.4 | TC-4.4a | Story 4 | |
| AC-4.4 | TC-4.4b | Story 4 | |
| AC-4.5 | TC-4.5a | Story 4 | |
| AC-4.5 | TC-4.5b | Story 4 | |
| AC-4.6 | TC-4.6a | Story 4 | |
| AC-4.6 | TC-4.6b | Story 4 | |
| AC-4.7 | TC-4.7a | Story 4 | |
| AC-4.7 | TC-4.7b | Story 4 | |
| AC-5.1 | TC-5.1a | Story 5 | |
| AC-5.1 | TC-5.1b | Story 5 | |
| AC-5.1 | TC-5.1c | Story 5 | |
| AC-5.2 | TC-5.2a | Story 5 | |
| AC-5.2 | TC-5.2b | Story 5 | |
| AC-5.3 | TC-5.3a | Story 5 | |
| AC-5.3 | TC-5.3b | Story 5 | |
| AC-5.4 | TC-5.4a | Story 5 | |
| AC-5.4 | TC-5.4b | Story 5 | |
| AC-6.1 | TC-6.1a | Story 6 | |
| AC-6.1 | TC-6.1b | Story 6 | |
| AC-6.2 | TC-6.2a | Story 6 | |
| AC-6.2 | TC-6.2b | Story 6 | |
| AC-6.2 | TC-6.2c | Story 6 | |
| AC-6.3 | TC-6.3a | Story 6 | |
| AC-6.3 | TC-6.3b | Story 6 | |
| AC-6.3 | TC-6.3c | Story 6 | |

**Coverage complete:** 28 ACs, 75 TCs, all assigned to exactly one story. No
orphaned TCs. No duplicated TCs.

---

## Test Count Summary

| Story | TC Tests | Non-TC Tests | Total |
|-------|----------|-------------|-------|
| Story 0 | 0 | 0 | 0 |
| Story 1 | 24 | 4 | 28 |
| Story 2 | 3 | 3 | 6 |
| Story 3 | 13 | 1 | 14 |
| Story 4 | 18 | 5 | 23 |
| Story 5 | 9 | 1 | 10 |
| Story 6 | 8 | 2 | 10 |
| **Total** | **75** | **16** | **91** |

These counts align with the test plan totals.

---

## Dependency Graph

```text
Story 0 (Foundation)
    │
    ├── Story 1 (CLI Shell + Output + Exit Codes)
    │       │
    │       └── Story 2 (Progress Rendering)
    │
    ├── Story 3 (SDK Integration Contract)
    │
    └── (Story 4 depends on Stories 0, 1, and 3)

Story 1 + Story 3 ──→ Story 4 (Publish Flow)

Stories 1, 2, 3, 4 ──→ Story 5 (Test & Eval Harness)

Stories 1, 3, 4 ──→ Story 6 (Failure / Recovery)
```

**Parallelization:** After Story 0, Stories 1 and 3 can proceed in parallel.
Story 2 follows Story 1. Story 4 requires Stories 1 and 3 (and transitively
Story 0). Story 5 depends on Stories 1, 2, 3, and 4. Story 6 requires Stories
1, 3, and 4.

---

## Validation Checklist

- [x] Every AC from the epic is assigned to a story
- [x] Every TC from the epic is assigned to exactly one story
- [x] Stories sequence logically (foundation → shell → progress → integration → publish → harness → failure)
- [x] Each story has full Given/When/Then detail for all TCs
- [x] Integration path trace complete with no gaps
- [x] Coverage gate table complete
- [x] Error paths documented per story
- [x] Story 0 covers types, fixtures, error codes, package config
- [x] Each feature story is independently acceptable by a PO
- [x] Story 2 / Story 3 boundary clean: CLI rendering vs SDK event contract
- [x] Publish (Story 4) isolated from generate/update
- [x] Test/eval harness (Story 5) is a real integration deliverable with fixtures, smoke tests, and determinism verification
- [x] Test counts align with test plan (91 total)
