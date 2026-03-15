# Python Examples

## Basic Query

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="What files are in the current directory?",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Glob", "Bash"],
            permission_mode="bypassPermissions",
            max_turns=5,
        ),
    ):
        if hasattr(message, "result"):
            print(f"Result: {message.result}")
            print(f"Cost: ${message.total_cost_usd:.4f}")

asyncio.run(main())
```

---

## Processing All Message Types

```python
from claude_agent_sdk.types import (
    AssistantMessage, UserMessage, ResultMessage, SystemMessage, StreamEvent,
)

async for message in query(prompt="...", options=options):
    if isinstance(message, SystemMessage):
        print(f"System: {message.subtype}")
    elif isinstance(message, AssistantMessage):
        for block in message.content:
            if block.get("type") == "text":
                print(f"Claude: {block['text']}")
            elif block.get("type") == "tool_use":
                print(f"Tool: {block['name']}({block['input']})")
    elif isinstance(message, ResultMessage):
        print(f"Done ({message.subtype}): {message.result}")
        print(f"Session: {message.session_id}")
        print(f"Cost: ${message.total_cost_usd:.4f}")
```

---

## Multi-Turn with ClaudeSDKClient

```python
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions

async with ClaudeSDKClient(options=ClaudeAgentOptions(
    allowed_tools=["Read", "Edit", "Bash"],
    permission_mode="acceptEdits",
)) as client:
    await client.query("Analyze the auth module")
    async for msg in client.receive_response():
        if hasattr(msg, "result"):
            print(f"Turn 1: {msg.result}")

    await client.query("Add rate limiting to login")
    async for msg in client.receive_response():
        if hasattr(msg, "result"):
            print(f"Turn 2: {msg.result}")

    await client.query("Write tests")
    async for msg in client.receive_response():
        if hasattr(msg, "result"):
            print(f"Turn 3: {msg.result}")
```

---

## Session Resume and Fork

```python
# Capture session ID
session_id = None
async for message in query(prompt="Build the feature", options=options):
    if isinstance(message, ResultMessage):
        session_id = message.session_id

# Resume
async for message in query(
    prompt="Now add error handling",
    options=ClaudeAgentOptions(resume=session_id),
):
    pass

# Fork (new branch, original untouched)
async for message in query(
    prompt="Try OAuth2 approach instead",
    options=ClaudeAgentOptions(resume=session_id, fork_session=True),
):
    pass
```

---

## Custom Tools

```python
from claude_agent_sdk import tool, create_sdk_mcp_server, ClaudeAgentOptions

@tool("greet", "Greet a user", {"name": str})
async def greet(args):
    return {"content": [{"type": "text", "text": f"Hello, {args['name']}!"}]}

@tool("get_time", "Get current time", {})
async def get_time(args):
    import datetime
    now = datetime.datetime.now().isoformat()
    return {"content": [{"type": "text", "text": f"Current time: {now}"}]}

server = create_sdk_mcp_server(name="utils", tools=[greet, get_time])

async for msg in query(
    prompt="Greet Alice and tell her the time",
    options=ClaudeAgentOptions(
        mcp_servers={"utils": server},
        allowed_tools=["mcp__utils__*"],
    ),
):
    if hasattr(msg, "result"):
        print(msg.result)
```

---

## Hooks

```python
from claude_agent_sdk import ClaudeAgentOptions, HookMatcher
from claude_agent_sdk.types import HookInput, HookContext, HookJSONOutput

async def block_env_writes(
    input_data: HookInput, tool_use_id: str | None, context: HookContext
) -> HookJSONOutput:
    file_path = input_data.get("tool_input", {}).get("file_path", "")
    if ".env" in file_path:
        return {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"Cannot modify: {file_path}",
            }
        }
    return {}

async def log_tools(input_data, tool_use_id, context):
    print(f"[LOG] {input_data.get('tool_name')}")
    return {"async_": True}

options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Write|Edit", hooks=[block_env_writes]),
            HookMatcher(hooks=[log_tools]),
        ],
    },
    allowed_tools=["Read", "Edit", "Write", "Bash"],
)
```

---

## Subagents

```python
from claude_agent_sdk import AgentDefinition, ClaudeAgentOptions

options = ClaudeAgentOptions(
    allowed_tools=["Read", "Grep", "Agent"],
    agents={
        "reviewer": AgentDefinition(
            description="Code reviewer for security and quality.",
            prompt="Analyze code for bugs and security issues.",
            tools=["Read", "Glob", "Grep"],
            model="sonnet",
        ),
        "fixer": AgentDefinition(
            description="Fix issues found by reviewer.",
            prompt="Apply fixes based on findings.",
            tools=["Read", "Edit", "Write", "Bash"],
            model="opus",
        ),
    },
)
```

---

## Streaming

```python
from claude_agent_sdk.types import StreamEvent

options = ClaudeAgentOptions(include_partial_messages=True)

async for message in query(prompt="Explain this code", options=options):
    if isinstance(message, StreamEvent):
        event = message.event
        if event.get("type") == "content_block_delta":
            delta = event.get("delta", {})
            if delta.get("type") == "text_delta":
                print(delta.get("text", ""), end="", flush=True)
```

---

## Structured Output with Pydantic

```python
from pydantic import BaseModel

class BugReport(BaseModel):
    file: str
    line: int
    severity: str
    description: str
    fix_suggestion: str

class AnalysisResult(BaseModel):
    bugs: list[BugReport]
    summary: str
    risk_level: str

options = ClaudeAgentOptions(
    output_format={"type": "json_schema", "schema": AnalysisResult.model_json_schema()},
    allowed_tools=["Read", "Glob", "Grep"],
)

async for msg in query(prompt="Find bugs in auth.py", options=options):
    if isinstance(msg, ResultMessage) and msg.structured_output:
        result = AnalysisResult.model_validate(msg.structured_output)
        for bug in result.bugs:
            print(f"{bug.file}:{bug.line} [{bug.severity}] {bug.description}")
```

---

## Error Handling with Recovery

```python
from claude_agent_sdk import ClaudeSDKError, ProcessError

session_id = None

async for msg in query(
    prompt="Refactor the auth module",
    options=ClaudeAgentOptions(max_turns=10, max_budget_usd=0.50),
):
    if isinstance(msg, ResultMessage):
        session_id = msg.session_id
        if msg.subtype == "error_max_turns":
            print("Hit turn limit, resuming...")
            async for cont in query(
                prompt="Continue",
                options=ClaudeAgentOptions(resume=session_id, max_turns=10),
            ):
                if isinstance(cont, ResultMessage):
                    print(cont.result)
        elif msg.subtype == "success":
            print(msg.result)
        print(f"Cost: ${msg.total_cost_usd:.4f}")
```

---

## MCP Servers (External)

```python
import os

options = ClaudeAgentOptions(
    mcp_servers={
        "github": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {"GITHUB_TOKEN": os.environ["GITHUB_TOKEN"]},
        },
        "postgres": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://..."],
        },
    },
    allowed_tools=["mcp__github__*", "mcp__postgres__*"],
)
```
