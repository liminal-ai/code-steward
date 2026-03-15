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
