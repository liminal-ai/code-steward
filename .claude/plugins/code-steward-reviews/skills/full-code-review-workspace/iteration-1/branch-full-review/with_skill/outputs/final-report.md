# Full Code Review Complete

**Scope:** 34 source files + 1 test file + configs on branch `master` vs initial commit `b8a2395` (Story 0 foundation: documentation engine SDK skeleton with types, contracts, stubs, and configuration resolution)

**Reviews run:** Standard, Security, Performance, Architecture, Test Coverage, Silent Failure

**Note:** The Agent tool was not available in this execution context. All 6 review passes were executed sequentially by the main agent (instead of in parallel via subagents), and synthesis was performed inline. See `orchestration-log.md` for details.

---

## Verification Summary

13 findings were identified across 6 review passes. After file-by-file verification against the actual source code, **11 findings survived verification** and 2 were eliminated as below-threshold. All surviving findings have confidence >= 80 and are categorized below.

---

## Critical Issues

### 1. Build Configuration Mismatch: tsconfig.json cannot produce distributable output

**Review type:** Architecture
**Confidence:** 95

- **File:** `code-wiki-gen/tsconfig.json:8`
- **Issue:** `tsconfig.json` sets `"noEmit": true`, but `package.json` declares `"main": "./dist/index.js"` and `"types": "./dist/index.d.ts"` with a `"build": "tsc -p tsconfig.json"` script. Running `npm run build` with `noEmit: true` produces zero output -- no `.js` files, no `.d.ts` files. The package cannot be consumed as a dependency.
- **Impact:** The SDK is not buildable. Anyone running `npm run build` or depending on this package via its `exports` field will get nothing. This blocks all downstream integration.
- **Recommendation:** Create a separate `tsconfig.build.json` that extends the base config but overrides `noEmit` to `false` and adds `outDir: "./dist"`, `declaration: true`, and `declarationDir: "./dist"`. Update the `build` script to use `tsconfig.build.json`. The current `tsconfig.json` with `noEmit: true` is appropriate for type-checking and test runs.

### 2. Unused production dependencies declared in package.json

**Review type:** Architecture
**Confidence:** 92

- **File:** `code-wiki-gen/package.json:33-36`
- **Issue:** Two production dependencies are declared but never imported anywhere in the source code:
  - `@anthropic-ai/claude-agent-sdk` (0.2.76)
  - `citty` (0.2.1)

  Verified by searching all files under `code-wiki-gen/src/` -- zero imports of either package.
- **Impact:** Inflated install size, misleading dependency graph, and potential version conflicts for consumers. The `claude-agent-sdk` in particular is a large package with many transitive dependencies.
- **Recommendation:** Move these to `devDependencies` if they're needed for future work, or remove them entirely if they were added prematurely. Only declare production dependencies that are actually imported by production code.

---

## High Issues

### 3. Python rglob("*") traverses entire repository without exclusions

**Review type:** Performance / Security
**Confidence:** 88

- **File:** `.claude/skills/doc-generation/scripts/analyze_repo.py:95`
- **Issue:** The new `check_dependencies()` function, when given a repo path, uses `repo.rglob("*")` to scan every file in the repository. This traverses into `node_modules/`, `.git/`, `dist/`, and all other directories without any filtering. For a large monorepo, this could scan hundreds of thousands of files just to check file extensions.
- **Impact:** Slow dependency check on large repos. On a monorepo with 100k+ files in `node_modules`, this could take multiple seconds. Also traverses symlinks, which could cause infinite loops or access files outside the repo.
- **Recommendation:** Apply the same exclusion patterns used by the `analyze()` function (skip `.git`, `node_modules`, `dist`, `build`, `venv`, etc.). Or use a more targeted approach: check only top-level and `src/` directories for language files, which is sufficient for language detection.

### 4. Configuration resolver lacks repoPath in resolved output

**Review type:** Standard
**Confidence:** 85

- **File:** `code-wiki-gen/src/config/resolver.ts:42-62`
- **Issue:** The `resolveConfiguration` function accepts a `ConfigurationRequest` that includes `repoPath`, and uses it to find the config file. However, the `ResolvedConfiguration` type does not include `repoPath`. After resolution, the caller has no way to know which repo path the configuration was resolved for, unless they track it separately.
- **Impact:** Downstream functions like `analyzeRepository` need a `repoPath` but can't get it from the resolved config. This creates a split where the caller must thread the `repoPath` through separately, increasing the coupling surface.
- **Recommendation:** Either add `repoPath` to `ResolvedConfiguration` (and make it required, defaulting to `process.cwd()` if not provided), or document this as an intentional design choice where `repoPath` is always provided separately by the caller.

### 5. Zod contract schemas allow unexpected types to pass silently

**Review type:** Standard
**Confidence:** 82

- **File:** `code-wiki-gen/src/contracts/configuration.ts:3-9`
- **Issue:** The `configurationRequestSchema` uses `z.object()` without `.strict()`. By default, Zod's `z.object()` in Zod v4 strips unknown properties during parsing (similar to `.strip()` in Zod v3). While the test "unknown fields in config file are silently ignored" explicitly tests this behavior, the `configurationRequestSchema` (used for caller input, not just file input) also silently strips unknown fields. If a caller passes `{ repoPath: "x", typoField: "y" }`, the typo is silently dropped.
- **Impact:** Callers may pass misspelled field names and not realize their configuration isn't being applied. This is a subtle usability issue for SDK consumers.
- **Recommendation:** Consider using `.strict()` on the `configurationRequestSchema` (caller-facing) while keeping the file schema lenient. This way, programmatic callers get feedback on typos while config files remain forward-compatible.

### 6. Guard script checks unstaged changes only, misses staged test modifications

**Review type:** Standard
**Confidence:** 83

- **File:** `code-wiki-gen/scripts/guard-no-test-changes.ts:3-5`
- **Issue:** The `guard-no-test-changes.ts` script runs `git diff --name-only -- test` which only detects unstaged changes. If a developer stages test file modifications (`git add test/...`) and then runs the green-verify script, the guard passes despite test files being modified. The `green-verify` script is meant to ensure tests were not changed during the green phase.
- **Impact:** False negative: modified test files that are staged will pass the guard, defeating its purpose.
- **Recommendation:** Add `--staged` check as well: run both `git diff --name-only -- test` and `git diff --staged --name-only -- test`, and fail if either produces output.

---

## Medium Issues

### 7. NotImplementedError stubs throw instead of returning EngineResult errors

**Review type:** Silent Failure / Architecture
**Confidence:** 85

- **File:** Multiple files (e.g., `code-wiki-gen/src/analysis/analyze.ts:11`, `code-wiki-gen/src/environment/check.ts:11`, `code-wiki-gen/src/metadata/reader.ts:10`, and 10+ others)
- **Issue:** All stub functions throw `NotImplementedError` instead of returning `EngineResult` error values. The SDK has a well-designed `EngineResult` discriminated union for error handling, but every unimplemented function bypasses it by throwing. Callers who write `const result = await analyzeRepository(opts); if (!result.ok) { ... }` will get an uncaught exception instead of an error result.
- **Impact:** Any caller that uses the SDK before all functions are implemented will encounter unhandled exceptions instead of the documented error protocol. If these stubs ship in an intermediate release, they'll crash caller applications.
- **Recommendation:** Change stubs to return `err("ANALYSIS_ERROR", "analyzeRepository is not yet implemented")` (or appropriate error codes). This preserves the contract that callers can always handle errors through the result type. If you want to keep `throw` to make it obvious during development, add a clear warning in the SDK docs that unimplemented functions throw rather than returning errors.

### 8. No integration tests or unit tests for most modules

**Review type:** Test Coverage
**Confidence:** 90

- **File:** `code-wiki-gen/test/` (directory)
- **Issue:** There is exactly 1 test file (`test/config/resolver.test.ts` with 11 test cases) covering `resolveConfiguration`. No other module has tests:
  - `config/file-loader.ts` -- no direct tests (tested indirectly through resolver)
  - `config/defaults.ts` -- no tests
  - `contracts/*.ts` -- no schema validation tests
  - `types/common.ts` -- no tests for `ok()`, `err()`, `NotImplementedError`
  - All stub modules -- no tests

  The `test/integration/` directory referenced by `vitest.integration.config.ts` does not exist.
- **Impact:** The only implemented feature (configuration resolution) has good test coverage. But no other code is tested. Foundation code like `ok()`, `err()`, and the Zod schemas should have tests to prevent regressions as the codebase grows.
- **Recommendation:** This is Story 0 (Foundation), so the stubs being untested is expected -- they'll get tests when implemented. However, add tests for: (a) `ok()` and `err()` helper functions, (b) `NotImplementedError` class, (c) `getDefaults()`, (d) Zod schema edge cases (e.g., does `configurationFileSchema` correctly reject `repoPath`?). Also create the `test/integration/` directory to avoid confusing the test config.

### 9. Validation types/contracts have a module-tree circular reference pattern

**Review type:** Architecture
**Confidence:** 80

- **File:** `code-wiki-gen/src/contracts/validation.ts:29-34`
- **Issue:** The `moduleTreeEntrySchema` uses `z.lazy()` for recursive self-reference, which is correct. However, the types `ModuleTree` and `ModuleTreeEntry` are defined in `types/validation.ts` (lines 25-31) and separately referenced in `contracts/validation.ts` via import. The Zod schema uses `z.ZodType<ModuleTreeEntry>` for type annotation, creating a tight coupling between the contracts layer and the types layer. If the type changes, both files must be updated in sync.
- **Impact:** Low immediate risk since the types are simple. But as the validation system grows, maintaining Zod schemas and TypeScript interfaces in two separate files for the same shapes increases the chance of drift.
- **Recommendation:** Consider using Zod's `z.infer<>` to derive the TypeScript types from the schemas (single source of truth), or accept the duplication as an intentional separation of concerns and add a comment noting the coupling.

### 10. `STRUCTURAL_FILES` exported as mutable Set from a types file

**Review type:** Standard
**Confidence:** 81

- **File:** `code-wiki-gen/src/types/validation.ts:33`
- **Issue:** `STRUCTURAL_FILES` is a `new Set(["overview.md"])` exported from a types file. This is a runtime value (not a type), placed in a file that should only contain type definitions. Additionally, it's a mutable `Set` -- any consumer can call `.add()` or `.delete()` on it, mutating the shared constant.
- **Impact:** Violates the convention that `types/` files contain only type definitions. The mutable Set could be accidentally modified at runtime, causing subtle bugs in validation logic.
- **Recommendation:** Move `STRUCTURAL_FILES` to a constants file (e.g., `src/validation/constants.ts` or `src/contracts/validation.ts`) and make it a `ReadonlySet` or a frozen `as const` array.

### 11. Python analyze_repo.py check_dependencies does not validate repo_path exists before using it

**Review type:** Security
**Confidence:** 80

- **File:** `.claude/skills/doc-generation/scripts/analyze_repo.py:91-98`
- **Issue:** The `check_dependencies()` function receives `repo_path` as a string and constructs a `Path(repo_path)`. It checks `repo.is_dir()` before scanning, which is good. However, if `repo_path` is a symlink to a directory outside the intended scope, `rglob("*")` will follow it and scan arbitrary filesystem locations. There is no canonicalization or boundary check.
- **Impact:** Low risk in practice since this is a CLI tool run by the user on their own machine. But if integrated into a service context, a symlinked repo_path could cause the tool to scan unintended directories.
- **Recommendation:** Use `repo.resolve()` to canonicalize the path, and optionally add a check that the resolved path is a real directory (not a symlink chain to somewhere unexpected).

---

## Positive Observations

- **Well-designed EngineResult type.** The discriminated union pattern (`{ ok: true, value: T } | { ok: false, error: EngineError }`) is clean, ergonomic, and avoids the pitfalls of exception-based error handling. The `ok()` and `err()` helper functions are a nice touch.

- **Thorough configuration resolution.** The three-layer merge (defaults -> file -> caller) is correctly implemented with clean precedence. The glob syntax validation in the resolver is a thoughtful touch that catches malformed patterns early.

- **Good test quality.** The existing test file (`resolver.test.ts`) is well-structured with descriptive test case IDs (TC-5.1a, TC-5.2b, etc.), covers both happy paths and error cases, and uses a proper assertion helper (`expectResolved`). This sets a strong pattern for future tests.

- **Clean project structure.** The module organization (`adapters/`, `analysis/`, `config/`, `contracts/`, `environment/`, `metadata/`, `types/`, `validation/`) maps well to the tech design and creates clear separation of concerns.

- **Strict TypeScript config.** `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`, and `isolatedModules: true` represent a rigorous TypeScript setup that will catch many issues at compile time.

- **Biome over ESLint+Prettier.** Using Biome as the single linter/formatter is a modern, fast choice that avoids configuration sprawl.

---

## Summary Table

| # | Severity | Review Type | File | Description | Confidence |
|---|----------|-------------|------|-------------|------------|
| 1 | Critical | Architecture | `tsconfig.json` | Build config cannot produce output (`noEmit: true` + `build` script) | 95 |
| 2 | Critical | Architecture | `package.json` | Unused production deps (claude-agent-sdk, citty) | 92 |
| 3 | High | Performance | `analyze_repo.py:95` | `rglob("*")` scans entire repo without exclusions | 88 |
| 4 | High | Standard | `resolver.ts` | `repoPath` lost after config resolution | 85 |
| 5 | High | Standard | `configuration.ts` | Caller-facing schema silently strips unknown fields | 82 |
| 6 | High | Standard | `guard-no-test-changes.ts` | Guard misses staged test modifications | 83 |
| 7 | Medium | Silent Failure | Multiple stubs | Stubs throw instead of returning EngineResult errors | 85 |
| 8 | Medium | Test Coverage | `test/` | Only 1 test file; no tests for types, contracts, defaults | 90 |
| 9 | Medium | Architecture | `contracts/validation.ts` | Zod/TypeScript type duplication creates drift risk | 80 |
| 10 | Medium | Standard | `types/validation.ts:33` | Mutable runtime constant in types file | 81 |
| 11 | Medium | Security | `analyze_repo.py:91` | No path canonicalization before rglob traversal | 80 |

---

## Structured JSON Block

```json
{
  "review_type": "full-code-review",
  "findings": [
    {
      "file": "code-wiki-gen/tsconfig.json",
      "line": 8,
      "severity": "critical",
      "category": "build_configuration",
      "description": "tsconfig.json sets noEmit: true but package.json declares dist/ output paths and a tsc build script. Build produces nothing.",
      "recommendation": "Create tsconfig.build.json with noEmit: false, outDir: './dist', declaration: true. Update build script to use it.",
      "confidence": 95
    },
    {
      "file": "code-wiki-gen/package.json",
      "line": 33,
      "end_line": 36,
      "severity": "critical",
      "category": "unused_dependency",
      "description": "Production dependencies @anthropic-ai/claude-agent-sdk and citty are declared but never imported in any source file.",
      "recommendation": "Move to devDependencies or remove if not yet needed.",
      "confidence": 92
    },
    {
      "file": ".claude/skills/doc-generation/scripts/analyze_repo.py",
      "line": 95,
      "severity": "high",
      "category": "performance",
      "description": "rglob('*') in check_dependencies traverses entire repo including node_modules, .git, etc.",
      "recommendation": "Apply exclusion patterns (skip .git, node_modules, dist, build, venv) or scan only top-level and src/ directories.",
      "confidence": 88
    },
    {
      "file": "code-wiki-gen/src/config/resolver.ts",
      "line": 42,
      "end_line": 62,
      "severity": "high",
      "category": "api_design",
      "description": "repoPath from ConfigurationRequest is not carried into ResolvedConfiguration. Callers must track it separately.",
      "recommendation": "Add repoPath to ResolvedConfiguration or document as intentional design choice.",
      "confidence": 85
    },
    {
      "file": "code-wiki-gen/src/contracts/configuration.ts",
      "line": 3,
      "end_line": 9,
      "severity": "high",
      "category": "input_validation",
      "description": "configurationRequestSchema uses z.object() without .strict(), silently stripping unknown fields from caller input.",
      "recommendation": "Use .strict() on the caller-facing schema to catch typos; keep file schema lenient.",
      "confidence": 82
    },
    {
      "file": "code-wiki-gen/scripts/guard-no-test-changes.ts",
      "line": 3,
      "end_line": 5,
      "severity": "high",
      "category": "logic_bug",
      "description": "Guard only checks unstaged changes (git diff), misses staged test modifications (git diff --staged).",
      "recommendation": "Also run git diff --staged --name-only -- test and fail if either produces output.",
      "confidence": 83
    },
    {
      "file": "code-wiki-gen/src/analysis/analyze.ts",
      "line": 11,
      "severity": "medium",
      "category": "error_handling",
      "description": "Stub functions throw NotImplementedError instead of returning EngineResult error values, bypassing the documented error protocol.",
      "recommendation": "Return err() results from stubs instead of throwing, or document the throw behavior.",
      "confidence": 85
    },
    {
      "file": "code-wiki-gen/test/",
      "line": 0,
      "severity": "medium",
      "category": "test_coverage",
      "description": "Only 1 test file exists (resolver.test.ts). No tests for ok/err helpers, NotImplementedError, getDefaults, Zod schemas, or stubs.",
      "recommendation": "Add tests for foundational utilities (ok, err, getDefaults) and schema edge cases. Create test/integration/ directory.",
      "confidence": 90
    },
    {
      "file": "code-wiki-gen/src/contracts/validation.ts",
      "line": 29,
      "end_line": 34,
      "severity": "medium",
      "category": "coupling",
      "description": "Zod schemas and TypeScript interfaces for validation types are maintained in separate files with tight coupling via ZodType<T> annotations.",
      "recommendation": "Use z.infer<> to derive types from schemas (single source of truth) or document the intentional duplication.",
      "confidence": 80
    },
    {
      "file": "code-wiki-gen/src/types/validation.ts",
      "line": 33,
      "severity": "medium",
      "category": "convention_violation",
      "description": "STRUCTURAL_FILES is a mutable runtime Set exported from a types-only file.",
      "recommendation": "Move to a constants file and change to ReadonlySet or frozen array.",
      "confidence": 81
    },
    {
      "file": ".claude/skills/doc-generation/scripts/analyze_repo.py",
      "line": 91,
      "end_line": 98,
      "severity": "medium",
      "category": "path_traversal",
      "description": "check_dependencies does not canonicalize repo_path before rglob traversal. Symlinks could cause scanning outside intended scope.",
      "recommendation": "Use repo.resolve() to canonicalize the path before scanning.",
      "confidence": 80
    }
  ],
  "summary": {
    "total_findings": 11,
    "critical": 2,
    "high": 4,
    "medium": 5,
    "files_reviewed": 40
  }
}
```
