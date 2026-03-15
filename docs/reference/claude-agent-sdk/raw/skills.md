---
source: https://platform.claude.com/docs/en/agent-sdk/skills
scraped_at: 2026-03-14
title: Agent Skills in the SDK
---

# Agent Skills in the SDK

## Overview

Agent Skills extend Claude with specialized capabilities that Claude autonomously invokes when relevant. Skills are packaged as `SKILL.md` files containing instructions, descriptions, and optional supporting resources.

## How Skills Work with the SDK

When using the Claude Agent SDK, Skills are:

1. **Defined as filesystem artifacts**: Created as `SKILL.md` files in specific directories (`.claude/skills/`)
2. **Loaded from filesystem**: You must specify `settingSources` (TypeScript) or `setting_sources` (Python) to load Skills from the filesystem
3. **Automatically discovered**: Once filesystem settings are loaded, Skill metadata is discovered at startup
4. **Model-invoked**: Claude autonomously chooses when to use them based on context
5. **Enabled via allowed_tools**: Add `"Skill"` to your `allowed_tools` to enable Skills

Unlike subagents (which can be defined programmatically), Skills must be created as filesystem artifacts. The SDK does not provide a programmatic API for registering Skills.

**Default behavior**: By default, the SDK does not load any filesystem settings. To use Skills, you must explicitly configure `settingSources: ['user', 'project']` (TypeScript) or `setting_sources=["user", "project"]` (Python).

## Using Skills with the SDK

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    options = ClaudeAgentOptions(
        cwd="/path/to/project",  # Project with .claude/skills/
        setting_sources=["user", "project"],  # Load Skills from filesystem
        allowed_tools=["Skill", "Read", "Write", "Bash"],  # Enable Skill tool
    )

    async for message in query(
        prompt="Help me process this PDF document", options=options
    ):
        print(message)

asyncio.run(main())
```

## Skill Locations

| Location | Path | When loaded |
| --- | --- | --- |
| **Project Skills** | `.claude/skills/` | When `setting_sources` includes `"project"` |
| **User Skills** | `~/.claude/skills/` | When `setting_sources` includes `"user"` |
| **Plugin Skills** | Bundled with plugins | When plugins are loaded |

## Creating Skills

Skills are defined as directories containing a `SKILL.md` file with YAML frontmatter and Markdown content. The `description` field determines when Claude invokes your Skill.

**Directory structure:**
```
.claude/skills/processing-pdfs/
└── SKILL.md
```

## Tool Restrictions

The `allowed-tools` frontmatter field in SKILL.md is only supported when using Claude Code CLI directly. It does **not** apply when using Skills through the SDK.

When using the SDK, control tool access through the main `allowedTools` option:

```python
options = ClaudeAgentOptions(
    setting_sources=["user", "project"],
    allowed_tools=["Skill", "Read", "Grep", "Glob"],
)
```

## Discovering Available Skills

```python
options = ClaudeAgentOptions(
    setting_sources=["user", "project"],
    allowed_tools=["Skill"],
)

async for message in query(prompt="What Skills are available?", options=options):
    print(message)
```

## Troubleshooting

### Skills Not Found

**Most common issue:** Missing `setting_sources` configuration:

```python
# Wrong - Skills won't be loaded
options = ClaudeAgentOptions(allowed_tools=["Skill"])

# Correct - Skills will be loaded
options = ClaudeAgentOptions(
    setting_sources=["user", "project"],  # Required to load Skills
    allowed_tools=["Skill"],
)
```

**Check working directory:** The SDK loads Skills relative to the `cwd` option.

**Verify filesystem location:**
```bash
# Check project Skills
ls .claude/skills/*/SKILL.md

# Check personal Skills
ls ~/.claude/skills/*/SKILL.md
```

### Skill Not Being Used

- Confirm `"Skill"` is in your `allowedTools`
- Ensure the description is specific and includes relevant keywords
