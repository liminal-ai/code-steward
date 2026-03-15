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
