# Advanced Features

## Extended Thinking

```typescript
// Adaptive (SDK decides based on complexity)
const options = { thinking: { type: "adaptive" } };

// Enabled with budget
const options = { thinking: { type: "enabled", budgetTokens: 10000 } };

// Disabled (faster, cheaper)
const options = { thinking: { type: "disabled" } };
```

### Streaming Thinking Content
```typescript
for await (const msg of query({
  prompt: "...",
  options: { thinking: { type: "enabled", budgetTokens: 10000 }, includePartialMessages: true },
})) {
  if (msg.type === "stream_event" && msg.event.delta?.type === "thinking_delta") {
    process.stderr.write(`[Think] ${msg.event.delta.thinking}`);
  }
}
```

---

## Extended Context (1M Tokens)

```typescript
const options = { betas: ["context-1m-2025-08-07"] };
```

Useful for large codebase analysis, extensive documentation, long sessions.

---

## Effort Levels

| Level | Use Case |
|-------|----------|
| `"low"` | Quick tasks, simple lookups |
| `"medium"` | Standard tasks (default) |
| `"high"` | Complex reasoning |
| `"max"` | Maximum depth |

```typescript
const options = { effort: "high" };
```

---

## Dynamic Configuration Changes

### Permission Mode
```typescript
const q = query({ prompt: "...", options: { permissionMode: "default" } });
await q.setPermissionMode("acceptEdits");
```

### Model (via ClaudeSDKClient / V2)
```typescript
await client.setModel("claude-sonnet-4-6");
```

### MCP Servers
```typescript
await client.addMcpServer("github", { command: "npx", args: [...] });
await client.removeMcpServer("github");
const status = await client.getMcpStatus();
```

---

## Interrupts

```typescript
// Send interrupt signal to stop current operation
await client.interrupt();
```

---

## Context Compaction

Auto-triggers when context approaches limit. Customize via:

1. **CLAUDE.md** — Add summarization preferences
2. **PreCompact hook** — Intercept before compaction
3. **Manual** — `/compact` slash command

```typescript
const options = {
  hooks: {
    PreCompact: [{
      hooks: [async (input, id, ctx) => ({
        systemMessage: "Preserve all file paths and line numbers when compacting.",
      })],
    }],
  },
};
```

---

## File Checkpointing

Track file changes for rewind:

```typescript
const options = { enableFileCheckpointing: true, permissionMode: "acceptEdits" };

// Capture checkpoint UUIDs from UserMessage.uuid
// Later: client.rewindFiles(checkpointId)
```

Only tracks Write, Edit, NotebookEdit — not Bash file operations.

---

## Skills

Filesystem-based capabilities in `.claude/skills/`:

```
.claude/skills/deploy/SKILL.md
```

Requires `"Skill"` in allowedTools and `settingSources: ["user", "project"]`.

---

## Plugins

Extend agents with bundled commands, agents, skills, hooks, and MCP servers:

```typescript
const options = {
  plugins: [
    { type: "local", path: "./my-plugin" },
    { type: "local", path: "/absolute/path/to/plugin" },
  ],
};
```

Plugin structure:
```
my-plugin/
  .claude-plugin/plugin.json    # Required manifest
  skills/                       # Skills
  agents/                       # Agents
  hooks/                        # Hooks
  .mcp.json                     # MCP servers
```

Resources are namespaced: `my-plugin:skill-name`, `mcp__my-plugin__tool-name`.

---

## Migration from Claude Code SDK

| Aspect | Old | New |
|--------|-----|-----|
| Package | `@anthropic-ai/claude-code` | `@anthropic-ai/claude-agent-sdk` |
| Import | `from "@anthropic-ai/claude-code"` | `from "@anthropic-ai/claude-agent-sdk"` |

### Breaking Changes
1. **No default system prompt** — must use `systemPrompt: { type: "preset", preset: "claude_code" }` to get Claude Code's prompt
2. **No settings loading** — must set `settingSources: ["user", "project", "local"]`
