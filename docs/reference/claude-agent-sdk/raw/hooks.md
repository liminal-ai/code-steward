---
source: https://platform.claude.com/docs/en/agent-sdk/hooks
scraped_at: 2026-03-14
title: Control Execution with Hooks
---

# Control Execution with Hooks

Hooks are callback functions that run your code in response to agent events. With hooks, you can:

- **Block dangerous operations** before they execute (destructive shell commands, unauthorized file access)
- **Log and audit** every tool call for compliance, debugging, or analytics
- **Transform inputs and outputs** to sanitize data, inject credentials, or redirect file paths
- **Require human approval** for sensitive actions (database writes, API calls)
- **Track session lifecycle** to manage state, clean up resources, or send notifications

## How Hooks Work

1. An event fires during agent execution (tool about to be called, tool returned result, subagent started, etc.)
2. The SDK collects registered hooks for that event type (callback hooks in `options.hooks`, plus shell command hooks from settings files if loaded via `settingSources`)
3. Matchers filter which hooks run based on the event's target (e.g., tool name)
4. Callback functions execute, receiving input about what's happening
5. Your callback returns a decision: allow, block, modify input, or inject context

## Available Hooks

| Hook Event | Python SDK | TypeScript SDK | What triggers it | Example use case |
| --- | --- | --- | --- | --- |
| `PreToolUse` | Yes | Yes | Tool call request (can block or modify) | Block dangerous shell commands |
| `PostToolUse` | Yes | Yes | Tool execution result | Log all file changes to audit trail |
| `PostToolUseFailure` | Yes | Yes | Tool execution failure | Handle or log tool errors |
| `UserPromptSubmit` | Yes | Yes | User prompt submission | Inject additional context into prompts |
| `Stop` | Yes | Yes | Agent execution stop | Save session state before exit |
| `SubagentStart` | Yes | Yes | Subagent initialization | Track parallel task spawning |
| `SubagentStop` | Yes | Yes | Subagent completion | Aggregate results from parallel tasks |
| `PreCompact` | Yes | Yes | Conversation compaction request | Archive full transcript before summarizing |
| `PermissionRequest` | Yes | Yes | Permission dialog would be displayed | Custom permission handling |
| `Notification` | Yes | Yes | Agent status messages | Send agent status updates to Slack |
| `SessionStart` | No | Yes | Session initialization | Initialize logging and telemetry |
| `SessionEnd` | No | Yes | Session termination | Clean up temporary resources |
| `Setup` | No | Yes | Session setup/maintenance | Run initialization tasks |
| `TeammateIdle` | No | Yes | Teammate becomes idle | Reassign work or notify |
| `TaskCompleted` | No | Yes | Background task completes | Aggregate results from parallel tasks |
| `ConfigChange` | No | Yes | Configuration file changes | Reload settings dynamically |
| `WorktreeCreate` | No | Yes | Git worktree created | Track isolated workspaces |
| `WorktreeRemove` | No | Yes | Git worktree removed | Clean up workspace resources |

## Configure Hooks

```python
options = ClaudeAgentOptions(
    hooks={"PreToolUse": [HookMatcher(matcher="Bash", hooks=[my_callback])]}
)
```

The `hooks` option is a dict (Python) or object (TypeScript) where:
- **Keys** are hook event names (e.g., `'PreToolUse'`, `'PostToolUse'`, `'Stop'`)
- **Values** are arrays of matchers, each containing an optional filter pattern and callback functions

### Matchers

Use matchers to filter when callbacks fire. The `matcher` field is a regex string.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `matcher` | `string` | `undefined` | Regex pattern matched against the event's filter field. For tool hooks, this is the tool name. |
| `hooks` | `HookCallback[]` | - | Required. Array of callback functions to execute |
| `timeout` | `number` | `60` | Timeout in seconds |

Built-in tool names: `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `WebFetch`, `Agent`, and others.
MCP tools use the pattern `mcp__<server>__<action>`.

### Callback Functions

**Inputs** (three arguments):
- **Input data:** typed object with event details (tool name, tool input, session ID, cwd, hook event name)
- **Tool use ID:** correlates `PreToolUse` and `PostToolUse` events for the same call
- **Context:** in TypeScript, contains an `AbortSignal` for cancellation

**Outputs:** return an object with:
- **Top-level fields:** `systemMessage` (inject context into conversation), `continue` / `continue_` (keep agent running)
- **`hookSpecificOutput`:** for `PreToolUse`: set `permissionDecision` (`"allow"`, `"deny"`, or `"ask"`), `permissionDecisionReason`, and `updatedInput`

Return `{}` to allow the operation without changes.

When multiple hooks apply: **deny** takes priority over **ask**, which takes priority over **allow**.

### Asynchronous Output

For side effects that don't need to influence the agent's behavior:

```python
async def async_hook(input_data, tool_use_id, context):
    asyncio.create_task(send_to_logging_service(input_data))
    return {"async_": True, "asyncTimeout": 30000}
```

## Complete Example: Protect .env Files

```python
import asyncio
from claude_agent_sdk import (
    AssistantMessage,
    ClaudeSDKClient,
    ClaudeAgentOptions,
    HookMatcher,
    ResultMessage,
)

async def protect_env_files(input_data, tool_use_id, context):
    file_path = input_data["tool_input"].get("file_path", "")
    file_name = file_path.split("/")[-1]

    if file_name == ".env":
        return {
            "hookSpecificOutput": {
                "hookEventName": input_data["hook_event_name"],
                "permissionDecision": "deny",
                "permissionDecisionReason": "Cannot modify .env files",
            }
        }

    return {}

async def main():
    options = ClaudeAgentOptions(
        hooks={
            "PreToolUse": [HookMatcher(matcher="Write|Edit", hooks=[protect_env_files])]
        }
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query("Update the database configuration")
        async for message in client.receive_response():
            if isinstance(message, (AssistantMessage, ResultMessage)):
                print(message)

asyncio.run(main())
```

## Examples

### Modify Tool Input (Redirect to Sandbox)

```python
async def redirect_to_sandbox(input_data, tool_use_id, context):
    if input_data["tool_name"] == "Write":
        original_path = input_data["tool_input"].get("file_path", "")
        return {
            "hookSpecificOutput": {
                "hookEventName": input_data["hook_event_name"],
                "permissionDecision": "allow",
                "updatedInput": {
                    **input_data["tool_input"],
                    "file_path": f"/sandbox{original_path}",
                },
            }
        }
    return {}
```

When using `updatedInput`, you must also include `permissionDecision: 'allow'`. Always return a new object rather than mutating the original `tool_input`.

### Add Context and Block a Tool

```python
async def block_etc_writes(input_data, tool_use_id, context):
    file_path = input_data["tool_input"].get("file_path", "")

    if file_path.startswith("/etc"):
        return {
            "systemMessage": "Remember: system directories like /etc are protected.",
            "hookSpecificOutput": {
                "hookEventName": input_data["hook_event_name"],
                "permissionDecision": "deny",
                "permissionDecisionReason": "Writing to /etc is not allowed",
            },
        }
    return {}
```

### Auto-Approve Specific Tools

```python
async def auto_approve_read_only(input_data, tool_use_id, context):
    read_only_tools = ["Read", "Glob", "Grep"]
    if input_data["tool_name"] in read_only_tools:
        return {
            "hookSpecificOutput": {
                "hookEventName": input_data["hook_event_name"],
                "permissionDecision": "allow",
                "permissionDecisionReason": "Read-only tool auto-approved",
            }
        }
    return {}
```

### Chain Multiple Hooks

```python
options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(hooks=[rate_limiter]),        # First: check rate limits
            HookMatcher(hooks=[authorization_check]), # Second: verify permissions
            HookMatcher(hooks=[input_sanitizer]),     # Third: sanitize inputs
            HookMatcher(hooks=[audit_logger]),        # Last: log the action
        ]
    }
)
```

### Filter with Regex Matchers

```python
options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Write|Edit|Delete", hooks=[file_security_hook]),
            HookMatcher(matcher="^mcp__", hooks=[mcp_audit_hook]),
            HookMatcher(hooks=[global_logger]),  # Match everything (no matcher)
        ]
    }
)
```

### Forward Notifications to Slack

```python
import asyncio
import json
import urllib.request

from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions, HookMatcher

def _send_slack_notification(message):
    data = json.dumps({"text": f"Agent status: {message}"}).encode()
    req = urllib.request.Request(
        "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    urllib.request.urlopen(req)

async def notification_handler(input_data, tool_use_id, context):
    try:
        await asyncio.to_thread(_send_slack_notification, input_data.get("message", ""))
    except Exception as e:
        print(f"Failed to send notification: {e}")
    return {}

async def main():
    options = ClaudeAgentOptions(
        hooks={
            "Notification": [HookMatcher(hooks=[notification_handler])],
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query("Analyze this codebase")
        async for message in client.receive_response():
            print(message)

asyncio.run(main())
```

## Troubleshooting

**Hook not firing:**
- Event name is case-sensitive (`PreToolUse`, not `preToolUse`)
- Check that your matcher pattern matches the tool name exactly
- Hooks may not fire when the agent hits `max_turns`

**Matcher not filtering as expected:**
- Matchers only match **tool names**, not file paths or other arguments
- Check `tool_input.file_path` inside your hook to filter by file path

**Modified input not applied:**
- Ensure `updatedInput` is inside `hookSpecificOutput`, not at the top level
- Must also return `permissionDecision: 'allow'`
- Include `hookEventName` in `hookSpecificOutput`

**Session hooks not available in Python:**
- `SessionStart` and `SessionEnd` are TypeScript-only as SDK callbacks
- In Python, use shell command hooks in `.claude/settings.json` and load with `setting_sources`
