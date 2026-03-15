# Claude Agent SDK - Context7 Source 3: Python SDK (anthropics/claude-agent-sdk-python)
## Library ID: /anthropics/claude-agent-sdk-python
## Source Reputation: High | Benchmark Score: 77.54 | Code Snippets: 51

---

### Configure ClaudeAgentOptions with Python SDK

Source: https://context7.com/anthropics/claude-agent-sdk-python/llms.txt

Initialize ClaudeAgentOptions with comprehensive settings including tool configuration, model selection, permission modes, sandbox settings, and session management. This example demonstrates all major configuration options available for customizing Claude agent behavior in Python applications.

```python
from pathlib import Path
from claude_agent_sdk import ClaudeAgentOptions, AgentDefinition

options = ClaudeAgentOptions(
    # Tool configuration
    allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    disallowed_tools=["WebFetch"],

    # System prompt configuration
    system_prompt="You are a helpful coding assistant specializing in Python.",

    # Permission and execution settings
    permission_mode="acceptEdits",  # Options: "default", "acceptEdits", "plan", "bypassPermissions"
    max_turns=10,
    max_budget_usd=0.50,

    # Model configuration
    model="claude-sonnet-4-5",
    fallback_model="claude-haiku-3-5",

    # Working directory
    cwd=Path("/path/to/project"),
    add_dirs=["/additional/allowed/path"],

    # Environment variables
    env={"MY_API_KEY": "secret_key"},

    # Session management
    continue_conversation=True,
    resume="session-uuid-to-resume",
    fork_session=True,

    # Custom agents
    agents={
        "code-reviewer": AgentDefinition(
            description="Reviews code for quality",
            prompt="Review the provided code for best practices",
            tools=["Read", "Grep"],
            model="sonnet",
        ),
    },

    # Sandbox configuration for bash isolation
    sandbox={
        "enabled": True,
        "autoAllowBashIfSandboxed": True,
        "excludedCommands": ["git", "docker"],
    },

    # Extended thinking configuration
    thinking={"type": "adaptive"},
    effort="high",

    # Streaming configuration
    include_partial_messages=True,
    enable_file_checkpointing=True,
)
```

---

### Implement Agent Control Hooks for Security and Context

Source: https://context7.com/anthropics/claude-agent-sdk-python/llms.txt

Shows how to utilize HookMatcher to intercept agent behavior. This example includes a PreToolUse hook to block dangerous shell commands and a PostToolUse hook to inject system messages or context based on tool execution results.

```python
import asyncio
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    ResultMessage,
    TextBlock,
    HookMatcher,
)
from claude_agent_sdk.types import HookInput, HookContext, HookJSONOutput

# PreToolUse hook to block certain commands
async def check_bash_command(
    input_data: HookInput, tool_use_id: str | None, context: HookContext
) -> HookJSONOutput:
    tool_name = input_data["tool_name"]
    tool_input = input_data["tool_input"]

    if tool_name != "Bash":
        return {}

    command = tool_input.get("command", "")
    blocked_patterns = ["rm -rf", "sudo", "chmod 777"]

    for pattern in blocked_patterns:
        if pattern in command:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Blocked dangerous pattern: {pattern}",
                }
            }

    return {}  # Allow the command

# PostToolUse hook to add context after tool execution
async def review_tool_output(
    input_data: HookInput, tool_use_id: str | None, context: HookContext
) -> HookJSONOutput:
    tool_response = input_data.get("tool_response", "")

    if "error" in str(tool_response).lower():
        return {
            "systemMessage": "Tool execution encountered an error",
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": "Consider trying a different approach.",
            }
        }
    return {}

async def main():
    options = ClaudeAgentOptions(
        allowed_tools=["Bash", "Read", "Write"],
        hooks={
            "PreToolUse": [
                HookMatcher(matcher="Bash", hooks=[check_bash_command]),
            ],
            "PostToolUse": [
                HookMatcher(matcher="Bash", hooks=[review_tool_output]),
            ],
        }
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query("Run: echo 'Hello World'")
        async for msg in client.receive_response():
            if isinstance(msg, AssistantMessage):
                for block in msg.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")

asyncio.run(main)
```

---

### Implement Pre-Tool Use Hooks in Python Claude Agent SDK

Source: https://github.com/anthropics/claude-agent-sdk-python/blob/main/README.md

Shows how to define and register a hook function to intercept and validate tool calls before execution. In this example, a Bash command is inspected and blocked if it matches specific forbidden patterns, providing deterministic control over agent behavior.

```python
from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, HookMatcher

async def check_bash_command(input_data, tool_use_id, context):
    tool_name = input_data["tool_name"]
    tool_input = input_data["tool_input"]
    if tool_name != "Bash":
        return {}
    command = tool_input.get("command", "")
    block_patterns = ["foo.sh"]
    for pattern in block_patterns:
        if pattern in command:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Command contains invalid pattern: {pattern}",
                }
            }
    return {}

options = ClaudeAgentOptions(
    allowed_tools=["Bash"],
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Bash", hooks=[check_bash_command]),
        ],
    }
)

async with ClaudeSDKClient(options=options) as client:
    await client.query("Run the bash command: ./foo.sh --help")
    async for msg in client.receive_response():
        print(msg)
```

---

### Implement Custom Tool Permission Callback in Claude Agent SDK (Python)

Source: https://context7.com/anthropics/claude-agent-sdk-python/llms.txt

This snippet defines an asynchronous callback function `my_permission_callback` that allows developers to programmatically control tool usage by Claude. It demonstrates how to allow specific read operations, deny writes to sensitive system directories, redirect writes to safe locations, and block dangerous bash commands. The callback returns `PermissionResultAllow` or `PermissionResultDeny` to manage tool execution and can modify tool inputs.

```python
import asyncio
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    PermissionResultAllow,
    PermissionResultDeny,
    ToolPermissionContext,
)

async def my_permission_callback(
    tool_name: str,
    input_data: dict,
    context: ToolPermissionContext
) -> PermissionResultAllow | PermissionResultDeny:
    """Control tool permissions with custom logic."""

    # Always allow read-only operations
    if tool_name in ["Read", "Glob", "Grep"]:
        print(f"Allowing read operation: {tool_name}")
        return PermissionResultAllow()

    # Block writes to system directories
    if tool_name in ["Write", "Edit"]:
        file_path = input_data.get("file_path", "")
        if file_path.startswith("/etc/") or file_path.startswith("/usr/"):
            return PermissionResultDeny(
                message=f"Cannot write to system directory: {file_path}"
            )

        # Redirect writes to a safe directory
        if not file_path.startswith("/tmp/"):
            safe_path = f"/tmp/safe_output/{file_path.split('/')[-1]}"
            return PermissionResultAllow(
                updated_input={**input_data, "file_path": safe_path}
            )

    # Check bash commands for dangerous patterns
    if tool_name == "Bash":
        command = input_data.get("command", "")
        dangerous = ["rm -rf", "sudo", "dd if="]
        for pattern in dangerous:
            if pattern in command:
                return PermissionResultDeny(
                    message=f"Dangerous command blocked: {pattern}"
                )

    return PermissionResultAllow()

async def main():
    options = ClaudeAgentOptions(
        can_use_tool=my_permission_callback,
        permission_mode="default",
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query("List files in the current directory, then create test.txt")

        async for msg in client.receive_response():
            if isinstance(msg, AssistantMessage):
                for block in msg.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")

asyncio.run(main)
```

---

### Managing MCP Server Connections with Claude Agent SDK in Python

Source: https://context7.com/anthropics/claude-agent-sdk-python/llms.txt

This example illustrates how to query the status of configured MCP (Multi-Client Protocol) servers, reconnect failed servers, and toggle their enabled state during a session. It demonstrates using `ClaudeAgentOptions` for initial server configuration and then interacting with server states via `get_mcp_status`, `reconnect_mcp_server`, and `toggle_mcp_server` methods.

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions

async def main():
    options = ClaudeAgentOptions(
        mcp_servers={
            "external": {
                "type": "stdio",
                "command": "my-mcp-server",
                "args": ["--port", "8080"],
            }
        }
    )

    async with ClaudeSDKClient(options=options) as client:
        # Get current MCP server status
        status = await client.get_mcp_status()

        for server in status["mcpServers"]:
            print(f"Server: {server['name']}")
            print(f"  Status: {server['status']}")
            if server["status"] == "connected":
                print(f"  Tools: {[t['name'] for t in server.get('tools', [])]}")
            elif server["status"] == "failed":
                print(f"  Error: {server.get('error')}")

        # Reconnect a failed server
        for server in status["mcpServers"]:
            if server["status"] == "failed":
                await client.reconnect_mcp_server(server["name"])

        # Temporarily disable a server
        await client.toggle_mcp_server("external", enabled=False)

        # Re-enable it
        await client.toggle_mcp_server("external", enabled=True)

asyncio.run(main)
```
