# Story 0: Foundation

## Objective

Establish the shared infrastructure that all subsequent stories build on. After
this story, the package compiles, all types are importable, test fixtures exist,
and the project is ready for TDD cycles.

## Scope

### In Scope

- Package skeleton (package.json, tsconfig.json, vitest.config.ts, biome.json)
- All type definitions from the epic's data contracts
- `EngineResult<T>` discriminated union, `EngineError`, `EngineErrorCode`
- `NotImplementedError` class for skeleton stubs
- `ok()` / `err()` result constructor helpers
- `STRUCTURAL_FILES` constant for validation
- Test fixture repos (valid-ts, empty, multi-lang, no-git)
- Test fixture doc outputs (valid, broken-links, missing-overview, missing-tree, missing-meta, warnings-only, inconsistent-tree, bad-mermaid, corrupt-metadata, missing-metadata-fields)
- Test fixture configs (valid-config, invalid-config, extra-fields-config, no-config)
- Test helper utilities (fixture paths, temp directory management, git helpers)
- Biome-based lint/format configuration and verification scripts

### Out of Scope

- Any SDK operation implementation (Stories 1-5)
- Any TDD cycle (types and fixtures don't need test-driven development)

## Dependencies / Prerequisites

- None — this is the first story

## Exit Criteria

- [ ] `typecheck` script (`tsc --noEmit`) passes
- [ ] All types importable from `src/types/index.ts`
- [ ] All fixture repos exist with expected directory structure and committed files
- [ ] All fixture doc output directories contain expected files with expected characteristics
- [ ] `red-verify` script passes (Biome + typecheck)

---
