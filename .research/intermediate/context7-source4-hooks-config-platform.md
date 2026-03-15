# Claude Agent SDK - Context7 Source 4: Hooks, Configuration, Sandbox (Platform Docs)
## Library ID: /websites/platform_claude_en_agent-sdk
## Query: multi-agent handoff guardrails streaming hooks lifecycle runner getting started installation configuration

---

### Configure Claude Agent SDK hooks with regex matchers (Python, TypeScript)

Source: https://platform.claude.com/docs/en/agent-sdk/hooks

This snippet demonstrates how to configure `PreToolUse` hooks in the Claude Agent SDK using regex patterns to selectively trigger different hooks based on tool names. It shows examples for matching specific tool names (e.g., 'Write|Edit|Delete'), tools starting with a prefix (e.g., '^mcp__'), and a global matcher for all tools, enabling fine-grained control over hook execution.

```Python
options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            # Match file modification tools
            HookMatcher(matcher="Write|Edit|Delete", hooks=[file_security_hook]),
            # Match all MCP tools
            HookMatcher(matcher="^mcp__", hooks=[mcp_audit_hook]),
            # Match everything (no matcher)
            HookMatcher(hooks=[global_logger]),
        ]
    }
)
```

```TypeScript
const options = {
  hooks: {
    PreToolUse: [
      // Match file modification tools
      { matcher: "Write|Edit|Delete", hooks: [fileSecurityHook] },

      // Match all MCP tools
      { matcher: "^mcp__", hooks: [mcpAuditHook] },

      // Match everything (no matcher)
      { hooks: [globalLogger] }
    ]
  }
};
```

---

### Configure Claude Agent SDK for Sandbox and Tool Use (Python)

Source: https://platform.claude.com/docs/en/agent-sdk/python

This Python snippet illustrates the setup of the Claude Agent SDK, demonstrating how to define a `dummy_hook` for `can_use_tool` to maintain stream activity, a `prompt_stream` for user interaction, and a `main` function to initiate a `query`. It configures `ClaudeAgentOptions` to enable sandbox features, permit unsandboxed commands, and integrate a `PreToolUse` hook with the `dummy_hook`.

```python
async def dummy_hook(input_data, tool_use_id, context):
    return {"continue_": True}


async def prompt_stream():
    yield {
        "type": "user",
        "message": {"role": "user", "content": "Deploy my application"},
    }


async def main():
    async for message in query(
        prompt=prompt_stream(),
        options=ClaudeAgentOptions(
            sandbox={
                "enabled": True,
                "allowUnsandboxedCommands": True,
            },
            permission_mode="default",
            can_use_tool=can_use_tool,
            hooks={"PreToolUse": [HookMatcher(matcher=None, hooks=[dummy_hook])]},
        ),
    ):
        print(message)
```

---

### Configure Agent Hooks with ClaudeAgentOptions - Python

Source: https://platform.claude.com/docs/en/agent-sdk/hooks

Sets up hooks in Python using ClaudeAgentOptions with a PreToolUse hook matcher for Bash commands. The hooks are passed to ClaudeSDKClient and executed asynchronously when the matched event occurs. This example demonstrates filtering callbacks by tool name using the matcher pattern.

```python
options = ClaudeAgentOptions(
    hooks={"PreToolUse": [HookMatcher(matcher="Bash", hooks=[my_callback])]}
)

async with ClaudeSDKClient(options=options) as client:
    await client.query("Your prompt")
    async for message in client.receive_response():
        print(message)
```

---

### Hook Usage Example - Security and Logging

Source: https://platform.claude.com/docs/en/agent-sdk/python

Demonstrates how to register and configure multiple hooks for the Claude Agent SDK. This example shows a security hook that blocks dangerous bash commands and a logging hook for audit trails, with hook matchers to control which tools trigger each hook.

```python
from claude_agent_sdk import query, ClaudeAgentOptions, HookMatcher, HookContext
from typing import Any

async def validate_bash_command(
    input_data: dict[str, Any], tool_use_id: str | None, context: HookContext
) -> dict[str, Any]:
    """Validate and potentially block dangerous bash commands."""
    if input_data["tool_name"] == "Bash":
        command = input_data["tool_input"].get("command", "")
        if "rm -rf /" in command:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": "Dangerous command blocked",
                }
            }
    return {}

async def log_tool_use(
    input_data: dict[str, Any], tool_use_id: str | None, context: HookContext
) -> dict[str, Any]:
    """Log all tool usage for auditing."""
    print(f"Tool used: {input_data.get('tool_name')}")
    return {}

options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(
                matcher="Bash", hooks=[validate_bash_command], timeout=120
            ),
            HookMatcher(
                hooks=[log_tool_use]
            ),
        ],
        "PostToolUse": [HookMatcher(hooks=[log_tool_use])],
    }
)

async for message in query(prompt="Analyze this codebase", options=options):
    print(message)
```

---

### ClaudeAgentOptions - Core Configuration Parameters

Source: https://platform.claude.com/docs/en/agent-sdk/python

Configuration parameters for ClaudeAgentOptions including tool permissions, hooks, user identification, and message streaming settings. These parameters control the fundamental behavior of the Claude Agent SDK.

#### can_use_tool
- **Type**: `CanUseTool | None`
- **Default**: `None`
- **Description**: Tool permission callback function that controls which tools can be used.

#### hooks
- **Type**: `dict[HookEvent, list[HookMatcher]] | None`
- **Default**: `None`
- **Description**: Hook configurations for intercepting and handling specific events during agent execution.

#### user
- **Type**: `str | None`
- **Default**: `None`
- **Description**: User identifier to associate with the current session or request.

#### include_partial_messages
- **Type**: `bool`
- **Default**: `False`
- **Description**: When enabled, includes partial message streaming events. StreamEvent messages are yielded during streaming operations.

#### fork_session
- **Type**: `bool`
- **Default**: `False`
- **Description**: When resuming with `resume`, fork to a new session ID instead of continuing the original session.

#### agents
- **Type**: `dict[str, AgentDefinition] | None`
- **Default**: `None`
- **Description**: Programmatically defined subagents that can be invoked during execution.

#### plugins
- **Type**: `list[SdkPluginConfig]`
- **Default**: `[]`
- **Description**: Load custom plugins from local paths.

#### sandbox
- **Type**: `SandboxSettings | None`
- **Default**: `None`
- **Description**: Configure sandbox behavior programmatically.

#### setting_sources
- **Type**: `list[SettingSource] | None`
- **Default**: `None` (no settings loaded)
- **Description**: Control which filesystem settings to load. Must include `"project"` to load CLAUDE.md files.

#### max_thinking_tokens
- **Type**: `int | None`
- **Default**: `None`
- **Description**: Deprecated - Maximum tokens for thinking blocks. Use `thinking` parameter instead.

#### thinking
- **Type**: `ThinkingConfig | None`
- **Default**: `None`
- **Description**: Controls extended thinking behavior. Takes precedence over `max_thinking_tokens`.

#### effort
- **Type**: `Literal["low", "medium", "high", "max"] | None`
- **Default**: `None`
- **Description**: Effort level that controls the depth and intensity of thinking operations.
