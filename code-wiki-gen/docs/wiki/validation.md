# Validation

Post-generation documentation validation module. After wiki pages are generated, this module runs a suite of integrity checks to ensure the output is correct, consistent, and complete.

## Purpose

The Validation module acts as a quality gate for generated documentation. It verifies that:

- All cross-links between wiki pages resolve to real targets
- Expected files are present on disk
- Mermaid diagram blocks use valid syntax
- Metadata frontmatter conforms to the expected shape
- The module tree structure is internally consistent

## Architecture

### Entry Point

| File | Export | Description |
|------|--------|-------------|
| `code-wiki-gen/src/validation/validate.ts` | `validateDocumentation` | Orchestrates all validation checks and aggregates results |

### Individual Checks

Each check is a self-contained module under `code-wiki-gen/src/validation/checks/`:

| File | Export | Responsibility |
|------|--------|----------------|
| `checks/cross-links.ts` | `checkCrossLinks` | Verifies that markdown cross-links point to existing pages |
| `checks/file-presence.ts` | `checkFilePresence` | Confirms expected output files exist on disk |
| `checks/mermaid.ts` | `checkMermaid` | Parses and validates Mermaid diagram syntax in markdown |
| `checks/metadata-shape.ts` | `checkMetadataShape` | Validates frontmatter metadata against the expected schema |
| `checks/module-tree.ts` | `checkModuleTree` | Checks that the module hierarchy is well-formed and complete |

### Shared Utilities

| File | Exports | Description |
|------|---------|-------------|
| `checks/shared.ts` | `pathExists`, `listMarkdownFiles`, `normalizePath` | Common filesystem helpers used across checks |

## Dependencies

- **Type Definitions** — Most checks import types from `code-wiki-gen/src/types/` (`index.ts`, `validation.ts`, `common.ts`)
- **Metadata** — `file-presence` and `metadata-shape` checks depend on `code-wiki-gen/src/metadata/file.ts` for reading metadata; `metadata-shape` also uses `code-wiki-gen/src/metadata/validate-shape.ts`
- **Contracts and Schemas** — `module-tree` imports validation contracts from `code-wiki-gen/src/contracts/validation.ts`

## Consumers

- **Orchestration** — The `validation-and-review` stage (`code-wiki-gen/src/orchestration/stages/validation-and-review.ts`) imports `validateDocumentation` to run validation as part of the generation pipeline.
