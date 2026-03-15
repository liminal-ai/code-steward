# Story 5: Documentation Validation

## Objective

Callers can validate an existing documentation output directory and receive a
structured report of completeness, consistency, and quality issues. Validation
covers file presence, internal cross-links, metadata shape, module-tree
consistency, and basic Mermaid syntax. All checks run locally, no agent
involved.

## Scope

### In Scope

- `validateDocumentation()` SDK operation
- File presence checks (overview.md, module-tree.json, .doc-meta.json)
- Internal relative markdown link verification (narrow scope: generated pages only, no external URLs)
- Metadata shape validation (delegates to shared `validate-shape.ts` from Story 4)
- Module-tree ↔ page file consistency (structural files excluded from orphan check)
- Basic Mermaid syntax validation (regex-based: diagram type + bracket balance)
- Aggregate `ValidationResult` with status, counts, and findings
- Check gating: checks no-op when their target file is absent (no duplicate findings with file-presence check)

### Out of Scope

- Agent-driven validation repair (Epic 2)
- External URL validation

## Dependencies / Prerequisites

- Story 4 complete (shared metadata-shape validation utility)

## Acceptance Criteria

**AC-4.1:** Validation runs as a standalone operation and accepts an output directory path.

- **TC-4.1a: Valid output directory**
  - Given: Output directory contains valid generated documentation
  - When: Caller invokes validation
  - Then: `ValidationResult` returned with `status: "pass"`, zero errors, zero warnings
- **TC-4.1b: Nonexistent directory**
  - Given: Output path does not exist
  - When: Caller invokes validation
  - Then: `ValidationResult` returned with `status: "fail"` and a finding identifying the missing directory

**AC-4.2:** Missing expected files are reported individually with the missing file path.

- **TC-4.2a: Missing overview.md**
  - Given: Output directory exists but `overview.md` is missing
  - When: Validation runs
  - Then: Finding with `severity: "error"`, `category: "missing-file"`, identifying `overview.md`
- **TC-4.2b: Missing module-tree.json**
  - Given: Output directory exists but `module-tree.json` is missing
  - When: Validation runs
  - Then: Finding with `severity: "error"`, `category: "missing-file"`, identifying `module-tree.json`
- **TC-4.2c: Missing .doc-meta.json**
  - Given: Output directory exists but `.doc-meta.json` is missing
  - When: Validation runs
  - Then: Finding with `severity: "error"`, `category: "missing-file"`, identifying `.doc-meta.json`

**AC-4.3:** Internal relative markdown links between generated documentation pages are verified. Broken internal links are reported with source file and target path. External URLs are out of scope.

- **TC-4.3a: Valid cross-links**
  - Given: Page A links to Page B; both exist in the output directory
  - When: Validation runs
  - Then: No link-related findings
- **TC-4.3b: Broken cross-link**
  - Given: Page A contains a markdown link to `page-c.md`; `page-c.md` does not exist
  - When: Validation runs
  - Then: Finding with `severity: "error"`, `category: "broken-link"`, `filePath` identifying Page A, `target` identifying `page-c.md`

**AC-4.4:** Module-tree consistency is verified: every module in `module-tree.json` has a corresponding markdown page, and every markdown page that is not a known structural file (`overview.md`) has an entry in the module tree.

- **TC-4.4a: Consistent tree**
  - Given: `module-tree.json` references modules A, B, C; pages `a.md`, `b.md`, `c.md` exist; `overview.md` exists
  - When: Validation runs
  - Then: No module-tree findings (`overview.md` is excluded from orphan check)
- **TC-4.4b: Module in tree with no page**
  - Given: `module-tree.json` references module D; no corresponding `d.md` exists
  - When: Validation runs
  - Then: Finding with `severity: "error"`, `category: "module-tree"`, identifying module D
- **TC-4.4c: Module page exists but not in tree**
  - Given: `e.md` exists in the output directory; `module-tree.json` does not reference module E; `e.md` is not a known structural file
  - When: Validation runs
  - Then: Finding with `severity: "warning"`, `category: "module-tree"`, identifying orphaned page `e.md`
- **TC-4.4d: Structural files excluded from orphan check**
  - Given: `overview.md` exists in the output directory; `module-tree.json` does not reference it
  - When: Validation runs
  - Then: No orphan warning for `overview.md`

**AC-4.5:** Mermaid code blocks in documentation pages pass basic syntax validation.

- **TC-4.5a: Valid Mermaid block**
  - Given: A documentation page contains a well-formed Mermaid diagram
  - When: Validation runs
  - Then: No Mermaid-related findings for that page
- **TC-4.5b: Malformed Mermaid block**
  - Given: A documentation page contains a Mermaid block with syntax errors
  - When: Validation runs
  - Then: Finding with `severity: "warning"`, `category: "mermaid"`, identifying the page

**AC-4.6:** Validation returns a structured `ValidationResult` with overall status, counts, and individual findings.

- **TC-4.6a: Pass summary**
  - Given: All checks pass
  - When: Validation completes
  - Then: `status: "pass"`, `errorCount: 0`, `warningCount: 0`, empty `findings`
- **TC-4.6b: Warn summary**
  - Given: Warnings exist but no errors
  - When: Validation completes
  - Then: `status: "warn"`, `errorCount: 0`, `warningCount` matches warning count, `findings` lists each warning
- **TC-4.6c: Fail summary**
  - Given: At least one error exists
  - When: Validation completes
  - Then: `status: "fail"`, `errorCount` matches error count, `findings` lists all errors and warnings
- **TC-4.6d: Invalid metadata JSON contributes metadata finding**
  - Given: `.doc-meta.json` exists but is invalid JSON
  - When: Validation runs
  - Then: `findings` includes an entry with `severity: "error"`, `category: "metadata"`, and `filePath` identifying `.doc-meta.json`; `status` is `"fail"`
- **TC-4.6e: Metadata missing required fields contributes metadata finding**
  - Given: `.doc-meta.json` exists and is valid JSON but is missing required fields such as `commitHash`
  - When: Validation runs
  - Then: `findings` includes an entry with `severity: "error"`, `category: "metadata"`, and `filePath` identifying `.doc-meta.json`; `status` is `"fail"`

## Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Output directory doesn't exist | `status: "fail"` with finding identifying missing directory |
| `.doc-meta.json` missing | Finding: `severity: "error"`, `category: "missing-file"` (metadata-shape check no-ops) |
| `.doc-meta.json` invalid JSON | Finding: `severity: "error"`, `category: "metadata"`; `status: "fail"` |
| `.doc-meta.json` missing required fields | Finding: `severity: "error"`, `category: "metadata"`; `status: "fail"` |
| `module-tree.json` missing | Finding: `severity: "error"`, `category: "missing-file"` (module-tree check no-ops) |
| Broken internal link | Finding: `severity: "error"`, `category: "broken-link"` |
| Malformed Mermaid | Finding: `severity: "warning"`, `category: "mermaid"` |

## Definition of Done

- [ ] All ACs met (AC-4.1 through AC-4.6)
- [ ] All TC conditions verified (TC-4.1a through TC-4.6e)
- [ ] `verify` script passes

---
