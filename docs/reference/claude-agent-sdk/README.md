# Claude Agent SDK Reference

**SDK Versions:** Python v0.1.48 | TypeScript v0.2.76
**Research Date:** 2026-03-14

The Claude Agent SDK (formerly Claude Code SDK) is Anthropic's framework for building autonomous AI agents programmatically. It provides the same tools, agent loop, and context management that power Claude Code, available as libraries in Python and TypeScript.

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [Getting Started](./01-getting-started.md) | Installation, authentication, quickstart examples |
| [Core Concepts](./02-core-concepts.md) | Agent loop, message types, result subtypes |
| [Query API](./03-query-api.md) | Primary `query()` function reference |
| [Configuration](./04-configuration.md) | All `ClaudeAgentOptions` fields with types and defaults |
| [Built-in Tools](./05-built-in-tools.md) | All 17 built-in tools with descriptions |
| [Custom Tools](./06-custom-tools.md) | Creating custom tools via MCP servers |
| [MCP Integration](./07-mcp-integration.md) | Transport types, config, tool search, .mcp.json |
| [Hooks](./08-hooks.md) | Hook events, callbacks, matchers, output options |
| [Permissions](./09-permissions.md) | Permission modes, evaluation order, canUseTool |
| [Sessions](./10-sessions.md) | Multi-turn, resume, fork, ClaudeSDKClient |
| [Subagents](./11-subagents.md) | AgentDefinition, isolation, tool restriction |
| [Streaming](./12-streaming.md) | Output streaming, input streaming, StreamEvent |
| [Structured Output](./13-structured-output.md) | JSON Schema, Pydantic, Zod validation |
| [Error Handling](./14-error-handling.md) | Error types, result subtypes, recovery |
| [Cost Tracking](./15-cost-tracking.md) | Usage monitoring, per-model breakdown |
| [Advanced Features](./16-advanced-features.md) | Thinking, 1M context, dynamic config, interrupts |
| [Hosting & Deployment](./17-hosting-deployment.md) | Docker, cloud, sandbox, security |
| [Migration Guide](./18-migration-guide.md) | Migrating from Claude Code SDK |
| [Skills & Plugins](./19-skills-plugins.md) | Skills system, plugin architecture |
| [Resources](./20-resources.md) | Official docs, repos, community resources |
| [Examples](./21-examples.md) | WebSocket chat, multi-agent research, AIClient wrapper, email classifier |

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│              Your Application                │
│  ┌─────────────────────────────────────────┐ │
│  │  query(prompt, options) -> messages      │ │
│  └──────────────┬──────────────────────────┘ │
│                 │                             │
│  ┌──────────────▼──────────────────────────┐ │
│  │         Claude Agent SDK                 │ │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │  │  Hooks  │ │Permissions│ │ Sessions │ │ │
│  │  └─────────┘ └──────────┘ └──────────┘ │ │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │  │Subagents│ │   MCP    │ │Streaming │ │ │
│  │  └─────────┘ └──────────┘ └──────────┘ │ │
│  └──────────────┬──────────────────────────┘ │
│                 │                             │
│  ┌──────────────▼──────────────────────────┐ │
│  │          Agent Loop                      │ │
│  │  Prompt → Claude → Tools → Repeat        │ │
│  └──────────────┬──────────────────────────┘ │
│                 │                             │
│  ┌──────────────▼──────────────────────────┐ │
│  │         Built-in Tools                   │ │
│  │  Read, Write, Edit, Bash, Glob, Grep,   │ │
│  │  WebSearch, WebFetch, Agent, Skill, ...  │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Key Concepts

- **query()** - Primary async generator API. Call with prompt + options, iterate over messages.
- **Agent Loop** - Autonomous cycle: Claude thinks → requests tools → SDK executes → repeat.
- **MCP** - Model Context Protocol. Standard for defining custom tools as servers.
- **Hooks** - Intercept and modify agent behavior at 16+ event points.
- **Sessions** - Persistent conversations that can be resumed, forked, or continued.
- **Subagents** - Isolated child agents with restricted tools and separate context.

---

## Raw Official Documentation

The `raw/` subdirectory contains scraped copies of official Anthropic documentation pages (from `platform.claude.com`). These include source URLs and may contain additional detail beyond the organized guides above. Useful for cross-referencing specific API signatures or edge cases.
