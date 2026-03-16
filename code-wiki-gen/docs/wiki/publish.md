# Publish Module

The Publish module is responsible for pushing generated wiki documentation to a Git branch and opening a GitHub pull request. It orchestrates a pipeline of preflight validation, branch creation, and PR submission.

## Responsibilities

1. **Preflight checks** — validate that the generated documentation meets quality and completeness requirements before publishing.
2. **Base branch detection** — determine the correct base branch for the PR.
3. **Branch management** — create (or reset) a dedicated docs branch and commit the generated pages.
4. **PR creation** — open a GitHub pull request from the docs branch against the base branch.
5. **Top-level orchestration** — wire the above steps together into a single `publishDocumentation` entry point.

## Components

| File | Key Exports | Purpose |
|---|---|---|
| `code-wiki-gen/src/publish/publish.ts` | `publishDocumentation` | Top-level orchestrator that runs preflight → branch → PR |
| `code-wiki-gen/src/publish/preflight.ts` | `PreflightResult`, `runPreflight` | Validates generated docs against metadata contracts before publish |
| `code-wiki-gen/src/publish/branch-manager.ts` | `BranchResult`, `createDocsBranch` | Creates/resets the docs branch and commits wiki pages |
| `code-wiki-gen/src/publish/pr-creator.ts` | `createPR` | Opens a GitHub PR for the docs branch |
| `code-wiki-gen/src/publish/base-branch-detector.ts` | `detectBaseBranch` | Resolves the target base branch for the PR |
| `code-wiki-gen/src/publish/adapters.ts` | `GitAdapterForPublish`, `GhAdapterForPublish` | Narrow interfaces describing the Git and GitHub capabilities this module requires |

## Architecture

The module follows a **ports-and-adapters** style. `adapters.ts` defines the minimal `GitAdapterForPublish` and `GhAdapterForPublish` interfaces that the publish pipeline depends on. The concrete implementations live in the **External Adapters** module (`code-wiki-gen/src/adapters/git.ts` and `code-wiki-gen/src/adapters/gh.ts`) and are injected at the call site in `publish.ts`.

Preflight validation pulls metadata schemas from the **Contracts and Schemas** module (`code-wiki-gen/src/contracts/metadata.ts`) to ensure documentation pages conform to the expected structure before a branch is created.

Shared domain types such as common result types are imported from the **Type Definitions** module (`code-wiki-gen/src/types/`).

## Dependencies

- **Contracts and Schemas** — metadata schemas used during preflight validation
- **External Adapters** — concrete Git and GitHub adapter implementations
- **Type Definitions** — shared types (`common.ts`, `index.ts`)

No other modules depend on Publish; it sits at the outermost layer of the documentation generation pipeline.
