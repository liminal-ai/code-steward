# Story 1: Configuration Resolution

## Objective

Callers can resolve configuration from built-in defaults, an optional config
file, and explicit caller-provided options. The three-level priority merge
produces a fully populated `ResolvedConfiguration` with no undefined fields.
Invalid configuration produces a typed error, not a crash or silent fallback.

## Scope

### In Scope

- `resolveConfiguration()` SDK operation
- Built-in default values
- Config file discovery and loading (`.docengine.json` in repo root)
- Three-level field-by-field merge (caller > config file > defaults)
- Validation of merged result (empty paths, malformed globs)
- `CONFIGURATION_ERROR` for invalid values

### Out of Scope

- Environment checks (Story 2)
- Any operation that consumes resolved configuration — this story delivers the resolution capability only

## Dependencies / Prerequisites

- Story 0 complete (types, fixtures, project skeleton)

## Acceptance Criteria

**AC-5.1:** Built-in defaults are applied when no explicit configuration or config file is provided.

- **TC-5.1a: Default output path**
  - Given: No output path configured anywhere
  - When: Engine resolves configuration
  - Then: Output path defaults to `"docs/wiki"` relative to repo root
- **TC-5.1b: Default exclude patterns**
  - Given: No exclude patterns configured anywhere
  - When: Engine resolves configuration
  - Then: Default exclude patterns are applied (at minimum: `node_modules`, `.git`, common build output directories)

**AC-5.2:** Caller-provided options take highest priority, overriding both config file values and defaults.

- **TC-5.2a: Explicit output path overrides default**
  - Given: No config file exists; caller provides `outputPath: "docs/api-docs"`
  - When: Engine resolves configuration
  - Then: Output path is `"docs/api-docs"`
- **TC-5.2b: Explicit option overrides config file**
  - Given: Config file sets `outputPath: "docs/generated"`; caller provides `outputPath: "docs/api-docs"`
  - When: Engine resolves configuration
  - Then: Output path is `"docs/api-docs"`
- **TC-5.2c: Partial override**
  - Given: Config file sets `outputPath: "docs/generated"` and `excludePatterns: ["**/test/**"]`; caller provides only `outputPath: "docs/custom"`
  - When: Engine resolves configuration
  - Then: Output path is `"docs/custom"`; exclude patterns come from config file

**AC-5.3:** Engine config file provides values when no caller-provided options are set for those fields.

- **TC-5.3a: Config file value used**
  - Given: Config file sets `outputPath: "docs/generated"`; caller does not set `outputPath`
  - When: Engine resolves configuration
  - Then: Output path is `"docs/generated"`
- **TC-5.3b: Missing config file is not an error**
  - Given: No config file exists in the repo root
  - When: Engine resolves configuration
  - Then: Built-in defaults used; no error returned

**AC-5.4:** Invalid configuration values produce a structured error identifying the field and the problem.

- **TC-5.4a: Invalid output path**
  - Given: Caller provides `outputPath: ""` (empty string)
  - When: Engine attempts to resolve configuration
  - Then: Structured error with code `CONFIGURATION_ERROR` identifying `outputPath` as invalid with reason
- **TC-5.4b: Invalid pattern syntax**
  - Given: Caller provides `includePatterns: ["[invalid"]` (malformed glob)
  - When: Engine attempts to resolve configuration
  - Then: Structured error with code `CONFIGURATION_ERROR` identifying the invalid pattern

**AC-5.5:** Resolved configuration is accessible as a typed `ResolvedConfiguration` object with all fields populated.

- **TC-5.5a: Complete resolution**
  - Given: Configuration resolved from a mix of caller options, config file, and defaults
  - When: Caller accesses the resolved configuration
  - Then: `ResolvedConfiguration` object has all fields populated with their resolved values; no fields are undefined

## Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Empty output path | `CONFIGURATION_ERROR` with field name and reason |
| Malformed glob pattern | `CONFIGURATION_ERROR` identifying the invalid pattern |
| Malformed JSON in config file | `CONFIGURATION_ERROR` with parse error detail |

## Definition of Done

- [ ] All ACs met (AC-5.1 through AC-5.5)
- [ ] All TC conditions verified (TC-5.1a through TC-5.5a)
- [ ] `verify` script passes

---
