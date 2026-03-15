# Configuration Reference

## All Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowedTools` | `string[]` | `[]` | Tools to auto-approve without prompts |
| `disallowedTools` | `string[]` | `[]` | Tools to always deny |
| `systemPrompt` | `string \| object` | `undefined` | Custom prompt or `{ type: "preset", preset: "claude_code" }` |
| `permissionMode` | `string` | `undefined` | `"default"`, `"acceptEdits"`, `"plan"`, `"bypassPermissions"`, `"dontAsk"` |
| `mcpServers` | `object` | `{}` | MCP server configurations |
| `maxTurns` | `number` | No limit | Maximum tool-use turns |
| `maxBudgetUsd` | `number` | No limit | Maximum cost in USD |
| `model` | `string` | SDK default | Model ID (e.g., `"claude-opus-4-6"`) |
| `fallbackModel` | `string` | `undefined` | Fallback model |
| `effort` | `string` | SDK default | `"low"` \| `"medium"` \| `"high"` \| `"max"` |
| `cwd` | `string` | Process cwd | Working directory |
| `resume` | `string` | `undefined` | Session ID to resume |
| `continue` | `boolean` | `false` | Continue most recent session |
| `forkSession` | `boolean` | `false` | Fork session when resuming |
| `hooks` | `object` | `undefined` | Hook configurations |
| `agents` | `object` | `undefined` | Subagent definitions |
| `canUseTool` | `function` | `undefined` | Custom permission callback |
| `includePartialMessages` | `boolean` | `false` | Enable StreamEvent messages |
| `outputFormat` | `object` | `undefined` | Structured output schema |
| `settingSources` | `string[]` | `undefined` | Load settings: `["user", "project", "local"]` |
| `plugins` | `array` | `[]` | Plugin configurations |
| `sandbox` | `object` | `undefined` | Sandbox settings |
| `thinking` | `object` | `undefined` | Extended thinking config |
| `betas` | `string[]` | `[]` | Beta features (e.g., `["context-1m-2025-08-07"]`) |
| `env` | `object` | `{}` | Environment variables |
| `enableFileCheckpointing` | `boolean` | `false` | Track file changes for rewind |
| `user` | `string` | `undefined` | User identifier |
| `addDirs` | `string[]` | `[]` | Additional allowed directories |
| `extraArgs` | `object` | `{}` | Extra CLI arguments |

---

## System Prompt Configuration

### No System Prompt (Default)
```typescript
// Agent has no predefined persona or instructions
const options = { systemPrompt: undefined };
```

### Custom String
```typescript
const options = { systemPrompt: "You are a security auditor. Only analyze vulnerabilities." };
```

### Claude Code Preset
```typescript
// Full Claude Code system prompt (same as CLI)
const options = { systemPrompt: { type: "preset", preset: "claude_code" } };
```

### Append to Default
```typescript
const options = { appendSystemPrompt: "Always use the staging database." };
```

### Loading CLAUDE.md and Project Settings
```typescript
// Load project CLAUDE.md, user settings, local settings
const options = { settingSources: ["user", "project", "local"] };
```

---

## Sandbox Configuration

Isolated bash execution with command restrictions:

```typescript
const options = {
  sandbox: {
    enabled: true,
    autoAllowBashIfSandboxed: true,       // Auto-approve Bash when sandboxed
    excludedCommands: ["git", "docker"],   // Block specific commands
  },
};
```

---

## Environment Variables

```typescript
const options = {
  env: {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN!,
    DATABASE_URL: "postgresql://...",
    NODE_ENV: "development",
  },
};
```

---

## Tool Approval Patterns

```typescript
const options = {
  allowedTools: [
    "Read",                            // Exact tool name
    "mcp__github__*",                  // Wildcard: all tools from server
    "mcp__my-tools__search_*",         // Prefix wildcard
  ],
  disallowedTools: [
    "Bash",                            // Block shell access
    "mcp__github__delete_repository",  // Block specific dangerous tool
  ],
};
```
