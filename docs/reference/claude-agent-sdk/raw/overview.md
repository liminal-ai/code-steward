---
source: https://platform.claude.com/docs/en/agent-sdk/overview
scraped_at: 2026-03-14
title: Agent SDK Overview
---

# Agent SDK Overview

The Claude Code SDK has been renamed to the **Claude Agent SDK**. If you're migrating from the old SDK, see the [Migration Guide](./migration-guide.md).

Build AI agents that autonomously read files, run commands, search the web, edit code, and more. The Agent SDK gives you the same tools, agent loop, and context management that power Claude Code, programmable in Python and TypeScript.

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="Find and fix the bug in auth.py",
        options=ClaudeAgentOptions(allowed_tools=["Read", "Edit", "Bash"]),
    ):
        print(message)  # Claude reads the file, finds the bug, edits it

asyncio.run(main())
```

The Agent SDK includes built-in tools for reading files, running commands, and editing code, so your agent can start working immediately without you implementing tool execution.

## Get Started

1. **Install the SDK**
   - TypeScript: `npm install @anthropic-ai/claude-agent-sdk`
   - Python: `pip install claude-agent-sdk`

2. **Set your API key**
   ```bash
   export ANTHROPIC_API_KEY=your-api-key
   ```
   The SDK also supports Amazon Bedrock (`CLAUDE_CODE_USE_BEDROCK=1`), Google Vertex AI (`CLAUDE_CODE_USE_VERTEX=1`), and Microsoft Azure (`CLAUDE_CODE_USE_FOUNDRY=1`).

3. **Run your first agent**
   ```python
   import asyncio
   from claude_agent_sdk import query, ClaudeAgentOptions

   async def main():
       async for message in query(
           prompt="What files are in this directory?",
           options=ClaudeAgentOptions(allowed_tools=["Bash", "Glob"]),
       ):
           if hasattr(message, "result"):
               print(message.result)

   asyncio.run(main())
   ```

## Capabilities

Everything that makes Claude Code powerful is available in the SDK:

- **Built-in tools**: Read, Edit, Write, Bash, Glob, Grep, WebSearch, WebFetch, and more
- **Hooks**: Run custom code before or after tool calls
- **Subagents**: Spawn specialized agents for subtasks
- **MCP**: Connect to databases, browsers, APIs, and other external systems
- **Permissions**: Fine-grained control over what the agent can do
- **Sessions**: Multi-turn agents that maintain context

## Claude Code Features

The SDK also supports Claude Code's filesystem-based configuration. Set `setting_sources=["project"]` (Python) or `settingSources: ['project']` (TypeScript) to enable:

| Feature | Description | Location |
| --- | --- | --- |
| Skills | Specialized capabilities defined in Markdown | `.claude/skills/SKILL.md` |
| Slash commands | Custom commands for common tasks | `.claude/commands/*.md` |
| Memory | Project context and instructions | `CLAUDE.md` or `.claude/CLAUDE.md` |
| Plugins | Extend with custom commands, agents, and MCP servers | Programmatic via `plugins` option |

## Compare Agent SDK to Other Claude Tools

The Agent SDK is distinct from:
- **Client SDK** (`@anthropic-ai/sdk` / `anthropic`): Lower-level API for direct messages. The Agent SDK wraps this with an autonomous agent loop, tool execution, and session management.
- **Claude Code CLI**: The CLI is for interactive use in a terminal. The Agent SDK is for programmatic use in your application code.

## Changelog

- **TypeScript SDK**: [CHANGELOG.md](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md)
- **Python SDK**: [CHANGELOG.md](https://github.com/anthropics/claude-agent-sdk-python/blob/main/CHANGELOG.md)

## Reporting Bugs

- **TypeScript SDK**: [GitHub Issues](https://github.com/anthropics/claude-agent-sdk-typescript/issues)
- **Python SDK**: [GitHub Issues](https://github.com/anthropics/claude-agent-sdk-python/issues)

## Branding Guidelines

**Allowed:**
- "Claude Agent" (preferred for dropdown menus)
- "Claude" (when within a menu already labeled "Agents")
- "{YourAgentName} Powered by Claude"

**Not permitted:**
- "Claude Code" or "Claude Code Agent"
- Claude Code-branded ASCII art or visual elements that mimic Claude Code

## License and Terms

Use of the Claude Agent SDK is governed by [Anthropic's Commercial Terms of Service](https://www.anthropic.com/legal/commercial-terms).
