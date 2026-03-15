# Configuration Reference

## ClaudeAgentOptions / Options

All options for configuring agent behavior. Python uses `snake_case`, TypeScript uses `camelCase`.

### Core Options

| Option (Python / TS) | Type | Default | Description |
|----------------------|------|---------|-------------|
| `prompt` | `str` / `string` | Required | The task prompt |
| `system_prompt` / `systemPrompt` | `str \| dict` | `None` | Custom system prompt or `{"type": "preset", "preset": "claude_code"}` |
| `model` | `str` / `string` | SDK default | Claude model ID (e.g., `"claude-opus-4-6"`) |
| `fallback_model` / `fallbackModel` | `str` | `None` | Fallback model if primary unavailable |
| `effort` | `"low" \| "medium" \| "high" \| "max"` | SDK-dependent | Reasoning effort level |
| `cwd` | `str` / `string` | Current dir | Working directory for the agent |

### Tool Control

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowed_tools` / `allowedTools` | `list[str]` / `string[]` | `[]` | Tools to auto-approve without permission prompts |
| `disallowed_tools` / `disallowedTools` | `list[str]` / `string[]` | `[]` | Tools to always deny |
| `permission_mode` / `permissionMode` | `str` | `None` | Permission mode (see [Permissions](./09-permissions.md)) |
| `can_use_tool` / `canUseTool` | Callback | `None` | Custom permission callback |

### Limits

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `max_turns` / `maxTurns` | `int` / `number` | No limit | Maximum tool-use turns before stopping |
| `max_budget_usd` / `maxBudgetUsd` | `float` / `number` | No limit | Maximum cost in USD |

### Sessions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `resume` | `str` / `string` | `None` | Session ID to resume |
| `continue_conversation` / `continue` | `bool` | `False` | Continue most recent session |
| `fork_session` / `forkSession` | `bool` | `False` | Fork session when resuming (new branch) |

### MCP & Tools

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mcp_servers` / `mcpServers` | `dict` / `object` | `{}` | MCP server configurations |
| `hooks` | `dict` / `object` | `None` | Hook configurations |
| `agents` | `dict` / `object` | `None` | Subagent definitions |
| `plugins` | `list` | `[]` | Plugin configurations |

### Output

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `output_format` / `outputFormat` | `dict` / `object` | `None` | Structured output JSON schema |
| `include_partial_messages` / `includePartialMessages` | `bool` | `False` | Enable StreamEvent messages |

### Advanced

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `thinking` | `dict` | `None` | Extended thinking config (see [Advanced](./16-advanced-features.md)) |
| `betas` | `list` | `[]` | Beta features (e.g., `["context-1m-2025-08-07"]`) |
| `env` | `dict` / `object` | `{}` | Environment variables passed to agent |
| `sandbox` | `dict` / `object` | `None` | Sandbox settings |
| `enable_file_checkpointing` / `enableFileCheckpointing` | `bool` | `False` | Track file changes for rewind |
| `setting_sources` / `settingSources` | `list` | `None` | Load filesystem settings: `["user", "project", "local"]` |
| `user` | `str` | `None` | User identifier for tracking |
| `add_dirs` / `addDirs` | `list[str]` | `[]` | Additional allowed directories |
| `extra_args` / `extraArgs` | `dict` | `{}` | Extra CLI arguments |

---

## System Prompt Configuration

### No System Prompt (Default)
```python
# Agent has no predefined persona or instructions
options = ClaudeAgentOptions(system_prompt=None)
```

### Custom String
```python
options = ClaudeAgentOptions(
    system_prompt="You are a security auditor. Only analyze code for vulnerabilities."
)
```

### Claude Code Preset
```python
# Use the full Claude Code system prompt (same as CLI)
options = ClaudeAgentOptions(
    system_prompt={"type": "preset", "preset": "claude_code"}
)
```

### Loading CLAUDE.md Files
```python
# Load project CLAUDE.md and user settings
options = ClaudeAgentOptions(
    setting_sources=["user", "project", "local"]
)
```

---

## Sandbox Configuration

Isolated bash execution with command restrictions:

```python
options = ClaudeAgentOptions(
    sandbox={
        "enabled": True,
        "autoAllowBashIfSandboxed": True,   # Auto-approve Bash when sandboxed
        "excludedCommands": ["git", "docker"],  # Block specific commands
    },
)
```

---

## Environment Variables

Pass environment variables to the agent process:

```python
options = ClaudeAgentOptions(
    env={
        "GITHUB_TOKEN": os.environ["GITHUB_TOKEN"],
        "DATABASE_URL": "postgresql://...",
        "NODE_ENV": "development",
    }
)
```
