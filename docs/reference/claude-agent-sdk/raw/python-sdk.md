---
source: https://platform.claude.com/docs/en/agent-sdk/python
scraped_at: 2026-03-14
title: Python SDK Reference
---

# Python SDK Reference

## Installation

```bash
pip install claude-agent-sdk
```

## Choosing Between `query()` and `ClaudeSDKClient`

| Feature | `query()` | `ClaudeSDKClient` |
| --- | --- | --- |
| **Session** | Creates new session each time | Reuses same session |
| **Conversation** | Single exchange | Multiple exchanges in same context |
| **Streaming Input** | Supported | Supported |
| **Interrupts** | Not supported | Supported |
| **Hooks** | Supported | Supported |
| **Custom Tools** | Supported | Supported |
| **Continue Chat** | New session each time | Maintains conversation |
| **Use Case** | One-off tasks | Continuous conversations |

Use `query()` for one-off questions and independent tasks.
Use `ClaudeSDKClient` for continuing conversations, follow-up questions, interactive applications, and when next actions depend on Claude's previous responses.

## Functions

### `query()`

Creates a new session for each interaction with Claude Code. Returns an async iterator.

```python
async def query(
    *,
    prompt: str | AsyncIterable[dict[str, Any]],
    options: ClaudeAgentOptions | None = None,
    transport: Transport | None = None
) -> AsyncIterator[Message]
```

#### Example

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    options = ClaudeAgentOptions(
        system_prompt="You are an expert Python developer",
        permission_mode="acceptEdits",
        cwd="/home/user/project",
    )

    async for message in query(prompt="Create a Python web server", options=options):
        print(message)

asyncio.run(main())
```

### `tool()` Decorator

Decorator for defining MCP tools with type safety.

```python
def tool(
    name: str,
    description: str,
    input_schema: type | dict[str, Any],
    annotations: ToolAnnotations | None = None
) -> Callable
```

**Input schema options:**

Simple type mapping (recommended):
```python
{"text": str, "count": int, "enabled": bool}
```

JSON Schema format (for complex validation):
```python
{
    "type": "object",
    "properties": {
        "text": {"type": "string"},
        "count": {"type": "integer", "minimum": 0},
    },
    "required": ["text"],
}
```

**Example:**
```python
from claude_agent_sdk import tool
from typing import Any

@tool("greet", "Greet a user", {"name": str})
async def greet(args: dict[str, Any]) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": f"Hello, {args['name']}!"}]}
```

### `create_sdk_mcp_server()`

Creates an in-process MCP server.

```python
def create_sdk_mcp_server(
    name: str,
    version: str = "1.0.0",
    tools: list[SdkMcpTool[Any]] | None = None
) -> McpSdkServerConfig
```

```python
from claude_agent_sdk import tool, create_sdk_mcp_server

@tool("add", "Add two numbers", {"a": float, "b": float})
async def add(args):
    return {"content": [{"type": "text", "text": f"Sum: {args['a'] + args['b']}"}]}

calculator = create_sdk_mcp_server(name="calculator", version="2.0.0", tools=[add])

options = ClaudeAgentOptions(
    mcp_servers={"calc": calculator},
    allowed_tools=["mcp__calc__add"],
)
```

### `list_sessions()`

Lists past sessions with metadata. Synchronous.

```python
def list_sessions(
    directory: str | None = None,
    limit: int | None = None,
    include_worktrees: bool = True
) -> list[SDKSessionInfo]
```

```python
from claude_agent_sdk import list_sessions

for session in list_sessions(directory="/path/to/project", limit=10):
    print(f"{session.summary} ({session.session_id})")
```

### `get_session_messages()`

Retrieves messages from a past session. Synchronous.

```python
def get_session_messages(
    session_id: str,
    directory: str | None = None,
    limit: int | None = None,
    offset: int = 0
) -> list[SessionMessage]
```

## Classes

### `ClaudeSDKClient`

Maintains a conversation session across multiple exchanges.

```python
class ClaudeSDKClient:
    def __init__(self, options: ClaudeAgentOptions | None = None, transport: Transport | None = None)
    async def connect(self, prompt: str | AsyncIterable[dict] | None = None) -> None
    async def query(self, prompt: str | AsyncIterable[dict], session_id: str = "default") -> None
    async def receive_messages(self) -> AsyncIterator[Message]
    async def receive_response(self) -> AsyncIterator[Message]
    async def interrupt(self) -> None
    async def set_permission_mode(self, mode: str) -> None
    async def set_model(self, model: str | None = None) -> None
    async def rewind_files(self, user_message_id: str) -> None
    async def get_mcp_status(self) -> list[McpServerStatus]
    async def add_mcp_server(self, name: str, config: McpServerConfig) -> None
    async def remove_mcp_server(self, name: str) -> None
    async def get_server_info(self) -> dict[str, Any] | None
    async def disconnect(self) -> None
```

Use as an async context manager:
```python
async with ClaudeSDKClient() as client:
    await client.query("Hello Claude")
    async for message in client.receive_response():
        print(message)
```

#### Multi-turn conversation example

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient, AssistantMessage, TextBlock

async def main():
    async with ClaudeSDKClient() as client:
        await client.query("What's the capital of France?")
        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")

        # Follow-up — session retains context
        await client.query("What's the population of that city?")
        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")

asyncio.run(main())
```

## Types

### `ClaudeAgentOptions`

```python
@dataclass
class ClaudeAgentOptions:
    tools: list[str] | ToolsPreset | None = None
    allowed_tools: list[str] = field(default_factory=list)
    system_prompt: str | SystemPromptPreset | None = None
    mcp_servers: dict[str, McpServerConfig] | str | Path = field(default_factory=dict)
    permission_mode: PermissionMode | None = None
    continue_conversation: bool = False
    resume: str | None = None
    max_turns: int | None = None
    max_budget_usd: float | None = None
    disallowed_tools: list[str] = field(default_factory=list)
    model: str | None = None
    cwd: str | Path | None = None
    env: dict[str, str] = field(default_factory=dict)
    can_use_tool: CanUseTool | None = None
    hooks: dict[HookEvent, list[HookMatcher]] | None = None
    include_partial_messages: bool = False
    fork_session: bool = False
    agents: dict[str, AgentDefinition] | None = None
    setting_sources: list[SettingSource] | None = None
    plugins: list[SdkPluginConfig] = field(default_factory=list)
    thinking: ThinkingConfig | None = None
    effort: Literal["low", "medium", "high", "max"] | None = None
    enable_file_checkpointing: bool = False
    # ... additional fields
```

Key properties:

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `allowed_tools` | `list[str]` | `[]` | Tools to auto-approve. Does NOT restrict Claude to only these; unlisted tools fall through to `permission_mode`. |
| `disallowed_tools` | `list[str]` | `[]` | Tools to always deny, even in `bypassPermissions` mode. |
| `system_prompt` | `str | SystemPromptPreset | None` | `None` | Custom system prompt or preset. Use `{"type": "preset", "preset": "claude_code"}` for Claude Code's system prompt. |
| `permission_mode` | `PermissionMode | None` | `None` | `"default"`, `"acceptEdits"`, `"plan"`, `"bypassPermissions"` |
| `setting_sources` | `list[SettingSource] | None` | `None` | Load filesystem settings. Must include `"project"` to load CLAUDE.md. |
| `max_turns` | `int | None` | `None` | Maximum tool-use round trips. |
| `max_budget_usd` | `float | None` | `None` | Maximum cost before stopping. |
| `resume` | `str | None` | `None` | Session ID to resume. |
| `fork_session` | `bool` | `False` | When resuming, fork to a new session ID. |
| `effort` | `Literal[...]` | `None` | `"low"`, `"medium"`, `"high"`, `"max"` for reasoning depth. |
| `agents` | `dict[str, AgentDefinition] | None` | `None` | Programmatically defined subagents. |
| `enable_file_checkpointing` | `bool` | `False` | Enable file change tracking for rewinding. |

### `SettingSource`

```python
SettingSource = Literal["user", "project", "local"]
```

| Value | Location |
| --- | --- |
| `"user"` | `~/.claude/settings.json` |
| `"project"` | `.claude/settings.json` |
| `"local"` | `.claude/settings.local.json` |

When `setting_sources` is `None` (default), the SDK does **not** load any filesystem settings.

### `AgentDefinition`

```python
@dataclass
class AgentDefinition:
    description: str
    prompt: str
    tools: list[str] | None = None
    model: Literal["sonnet", "opus", "haiku", "inherit"] | None = None
```

### `PermissionMode`

```python
PermissionMode = Literal["default", "acceptEdits", "plan", "bypassPermissions"]
```

### `CanUseTool`

```python
CanUseTool = Callable[[str, dict[str, Any], ToolPermissionContext], Awaitable[PermissionResult]]
```

### `PermissionResultAllow`

```python
@dataclass
class PermissionResultAllow:
    behavior: Literal["allow"] = "allow"
    updated_input: dict[str, Any] | None = None
    updated_permissions: list[PermissionUpdate] | None = None
```

### `PermissionResultDeny`

```python
@dataclass
class PermissionResultDeny:
    behavior: Literal["deny"] = "deny"
    message: str = ""
    interrupt: bool = False
```

### `SystemPromptPreset`

```python
class SystemPromptPreset(TypedDict):
    type: Literal["preset"]
    preset: Literal["claude_code"]
    append: NotRequired[str]
```

### `ThinkingConfig`

```python
ThinkingConfig = ThinkingConfigAdaptive | ThinkingConfigEnabled | ThinkingConfigDisabled

class ThinkingConfigAdaptive(TypedDict):
    type: Literal["adaptive"]

class ThinkingConfigEnabled(TypedDict):
    type: Literal["enabled"]
    budget_tokens: int

class ThinkingConfigDisabled(TypedDict):
    type: Literal["disabled"]
```

### `SdkBeta`

```python
SdkBeta = Literal["context-1m-2025-08-07"]
```

Enable 1M-token context window for Sonnet 4.5 and Sonnet 4 with `betas=["context-1m-2025-08-07"]`.
(Claude Opus 4.6 and Sonnet 4.6 have 1M context by default.)

## Message Types

### `Message` (Union)

```python
Message = UserMessage | AssistantMessage | SystemMessage | ResultMessage | StreamEvent
```

### `AssistantMessage`

```python
@dataclass
class AssistantMessage:
    content: list[ContentBlock]
    model: str
    parent_tool_use_id: str | None = None
    error: AssistantMessageError | None = None
```

### `ResultMessage`

```python
@dataclass
class ResultMessage:
    subtype: str  # "success" | "error_max_turns" | "error_max_budget_usd" | "error_during_execution"
    duration_ms: int
    duration_api_ms: int
    is_error: bool
    num_turns: int
    session_id: str
    total_cost_usd: float | None = None
    usage: dict[str, Any] | None = None  # Keys: input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens
    result: str | None = None  # Only present on "success" subtype
    stop_reason: str | None = None  # "end_turn" | "max_tokens" | "refusal"
    structured_output: Any = None
```

### `SystemMessage`

```python
@dataclass
class SystemMessage:
    subtype: str  # "init" | "compact_boundary"
    data: dict[str, Any]
```

### `StreamEvent`

Only received when `include_partial_messages=True`.

```python
@dataclass
class StreamEvent:
    uuid: str
    session_id: str
    event: dict[str, Any]  # Raw Claude API stream event
    parent_tool_use_id: str | None = None
```

## Content Block Types

| Type | Description |
| --- | --- |
| `TextBlock` | Text content with `.text` field |
| `ToolUseBlock` | Tool call with `.name`, `.id`, `.input` fields |
| `ToolResultBlock` | Tool result with `.tool_use_id`, `.content`, `.is_error` fields |
| `ThinkingBlock` | Extended thinking content |

## Hook Input Types

Hooks receive typed input objects. All share `session_id`, `cwd`, and `hook_event_name` fields.

`PreToolUse` / `PostToolUse` inputs include:
- `tool_name`: str
- `tool_input`: dict
- `agent_id`: str | None (for subagent hooks)
- `agent_type`: str | None

## Tool Input/Output Types

Tool inputs vary by tool. Common ones:

| Tool | Key input fields |
| --- | --- |
| `Bash` | `command`, `description`, `timeout` |
| `Read` | `file_path`, `offset`, `limit` |
| `Write` | `file_path`, `content` |
| `Edit` | `file_path`, `old_string`, `new_string` |
| `Glob` | `pattern`, `path` |
| `Grep` | `pattern`, `path`, `include` |
