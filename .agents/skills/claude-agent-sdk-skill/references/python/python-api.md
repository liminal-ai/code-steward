# Python API Reference

## Installation

```bash
pip install claude-agent-sdk
# or
uv add claude-agent-sdk
```

Prerequisites: Python 3.10+. CLI is bundled with the package.

---

## Imports

```python
from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    AgentDefinition,
    HookMatcher,
    tool,
    create_sdk_mcp_server,
    PermissionResultAllow,
    PermissionResultDeny,
)
from claude_agent_sdk.types import (
    AssistantMessage,
    UserMessage,
    ResultMessage,
    SystemMessage,
    StreamEvent,
    TextBlock,
    HookInput,
    HookContext,
    HookJSONOutput,
)
```

---

## query() Signature

```python
async def query(
    *,
    prompt: str | AsyncIterable[dict[str, Any]],
    options: ClaudeAgentOptions | None = None,
    transport: Transport | None = None,
) -> AsyncIterator[Message]
```

---

## query() vs ClaudeSDKClient

| Feature | `query()` | `ClaudeSDKClient` |
|---------|-----------|-------------------|
| Session | New each time | Reuses same session |
| Conversation | Single exchange | Multi-turn |
| Interrupts | Not supported | Supported |
| Dynamic config | Limited | Full (model, permissions, MCP) |
| Use case | One-off tasks | Interactive apps |

---

## ClaudeAgentOptions (All Fields)

```python
options = ClaudeAgentOptions(
    # Tools
    allowed_tools=["Read", "Edit", "Bash"],
    disallowed_tools=["Write"],
    permission_mode="acceptEdits",

    # Limits
    max_turns=20,
    max_budget_usd=1.0,

    # Model
    model="claude-opus-4-6",
    fallback_model="claude-haiku-4-5",
    effort="high",

    # Session
    resume="session-id",
    continue_conversation=True,
    fork_session=True,

    # System
    system_prompt="You are a security auditor.",
    cwd="/path/to/project",
    env={"GITHUB_TOKEN": "..."},
    add_dirs=["/additional/path"],

    # Extensions
    mcp_servers={"my-tools": server},
    hooks={"PreToolUse": [HookMatcher(hooks=[my_hook])]},
    agents={"reviewer": AgentDefinition(...)},
    output_format={"type": "json_schema", "schema": {...}},
    plugins=[{"type": "local", "path": "./plugin"}],

    # Advanced
    thinking={"type": "adaptive"},
    betas=["context-1m-2025-08-07"],
    include_partial_messages=True,
    enable_file_checkpointing=True,
    setting_sources=["user", "project", "local"],
    sandbox={"enabled": True, "autoAllowBashIfSandboxed": True},
    user="user-id",
)
```

---

## ClaudeSDKClient

Stateful client for multi-turn conversations:

```python
async with ClaudeSDKClient(options=ClaudeAgentOptions(
    allowed_tools=["Read", "Edit"],
    permission_mode="acceptEdits",
)) as client:
    # First turn
    await client.query("Analyze the auth module")
    async for message in client.receive_response():
        if isinstance(message, ResultMessage):
            print(message.result)

    # Second turn (same session, full context)
    await client.query("Now refactor the login function")
    async for message in client.receive_response():
        if isinstance(message, ResultMessage):
            print(message.result)
```

### ClaudeSDKClient Methods

| Method | Description |
|--------|-------------|
| `query(prompt)` | Send new prompt |
| `receive_response()` | Async iterator over response messages |
| `interrupt()` | Send interrupt signal |
| `set_model(model)` | Change model |
| `set_permission_mode(mode)` | Change permissions |
| `add_mcp_server(name, config)` | Add MCP server |
| `remove_mcp_server(name)` | Remove MCP server |
| `get_mcp_status()` | Get MCP status |
| `rewind_files(checkpoint_id)` | Rewind to checkpoint |

---

## Custom Tools (Python)

```python
from claude_agent_sdk import tool, create_sdk_mcp_server
from typing import Any

@tool("get_weather", "Get temperature", {"latitude": float, "longitude": float})
async def get_weather(args: dict[str, Any]) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": f"72°F at ({args['latitude']}, {args['longitude']})"}]}

@tool("search_docs", "Search docs", {"query": str})
async def search_docs(args: dict[str, Any]) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": f"Results for: {args['query']}"}]}

server = create_sdk_mcp_server(name="my-tools", tools=[get_weather, search_docs])
```

---

## Hook Typing

```python
from claude_agent_sdk.types import HookInput, HookContext, HookJSONOutput

async def my_hook(
    input_data: HookInput,
    tool_use_id: str | None,
    context: HookContext,
) -> HookJSONOutput:
    return {}
```

---

## Permission Callback

```python
from claude_agent_sdk import PermissionResultAllow, PermissionResultDeny

async def custom_permission(tool_name, input_data, context):
    if tool_name == "Bash" and "rm -rf" in input_data.get("command", ""):
        return PermissionResultDeny(message="Dangerous command blocked")
    return PermissionResultAllow(updated_input=input_data)

options = ClaudeAgentOptions(can_use_tool=custom_permission)
```

---

## Structured Output (Pydantic)

```python
from pydantic import BaseModel

class FeaturePlan(BaseModel):
    feature_name: str
    summary: str
    steps: list[dict]
    risks: list[str]

options = ClaudeAgentOptions(
    output_format={"type": "json_schema", "schema": FeaturePlan.model_json_schema()},
)

async for message in query(prompt="Plan dark mode", options=options):
    if isinstance(message, ResultMessage) and message.structured_output:
        plan = FeaturePlan.model_validate(message.structured_output)
```

---

## Error Types

| Exception | Description |
|-----------|-------------|
| `ClaudeSDKError` | Base exception |
| `CLINotFoundError` | CLI not found |
| `CLIConnectionError` | Connection failed |
| `ProcessError` | Process failed (`exit_code`, `stderr`) |
| `CLIJSONDecodeError` | JSON parse error (`raw_data`) |

```python
try:
    async for msg in query(prompt="...", options=options):
        pass
except CLINotFoundError:
    print("Install: pip install claude-agent-sdk")
except ProcessError as e:
    print(f"Exit {e.exit_code}: {e.stderr}")
except ClaudeSDKError as e:
    print(f"SDK error: {e}")
```
