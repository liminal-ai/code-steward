# Documentation Engine Dependency Stack Decision

**Date:** 2026-03-15  
**Scope:** `packages/documentation-engine`  
**Purpose:** Source-of-truth dependency and tooling decision for the first
implementation pass.

This document resolves the earlier drift between generic TypeScript package
defaults, the internal CLI family, and the documentation engine's actual needs.
Use this document as the authority when updating PRDs, technical architecture,
tech designs, test plans, and package scaffolding.

## Final Direction

The documentation engine should be:

- Node-first, not Bun-first
- TypeScript SDK first, thin CLI second
- ESM-only
- built for local execution
- minimal in dependencies unless a helper clearly improves reliability

The Python analyzer remains acceptable for the hackathon baseline, but it is an
explicit mixed-runtime compromise rather than the desired long-term end state.

## Package Manager Stance

This package is intentionally **package-manager-neutral** at the documentation
and spec level.

- Script names and tool choices are the source of truth
- The docs should not assume `npm`, `pnpm`, or `bun` as a product requirement
- Teams can use their standard package manager so long as the chosen dependency
  versions and Node runtime constraints are respected

Implementation examples may use one package manager for convenience, but the
package itself is not being standardized around one here.

## Runtime Baseline

### Node

- **Target runtime:** Node 24 LTS
- **Package engines:** `>=24 <25`
- **Reason:** Node 23 is EOL and should not be used. Node 24 is the current
  stable LTS line for a work-oriented Node package.

### TypeScript

- **Version:** `5.9.3`
- **Reason:** current stable TypeScript release with good NodeNext/ESM support.

### Module Format

- **Package mode:** ESM-only
- **`package.json`:** `"type": "module"`
- **`tsconfig`:** `module: "NodeNext"`, `moduleResolution: "NodeNext"`

## JavaScript / TypeScript Tooling

### Build

- **Primary build tool:** `tsc`
- **Dev runner:** `tsx@4.21.0`
- **Reason:** the package shape is simple enough that `tsc` is sufficient for
  SDK + thin CLI output. `tsx` is useful for local development scripts but is
  not the build system.

### Testing

- **Test runner:** `vitest@4.1.0`
- **Coverage:** `@vitest/coverage-v8@4.1.0`
- **Reason:** better fit than Bun test for the fixture-heavy, mock-heavy,
  async-iterator-heavy testing expected in this package.

### Lint / Format

- **Tool:** `@biomejs/biome@2.4.7`
- **Reason:** keep one tool for lint + format. Do not use ESLint + Prettier
  unless a specific gap appears later.

## Runtime Dependencies

### Claude SDK

- `@anthropic-ai/claude-agent-sdk@0.2.76`
- `@anthropic-ai/sdk`
- `zod@4.3.6`

**Notes:**

- The Agent SDK is a core dependency.
- `zod` is required for runtime contracts and is also aligned with the Agent SDK
  ecosystem.
- Keep `@anthropic-ai/sdk` explicit in the package dependency set as a
  defensive measure for types/runtime compatibility until implementation proves
  it unnecessary.

### CLI

- **CLI parser:** `citty@0.2.1`
- **Reason:** stays aligned with the existing internal CLI family while still
  fitting a Node-first stack. The CLI is intentionally thin and does not need a
  large framework.

## Libraries We Are Intentionally NOT Using in v1

Use Node built-ins instead of adding helpers unless implementation proves they
are insufficient.

### Config

- Do **not** use `c12` in v1
- Use built-in `fs` + `JSON.parse` + `zod`
- Config file remains a simple repo-local `.docengine.json`

### Logging

- Do **not** use `consola` in v1
- Use structured progress/result objects in the SDK and plain CLI output via
  `console`

### Path Utilities

- Do **not** use `pathe` in v1
- Use built-in `node:path`

### Subprocess Execution

- Do **not** use `execa` in v1
- Use built-in `node:child_process`

### Git

- Do **not** use `simple-git` in v1
- Shell out directly to the git CLI through the subprocess adapter

### Globbing / Include-Exclude

- Prefer Node 24 built-ins first
- Preferred built-ins:
  - `fs.promises.glob()` for file discovery
  - `path.matchesGlob()` for path-level include/exclude checks
- Do **not** add `fast-glob`, `globby`, `picomatch`, or `minimatch` unless
  implementation proves built-ins are inadequate

### Markdown / Link Parsing

- No markdown parser library is required in v1
- Validation can use targeted parsing/regex logic as already described in the
  tech design

## Python Baseline

The hackathon/runtime baseline still uses a Python-backed analysis adapter.

### Python Runtime

- **Minimum supported:** Python `3.11+`
- **Recommended baseline:** Python `3.13.x`

### Python Packages

Pin these for the initial analyzer environment:

```txt
tree-sitter==0.25.2
tree-sitter-typescript==0.23.2
tree-sitter-javascript==0.25.0
```

Optional later:

```txt
tree-sitter-python==0.25.0
```

Use the smallest parser set needed for the TypeScript-first initial target.

## Proposed Package Dependency Blocks

### `dependencies`

```json
{
  "@anthropic-ai/claude-agent-sdk": "0.2.76",
  "@anthropic-ai/sdk": "latest-compatible",
  "citty": "0.2.1",
  "zod": "4.3.6"
}
```

### `devDependencies`

```json
{
  "@biomejs/biome": "2.4.7",
  "@types/node": "24.12.0",
  "@vitest/coverage-v8": "4.1.0",
  "tsx": "4.21.0",
  "typescript": "5.9.3",
  "vitest": "4.1.0"
}
```

### `engines`

```json
{
  "node": ">=24 <25"
}
```

## Documentation Normalization Rules

When updating existing docs/specs:

- replace Bun-first assumptions with Node-first assumptions
- replace Bun test references with Vitest
- replace generic ESLint + Prettier assumptions with Biome
- keep `citty` as the CLI library choice
- remove or revise references to `c12`, `consola`, `pathe`, `execa`,
  `simple-git`, and helper glob libs unless a document is explicitly discussing
  alternatives
- keep the Python adapter in place for the current baseline, but clearly label
  it as a mixed-runtime compromise rather than the long-term desired state
- keep script names/tooling decisions package-manager-neutral unless a document
  is explicitly describing an example command

## Required Early Smoke Tests

Before implementation proceeds too far:

1. Verify the Agent SDK package works cleanly in the chosen Node 24 + ESM setup
2. Verify structured output works for the engine's expected schemas
3. Verify the Python `tree-sitter` pin set works together in a fresh venv
4. Verify the CLI can build and run correctly from `dist`

## Not Yet Decided Here

This document does **not** settle:

- whether the Python-backed analyzer should be replaced in a later epic
- whether the package should later adopt a bundler beyond `tsc`
- whether future production logging needs justify adding a logging library

Those are later implementation/backlog decisions, not blockers for the first
implementation pass.
