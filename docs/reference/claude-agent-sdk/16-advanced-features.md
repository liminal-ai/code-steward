# Advanced Features

## Extended Thinking

Configure Claude's internal reasoning:

```python
# Adaptive (SDK decides based on task complexity)
options = ClaudeAgentOptions(thinking={"type": "adaptive"})

# Enabled with explicit budget
options = ClaudeAgentOptions(thinking={"type": "enabled", "budget_tokens": 10000})

# Disabled (faster, cheaper)
options = ClaudeAgentOptions(thinking={"type": "disabled"})
```

### Streaming Thinking Content

```python
options = ClaudeAgentOptions(
    thinking={"type": "enabled", "budget_tokens": 10000},
    include_partial_messages=True,
)

async for message in query(prompt="...", options=options):
    if isinstance(message, StreamEvent):
        delta = message.event.get("delta", {})
        if delta.get("type") == "thinking_delta":
            print(f"[Thinking] {delta['thinking']}", end="")
```

---

## Extended Context (1M Tokens)

Enable the 1M context window beta:

```python
options = ClaudeAgentOptions(
    betas=["context-1m-2025-08-07"],
)
```

Useful for:
- Large codebase analysis
- Processing extensive documentation
- Long multi-turn sessions

---

## Dynamic Permission Changes

Change permissions mid-session:

```python
# Via query generator
q = query(prompt="...", options=ClaudeAgentOptions(permission_mode="default"))
await q.set_permission_mode("acceptEdits")

# Via ClaudeSDKClient
async with ClaudeSDKClient(options=options) as client:
    await client.set_permission_mode("bypassPermissions")
```

---

## Dynamic Model Changes

Switch models mid-session (ClaudeSDKClient):

```python
async with ClaudeSDKClient(options=options) as client:
    # Start with opus for analysis
    await client.query("Analyze the architecture")
    async for msg in client.receive_response():
        pass

    # Switch to sonnet for implementation
    await client.set_model("claude-sonnet-4-6")
    await client.query("Implement the changes")
    async for msg in client.receive_response():
        pass
```

---

## Dynamic MCP Server Management

Add/remove MCP servers at runtime:

```python
async with ClaudeSDKClient(options=options) as client:
    # Add server
    await client.add_mcp_server("github", {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {"GITHUB_TOKEN": token},
    })

    # Check status
    status = await client.get_mcp_status()
    print(status)

    # Use it
    await client.query("List open PRs")
    async for msg in client.receive_response():
        pass

    # Remove when done
    await client.remove_mcp_server("github")
```

---

## Interrupts

Send an interrupt signal to stop the current operation:

```python
async with ClaudeSDKClient(options=options) as client:
    await client.query("Process all files in the repo")

    # After some time, interrupt
    await asyncio.sleep(30)
    await client.interrupt()

    async for msg in client.receive_response():
        if isinstance(msg, ResultMessage):
            print(f"Interrupted: {msg.result}")
```

---

## Context Compaction

When the context window approaches its limit, the SDK automatically compacts the conversation by summarizing earlier messages.

### Customization

1. **CLAUDE.md instructions** - Add summarization preferences
2. **PreCompact hook** - Intercept before compaction
3. **Manual** - `/compact` slash command in interactive sessions

```python
options = ClaudeAgentOptions(
    hooks={
        "PreCompact": [
            HookMatcher(hooks=[pre_compact_handler]),
        ],
    },
)

async def pre_compact_handler(input_data, tool_use_id, context):
    return {
        "systemMessage": "When compacting, preserve all file paths and line numbers mentioned."
    }
```

---

## Effort Levels

Control reasoning depth vs speed/cost:

```python
# Quick tasks
options = ClaudeAgentOptions(effort="low")

# Standard tasks (default)
options = ClaudeAgentOptions(effort="medium")

# Complex reasoning
options = ClaudeAgentOptions(effort="high")

# Maximum reasoning
options = ClaudeAgentOptions(effort="max")
```

---

## File Checkpointing

Track file changes for rewind capability:

```python
options = ClaudeAgentOptions(
    enable_file_checkpointing=True,
    permission_mode="acceptEdits",
)

checkpoints = []

async for message in query(prompt="Refactor the auth module", options=options):
    if isinstance(message, UserMessage) and hasattr(message, "uuid"):
        checkpoints.append(message.uuid)

# Later: rewind to a checkpoint
# client.rewind_files(checkpoints[2])
```

**Note:** Only tracks changes via Write, Edit, and NotebookEdit tools. Bash file operations are not tracked.

---

## Slash Commands

Built-in slash commands available in interactive sessions:

| Command | Description |
|---------|-------------|
| `/compact` | Manually trigger context compaction |
| `/help` | Show available commands |
| `/clear` | Clear conversation history |

### Custom Slash Commands via Skills

Define custom slash commands as Skills:
```
.claude/skills/my-command/SKILL.md
```

Include `"Skill"` in `allowed_tools` and set `setting_sources` to load from filesystem.
