---
source: https://platform.claude.com/docs/en/agent-sdk/migration-guide
scraped_at: 2026-03-14
title: Migration Guide - Claude Code SDK to Claude Agent SDK
---

# Migration Guide: Claude Code SDK to Claude Agent SDK

## Overview

The Claude Code SDK has been renamed to the **Claude Agent SDK** and its documentation has been reorganized. This change reflects the SDK's broader capabilities for building AI agents beyond just coding tasks.

| Aspect | Old | New |
| --- | --- | --- |
| **Package Name (TS/JS)** | `@anthropic-ai/claude-code` | `@anthropic-ai/claude-agent-sdk` |
| **Python Package** | `claude-code-sdk` | `claude-agent-sdk` |
| **Documentation Location** | Claude Code docs | API Guide → Agent SDK section |

## Migration Steps

### For TypeScript/JavaScript Projects

**1. Uninstall the old package:**
```bash
npm uninstall @anthropic-ai/claude-code
```

**2. Install the new package:**
```bash
npm install @anthropic-ai/claude-agent-sdk
```

**3. Update your imports:**
```typescript
// Before
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-code";

// After
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
```

**4. Update package.json:**
```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.2.0"
  }
}
```

That's it! No other code changes are required.

### For Python Projects

**1. Uninstall the old package:**
```bash
pip uninstall claude-code-sdk
```

**2. Install the new package:**
```bash
pip install claude-agent-sdk
```

**3. Update your imports:**
```python
# Before
from claude_code_sdk import query, ClaudeCodeOptions

# After
from claude_agent_sdk import query, ClaudeAgentOptions
```

**4. Update type names:**
```python
# Before
from claude_code_sdk import query, ClaudeCodeOptions
options = ClaudeCodeOptions(model="claude-opus-4-6")

# After
from claude_agent_sdk import query, ClaudeAgentOptions
options = ClaudeAgentOptions(model="claude-opus-4-6")
```

## Breaking Changes

### Python: `ClaudeCodeOptions` Renamed to `ClaudeAgentOptions`

```python
# BEFORE (claude-code-sdk)
from claude_code_sdk import query, ClaudeCodeOptions
options = ClaudeCodeOptions(model="claude-opus-4-6", permission_mode="acceptEdits")

# AFTER (claude-agent-sdk)
from claude_agent_sdk import query, ClaudeAgentOptions
options = ClaudeAgentOptions(model="claude-opus-4-6", permission_mode="acceptEdits")
```

### System Prompt No Longer Default

The SDK no longer uses Claude Code's system prompt by default.

```typescript
// BEFORE (v0.0.x) - Used Claude Code's system prompt by default
const result = query({ prompt: "Hello" });

// AFTER (v0.1.0) - Uses minimal system prompt by default
// To get the old behavior, explicitly request Claude Code's preset:
const result = query({
  prompt: "Hello",
  options: {
    systemPrompt: { type: "preset", preset: "claude_code" }
  }
});

// Or use a custom system prompt:
const result = query({
  prompt: "Hello",
  options: {
    systemPrompt: "You are a helpful coding assistant"
  }
});
```

**Why this changed:** Provides better control and isolation for SDK applications.

### Settings Sources No Longer Loaded by Default

The SDK no longer reads from filesystem settings (CLAUDE.md, settings.json, slash commands, etc.) by default.

```typescript
// BEFORE (v0.0.x) - Loaded all settings automatically
const result = query({ prompt: "Hello" });

// AFTER (v0.1.0) - No settings loaded by default
// To get the old behavior:
const result = query({
  prompt: "Hello",
  options: {
    settingSources: ["user", "project", "local"]
  }
});

// Or load only specific sources:
const result = query({
  prompt: "Hello",
  options: {
    settingSources: ["project"] // Only project settings
  }
});
```

**Why this changed:** Ensures SDK applications have predictable behavior independent of local filesystem configurations. This is especially important for:
- **CI/CD environments**: Consistent behavior without local customizations
- **Deployed applications**: No dependency on filesystem settings
- **Testing**: Isolated test environments
- **Multi-tenant systems**: Prevent settings leakage between users

**Backward compatibility:** If your application relied on filesystem settings (custom slash commands, CLAUDE.md instructions, etc.), add `settingSources: ['user', 'project', 'local']` to your options.

## Why the Rename?

The Claude Code SDK was originally designed for coding tasks, but has evolved into a powerful framework for building all types of AI agents:

- Building business agents (legal assistants, finance advisors, customer support)
- Creating specialized coding agents (SRE bots, security reviewers, code review agents)
- Developing custom agents for any domain with tool use, MCP integration, and more

## Getting Help

**For TypeScript/JavaScript:**
1. Check that all imports are updated to use `@anthropic-ai/claude-agent-sdk`
2. Verify your package.json has the new package name
3. Run `npm install` to ensure dependencies are updated

**For Python:**
1. Check that all imports use `claude_agent_sdk`
2. Verify requirements.txt or pyproject.toml has the new package name
3. Run `pip install claude-agent-sdk`
