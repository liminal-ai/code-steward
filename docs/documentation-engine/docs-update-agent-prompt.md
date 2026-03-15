Update the documentation-engine docs and specs to align with the final
dependency/tooling decision captured in:

- `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`

Your job is to normalize the docs so they no longer contain stale Bun-first,
Node-23, Bun-test, or generic tooling assumptions.

## Read these files first

1. `/Users/leemoore/code/code-steward/docs/documentation-engine/dependency-stack-decision.md`
2. `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`
3. `/Users/leemoore/code/code-steward/docs/documentation-engine/PRD.md`
4. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md`
5. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md`
6. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md`
7. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md`

## Primary goal

Make the documentation consistent with the chosen stack:

- Node 24 LTS target
- Node-first, not Bun-first
- TypeScript 5.9.x
- ESM-only package
- `tsc` as the build tool
- `tsx` for development execution
- Vitest for testing
- Biome for lint + format
- `citty` for the CLI
- `zod` for schemas/contracts
- built-in Node modules preferred for config/path/subprocess/git/globbing in v1
- Python-backed analyzer remains for the current baseline

## High-priority files to update

These are the most important:

1. `/Users/leemoore/code/code-steward/docs/documentation-engine/technical-architecture.md`
2. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/tech-design.md`
3. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/tech-design.md`

Also update any directly conflicting references in:

4. `/Users/leemoore/code/code-steward/docs/documentation-engine/PRD.md`
5. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-1/test-plan.md`
6. `/Users/leemoore/code/code-steward/docs/documentation-engine/epic-2/test-plan.md`

## Specific things to fix

### Technical Architecture

- replace Bun-centric assumptions with Node-first assumptions
- make Node 24 the explicit target
- make `tsc` the default build approach
- make `tsx` the dev runner
- make Vitest the default test runner
- keep `citty` as the CLI choice
- remove or soften mentions of unnecessary helper libraries unless they are
  explicitly listed as future alternatives
- keep the Python analyzer for the current baseline, but describe it clearly as
  an intentional short-term mixed-runtime compromise

### Epic 1 Tech Design

- update verification scripts away from Bun / npm ambiguity toward the chosen
  Node + Vitest + Biome stack
- align package/tooling references to:
  - TypeScript 5.9.x
  - Node 24
  - `tsc`
  - `tsx`
  - Vitest
  - Biome
- remove stale assumptions about ESLint + Prettier if present
- remove stale assumptions about Bun test/build if present
- keep the existing architecture decisions intact unless they directly conflict
  with the new dependency decision doc

### Epic 2 Tech Design

- normalize tooling/runtime/package assumptions the same way as Epic 1
- ensure any testing, script, packaging, or runtime prerequisite sections use
  the final dependency decision doc as the source of truth
- preserve the Agent SDK design decisions already made

### Test Plans

- replace Bun test references with Vitest assumptions
- keep mocking strategy and fixture design intact
- update any package/script/tool references that are now stale

### PRD

- only update sections that directly mention tooling/runtime choices and now
  conflict with the dependency decision doc
- do not rewrite broader product intent or epic scope

## Important constraints

- Do not redesign the product
- Do not change epic scope or architecture decisions unless they are directly
  required to align with the dependency decision doc
- Do not remove the Python analyzer from the current baseline
- Do not introduce new dependencies beyond what is in the decision doc unless
  you are only mentioning them as rejected alternatives or future options

## Deliverable

Edit the docs directly.

Then provide:

1. a concise summary of what changed
2. the file list changed
3. any remaining doc inconsistencies or open questions you chose not to resolve
4. any places where the dependency decision doc should itself be revised
