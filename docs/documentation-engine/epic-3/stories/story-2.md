## Story 2: CLI Progress Rendering

### Objective

`generate` and `update` CLI commands render incremental progress to the terminal
in human-readable mode. Each stage transition prints a sequential line to stderr.
Module-level progress includes module name and completion count. JSON mode
suppresses all intermediate output — stdout contains only the final result.
After this story, an operator running `docs generate` sees real-time stage
progression.

### Scope

#### In Scope

- Progress renderer (`cli/progress.ts`): subscribes to SDK `onProgress` callback, writes sequential lines to stderr
- Stage transition display (e.g., "Analyzing structure...", "Generating module: core (2/5)")
- JSON mode suppression — no stderr output when `--json` is active
- SIGINT handler: sets cancellation flag, waits for current SDK operation, exits with code 130
- Forward-compatible default case for unknown stage names
- Integration of progress callback into `commands/generate.ts` and `commands/update.ts`

#### Out of Scope

- SDK progress event shape definition (owned by Epic 2)
- Verifying that SDK emits correct progress events (Story 3 verifies this from the consumer perspective)
- CLI commands other than `generate` and `update` (already complete in Story 1)
- Publish flow (Story 4)

### Dependencies / Prerequisites

- Story 1 complete — CLI command shell with `generate` and `update` commands working (final result mode)

### Acceptance Criteria

**AC-2.3:** Long-running commands (`generate`, `update`) display incremental progress in human-readable mode.

- **TC-2.3a: Stage transitions visible during generation**
  - Given: Operator runs `docs generate --repo-path ./my-repo` without `--json`
  - When: Generation progresses through stages
  - Then: Each stage name is printed to stderr as it begins (e.g., "Analyzing structure...", "Generating module: core...")
- **TC-2.3b: Module-level progress visible**
  - Given: A repo with multiple modules
  - When: Generation reaches the module generation stage
  - Then: Progress includes module name and completion count (e.g., "Generating module: core (2/5)")
- **TC-2.3c: JSON mode suppresses incremental progress**
  - Given: Operator runs `docs generate --json --repo-path ./my-repo`
  - When: Generation completes
  - Then: stdout contains only the final `CliResultEnvelope`; stderr is empty

### Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Unknown stage name in progress event | Logged as raw stage name; no crash |
| Empty `moduleName` in `generating-module` event | Handled gracefully; line still prints |
| Ctrl+C during generation | Current SDK operation completes; CLI exits with code 130 |

### Definition of Done

- [ ] All AC-2.3 TCs verified
- [ ] Progress lines appear on stderr, not stdout
- [ ] JSON mode produces clean stdout with no interleaved stderr
- [ ] SIGINT exits with code 130 after current operation completes
- [ ] Unknown stage names do not crash the renderer
- [ ] PO accepts

**Estimated test count:** 6 tests (3 TC + 3 non-TC)

---

