---
source: https://platform.claude.com/docs/en/agent-sdk/quickstart
scraped_at: 2026-03-14
title: Agent SDK Quickstart
---

# Agent SDK Quickstart

Use the Agent SDK to build an AI agent that reads your code, finds bugs, and fixes them — all without manual intervention.

**What you'll do:**
1. Set up a project with the Agent SDK
2. Create a file with some buggy code
3. Run an agent that finds and fixes the bugs automatically

## Prerequisites

- **Node.js 18+** or **Python 3.10+**
- An **Anthropic account** ([sign up here](https://platform.claude.com/))

## Setup

### 1. Create a project folder

```bash
mkdir my-agent && cd my-agent
```

### 2. Install the SDK

TypeScript:
```bash
npm install @anthropic-ai/claude-agent-sdk
```

Python (uv):
```bash
uv init && uv add claude-agent-sdk
```

Python (pip):
```bash
pip install claude-agent-sdk
```

### 3. Set your API key

Get an API key from the [Claude Console](https://platform.claude.com/), then create a `.env` file:

```
ANTHROPIC_API_KEY=your-api-key
```

The SDK also supports:
- **Amazon Bedrock**: `CLAUDE_CODE_USE_BEDROCK=1` + AWS credentials
- **Google Vertex AI**: `CLAUDE_CODE_USE_VERTEX=1` + Google Cloud credentials
- **Microsoft Azure**: `CLAUDE_CODE_USE_FOUNDRY=1` + Azure credentials

## Create a Buggy File

Create `utils.py` with these intentional bugs:

```python
def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)

def get_user_name(user):
    return user["name"].upper()
```

Bugs:
1. `calculate_average([])` crashes with division by zero
2. `get_user_name(None)` crashes with a TypeError

## Build an Agent That Finds and Fixes Bugs

Create `agent.py`:

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, ResultMessage

async def main():
    # Agentic loop: streams messages as Claude works
    async for message in query(
        prompt="Review utils.py for bugs that would cause crashes. Fix any issues you find.",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit", "Glob"],  # Tools Claude can use
            permission_mode="acceptEdits",  # Auto-approve file edits
        ),
    ):
        # Print human-readable output
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if hasattr(block, "text"):
                    print(block.text)  # Claude's reasoning
                elif hasattr(block, "name"):
                    print(f"Tool: {block.name}")  # Tool being called
        elif isinstance(message, ResultMessage):
            print(f"Done: {message.subtype}")  # Final result

asyncio.run(main())
```

This code has three main parts:

1. **`query`**: the main entry point that creates the agentic loop. Returns an async iterator, so use `async for` to stream messages as Claude works.
2. **`prompt`**: what you want Claude to do. Claude figures out which tools to use based on the task.
3. **`options`**: configuration for the agent. Uses `allowedTools` to pre-approve tools and `permissionMode: "acceptEdits"` to auto-approve file changes.

### Run Your Agent

```bash
python3 agent.py
```

After running, check `utils.py`. You'll see defensive code handling empty lists and null users. Your agent autonomously:
1. **Read** `utils.py` to understand the code
2. **Analyzed** the logic and identified edge cases that would crash
3. **Edited** the file to add proper error handling

### Try Other Prompts

- `"Add docstrings to all functions in utils.py"`
- `"Add type hints to all functions in utils.py"`
- `"Create a README.md documenting the functions in utils.py"`

### Customize Your Agent

**Add web search capability:**
```python
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Edit", "Glob", "WebSearch"], permission_mode="acceptEdits"
)
```

**Give Claude a custom system prompt:**
```python
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Edit", "Glob"],
    permission_mode="acceptEdits",
    system_prompt="You are a senior Python developer. Always follow PEP 8 style guidelines.",
)
```

**Run commands in the terminal:**
```python
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Edit", "Glob", "Bash"], permission_mode="acceptEdits"
)
```

With `Bash` enabled, try: `"Write unit tests for utils.py, run them, and fix any failures"`

## Key Concepts

**Tools** control what your agent can do:

| Tools | What the agent can do |
| --- | --- |
| `Read`, `Glob`, `Grep` | Read-only analysis |
| `Read`, `Edit`, `Glob` | Analyze and modify code |
| `Read`, `Edit`, `Bash`, `Glob`, `Grep` | Full automation |

**Permission modes** control human oversight:

| Mode | Behavior | Use case |
| --- | --- | --- |
| `acceptEdits` | Auto-approves file edits, asks for other actions | Trusted development workflows |
| `dontAsk` (TypeScript only) | Denies anything not in `allowedTools` | Locked-down headless agents |
| `bypassPermissions` | Runs every tool without prompts | Sandboxed CI, fully trusted environments |
| `default` | Requires a `canUseTool` callback to handle approval | Custom approval flows |

## Next Steps

- **[Permissions](./permissions.md)**: control what your agent can do and when it needs approval
- **[Hooks](./hooks.md)**: run custom code before or after tool calls
- **[Sessions](./sessions.md)**: build multi-turn agents that maintain context
- **[MCP servers](./mcp.md)**: connect to databases, browsers, APIs, and other external systems
- **[Hosting](./hosting.md)**: deploy agents to Docker, cloud, and CI/CD
- **[Example agents](https://github.com/anthropics/claude-agent-sdk-demos)**: see complete examples
