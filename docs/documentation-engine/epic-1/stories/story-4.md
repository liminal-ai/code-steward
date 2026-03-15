# Story 4: Metadata & Status

## Objective

Callers can read and write documentation metadata and query staleness status
without running generation. Status is derived from metadata presence and commit
hash comparison — a four-state model (not_generated, current, stale, invalid)
that tells the caller exactly what state the documentation is in.

## Scope

### In Scope

- `getDocumentationStatus()` SDK operation
- `readMetadata()` SDK operation
- `writeMetadata()` SDK operation
- Four-state status derivation (not_generated / current / stale / invalid)
- `.doc-meta.json` read, write, and shape validation
- Commit hash comparison against current HEAD
- Shared metadata shape validation (via `metadata/validate-shape.ts`, also used by Story 5's validation pipeline)

### Out of Scope

- Validation pipeline (Story 5)
- Any generation workflow that would produce metadata (Epic 2)

## Dependencies / Prerequisites

- Story 1 complete (configuration provides resolved output path for metadata location)

## Acceptance Criteria

**AC-3.1:** Status query returns `"not_generated"` when no metadata file exists in the output directory.

- **TC-3.1a: Output directory does not exist**
  - Given: Output path does not exist on disk
  - When: Caller queries status
  - Then: `state` is `"not_generated"`; `lastGeneratedAt` and `lastGeneratedCommitHash` are `null`
- **TC-3.1b: Output directory exists but no metadata file**
  - Given: Output path exists but contains no `.doc-meta.json`
  - When: Caller queries status
  - Then: `state` is `"not_generated"`

**AC-3.2:** Status query returns `"current"` when metadata exists and stored commit hash matches current HEAD.

- **TC-3.2a: Documentation is current**
  - Given: `.doc-meta.json` exists with `commitHash` matching repo HEAD
  - When: Caller queries status
  - Then: `state` is `"current"`; `lastGeneratedCommitHash` and `currentHeadCommitHash` are equal

**AC-3.3:** Status query returns `"stale"` when metadata exists and stored commit hash differs from current HEAD.

- **TC-3.3a: Documentation is stale**
  - Given: `.doc-meta.json` has `commitHash: "abc123"`; repo HEAD is `"def456"`
  - When: Caller queries status
  - Then: `state` is `"stale"`; `lastGeneratedCommitHash` is `"abc123"`; `currentHeadCommitHash` is `"def456"`

**AC-3.4:** Status query returns `"invalid"` when metadata exists but its shape is malformed or required fields are missing.

- **TC-3.4a: Malformed metadata file**
  - Given: `.doc-meta.json` exists but is not valid JSON
  - When: Caller queries status
  - Then: `state` is `"invalid"`
- **TC-3.4b: Missing required fields**
  - Given: `.doc-meta.json` is valid JSON but missing `commitHash`
  - When: Caller queries status
  - Then: `state` is `"invalid"`

**AC-3.5:** Metadata write persists generation mode, ISO 8601 UTC timestamp, commit hash, output path, list of generated files, and component count to `.doc-meta.json`.

- **TC-3.5a: Write metadata for full generation mode**
  - Given: Caller provides a valid `GeneratedDocumentationMetadata` payload with `mode: "full"`
  - When: Engine writes metadata to the output directory
  - Then: `.doc-meta.json` contains `mode: "full"`, ISO 8601 `generatedAt`, `commitHash`, `outputPath`, populated `filesGenerated` array, and `componentCount`
- **TC-3.5b: Write metadata for update mode**
  - Given: Caller provides a valid `GeneratedDocumentationMetadata` payload with `mode: "update"`; a previous `.doc-meta.json` exists
  - When: Engine writes metadata to the output directory
  - Then: `.doc-meta.json` contains `mode: "update"` with the new commit hash and timestamp; previous metadata is replaced

**AC-3.6:** Metadata read returns the complete `GeneratedDocumentationMetadata` object or a structured error.

- **TC-3.6a: Successful read**
  - Given: Valid `.doc-meta.json` exists
  - When: Engine reads metadata
  - Then: Complete `GeneratedDocumentationMetadata` returned with all fields populated
- **TC-3.6b: Corrupted metadata**
  - Given: `.doc-meta.json` is corrupted or has an invalid shape
  - When: Engine reads metadata
  - Then: Structured error returned with code `METADATA_ERROR`; no silent fallback to default values

## Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Output directory doesn't exist | Status: `"not_generated"` (not an error) |
| `.doc-meta.json` is invalid JSON | Status: `"invalid"` (for status query); `METADATA_ERROR` (for readMetadata) |
| `.doc-meta.json` missing required fields | Status: `"invalid"` (for status query); `METADATA_ERROR` (for readMetadata) |

## Definition of Done

- [ ] All ACs met (AC-3.1 through AC-3.6)
- [ ] All TC conditions verified (TC-3.1a through TC-3.6b)
- [ ] `verify` script passes

---
