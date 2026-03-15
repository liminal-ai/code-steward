---
source: https://platform.claude.com/docs/en/agent-sdk/overview
scraped_at: 2026-03-14
title: Claude Agent SDK Documentation Index
---

# Claude Agent SDK Documentation

This directory contains comprehensive documentation for the Claude Agent SDK (formerly the Claude Code SDK), scraped from official Anthropic documentation sources.

## Table of Contents

### Getting Started

| File | Description | Source |
| --- | --- | --- |
| [overview.md](./overview.md) | Agent SDK overview, capabilities, branding guidelines | platform.claude.com |
| [quickstart.md](./quickstart.md) | Build a bug-fixing agent in minutes | platform.claude.com |
| [migration-guide.md](./migration-guide.md) | Migrate from Claude Code SDK to Claude Agent SDK | platform.claude.com |

### Core Concepts

| File | Description | Source |
| --- | --- | --- |
| [agent-loop.md](./agent-loop.md) | How the autonomous agent loop works, turns, messages, context window | platform.claude.com |
| [streaming-vs-single-mode.md](./streaming-vs-single-mode.md) | Streaming input vs single message input | platform.claude.com |
| [sessions.md](./sessions.md) | Session management: continue, resume, fork | platform.claude.com |
| [modifying-system-prompts.md](./modifying-system-prompts.md) | CLAUDE.md, preset, append, and custom system prompts | platform.claude.com |

### Tools and Capabilities

| File | Description | Source |
| --- | --- | --- |
| [mcp.md](./mcp.md) | MCP integration in the Agent SDK (stdio, HTTP, SSE, SDK MCP servers) | platform.claude.com |
| [mcp-connector.md](./mcp-connector.md) | MCP connector for the Messages API (remote MCP servers) | docs.anthropic.com |
| [custom-tools.md](./custom-tools.md) | Create in-process MCP servers with custom tools | platform.claude.com |
| [web-search-tool.md](./web-search-tool.md) | Web search tool: usage, pricing, streaming, prompt caching | docs.anthropic.com |
| [subagents.md](./subagents.md) | Spawn specialized sub-agents for parallel work | platform.claude.com |
| [skills.md](./skills.md) | Agent Skills: filesystem-based specialized capabilities | platform.claude.com |
| [plugins.md](./plugins.md) | Load plugins with custom commands, agents, and MCP servers | platform.claude.com |
| [slash-commands.md](./slash-commands.md) | Built-in and custom slash commands in the SDK | platform.claude.com |

### Control and Safety

| File | Description | Source |
| --- | --- | --- |
| [permissions.md](./permissions.md) | Permission modes and allow/deny rules | platform.claude.com |
| [hooks.md](./hooks.md) | Hook callbacks for intercepting and controlling agent execution | platform.claude.com |
| [user-input.md](./user-input.md) | Handle approvals and clarifying questions from Claude | platform.claude.com |
| [secure-deployment.md](./secure-deployment.md) | Security hardening: containers, gVisor, VMs, credential management | platform.claude.com |

### Deployment and Operations

| File | Description | Source |
| --- | --- | --- |
| [hosting.md](./hosting.md) | Deployment patterns: ephemeral, long-running, hybrid | platform.claude.com |
| [cost-tracking.md](./cost-tracking.md) | Track token usage and costs per query and per model | platform.claude.com |

### SDK References

| File | Description | Source |
| --- | --- | --- |
| [python-sdk.md](./python-sdk.md) | Full Python SDK API reference: `query()`, `ClaudeSDKClient`, all types | platform.claude.com |
| [typescript-sdk.md](./typescript-sdk.md) | Full TypeScript SDK API reference: `query()`, `Options`, all types | platform.claude.com |

## Key Concepts Summary

### Package Names

| Language | Package |
| --- | --- |
| TypeScript/JavaScript | `@anthropic-ai/claude-agent-sdk` |
| Python | `claude-agent-sdk` |

### Authentication

```bash
export ANTHROPIC_API_KEY=your-api-key
```

Also supports:
- Amazon Bedrock: `CLAUDE_CODE_USE_BEDROCK=1`
- Google Vertex AI: `CLAUDE_CODE_USE_VERTEX=1`
- Microsoft Azure: `CLAUDE_CODE_USE_FOUNDRY=1`

### Quick Reference: Permission Modes

| Mode | Description |
| --- | --- |
| `default` | Tools not in `allowedTools` trigger `canUseTool` callback |
| `acceptEdits` | Auto-approves file edits and filesystem operations |
| `dontAsk` (TS only) | Denies anything not in `allowedTools` |
| `plan` | No tool execution; Claude plans only |
| `bypassPermissions` | All tools run without prompts (isolated environments only) |

### Quick Reference: Result Subtypes

| Subtype | Meaning |
| --- | --- |
| `success` | Claude finished the task normally |
| `error_max_turns` | Hit the `maxTurns` limit |
| `error_max_budget_usd` | Hit the `maxBudgetUsd` limit |
| `error_during_execution` | An error interrupted the loop |

### Built-in Tools

| Tool | Category | Description |
| --- | --- | --- |
| `Read` | File | Read file contents |
| `Edit` | File | Edit file contents |
| `Write` | File | Write new files |
| `Glob` | Search | Find files by pattern |
| `Grep` | Search | Search content with regex |
| `Bash` | Execution | Run shell commands |
| `WebSearch` | Web | Search the internet |
| `WebFetch` | Web | Fetch and parse web pages |
| `ToolSearch` | Discovery | Dynamically find and load tools |
| `Agent` | Orchestration | Spawn subagents |
| `Skill` | Orchestration | Invoke project skills |
| `AskUserQuestion` | Orchestration | Ask user clarifying questions |
| `TodoWrite` | Orchestration | Track tasks |
