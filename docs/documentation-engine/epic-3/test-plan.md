# Test Plan: CLI & Code Steward Integration

## Purpose

This document defines the complete testing strategy for Epic 3. It maps every TC
from the epic to a specific test, defines the fixture architecture for CLI and
publish testing, and establishes how each consumption path (CLI, SDK, publish) is
verified.

**Companion:** [tech-design.md](tech-design.md) — architecture, interfaces, module
breakdown. This plan references the tech design for implementation details.

---

## Testing Philosophy

Epic 3 introduces two new test boundaries: the CLI binary (tested as a
subprocess) and the publish flow (tested with git operations against fixture
repos). The testing strategy extends Epic 1/2's service mock pattern while adding
a subprocess testing layer for the CLI.

This plan assumes the finalized package baseline: Node 24 LTS, TypeScript 5.9.x,
ESM-only, Vitest, Biome for lint/format, `tsc` for typecheck/build.

**Three testing layers in Epic 3:**

```text
Layer 1: CLI Binary Tests (subprocess)
    Invoke dist/cli.js as a child process
    Assert on stdout, stderr, and exit code
    Mock nothing — exercise the real CLI-to-SDK path
    Control inputs via arguments and fixture repos

Layer 2: SDK Integration Tests (import)
    Import operations from the package entry point
    Assert on typed return values
    Mock at external boundaries (Agent SDK, git, filesystem)
    Verify the contract Code Steward depends on

Layer 3: Publish Tests (git operations)
    Mock git and gh adapters for most publish-path cases
    Use temporary git repos with a local bare remote for worktree/branch-preservation integration cases
    Verify branch creation, commit, push, PR, and caller-checkout preservation
```

### What is Subprocess-Tested vs Mock-Tested

| Component | Strategy | Why |
|-----------|----------|-----|
| CLI binary (commands, output, exit codes) | Subprocess | Proves the built binary works end-to-end |
| CLI progress rendering | Subprocess (stderr capture) | Proves progress lines appear in stderr |
| SDK integration contract | Import + mock boundaries | Verifies typed contract without full pipeline |
| Publish preflight | Mock git/gh adapters | Controls git state without real repos |
| Publish branch operations | Mostly mock git adapter; local bare-remote for worktree-preservation cases | Covers both fast branch logic checks and real git lifecycle verification |
| Publish PR creation | Mock gh adapter | Verifies gh CLI invocations without GitHub credentials |
| Failure surfacing | Both subprocess + import | Proves consistency across paths |

---

## Mock Strategy

### CLI Tests — Minimal Mocks

CLI tests invoke the compiled binary as a subprocess. They do not mock internal
SDK modules. Instead, they control behavior through:

- Fixture repos (known state)
- Fixture doc output directories (known content)
- Environment variables (to control dependency availability)
- CLI arguments

Most CLI tests exercise the full CLI-to-SDK path against fixture repos. For
tests that require specific failure conditions (e.g., missing Python for
TC-2.5a/b), the CLI subprocess environment is configured to simulate the
condition — for example, using a `PATH` that excludes the Python binary. This
avoids internal mocking while still controlling the external dependency state.

For long-running commands (`generate`, `update`), CLI smoke tests run against
small fixtures; full pipeline tests are in the SDK layer with mocked Agent SDK.

### SDK Integration Tests — Boundary Mocks

Same mock strategy as Epic 1/2: mock at external boundaries, exercise internal
modules through entry points.

| Boundary | Mock? | Why |
|----------|-------|-----|
| `adapters/agent-sdk.ts` | Yes (from Epic 2 mock) | Controls inference responses |
| `adapters/git.ts` — publish operations | Yes | Controls branch/commit/push behavior |
| `adapters/gh.ts` — PR creation | Yes | Controls gh CLI availability and responses |
| `adapters/subprocess.ts` — Python | Yes (from Epic 1 mock) | Controls analysis adapter |
| Filesystem reads | Via fixture directories | Controls config, metadata, output state |
| Filesystem writes | Via temp directories | Verify writes without polluting fixtures |

### Publish Tests — Mocks First, Local Git Where It Matters

Most publish tests mock the git and gh adapters so branch, push, and PR failure
cases stay deterministic. A smaller integration subset uses
`createPublishTestEnv()` with a local bare remote to verify the real worktree
lifecycle, caller-branch preservation, and doc-file-only commit behavior
without network access. The mock git adapter tracks method calls and returns
configured responses:

```typescript
// test/helpers/publish-fixtures.ts

import type { EngineResult } from "../../src/types/common.js";

export interface MockGitForPublish {
  createWorktree: vi.Mock;
  removeWorktree: vi.Mock;
  createBranch: vi.Mock;
  stageFiles: vi.Mock;
  commit: vi.Mock;
  pushBranch: vi.Mock;
  getRemoteUrl: vi.Mock;
  branchExists: vi.Mock;
  getDefaultBranch: vi.Mock;
}

export function createMockGitForPublish(overrides?: Partial<MockGitForPublish>): MockGitForPublish {
  return {
    createWorktree: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    removeWorktree: vi.fn().mockResolvedValue(undefined),
    createBranch: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    stageFiles: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    commit: vi.fn().mockResolvedValue({ ok: true, value: "abc123def456" }),
    pushBranch: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getRemoteUrl: vi.fn().mockResolvedValue({ ok: true, value: "https://github.com/org/repo.git" }),
    branchExists: vi.fn().mockResolvedValue(false),
    getDefaultBranch: vi.fn().mockResolvedValue({ ok: true, value: "main" }),
    ...overrides,
  };
}

export interface MockGhAdapter {
  isGhAvailable: vi.Mock;
  createPullRequest: vi.Mock;
}

export function createMockGh(overrides?: Partial<MockGhAdapter>): MockGhAdapter {
  return {
    isGhAvailable: vi.fn().mockResolvedValue(true),
    createPullRequest: vi.fn().mockResolvedValue({
      ok: true,
      value: { url: "https://github.com/org/repo/pull/42", number: 42 },
    }),
    ...overrides,
  };
}
```

### What Is NOT Mocked

| Module | Why Not |
|--------|---------|
| `cli/output.ts` formatters | Pure functions — test through CLI subprocess |
| `cli/progress.ts` renderer | Pure function — test through CLI subprocess stderr |
| `cli/config-merger.ts` | Pure function — exercise through CLI tests |
| `cli/exit-codes.ts` | Pure function — exercise through CLI tests |
| `publish/preflight.ts` logic | Exercise through `publishDocumentation()` entry point |
| `publish/base-branch-detector.ts` | Exercise through publish flow with mocked git |

---

## Fixture Architecture

### CLI Test Helper

```typescript
// test/helpers/cli-runner.ts

import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_PATH = path.resolve(__dirname, "../../dist/cli.js");

export interface CliRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Runs the CLI binary as a subprocess and captures output.
 * Does not throw on non-zero exit codes.
 */
export async function runCli(args: string[]): Promise<CliRunResult> {
  return new Promise((resolve) => {
    const child = execFile("node", [CLI_PATH, ...args], { timeout: 30_000 }, (error, stdout, stderr) => {
      // execFile sets error when exit code is non-zero.
      // The exit code is available on the ChildProcess, not on error.code
      // (which is a string like 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER').
      resolve({
        stdout: stdout ?? "",
        stderr: stderr ?? "",
        exitCode: child.exitCode ?? (error ? 1 : 0),
      });
    });
  });
}

/**
 * Runs CLI and parses stdout as JSON.
 * Throws if stdout is not valid JSON.
 */
export async function runCliJson<T>(args: string[]): Promise<{ envelope: CliResultEnvelope<T>; exitCode: number }> {
  const result = await runCli(args);
  const envelope = JSON.parse(result.stdout);
  return { envelope, exitCode: result.exitCode };
}
```

### Reused Fixtures from Epic 1/2

| Fixture | Original Path | Used By (Epic 3) |
|---------|--------------|-------------------|
| `valid-ts` repo | `test/fixtures/repos/valid-ts/` | CLI smoke tests (check, analyze, status) |
| `empty` repo | `test/fixtures/repos/empty/` | CLI smoke test (status, empty state) |
| `valid` doc output | `test/fixtures/docs-output/valid/` | CLI validate smoke test, publish tests |
| `broken-links` doc output | `test/fixtures/docs-output/broken-links/` | CLI validate exit code test |
| `corrupt-metadata` doc output | `test/fixtures/docs-output/corrupt-metadata/` | Publish preflight test |
| Agent SDK response fixtures | `test/fixtures/agent-sdk/*` | SDK integration tests (via Epic 2 mock) |
| Config fixtures | `test/fixtures/config/*` | CLI config resolution tests |

### New Fixtures for Epic 3

| Fixture | Path | Contents | Used By |
|---------|------|----------|---------|
| `bare-remote` | `test/fixtures/publish/bare-remote/` | Bare git repo (`git init --bare`). Created in `beforeAll`, cleaned in `afterAll`. Serves as push target. | Publish push tests (integration) |
| `valid-output-for-publish` | `test/fixtures/publish/valid-output-for-publish/` | Pre-built doc output: `overview.md`, 2 module pages, `module-tree.json`, `.doc-meta.json`, `.module-plan.json`. Valid metadata with known commit hash. | Publish preflight tests, publish happy path |
| `no-remote-repo` | `test/fixtures/publish/no-remote-repo/` | Git repo with no remote configured. Created in test setup. | TC-4.7a (no remote) |

### Publish Fixture Setup

Publish tests that require git operations (push, branch creation) use temporary
repos created in `beforeAll`:

```typescript
// test/helpers/publish-fixtures.ts

import { execSync } from "node:child_process";
import { mkdtempSync, cpSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a temporary git repo with a bare remote for publish testing.
 * Returns paths to both the working repo and the bare remote.
 * All operations are local — no network access required.
 */
export function createPublishTestEnv(): { repoPath: string; remotePath: string; cleanup: () => void } {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "docengine-publish-test-"));
  const remotePath = path.join(tmpDir, "remote.git");
  const repoPath = path.join(tmpDir, "repo");

  // Create bare remote (local filesystem, no network)
  execSync(`git init --bare ${remotePath}`);

  // Create working repo pointing at the local bare remote
  execSync(`git init ${repoPath}`);
  execSync(`git -C ${repoPath} remote add origin ${remotePath}`);
  execSync(`git -C ${repoPath} commit --allow-empty -m "initial"`);
  execSync(`git -C ${repoPath} push -u origin main`);

  // Copy doc output fixture into repo
  cpSync(
    path.resolve(__dirname, "../fixtures/publish/valid-output-for-publish"),
    path.join(repoPath, "docs/wiki"),
    { recursive: true }
  );

  return {
    repoPath,
    remotePath,
    cleanup: () => execSync(`rm -rf ${tmpDir}`),
  };
}
```

---

## TC-to-Test Mapping

### Chunk 1: CLI Command Shell

**Test File:** `test/cli/commands.test.ts`

Entry point: CLI binary via `runCli()` / `runCliJson()`

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-1.1a | TC-1.1a: each command responds to --help | Run each command with `--help` | stdout non-empty; exit code 0; no "unknown command" text |
| TC-1.1b | TC-1.1b: unknown command rejected | Run `docs nonexistent` | stderr contains error message; exit code 2 |
| TC-1.1c | TC-1.1c: no-argument shows help | Run `docs` with no subcommand | stdout shows available commands |
| TC-1.2a | TC-1.2a: generate accepts repo-path and output-path | Run `docs generate --json --repo-path <fixture> --output-path docs/wiki` | JSON envelope returned; SDK received both values (verified via output path in result) |
| TC-1.2b | TC-1.2b: check accepts optional repo-path | Run `docs check --json` (no repo-path) | JSON envelope with `passed` field; no parser-related findings |
| TC-1.2c | TC-1.2c: required argument missing | Run `docs generate --json` (no repo-path) | JSON error or stderr error; exit code 2 |
| TC-1.2d | TC-1.2d: publish accepts publish-specific arguments | Run `docs publish --json --repo-path <fixture> --branch-name docs/test --create-pr` | Arguments reach SDK (verified via mock or result) |
| TC-1.2e | TC-1.2e: include/exclude/focus patterns accepted | Run `docs generate --json --repo-path <fixture> --include "src/**" --exclude "**/*.test.ts" --focus src/core` | Patterns reach SDK (verified via result or mock) |
| TC-1.3a | TC-1.3a: CLI argument overrides config file | Config file sets outputPath; CLI provides different `--output-path` | Result uses CLI's output path |
| TC-1.3b | TC-1.3b: config file value used when CLI arg omitted | Config file sets outputPath; CLI omits `--output-path` | Result uses config file's output path |
| TC-1.3c | TC-1.3c: defaults when both omitted | No config file; no `--output-path` | Result uses default `docs/wiki` |
| TC-1.4a | TC-1.4a: CLI generate result matches SDK | Compare `docs generate --json` output with direct SDK call | Same fields and values (modulo timestamps/runId) |
| TC-1.4b | TC-1.4b: CLI status result matches SDK | Compare `docs status --json` output with direct SDK call | Same state, timestamps, commit hashes |

**Test File:** `test/cli/output.test.ts`

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-2.1a | TC-2.1a: successful JSON result | Run `docs status --json --repo-path <valid-ts>` | stdout is valid JSON; `success: true`; `result` contains status fields |
| TC-2.1b | TC-2.1b: error JSON result | Run `docs generate --json --repo-path /nonexistent` | stdout is valid JSON; `success: false`; `error.code` and `error.message` present |
| TC-2.1c | TC-2.1c: JSON is single parseable object | Run any command with `--json` | `JSON.parse(stdout)` succeeds; no other text in stdout |
| TC-2.2a | TC-2.2a: status displayed readably | Run `docs status --repo-path <valid-ts>` (no --json) | stdout includes status state and commit hash in readable format (not raw JSON) |
| TC-2.2b | TC-2.2b: validation findings listed readably | Run `docs validate --output-path <broken-links>` (no --json) | stdout includes each finding on its own line with severity and category |
| TC-2.4a | TC-2.4a: exit code 0 on success | Run `docs status --repo-path <valid-ts>` | Exit code 0 |
| TC-2.4b | TC-2.4b: exit code 1 on operational failure | Run `docs generate --repo-path /nonexistent` | Exit code 1 |
| TC-2.4c | TC-2.4c: exit code 2 on usage error | Run `docs generate` (no repo-path) | Exit code 2 |
| TC-2.4d | TC-2.4d: exit code 1 when validation finds errors | Run `docs validate --output-path <broken-links>` | Exit code 1 |
| TC-2.5a | TC-2.5a: structured error in human mode | Run `docs check --repo-path <fixture>` with `PATH` modified to exclude Python | stderr includes `DEPENDENCY_MISSING` and "python" |
| TC-2.5b | TC-2.5b: structured error in JSON mode | Run `docs check --json --repo-path <fixture>` with `PATH` modified to exclude Python | JSON envelope has `error.code`, `error.message` |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| CLI binary starts without error | Zero-arg smoke test |
| --help flag produces non-empty output for each command | Help text completeness |
| Comma-separated patterns split correctly | CLI arg parsing edge case |
| Config file loaded from --config relative to CWD | Path resolution behavior |

---

### Chunk 2: CLI Progress Rendering

**Test File:** `test/cli/progress.test.ts`

Entry point: CLI binary via `runCli()` with stderr capture

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-2.3a | TC-2.3a: stage transitions visible during generation | Run `docs generate --repo-path <fixture>` against a small fixture repo (fast due to small input size, not mocking) | stderr contains stage lines ("Analyzing structure...", "Generating module...") |
| TC-2.3b | TC-2.3b: module-level progress visible | Run `docs generate` against fixture with multiple modules | stderr contains module name and completion count (e.g., "(2/5)") |
| TC-2.3c | TC-2.3c: JSON mode suppresses progress | Run `docs generate --json --repo-path <fixture>` | stderr is empty; stdout is single JSON object |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| Progress renderer handles unknown stage without crash | Defensive — SDK may add stages later |
| Empty moduleName in generating-module handled gracefully | Edge case |
| SIGINT during progress exits with code 130 | Ctrl+C behavior verification |

---

### Chunk 3: Public SDK Integration Contract

**Test File:** `test/integration/sdk-contract.test.ts`

Entry point: Package imports from `"documentation-engine"` (or local path equivalent)

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-3.1a | TC-3.1a: operations importable | Import all six operations from entry point | All are defined and typeof "function" |
| TC-3.1b | TC-3.1b: types importable | Import all specified types from entry point (including request types like `AnalysisOptions`, `PublishRequest`) | TypeScript compilation succeeds (enforced by tsc); all type names resolve |
| TC-3.2a | TC-3.2a: progress events identify stage | Call `generateDocumentation()` with progress callback; mock Agent SDK | Each event has `stage` from defined set |
| TC-3.2b | TC-3.2b: module-level progress includes name and count | Call generate against 5-module fixture | `generating-module` events have `moduleName`, `completed`, `total` |
| TC-3.2c | TC-3.2c: final event signals completion or failure | Call generate to completion and to failure | Last event is `"complete"` or `"failed"` respectively |
| TC-3.3a | TC-3.3a: not-generated state for empty tab render | Call `getDocumentationStatus()` on repo with no docs | `state: "not_generated"`, null timestamps, output path present |
| TC-3.3b | TC-3.3b: stale state provides comparison data | Call status on stale repo | `state: "stale"`, both commit hashes populated |
| TC-3.3c | TC-3.3c: current state provides generation metadata | Call status on current repo | `state: "current"`, `lastGeneratedAt` populated, hashes match |
| TC-3.4a | TC-3.4a: successful result has persistence-ready fields | Full generation | `mode`, `commitHash`, `durationSeconds`, `costUsd`, `generatedFiles`, `warnings`, `validationResult` present |
| TC-3.4b | TC-3.4b: failed result has diagnostic fields | Generation failure | `success: false`, `failedStage`, `error.code`, `error.message` present |
| TC-3.4c | TC-3.4c: cost is null when unavailable | Mock Agent SDK without usage data | `costUsd` is `null` |
| TC-3.5a | TC-3.5a: status available without reading filesystem | Call `getDocumentationStatus()` | All info in return value; no need to read `.doc-meta.json` |
| TC-3.5b | TC-3.5b: generation result available without reading output | Call `generateDocumentation()` | File list, validation, metadata all in return value |

Epic 1's inherited `DocumentationStatus.state: "invalid"` contract is preserved
for malformed metadata and can be asserted in status-fixture variants used by
Chunk 3 tests.

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| Package entry point does not export internal modules | Verify encapsulation — no orchestration/ or adapters/ exports |

---

### Chunk 4: Publish Flow

**Test File:** `test/integration/publish.test.ts`

Entry point: `publishDocumentation()` with mocked git/gh adapters for most
cases, plus local bare-remote fixture coverage for worktree-preservation cases

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-4.1a | TC-4.1a: publish without prior generation | Output dir empty (no docs) | `PUBLISH_ERROR`; no generation triggered |
| TC-4.1b | TC-4.1b: publish after generation | Valid doc output exists | Publish proceeds; no generation runs |
| TC-4.2a | TC-4.2a: full publish with PR | `createPullRequest: true` | `branchName`, `commitHash`, `pullRequestUrl` non-null, `pullRequestNumber` non-null, `filesCommitted` non-empty |
| TC-4.2b | TC-4.2b: publish without PR | `createPullRequest: false` | `pullRequestUrl: null`, `pullRequestNumber: null`; branch pushed |
| TC-4.2c | TC-4.2c: custom branch name used | `branchName: "docs/my-update"` | Result `branchName` is `"docs/my-update"` |
| TC-4.2d | TC-4.2d: auto-generated branch name | No branchName provided | Result `branchName` matches `docs/update-<timestamp>` pattern |
| TC-4.2e | TC-4.2e: branch name collision | Mock `branchExists` returns `true` | `PUBLISH_ERROR`; no worktree created |
| TC-4.3a | TC-4.3a: no output directory | Output path does not exist | `PUBLISH_ERROR`; no branch created |
| TC-4.3b | TC-4.3b: invalid metadata | Corrupt `.doc-meta.json` in output | `PUBLISH_ERROR`; no branch created |
| TC-4.3c | TC-4.3c: valid output proceeds | Valid output with valid metadata | Preflight passes; publish proceeds |
| TC-4.4a | TC-4.4a: all fields populated with PR | Full publish with PR | `branchName`, `commitHash`, `pushedToRemote: true`, `pullRequestUrl`, `pullRequestNumber`, `filesCommitted` all present |
| TC-4.4b | TC-4.4b: PR fields null without PR | Push-only publish | `pullRequestUrl: null`, `pullRequestNumber: null` |
| TC-4.5a | TC-4.5a: caller's branch preserved | Record branch before, publish, check branch after | Same branch checked out; working tree unchanged |
| TC-4.5b | TC-4.5b: only doc files committed | Repo has uncommitted non-doc changes | Commit contains only doc files; other changes remain uncommitted |
| TC-4.6a | TC-4.6a: PR requested without gh CLI | `createPullRequest: true`; mock `isGhAvailable` returns `false` | `PUBLISH_ERROR` identifying `gh` as required |
| TC-4.6b | TC-4.6b: push-only without gh CLI | `createPullRequest: false`; mock `isGhAvailable` returns `false` | Publish completes; no error |
| TC-4.7a | TC-4.7a: no remote configured | Mock `getRemoteUrl` returns error | `PUBLISH_ERROR` identifying no remote |
| TC-4.7b | TC-4.7b: push rejected | Mock `pushBranch` returns error | `PUBLISH_ERROR` with rejection reason |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| Worktree cleanup on push failure | Verify temp directory removed even on failure |
| Auto-generated branch name includes timestamp | Convention verification |
| Auto-generated commit message includes output path | Convention verification |
| Base branch fallback chain (symbolic-ref → main → master) | Multi-step detection logic |
| PR body auto-generation includes commit hash and file count | Content quality |

---

### Chunk 5: Test & Eval Harness

**Test File:** `test/cli/smoke.test.ts`

AC-5.3's publish leg is satisfied by Chunk 4's local bare-remote publish
coverage. Chunk 5 reuses that path for full-pipeline confidence rather than
duplicating publish-specific tests here.

Entry point: CLI binary via `runCliJson()`

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-5.1a | TC-5.1a: status against fixture repo | `valid-ts` fixture with no generated docs | JSON: `state: "not_generated"` |
| TC-5.1b | TC-5.1b: check against fixture repo | `valid-ts` fixture with all deps | JSON: `passed: true` |
| TC-5.1c | TC-5.1c: validate against fixture output | `valid` docs fixture | JSON: `status: "pass"` |

**Test File:** `test/integration/sdk-contract.test.ts` (additions to Chunk 3)

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-5.2a | TC-5.2a: all operations importable | Import from package entry point | Six operations available as named exports |
| TC-5.2b | TC-5.2b: operations callable without app context | Call `getDocumentationStatus()` with fixture repo; no app server | Valid result returned |

**Test File:** `test/integration/e2e.test.ts`

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-5.3a | TC-5.3a: fixture repo has known structure | Run `analyzeRepository()` on `valid-ts` fixture | Component count, languages, relationships match expectations |
| TC-5.3b | TC-5.3b: end-to-end generation produces expected output | Run `generateDocumentation()` on `valid-ts` fixture (with mocked Agent SDK) | Output dir contains `overview.md`, `module-tree.json`, `.doc-meta.json`, `.module-plan.json`, and module pages |

**Test File:** `test/integration/determinism.test.ts`

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-5.4a | TC-5.4a: file list deterministic | Run generation twice with same fixture and mocked Agent SDK | Same output file names both times |
| TC-5.4b | TC-5.4b: module tree deterministic | Run generation twice | Same `module-tree.json` module entries both times |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| CLI smoke test against empty fixture repo | Edge case — repo with no source files |

---

### Chunk 6: Failure, Recovery, and Operator Feedback

**Test File:** `test/cli/failure.test.ts` and `test/integration/failure.test.ts`

| TC | Test Name | Setup | Assert |
|----|-----------|-------|--------|
| TC-6.1a | TC-6.1a: SDK error and CLI error match | Call SDK with nonexistent path; run CLI with same path | Both return `PATH_ERROR` with equivalent messages |
| TC-6.1b | TC-6.1b: CLI exit code reflects SDK error | Mock env check failure; run `docs check` | Error printed; exit code 1 |
| TC-6.2a | TC-6.2a: failed stage identified | Mock analysis failure | `failedStage: "analyzing-structure"` |
| TC-6.2b | TC-6.2b: missing dependency includes guidance | Mock Python unavailable | Error message identifies Python and mentions install guidance |
| TC-6.2c | TC-6.2c: update failure suggests recovery | Mock missing module plan for update | `METADATA_ERROR`; message mentions full generation |
| TC-6.3a | TC-6.3a: failed generation leaves no metadata | Mock module gen failure | `.doc-meta.json` absent (or prior metadata retained) |
| TC-6.3b | TC-6.3b: prior state preserved on update failure | Mock update failure after partial regen | Status returns prior generation's metadata |
| TC-6.3c | TC-6.3c: status after failure returns actionable state | Never-succeeded repo after failed attempt | `state: "not_generated"` |

**Non-TC Decided Tests:**

| Test Name | Rationale |
|-----------|-----------|
| Publish failure leaves output directory unchanged | Verify docs aren't modified on publish error |
| Multiple sequential failures don't corrupt state | Repeated failures → clean status each time |

---

## Test Organization

```text
test/
├── cli/
│   ├── commands.test.ts                   # Chunk 1: 13 TC tests (AC-1.x)
│   ├── output.test.ts                     # Chunk 1: 11 TC tests (AC-2.x) + 4 non-TC
│   ├── progress.test.ts                   # Chunk 2: 3 TC + 3 non-TC = 6 tests
│   ├── smoke.test.ts                      # Chunk 5: 3 TC + 1 non-TC = 4 tests
│   └── failure.test.ts                    # Chunk 6: 5 tests (CLI-side)
├── integration/
│   ├── sdk-contract.test.ts               # Chunk 3: 13 TC + 1 non-TC + Chunk 5: 2 TC
│   ├── publish.test.ts                    # Chunk 4: 18 TC + 5 non-TC = 23 tests
│   ├── e2e.test.ts                        # Chunk 5: 2 TC tests
│   ├── determinism.test.ts                # Chunk 5: 2 TC tests
│   └── failure.test.ts                    # Chunk 6: 5 tests (SDK-side)
├── fixtures/
│   ├── publish/
│   │   ├── bare-remote/                   # Created in beforeAll
│   │   └── valid-output-for-publish/      # Pre-built doc output
│   ├── repos/                             # Reuse from Epic 1
│   ├── docs-output/                       # Reuse from Epic 1
│   ├── config/                            # Reuse from Epic 1
│   ├── agent-sdk/                         # Reuse from Epic 2
│   └── update/                            # Reuse from Epic 2
└── helpers/
    ├── cli-runner.ts                      # CLI subprocess runner
    ├── publish-fixtures.ts                # Publish test env setup
    ├── fixtures.ts                        # Reuse from Epic 1
    ├── temp.ts                            # Reuse from Epic 1
    ├── git.ts                             # Reuse from Epic 1
    ├── agent-sdk-mock.ts                  # Reuse from Epic 2
    ├── run-pipeline.ts                    # Reuse from Epic 2
    └── assert-output.ts                   # Reuse from Epic 2
```

---

## How Key Scenarios Are Tested

### CLI-to-SDK Parity (TC-1.4a, TC-1.4b)

Parity is verified by running the same operation through both paths:

```typescript
test("TC-1.4b: CLI status matches SDK status", async () => {
  // CLI path
  const cliResult = await runCliJson<DocumentationStatus>(
    ["status", "--json", "--repo-path", FIXTURES.validTs]
  );

  // SDK path
  const sdkResult = await getDocumentationStatus({ repoPath: FIXTURES.validTs });

  // Compare — same fields, same values
  expect(cliResult.envelope.result?.state).toBe(sdkResult.state);
  expect(cliResult.envelope.result?.lastGeneratedCommitHash).toBe(sdkResult.lastGeneratedCommitHash);
});
```

### Publish Worktree Lifecycle

Publish tests verify the sequence of git adapter calls without real git:

```typescript
test("TC-4.2a: full publish with PR", async () => {
  const mockGit = createMockGitForPublish();
  const mockGh = createMockGh();

  const result = await publishDocumentation(
    { repoPath: "/repo", createPullRequest: true },
    { git: mockGit, gh: mockGh }
  );

  // Verify worktree lifecycle
  expect(mockGit.createWorktree).toHaveBeenCalledOnce();
  expect(mockGit.createBranch).toHaveBeenCalledOnce();
  expect(mockGit.stageFiles).toHaveBeenCalledOnce();
  expect(mockGit.commit).toHaveBeenCalledOnce();
  expect(mockGit.pushBranch).toHaveBeenCalledOnce();
  expect(mockGit.removeWorktree).toHaveBeenCalledOnce();

  // Verify PR creation
  expect(mockGh.createPullRequest).toHaveBeenCalledOnce();

  // Verify result
  expect(result.ok).toBe(true);
  expect(result.value.pullRequestUrl).not.toBeNull();
});
```

### Branch Preservation (TC-4.5a)

This test verifies the caller's checkout is undisturbed:

```typescript
test("TC-4.5a: caller's branch preserved", async () => {
  const mockGit = createMockGitForPublish();

  // Verify worktree approach — main checkout never touched
  await publishDocumentation(request, { git: mockGit, gh: mockGh });

  // The key assertion: no checkout commands were issued on repoPath
  // Only worktree operations were used
  expect(mockGit.createWorktree).toHaveBeenCalled();
  // No git checkout calls on the main repo path
});
```

### Failure Consistency (TC-6.1a)

Both paths produce the same error:

```typescript
test("TC-6.1a: SDK and CLI produce same error", async () => {
  const nonexistentPath = "/nonexistent-repo-path";

  // SDK path
  const sdkResult = await generateDocumentation({ repoPath: nonexistentPath, mode: "full" });

  // CLI path
  const cliResult = await runCliJson(["generate", "--json", "--repo-path", nonexistentPath]);

  // Same error code and comparable message
  expect(sdkResult.error?.code).toBe(cliResult.envelope.error?.code);
  expect(sdkResult.error?.code).toBe("PATH_ERROR");
});
```

### Progress Rendering Without Live Calls

Progress tests for the CLI capture stderr from the subprocess:

```typescript
test("TC-2.3a: stage transitions visible", async () => {
  // Run generate against small fixture repo (fast due to small input size)
  const result = await runCli(["generate", "--repo-path", FIXTURES.validTs]);

  // Verify stage lines appeared in stderr
  expect(result.stderr).toContain("Analyzing structure");
  expect(result.stderr).toContain("Generating module");
  expect(result.stderr).toContain("Complete");
});

test("TC-2.3c: JSON mode suppresses progress", async () => {
  const result = await runCli(["generate", "--json", "--repo-path", FIXTURES.validTs]);

  // stderr should be empty — no progress lines
  expect(result.stderr).toBe("");
  // stdout should be valid JSON
  expect(() => JSON.parse(result.stdout)).not.toThrow();
});
```

---

## CI vs Manual/Environment-Gated Tests

| Test Category | CI Safe? | Why |
|---------------|----------|-----|
| CLI command tests — non-inference (Chunk 1) | Yes | Black-box subprocess tests for `check`, `status`, `validate`, `analyze`, `--help`, unknown commands, missing args |
| CLI command tests — inference (Chunk 1) | **Environment-gated** | Tests that invoke `generate` or `update` as subprocesses require Agent SDK |
| CLI output tests (Chunk 1) | Yes | Pure formatting assertions via `check`, `status`, `validate` |
| Progress rendering (Chunk 2) | **Environment-gated** | Black-box subprocess tests; `generate`/`update` require Agent SDK for real execution |
| SDK contract tests (Chunk 3) | Yes | Mocked Agent SDK |
| Publish mock tests (Chunk 4) | Yes | All git/gh adapters mocked |
| Publish integration tests (Chunk 4) | Yes | Uses local bare-remote git fixture — no network access, no GitHub credentials |
| CLI smoke tests (Chunk 5) | Mostly | `check` depends on Python + tree-sitter; `status` and `validate` are CI-safe |
| E2E generation tests (Chunk 5) | Yes | Uses mocked Agent SDK via SDK import (not CLI subprocess) |
| Determinism tests (Chunk 5) | Yes | Uses mocked Agent SDK; verifies structural output stability across two runs |
| Failure tests (Chunk 6) | Yes | Mocked boundaries |

**CI requirements:**
- Built CLI binary (`tsc` build must run before CLI tests)
- Fixture repos committed to the test directory
- Git available (for publish integration tests using local bare-remote fixtures)
- No network access needed for CI-safe tests
- Python + tree-sitter needed for analysis-dependent smoke tests

**Environment-gated tests:**
- CLI subprocess tests that invoke `generate` or `update` (Chunk 1 inference
  tests, Chunk 2 progress tests) require a working authenticated Claude Agent
  SDK environment because the CLI binary runs as an opaque subprocess with no
  internal mocking
- These tests are marked with a Vitest `describe.skipIf` guard that checks
  whether Claude Agent SDK authentication is available
- All other tests — including publish integration, E2E generation (via SDK
  import with mocked Agent SDK), and determinism tests — run in CI without gates

```typescript
describe.skipIf(!hasClaudeAuth())("CLI generate subprocess", () => {
  // These tests invoke the CLI binary and require real Claude Agent SDK inference
});
```

---

## Running Totals

| Chunk | TC Tests | Non-TC Tests | Total | Running Total |
|-------|----------|-------------|-------|---------------|
| 0: Infrastructure | 0 | 0 | 0 | 0 |
| 1: CLI Command Shell | 24 | 4 | 28 | 28 |
| 2: CLI Progress | 3 | 3 | 6 | 34 |
| 3: Integration Contract | 13 | 1 | 14 | 48 |
| 4: Publish Flow | 18 | 5 | 23 | 71 |
| 5: Test Harness | 9 | 1 | 10 | 81 |
| 6: Failure/Recovery | 8 | 2 | 10 | 91 |
| **Total** | **75** | **16** | **91** | |

Previous Epic 1 tests (82) and Epic 2 tests (109) must keep passing as each
chunk completes. Regression = stop and fix before proceeding.
