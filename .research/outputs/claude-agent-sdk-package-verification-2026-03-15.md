# @anthropic-ai/claude-agent-sdk -- Package Verification Report

**Research Date:** 2026-03-15
**Researcher:** Claude Code (web research agent)

---

## Summary

The `@anthropic-ai/claude-agent-sdk` package is the TypeScript SDK for building Claude-powered agents, formerly known as the Claude Code SDK. It is actively maintained by Anthropic with very frequent releases (multiple per week). The local reference to v0.2.76 is confirmed current -- it was published on 2026-03-14, just one day ago. The package is ESM-native, requires Node.js >= 18.0.0, has zero production dependencies, and uses zod ^4.0.0 as a peer dependency. The package is production-quality but has some known issues worth tracking.

---

## Key Findings

### 1. Current Version

- **Latest version:** `0.2.76` (confirmed on npm registry and GitHub releases)
- **Published:** 2026-03-14 (one day before this report)
- **Total versions published:** 134
- **GitHub releases:** 62
- **Claude Code parity:** v2.1.76 (each SDK version maps to a Claude Code CLI version)
- **Your local reference of v0.2.76 is current.**

### 2. Package Name

- **Exact npm package name:** `@anthropic-ai/claude-agent-sdk`
- **Old name (deprecated):** `@anthropic-ai/claude-code`
- **GitHub repo:** https://github.com/anthropics/claude-agent-sdk-typescript
- **npm:** https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk

### 3. Node.js Compatibility

- **Engine requirement:** `"node": ">=18.0.0"` (declared in package.json `engines` field)
- **Supports Node 18, 20, 22+**
- **Runtime options:** The `executable` option supports `'node'`, `'bun'`, and `'deno'` (auto-detected by default)
- **Note:** "Fast Mode" requires native Bun binary and is not available to pure Node.js users (see Issue #216)

### 4. ESM Compatibility

- **Module type:** `"type": "module"` -- **ESM-native**
- **Main entry point:** `sdk.mjs`
- **Types entry:** `sdk.d.ts`
- **No CJS build is provided.** The package is ESM-only.
- **Exports map (v0.2.76):**
  ```json
  {
    ".": { "types": "./sdk.d.ts", "default": "./sdk.mjs" },
    "./embed": { "types": "./embed.d.ts", "default": "./embed.js" },
    "./browser": { "types": "./browser-sdk.d.ts", "default": "./browser-sdk.js" },
    "./sdk-tools": { "types": "./sdk-tools.d.ts" }
  }
  ```
- **ESM issue fixed in v0.2.74:** `import type` from `@anthropic-ai/claude-agent-sdk/sdk-tools` was broken under NodeNext/Bundler module resolution from v0.2.69-v0.2.73 due to a missing exports map entry. Fixed in v0.2.74.

### 5. Key Features (Confirmed)

| Feature | Status | Details |
|---------|--------|---------|
| **Structured output** | Supported | `outputFormat: { type: 'json_schema', schema: JSONSchema }` option on `query()`. Result available in `SDKResultMessage.structured_output` field. Error subtype `error_max_structured_output_retries` exists. |
| **Session support** | Supported | `resume` option (session ID string) to continue a session. `forkSession: true` to branch. `listSessions()`, `getSessionMessages()`, `renameSession()` (added v0.2.74), `forkSession()` (added v0.2.76) are available. `persistSession: false` disables disk persistence. |
| **Cost/token tracking** | Supported | `SDKResultMessage` includes `total_cost_usd: number`, `usage: NonNullableUsage`, and `modelUsage: { [modelName: string]: ModelUsage }` for per-model breakdown. `maxBudgetUsd` option enforces budget caps. |
| **Subagent support** | Supported | `agents` option defines subagents with `AgentDefinition` type. Subagents have isolated context, optional model override (`sonnet`/`opus`/`haiku`/`inherit`), restricted tools, MCP servers, skills, and max turns. Include `'Agent'` in `allowedTools`. |
| **Custom tools via MCP** | Supported | Four transport types: `stdio`, `sse`, `http`, `sdk` (in-process). `tool()` helper creates zod-typed tool definitions. `createSdkMcpServer()` creates in-process MCP servers. `setMcpServers()` allows dynamic server management. |
| **Hooks system** | Supported | 17 hook events: PreToolUse, PostToolUse, PostToolUseFailure, Notification, UserPromptSubmit, SessionStart, SessionEnd, Stop, SubagentStart, SubagentStop, PreCompact, PermissionRequest, Setup, TeammateIdle, TaskCompleted, ConfigChange, WorktreeCreate, WorktreeRemove. |
| **Streaming input** | Supported | `prompt` accepts `AsyncIterable<SDKUserMessage>` for multi-turn streaming. `streamInput()` method on Query object. |
| **V2 preview interface** | Available (unstable) | Simplified `send()` and `stream()` patterns for multi-turn conversations. |

### 6. Dependencies

#### Production Dependencies
**Zero.** The package has no declared production dependencies.

#### Peer Dependencies
- **`zod: ^4.0.0`** -- Required for the `tool()` function's type-safe schema definitions. Supports both Zod 3 and Zod 4 according to the docs (the `tool()` function accepts `AnyZodRawShape`), but the peerDependency range specifies `^4.0.0`.

#### Optional Dependencies (all `@img/sharp-*` v0.34.2)
These are platform-specific native image processing binaries. They are optional and only installed when needed:
- `@img/sharp-linux-arm`
- `@img/sharp-linux-x64`
- `@img/sharp-linux-arm64`
- `@img/sharp-win32-x64`
- `@img/sharp-win32-arm64`
- `@img/sharp-darwin-x64`
- `@img/sharp-darwin-arm64`
- `@img/sharp-linuxmusl-x64`
- `@img/sharp-linuxmusl-arm64`

#### Missing/Implied Dependencies
- **`@anthropic-ai/sdk`** is NOT declared as a dependency, but the SDK re-exports types from it. This causes TypeScript types to resolve as `any` unless you also install `@anthropic-ai/sdk` separately. **This is a known bug** (Issue #121, 7 thumbs-up, open since 2026-01-08).

### 7. Known Issues

| Issue | Status | Impact | Details |
|-------|--------|--------|---------|
| **#121: Missing @anthropic-ai/sdk dependency** | Open (bug) | High for TS users | Types from the Anthropic SDK resolve as `any` unless you manually install `@anthropic-ai/sdk`. 7 upvotes. Workaround: `npm install @anthropic-ai/sdk` alongside the agent SDK. |
| **#227: outputFormat is ignored** | Open (bug) | Medium | The `outputFormat` option may not be respected in all cases. |
| **#230: Settings files not reliably honored** | Open (bug) | Medium | `query()` does not reliably load Claude settings files. |
| **#216: Fast Mode requires native Bun** | Open (bug/enhancement) | Low-Medium | Fast Mode is unavailable for pure Node.js users -- requires Bun binary. |
| **#144: ANTHROPIC_BASE_URL broken in v0.2.8+** | Open (bug) | High for custom endpoints | Environment variable configuration for custom base URLs broken since v0.2.8. |
| **#195: ANTHROPIC_BASE_URL query params** | Open (bug) | Medium for custom endpoints | Query parameters not preserved in custom base URLs. |
| **#211: Git in sandbox** | Open (question) | Low | No clear documentation for securely configuring git credentials in sandboxed environments. |
| **#218: sdk-tools.d.ts not resolvable (v0.2.69)** | Closed (fixed in v0.2.74) | N/A (resolved) | Missing exports map entry for `./sdk-tools` was fixed. |

### 8. Breaking Changes in v0.2.x Line

#### v0.2.69 (fixed in v0.2.69)
- **Agent tool name reverted:** `system:init` and `result` events briefly emitted `'Agent'` as the tool name instead of `'Task'`. This was an unintentional breaking change in a prior patch release. v0.2.69 reverted to `'Task'` and stated the wire name will migrate to `'Agent'` in a future major/minor release.

#### v0.2.69 (introduced, fixed in v0.2.74)
- **Exports map added:** Adding the `exports` field in package.json broke `import type` from `@anthropic-ai/claude-agent-sdk/sdk-tools` under NodeNext/Bundler module resolution. Fixed by adding the missing `./sdk-tools` export entry in v0.2.74.

#### v0.2.70
- **`AgentToolInput.subagent_type` made optional:** Now defaults to `'general-purpose'` when omitted. (Non-breaking for most consumers.)

#### v0.1.0 Migration Breaking Changes (from Claude Code SDK to Agent SDK)
These are the breaking changes from the original rename/migration. If you are already on the `@anthropic-ai/claude-agent-sdk` package, these are already in effect:

1. **Package name changed:** `@anthropic-ai/claude-code` -> `@anthropic-ai/claude-agent-sdk`
2. **System prompt no longer loaded by default:** Must explicitly pass `systemPrompt: { type: 'preset', preset: 'claude_code' }` to get Claude Code's system prompt.
3. **Settings sources no longer loaded by default:** Must explicitly pass `settingSources: ['user', 'project', 'local']` to load filesystem settings (CLAUDE.md, settings.json, etc.).
4. **Python type rename:** `ClaudeCodeOptions` -> `ClaudeAgentOptions`.

### 9. Zod Dependency Details

- **Peer dependency:** `zod: ^4.0.0`
- **Usage:** The `tool()` function accepts `AnyZodRawShape` for defining input schemas
- **Documentation states:** "supports both Zod 3 and Zod 4" for the `inputSchema` parameter
- **Implication:** You must install zod yourself if you use the `tool()` / `createSdkMcpServer()` APIs for custom MCP tools. If you only use `query()` without custom tools, zod is not strictly needed at runtime (it is a peer dependency, not a hard dependency).

---

## Sources

- [npm registry -- @anthropic-ai/claude-agent-sdk@0.2.76](https://registry.npmjs.org/@anthropic-ai/claude-agent-sdk/0.2.76) -- Authoritative package metadata
- [GitHub -- anthropics/claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript) -- Official repository, 961 stars, last push 2026-03-14
- [GitHub Releases](https://github.com/anthropics/claude-agent-sdk-typescript/releases) -- Full release notes for v0.2.66 through v0.2.76
- [Anthropic Platform Docs -- Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) -- Official documentation
- [Anthropic Platform Docs -- TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- Full API reference
- [Anthropic Platform Docs -- Migration Guide](https://platform.claude.com/docs/en/agent-sdk/migration-guide) -- Breaking changes documentation
- [GitHub Issue #121](https://github.com/anthropics/claude-agent-sdk-typescript/issues/121) -- Missing @anthropic-ai/sdk dependency
- [GitHub Issue #218](https://github.com/anthropics/claude-agent-sdk-typescript/issues/218) -- sdk-tools.d.ts resolution (fixed in v0.2.74)
- [GitHub Issue #216](https://github.com/anthropics/claude-agent-sdk-typescript/issues/216) -- Fast Mode requires Bun
- [GitHub Issue #227](https://github.com/anthropics/claude-agent-sdk-typescript/issues/227) -- outputFormat ignored
- [GitHub Issue #144](https://github.com/anthropics/claude-agent-sdk-typescript/issues/144) -- ANTHROPIC_BASE_URL broken
- [Aikido Intel -- Package Health](https://intel.aikido.dev/packages/npm/@anthropic-ai/claude-agent-sdk) -- Security score 90%, no known vulnerabilities

---

## Confidence Assessment

- **Overall confidence:** **High** -- Data sourced directly from npm registry, GitHub releases, and official Anthropic documentation.
- **Version number:** **Confirmed** -- v0.2.76 verified from three independent sources (npm, GitHub releases, official docs).
- **Node compatibility:** **Confirmed** -- `>=18.0.0` directly from package.json `engines` field in the npm registry.
- **ESM status:** **Confirmed** -- `"type": "module"` and `.mjs` entry point from npm registry metadata.
- **Zod dependency:** **Confirmed** -- `zod: ^4.0.0` as peerDependency from npm registry. Note possible inconsistency: docs say "supports Zod 3 and Zod 4" but peerDep range says `^4.0.0`.
- **Area of uncertainty:** The `outputFormat` option -- Issue #227 reports it being ignored, which could affect structured output reliability. Worth testing before depending on this feature.
- **Area of uncertainty:** The relationship between the `@anthropic-ai/sdk` types dependency (Issue #121) -- unclear when/if this will be resolved. Recommend installing `@anthropic-ai/sdk` alongside `@anthropic-ai/claude-agent-sdk` for proper TypeScript types.
