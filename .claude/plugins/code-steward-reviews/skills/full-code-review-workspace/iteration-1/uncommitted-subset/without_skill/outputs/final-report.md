# Code Review: Standard + Security

**Branch:** `master`
**Scope:** Uncommitted local changes (unstaged modifications + untracked files)
**Review types:** Standard code quality, Security
**Date:** 2026-03-15

---

## Executive Summary

The changeset replaces `NotImplementedError` stubs in the configuration subsystem (`defaults.ts`, `file-loader.ts`, `resolver.ts`) with complete implementations. A new type (`ConfigurationErrorDetails`) and a comprehensive test file are added. Documentation prompts received a mechanical path-absolutization pass.

**Overall assessment:** The code is well-structured, follows consistent patterns, and demonstrates careful defensive programming. A few findings are noted below, mostly low severity. One security observation is worth consideration.

---

## Standard Code Quality Findings

### S-1: Zod `strip` behavior relied upon implicitly for unknown-field tolerance (Low)

**File:** `code-wiki-gen/src/contracts/configuration.ts`
**Lines:** 11-13 (`configurationFileSchema`)

The test `"unknown fields in config file are silently ignored"` (resolver.test.ts:173) passes because Zod's default behavior for `.object()` is to strip unknown keys. This is correct behavior but is implicit -- if someone later adds `.strict()` to the schema (perhaps as a "hardening" measure), the test would break and real config files with forward-compatible fields would start failing.

**Recommendation:** Add a comment on the schema noting that strip-unknown behavior is intentional, or explicitly call `.strip()` to make the intent self-documenting.

---

### S-2: `getGlobSyntaxError` validates bracket/brace pairing but not all glob edge cases (Low)

**File:** `code-wiki-gen/src/config/resolver.ts`
**Lines:** 171-208

The custom glob syntax validator checks for balanced `[]`, `{}`, and `()` pairs with escape handling. This is a reasonable heuristic, but it does not catch all malformed globs (e.g., `***/` or empty character classes `[]`). This is acceptable for a pre-validation pass -- the real glob engine will catch deeper issues at runtime -- but it is worth noting that the function name `getGlobSyntaxError` implies more completeness than it delivers.

**Recommendation:** Consider renaming to `getGlobBalanceError` or adding a doc comment clarifying it only checks bracket/brace balance.

---

### S-3: `validatePaths` is restricted to `"focusDirs"` literal type (Informational)

**File:** `code-wiki-gen/src/config/resolver.ts`
**Lines:** 154-168

The `fieldName` parameter is typed as the literal `"focusDirs"`. If another path-typed array field is added to the configuration, this function would need its type widened. This is not a bug -- it enforces current correctness -- but contrasts with `validatePatterns` which already accepts a union of two field names.

**Recommendation:** No action needed now. Just noting for future maintainers.

---

### S-4: Double validation -- Zod parse then manual validation (Informational)

**File:** `code-wiki-gen/src/config/resolver.ts`
**Lines:** 64-88 (Zod parse of resolved config), then 80-88 (manual `validateResolvedConfiguration`)

The resolved configuration is validated first by `resolvedConfigurationSchema.safeParse()` and then again by `validateResolvedConfiguration()`. The Zod schema validates structural types (string, array of strings), while the manual validation checks semantic constraints (non-empty strings, glob syntax). This layering is intentional and sound -- Zod handles shape, manual code handles business rules. No change needed; this note is for clarity.

---

### S-5: Test file uses only the `expectResolved` helper for success paths (Informational)

**File:** `code-wiki-gen/test/config/resolver.test.ts`
**Lines:** 5-17

The `expectResolved` helper is well-designed: it asserts `ok === true` and then throws with a descriptive message if the narrowing guard fails. This is a clean pattern for discriminated-union result types in tests.

For the error-path tests (TC-5.4a, TC-5.4b, malformed JSON), the pattern of checking `result.ok === false` with an early return is also correct and avoids the need for a mirrored `expectFailed` helper, though adding one could reduce repetition.

**Recommendation:** Optional. A symmetric `expectFailed` helper could reduce the ~8 lines of error-path boilerplate in each error test to ~1.

---

### S-6: Defensive array cloning is thorough (Positive)

**File:** `code-wiki-gen/src/config/defaults.ts` (lines 17-21) and `code-wiki-gen/src/config/resolver.ts` (line 93)

`getDefaults()` returns fresh array copies via spread, and `cloneStringArray` is used throughout the resolver. This prevents callers from mutating shared default state. Good practice.

---

## Security Findings

### SEC-1: `repoPath` used directly in filesystem path construction without sanitization (Medium)

**File:** `code-wiki-gen/src/config/file-loader.ts`
**Line:** 20

```typescript
const configPath = path.join(repoPath, CONFIG_FILE_NAME);
```

The `repoPath` value comes from the caller's `ConfigurationRequest.repoPath` and is used directly with `path.join()` to construct a filesystem read path. There is no validation that:
1. The path is absolute (or relative to an expected root)
2. The path does not contain traversal sequences (e.g., `../../etc`)
3. The path resolves to within an expected boundary

In the current threat model -- where `repoPath` is provided by a trusted caller (the Code Steward host or CLI) -- this is acceptable. However, if this SDK is ever exposed to less-trusted input (e.g., a web API, a config file from an untrusted repo), the lack of path validation could allow reading arbitrary files from the filesystem (limited to the fixed filename `.docengine.json`, which substantially reduces the impact).

**Impact:** An attacker who controls `repoPath` can read any file named `.docengine.json` anywhere on the filesystem accessible to the process. The fixed filename limits exploitation but does not eliminate it.

**Recommendation:** Add a `repoPath` validation step before filesystem access. At minimum, verify it is an absolute path. For stronger guarantees, resolve it and confirm it falls within an expected boundary. The Zod schema for `configurationRequestSchema` currently only checks that `repoPath` is an optional string -- adding `.refine()` constraints there would centralize the validation.

---

### SEC-2: Error messages include raw filesystem paths (Low)

**File:** `code-wiki-gen/src/config/file-loader.ts`
**Lines:** 33, 49, 65

Error messages and `ConfigurationErrorDetails.path` include the fully resolved `configPath`:

```typescript
`Unable to read configuration file at ${configPath}`
```

If these error messages are surfaced to end users (e.g., in a CLI, web UI, or log), they leak the server-side filesystem layout. For a local CLI tool this is benign, but it could be a concern if error details are ever serialized across a trust boundary.

**Recommendation:** For current use as a local SDK, this is fine. If the SDK is later exposed via a network service, consider sanitizing paths in user-facing error messages while keeping full paths in internal logs.

---

### SEC-3: `JSON.parse` on untrusted file content (Low)

**File:** `code-wiki-gen/src/config/file-loader.ts`
**Lines:** 44-45

```typescript
parsed = JSON.parse(fileContents);
```

`JSON.parse` is used on file contents read from disk. While `JSON.parse` itself is safe against prototype pollution (unlike some YAML parsers or custom deserializers), the parsed output is immediately passed to Zod's `safeParse`, which validates the structure. This is the correct approach -- the Zod schema acts as a sanitization boundary.

No action needed. This is noted as a positive finding: the parse-then-validate pattern is sound.

---

### SEC-4: Absolute local paths in documentation prompts (Low)

**Files:** All 20 modified `docs/documentation-engine/epic-*/prompts/story-*-implementation-prompt.md` files

The documentation prompts have been updated from relative paths to absolute paths containing the local machine path `/Users/leemoore/code/code-steward/...`. These files are intended to be checked into version control.

While this is not a code security issue, it constitutes minor information leakage:
- Reveals the local username (`leemoore`)
- Reveals the local directory structure
- Makes the prompts non-portable to other developer machines

**Recommendation:** Consider whether these prompts are intended to be portable. If so, use a path variable or relative paths. If they are intentionally machine-specific (e.g., generated for local agent handoff and not meant for distribution), this is acceptable.

---

### SEC-5: No sensitive data in config fixtures (Positive)

**Files:** `code-wiki-gen/test/fixtures/config/*/.docengine.json`

The test fixtures contain only structural configuration data (output paths, glob patterns). No secrets, tokens, or credentials are present. Good.

---

## Test Quality Assessment

**File:** `code-wiki-gen/test/config/resolver.test.ts`

| Aspect | Assessment |
|--------|-----------|
| Coverage of happy paths | Good -- tests default resolution, caller overrides, file overrides, and 3-layer precedence |
| Coverage of error paths | Good -- tests empty outputPath, malformed globs, malformed JSON, and schema validation |
| Edge case: extra fields tolerance | Covered (line 173) |
| Missing: `repoPath` to nonexistent directory | Not tested (would exercise the ENOENT branch in file-loader when the directory itself doesn't exist, vs. just the file) |
| Missing: `repoPath` as empty string | Not tested (empty string is falsy in JS but is a valid string -- `path.join("", ".docengine.json")` resolves to `.docengine.json` in CWD, which may be unintended) |
| Missing: concurrent resolution calls | Not tested (likely not needed for this pure-functional design) |
| Assertion style | Consistent, using `expect` with `toEqual`, `toBe`, `toMatchObject`, `arrayContaining` |

---

## Summary of Findings

| ID | Severity | Category | File | Summary |
|----|----------|----------|------|---------|
| SEC-1 | Medium | Security | `file-loader.ts:20` | `repoPath` used in path construction without boundary validation |
| SEC-2 | Low | Security | `file-loader.ts:33,49,65` | Raw filesystem paths in error messages |
| SEC-3 | Low (Positive) | Security | `file-loader.ts:44-45` | JSON.parse + Zod validation is the correct pattern |
| SEC-4 | Low | Security | `docs/**/prompts/*.md` | Absolute local paths with username leaked in documentation |
| SEC-5 | N/A (Positive) | Security | `test/fixtures/config/` | No secrets in fixtures |
| S-1 | Low | Standard | `configuration.ts:11-13` | Implicit Zod strip behavior for unknown fields |
| S-2 | Low | Standard | `resolver.ts:171-208` | Glob validator name implies more completeness than delivered |
| S-3 | Informational | Standard | `resolver.ts:154-168` | `validatePaths` restricted to single field name literal |
| S-4 | Informational | Standard | `resolver.ts:64-88` | Double validation is intentional layering (Zod shape + business rules) |
| S-5 | Informational | Standard | `resolver.test.ts:5-17` | Optional `expectFailed` helper could reduce error-test boilerplate |
| S-6 | N/A (Positive) | Standard | `defaults.ts`, `resolver.ts` | Defensive array cloning prevents shared-state mutation |

---

## Actionable Recommendations (Priority Order)

1. **SEC-1 (Medium):** Add path validation for `repoPath` before using it in filesystem operations. At minimum, verify it is an absolute path. Consider adding a `.refine()` to the Zod schema.

2. **SEC-4 (Low):** Decide whether the absolute-path prompts are intentional for local-only use or if they should be portable. If the latter, revert to relative paths or use a variable.

3. **S-1 (Low):** Make the Zod strip-unknown behavior explicit on `configurationFileSchema` via `.strip()` or a comment.

4. **S-2 (Low):** Clarify the scope of `getGlobSyntaxError` via rename or doc comment.

5. **Test gap:** Add a test for `repoPath: ""` to verify the behavior when an empty string is provided (it will resolve to `".docengine.json"` in CWD via `path.join`).
