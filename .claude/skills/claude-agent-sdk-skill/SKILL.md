---
name: claude-agent-sdk
description: Build agents, tools, and multi-agent systems with the Claude Agent SDK (formerly Claude Code SDK). Use this skill whenever the user wants to plan, design, implement, debug, or extend anything involving the Claude Agent SDK, claude-agent-sdk, @anthropic-ai/claude-agent-sdk, claude_agent_sdk, agent automation, programmatic Claude usage, MCP tool servers, agent hooks, subagents, or SDK-based agent orchestration — even if they just mention "agent SDK", "building agents programmatically", or want to create tools for Claude to use. Covers the complete API for TypeScript (default) and Python.
---

# Claude Agent SDK

Anthropic's framework for building autonomous AI agents. Same tools, agent loop, and context management that power Claude Code — as a library.

**Versions:** TypeScript v0.2.76 (`@anthropic-ai/claude-agent-sdk`) | Python v0.1.48 (`claude-agent-sdk`)

> **All examples are TypeScript.** If the user needs Python, read `references/python/python-api.md` and `references/python/python-examples.md`.

## Quick Start

```bash
npm install @anthropic-ai/claude-agent-sdk
export ANTHROPIC_API_KEY=your-key
```

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Find and fix the bug in auth.ts",
  options: {
    allowedTools: ["Read", "Edit", "Bash"],
    permissionMode: "acceptEdits",
    maxTurns: 10,
  },
})) {
  if (message.type === "result") {
    console.log(message.result);
    console.log(`Cost: $${message.totalCostUsd?.toFixed(4)}`);
  }
}
```

Also supports Bedrock (`CLAUDE_CODE_USE_BEDROCK=1`), Vertex AI (`CLAUDE_CODE_USE_VERTEX=1`), Azure (`CLAUDE_CODE_USE_FOUNDRY=1`).

---

## Capability Map

| Capability | Summary | Deep Dive |
|-----------|---------|-----------|
| **query()** | Async iterator API — send prompt, get messages | This file |
| **Configuration** | 25+ options: model, tools, limits, sandbox, env | `references/configuration.md` |
| **Built-in Tools** | 17 tools: Read, Write, Edit, Bash, Glob, Grep, Web... | `references/tools-and-mcp.md` |
| **Custom Tools** | Define tools as in-process MCP servers | `references/tools-and-mcp.md` |
| **MCP Integration** | 4 transports: stdio, SSE, HTTP, SDK | `references/tools-and-mcp.md` |
| **Hooks** | 16 events to intercept/modify agent behavior | `references/hooks.md` |
| **Permissions** | 5 modes + allow/deny lists + callback | `references/permissions.md` |
| **Sessions** | Multi-turn, resume, fork conversations | `references/sessions.md` |
| **Subagents** | Isolated child agents with restricted tools | `references/subagents.md` |
| **Streaming** | Real-time output + input streaming | `references/streaming-and-output.md` |
| **Structured Output** | Force typed JSON via Zod / JSON Schema | `references/streaming-and-output.md` |
| **Error Handling** | 5 error types + result subtypes | This file |
| **Cost Tracking** | Per-step and per-model usage | This file |
| **Hosting** | Docker, cloud, sandbox providers, security | `references/hosting-and-security.md` |
| **Advanced** | Thinking, 1M context, dynamic config, plugins | `references/advanced.md` |
| **Examples** | WebSocket chat, multi-agent, AIClient wrapper | `references/examples.md` |

---

## Core API: query()

Returns an async iterator yielding messages as the agent works through its loop (prompt → Claude responds → execute tools → repeat):

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Your task description",
  options: { /* see Configuration */ },
})) {
  switch (message.type) {
    case "system":    // Session lifecycle (init, compact_boundary)
    case "assistant": // Claude's responses — text + tool_use blocks in message.content
    case "user":      // Tool results — tool_result blocks in message.content
    case "result":    // Final: result, subtype, sessionId, totalCostUsd, usage
  }
}
```

### Result Subtypes

| Subtype | Meaning | Recovery |
|---------|---------|----------|
| `success` | Completed normally | Process result |
| `error_max_turns` | Hit maxTurns limit | Resume with sessionId |
| `error_max_budget_usd` | Hit cost cap | Increase budget or resume |
| `error_during_execution` | Runtime error | Check logs, retry |
| `error_max_structured_output_retries` | Schema validation failed | Fix schema or prompt |

---

## Configuration (Key Options)

```typescript
const options = {
  // Tools
  allowedTools: ["Read", "Edit", "Bash"],       // Auto-approve
  disallowedTools: ["Write"],                    // Always deny
  permissionMode: "acceptEdits",                 // See Permissions section

  // Limits
  maxTurns: 20,
  maxBudgetUsd: 1.0,

  // Model
  model: "claude-opus-4-6",
  effort: "high",                                // "low" | "medium" | "high" | "max"

  // Session
  resume: "session-id",                          // Resume previous session
  forkSession: true,                             // Branch when resuming

  // System
  systemPrompt: "You are a security auditor.",
  cwd: "/path/to/project",
  env: { GITHUB_TOKEN: "..." },

  // Extensions
  mcpServers: { /* MCP server configs */ },
  hooks: { /* Hook configs */ },
  agents: { /* Subagent definitions */ },
  outputFormat: { /* Structured output schema */ },
};
```

For all 25+ options with types and defaults, read `references/configuration.md`.

---

## Built-in Tools

| Tool | Category | What It Does |
|------|----------|-------------|
| **Read** | File I/O | Read files (images, PDFs, notebooks) |
| **Write** | File I/O | Create or overwrite files |
| **Edit** | File I/O | Precise string-replacement edits |
| **Bash** | Execution | Terminal commands, scripts, git |
| **Glob** | Search | Find files by pattern (`**/*.ts`) |
| **Grep** | Search | Regex content search (ripgrep) |
| **WebSearch** | Web | Search the web |
| **WebFetch** | Web | Fetch and parse web pages |
| **AskUserQuestion** | Interaction | Ask clarifying questions |
| **Agent** | Orchestration | Spawn subagents |
| **Skill** | Orchestration | Invoke filesystem skills |
| **TodoWrite** | Tracking | Task status tracking |
| **NotebookEdit** | File I/O | Jupyter cell edits |
| **ToolSearch** | Discovery | Load deferred tools on-demand |

---

## Custom Tools (MCP)

Define tools as in-process MCP servers. Tool naming: `mcp__<server>__<tool>`

```typescript
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const server = createSdkMcpServer({
  name: "my-tools",
  tools: [
    tool("get_weather", "Get temperature for a location", {
      latitude: z.number(),
      longitude: z.number(),
    }, async (args) => ({
      content: [{ type: "text", text: `72°F at ${args.latitude}, ${args.longitude}` }],
    })),
  ],
});

for await (const msg of query({
  prompt: "Weather at 40.7, -74.0?",
  options: {
    mcpServers: { "my-tools": server },
    allowedTools: ["mcp__my-tools__*"],   // Wildcard approval
  },
})) { /* ... */ }
```

For external servers (stdio, SSE, HTTP), tool schemas, and patterns, read `references/tools-and-mcp.md`.

---

## Hooks

Intercept and modify agent behavior at 16 event points:

| Key Events | Trigger |
|------------|---------|
| `PreToolUse` / `PostToolUse` | Before/after tool execution |
| `Stop` | Agent stopping |
| `SubagentStart` / `SubagentStop` | Subagent lifecycle |
| `PreCompact` | Before context compaction |
| `Notification` | Status messages |
| `SessionStart` / `SessionEnd` | Session lifecycle |

```typescript
const options = {
  hooks: {
    PreToolUse: [{
      matcher: "Write|Edit",
      hooks: [async (input, toolUseId, ctx) => {
        if (input.tool_input.file_path?.includes(".env"))
          return {
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              permissionDecision: "deny",
              permissionDecisionReason: "Cannot modify .env files",
            },
          };
        return {};  // Allow
      }],
    }],
  },
};
```

For all events, output options, matchers, and chaining, read `references/hooks.md`.

---

## Permissions

| Mode | Behavior |
|------|----------|
| `default` | Unmatched tools → canUseTool callback |
| `acceptEdits` | Auto-approve Edit, Write, mkdir, rm, mv, cp |
| `dontAsk` | Deny anything not in allowedTools |
| `bypassPermissions` | Approve everything (use with caution) |
| `plan` | No tool execution — planning only |

**Evaluation order:** Hooks → disallowedTools → Mode → allowedTools → canUseTool callback

For canUseTool callback and common patterns, read `references/permissions.md`.

---

## Sessions

| Use Case | How |
|----------|-----|
| One-shot | Single `query()` call |
| Resume | `options: { resume: sessionId }` |
| Branch | `options: { resume: sessionId, forkSession: true }` |
| Multi-turn | TS V2 preview: `createSession()` + `send()` |

```typescript
// Capture session ID
let sessionId: string;
for await (const msg of query({ prompt: "Analyze auth", options })) {
  if (msg.type === "result") sessionId = msg.sessionId;
}

// Resume later
for await (const msg of query({
  prompt: "Now refactor it",
  options: { resume: sessionId },
})) { /* full context preserved */ }
```

For TS V2 preview, fork patterns, and cross-host resume, read `references/sessions.md`.

---

## Subagents

Isolated child agents with their own context, restricted tools, and model override:

```typescript
const options = {
  allowedTools: ["Read", "Grep", "Agent"],    // Agent tool required
  agents: {
    "code-reviewer": {
      description: "Expert code reviewer for quality and security.",
      prompt: "You are a code review specialist. Be thorough but concise.",
      tools: ["Read", "Glob", "Grep"],        // Restricted
      model: "sonnet",                         // Cheaper model
    },
  },
};
```

Key properties: isolated context, parent sees only final message, no nesting, resumable via agent ID.

For orchestration patterns and cost optimization, read `references/subagents.md`.

---

## Streaming & Structured Output

### Streaming
```typescript
for await (const msg of query({
  prompt: "...",
  options: { includePartialMessages: true },
})) {
  if (msg.type === "stream_event" && msg.event.delta?.type === "text_delta") {
    process.stdout.write(msg.event.delta.text);
  }
}
```

### Structured Output
```typescript
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const Plan = z.object({
  steps: z.array(z.object({ title: z.string(), description: z.string() })),
  risks: z.array(z.string()),
});

for await (const msg of query({
  prompt: "Plan the feature",
  options: { outputFormat: { type: "json_schema", schema: zodToJsonSchema(Plan) } },
})) {
  if (msg.type === "result") console.log(msg.structuredOutput);  // Parsed JSON
}
```

For stream event types and input streaming, read `references/streaming-and-output.md`.

---

## Error Handling

```typescript
for await (const msg of query({ prompt: "...", options })) {
  if (msg.type === "result") {
    if (msg.subtype === "success") {
      console.log(msg.result);
    } else if (msg.subtype === "error_max_turns") {
      // Resume: query({ prompt: "Continue", options: { resume: msg.sessionId } })
    } else if (msg.subtype === "error_max_budget_usd") {
      console.log(`Budget exceeded: $${msg.totalCostUsd}`);
    }
  }
}
```

---

## Cost Tracking

```typescript
if (msg.type === "result") {
  console.log(`Cost: $${msg.totalCostUsd?.toFixed(4)}`);
  // Per-model breakdown
  for (const [model, usage] of Object.entries(msg.modelUsage ?? {})) {
    console.log(`${model}: $${usage.costUSD.toFixed(4)}`);
  }
}
```

**Optimization tips:** Use `model: "haiku"` for subagents, set `maxBudgetUsd`, limit `maxTurns`, use `effort: "low"` for simple tasks.

---

## Python Support

If the user's project is Python, load these references:
- `references/python/python-api.md` — Imports, types, `ClaudeSDKClient`, Pydantic
- `references/python/python-examples.md` — All patterns in Python

Key differences: `snake_case` options, `ClaudeAgentOptions` class, `async for` iteration, Pydantic for structured output.

---

## Reference Loading Guide

Load the reference file that matches the topic you need:

| Need | Read |
|------|------|
| Full config options table | `references/configuration.md` |
| Tool schemas, custom tools, MCP transports | `references/tools-and-mcp.md` |
| Hook events, callbacks, patterns | `references/hooks.md` |
| Permission modes, canUseTool callback | `references/permissions.md` |
| Session resume, fork, TS V2 | `references/sessions.md` |
| Subagent orchestration | `references/subagents.md` |
| Streaming details, structured output | `references/streaming-and-output.md` |
| Docker, sandbox, security | `references/hosting-and-security.md` |
| Thinking, 1M context, plugins, migration | `references/advanced.md` |
| Full real-world code examples | `references/examples.md` |
| **Python API and types** | `references/python/python-api.md` |
| **Python code examples** | `references/python/python-examples.md` |
