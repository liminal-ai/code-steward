## Story 4: Publish Flow

### Objective

The `publishDocumentation()` SDK operation and `docs publish` CLI command are
fully functional. After this story, a caller can publish generated documentation
to a repository by creating a branch, committing doc files, pushing to the
remote, and optionally opening a pull request. The caller's current branch
context is preserved throughout via the git worktree mechanism. Publish is
standalone — it does not trigger generation or update.

### Scope

#### In Scope

- `publishDocumentation()` orchestrator (`publish/publish.ts`)
- Preflight checks (`publish/preflight.ts`): output directory exists, `.doc-meta.json` valid, `.module-plan.json` present, git remote configured, branch name not already taken
- Branch manager (`publish/branch-manager.ts`): worktree creation, branch checkout, doc file copy, stage, commit, push, worktree cleanup
- PR creator (`publish/pr-creator.ts`): `gh pr create` invocation, PR URL and number parsing
- Base branch detector (`publish/base-branch-detector.ts`): `symbolic-ref` → `main` → `master` fallback, explicit override
- GitHub CLI adapter (`adapters/gh.ts`): `isGhAvailable()`, `createPullRequest()`
- Git adapter extensions (`adapters/git.ts`): `createWorktree()`, `removeWorktree()`, `createBranch()`, `stageFiles()`, `commit()`, `pushBranch()`, `getRemoteUrl()`, `branchExists()`, `getDefaultBranch()`
- Auto-generated branch name (`docs/update-<timestamp>`) when not provided
- Auto-generated commit message when not provided
- Structured `PublishResult` with all fields
- Re-export of `publishDocumentation` from `src/index.ts` (coordinate with Story 3)

#### Out of Scope

- Generation or update triggering from publish (explicitly excluded — publish operates on existing output)
- CLI progress rendering for publish (publish is fast enough to not need stage progress)
- GitHub Pages setup
- Multi-repo publish

### Dependencies / Prerequisites

- Story 0 complete — publish types, zod contracts, mock helpers, fixtures
- Story 1 complete — CLI command shell including `docs publish` argument parsing
- Story 3 complete — SDK entry point re-exports (so `publishDocumentation` can be added to the export surface)

### Acceptance Criteria

**AC-4.1:** Publish is a standalone SDK operation that does not trigger generation or update.

- **TC-4.1a: Publish without prior generation**
  - Given: Output directory has no documentation (status: `not_generated`)
  - When: Caller invokes `publishDocumentation()`
  - Then: Structured error returned with code `PUBLISH_ERROR`; message indicates no documentation to publish; no generation runs
- **TC-4.1b: Publish after generation**
  - Given: Documentation was previously generated successfully
  - When: Caller invokes `publishDocumentation()`
  - Then: Publish proceeds using existing output; no generation or update runs

**AC-4.2:** Publish creates a branch, commits documentation files, pushes to the remote, and optionally opens a PR.

- **TC-4.2a: Full publish with PR**
  - Given: Valid documentation output exists; `createPullRequest: true`
  - When: Caller invokes publish
  - Then: Branch created, docs committed, branch pushed, PR opened; `PublishResult` contains branch name, commit hash, and PR URL
- **TC-4.2b: Publish without PR**
  - Given: Valid documentation output exists; `createPullRequest: false`
  - When: Caller invokes publish
  - Then: Branch created, docs committed, branch pushed; `PublishResult` has `pullRequestUrl: null` and `pullRequestNumber: null`
- **TC-4.2c: Custom branch name used**
  - Given: Caller provides `branchName: "docs/my-update"`
  - When: Publish runs
  - Then: Branch name in the result is `"docs/my-update"`
- **TC-4.2d: Auto-generated branch name when not provided**
  - Given: Caller does not provide `branchName`
  - When: Publish runs
  - Then: Branch name follows the `docs/update-<timestamp>` convention
- **TC-4.2e: Branch name collision**
  - Given: Caller provides `branchName: "docs/my-update"`; that branch already exists locally or on the remote
  - When: Publish runs
  - Then: Structured error with code `PUBLISH_ERROR`; message indicates the branch already exists

**AC-4.3:** Publish verifies that documentation output exists and has valid metadata before proceeding.

- **TC-4.3a: No output directory**
  - Given: Output path does not exist
  - When: Caller invokes publish
  - Then: Structured error with code `PUBLISH_ERROR`; no branch created
- **TC-4.3b: Invalid metadata**
  - Given: Output directory exists but `.doc-meta.json` is malformed
  - When: Caller invokes publish
  - Then: Structured error with code `PUBLISH_ERROR`; message indicates invalid metadata
- **TC-4.3c: Valid output proceeds**
  - Given: Output directory has valid metadata and documentation files
  - When: Publish preflight checks run
  - Then: No errors; publish proceeds to branch creation

**AC-4.4:** Publish returns a structured `PublishResult` with branch, commit, file, and PR information.

- **TC-4.4a: All fields populated on success with PR**
  - Given: Publish completes with PR creation
  - When: Caller inspects result
  - Then: `branchName`, `commitHash`, `pushedToRemote: true`, `pullRequestUrl` (non-null), `pullRequestNumber` (non-null), and `filesCommitted` (non-empty) are all present
- **TC-4.4b: PR fields null when PR not created**
  - Given: Publish completes without PR creation
  - When: Caller inspects result
  - Then: `pullRequestUrl` is `null`; `pullRequestNumber` is `null`; all other fields populated

**AC-4.5:** Publish does not modify files outside the documentation output directory or mutate unrelated branches.

- **TC-4.5a: Caller's branch context preserved**
  - Given: Repo is on branch `main` with a clean or dirty working tree
  - When: Publish completes (success or failure)
  - Then: Repo's checked-out branch is still `main`; working tree state is unchanged; the docs branch exists as a separate ref
- **TC-4.5b: Only documentation files committed**
  - Given: Repo has uncommitted changes outside the output directory
  - When: Publish commits documentation
  - Then: Commit contains only files from the documentation output directory; uncommitted changes to other files remain uncommitted

**AC-4.6:** PR creation requires `gh` CLI availability. Missing `gh` when PR is requested produces a structured error. Push-only publish does not require `gh`.

- **TC-4.6a: PR requested without `gh` CLI**
  - Given: `createPullRequest: true`; `gh` CLI is not available
  - When: Caller invokes publish
  - Then: Structured error with code `PUBLISH_ERROR`; message identifies `gh` as required for PR creation
- **TC-4.6b: Push-only publish without `gh` CLI**
  - Given: `createPullRequest: false`; `gh` CLI is not available
  - When: Caller invokes publish
  - Then: Publish completes; branch created, committed, and pushed; no error

**AC-4.7:** Publish fails with a structured error when git remote is not configured or push is rejected.

- **TC-4.7a: No remote configured**
  - Given: Repo has no remote configured
  - When: Caller invokes publish
  - Then: Structured error with code `PUBLISH_ERROR`; message indicates no remote
- **TC-4.7b: Push rejected**
  - Given: Remote is configured but push is rejected (e.g., permission denied)
  - When: Push step executes
  - Then: Structured error with code `PUBLISH_ERROR`; message includes the rejection reason from git

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| No documentation to publish | `PUBLISH_ERROR` — no branch created |
| No remote configured | `PUBLISH_ERROR` — no branch created |
| Branch already exists | `PUBLISH_ERROR` — no worktree created |
| Invalid metadata | `PUBLISH_ERROR` — no branch created |
| Push rejected | `PUBLISH_ERROR` — local branch exists for retry |
| PR creation fails | `PUBLISH_ERROR` — branch pushed but no PR; caller can retry PR |
| Worktree cleanup fails | Warning (non-fatal) — publish result still succeeds |
| `gh` CLI missing when PR requested | `PUBLISH_ERROR` identifying `gh` as required |

### Definition of Done

- [ ] All AC-4.1 through AC-4.7 TCs verified
- [ ] Worktree mechanism preserves caller's branch context
- [ ] Worktree is cleaned up on both success and failure
- [ ] Publish result contains all specified fields
- [ ] Auto-generated branch names follow convention
- [ ] Base branch detection works via symbolic-ref with main/master fallback
- [ ] PO accepts

**Estimated test count:** 23 tests (18 TC + 5 non-TC)

---
