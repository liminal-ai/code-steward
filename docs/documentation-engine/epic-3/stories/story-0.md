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
