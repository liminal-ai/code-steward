# Hooks System

Hooks intercept and modify agent behavior at specific event points during execution.

## Available Hook Events

| Hook Event | Python | TypeScript | Trigger |
|------------|:------:|:----------:|---------|
| `PreToolUse` | Yes | Yes | Before tool execution |
| `PostToolUse` | Yes | Yes | After tool execution |
| `PostToolUseFailure` | Yes | Yes | After tool failure |
| `UserPromptSubmit` | Yes | Yes | User prompt sent |
| `Stop` | Yes | Yes | Agent execution stop |
| `SubagentStart` | Yes | Yes | Subagent initialization |
| `SubagentStop` | Yes | Yes | Subagent completion |
| `PreCompact` | Yes | Yes | Before context compaction |
| `Notification` | Yes | Yes | Agent status messages |
| `PermissionRequest` | Yes | Yes | Permission dialog |
| `SessionStart` | No | Yes | Session initialization |
| `SessionEnd` | No | Yes | Session termination |
| `Setup` | No | Yes | Session setup |
| `TeammateIdle` | No | Yes | Teammate idle |
| `TaskCompleted` | No | Yes | Background task done |
| `ConfigChange` | No | Yes | Config file changes |

---

## Hook Callback Signature

### Python
```python
async def my_hook(
    input_data: dict[str, Any],    # Event details (tool_name, tool_input, etc.)
    tool_use_id: str | None,        # Correlates Pre/PostToolUse events
    context: HookContext             # Reserved for future use
) -> dict[str, Any]:
    return {}  # Empty dict = allow operation unchanged
```

### TypeScript
```typescript
async function myHook(
  inputData: Record<string, any>,
  toolUseId: string | null,
  context: HookContext
): Promise<Record<string, any>> {
  return {};
}
```

---

## Hook Output Options

### Allow (no changes)
```python
return {}
```

### Deny Operation (PreToolUse)
```python
return {
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": "Writing to .env files is not allowed",
    }
}
```

### Allow with Modified Input (PreToolUse)
```python
return {
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow",
        "updatedInput": {
            "command": input_data["tool_input"]["command"].replace("rm -rf", "echo BLOCKED"),
        },
    }
}
```

### Inject System Message
```python
return {
    "systemMessage": "Remember: always use the staging database, not production."
}
```

### Stop Execution
```python
return {"continue_": False}
```

### Fire-and-Forget (Non-Blocking)
```python
return {"async_": True}
```

---

## Hook Configuration

### Python with Matchers
```python
from claude_agent_sdk import ClaudeAgentOptions, HookMatcher

options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            # Match specific tools by regex
            HookMatcher(matcher="Write|Edit", hooks=[protect_env_files]),
            # Match MCP tools
            HookMatcher(matcher="^mcp__", hooks=[mcp_audit_hook]),
            # No matcher = runs for all tools
            HookMatcher(hooks=[global_logger]),
        ],
        "PostToolUse": [
            HookMatcher(hooks=[audit_logger]),
        ],
        "Stop": [
            HookMatcher(hooks=[save_session_hook]),
        ],
    }
)
```

### TypeScript
```typescript
const options = {
  hooks: {
    PreToolUse: [
      { matcher: "Write|Edit", hooks: [protectEnvFiles] },
      { matcher: /^mcp__/, hooks: [mcpAuditHook] },
      { hooks: [globalLogger] },
    ],
    PostToolUse: [{ hooks: [auditLogger] }],
    Stop: [{ hooks: [saveSessionHook] }],
  },
};
```

---

## Practical Examples

### Protect Sensitive Files
```python
async def protect_env_files(input_data, tool_use_id, context):
    tool_input = input_data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if ".env" in file_path or "credentials" in file_path.lower():
        return {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"Cannot modify sensitive file: {file_path}",
            }
        }
    return {}
```

### Audit All Tool Usage
```python
async def audit_logger(input_data, tool_use_id, context):
    tool_name = input_data.get("tool_name", "unknown")
    tool_input = input_data.get("tool_input", {})
    print(f"[AUDIT] Tool: {tool_name}, Input: {json.dumps(tool_input)[:200]}")
    return {"async_": True}  # Non-blocking
```

### Block Dangerous Commands
```python
BLOCKED_PATTERNS = ["rm -rf /", "DROP TABLE", "format c:", ":(){ :|:& };:"]

async def block_dangerous_commands(input_data, tool_use_id, context):
    if input_data.get("tool_name") != "Bash":
        return {}

    command = input_data.get("tool_input", {}).get("command", "")
    for pattern in BLOCKED_PATTERNS:
        if pattern in command:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Blocked dangerous command pattern: {pattern}",
                }
            }
    return {}
```

### Inject Context on Stop
```python
async def add_summary_instruction(input_data, tool_use_id, context):
    return {
        "systemMessage": "Before finishing, provide a brief summary of all changes made."
    }
```

---

## Hook Chaining

Multiple hooks on the same event run in order. Each hook sees the (potentially modified) input from the previous hook:

```python
hooks={
    "PreToolUse": [
        HookMatcher(hooks=[logger]),          # Runs first
        HookMatcher(hooks=[validator]),        # Runs second
        HookMatcher(hooks=[transformer]),      # Runs third
    ]
}
```

If any hook returns a deny decision, subsequent hooks for that event are skipped.
