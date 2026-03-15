# Permissions

## Permission Evaluation Order

Permissions are evaluated in this order (first match wins):

```
1. Hooks (PreToolUse) → can allow/deny/continue
   ↓ (if no decision)
2. Deny rules (disallowed_tools) → always block
   ↓ (if not denied)
3. Permission mode → mode-specific auto-approvals
   ↓ (if not resolved)
4. Allow rules (allowed_tools) → auto-approve if matched
   ↓ (if not matched)
5. canUseTool callback → custom logic
   ↓ (if no callback or no decision)
6. Default behavior → depends on mode
```

---

## Permission Modes

| Mode | Description | Auto-Approves |
|------|-------------|---------------|
| `default` | Standard mode | Nothing - unmatched tools trigger canUseTool |
| `acceptEdits` | Auto-approve file edits | Edit, Write, mkdir, rm, mv, cp |
| `plan` | Planning only | No tool execution allowed |
| `dontAsk` (TS only) | Deny anything not pre-approved | Nothing - denies unmatched |
| `bypassPermissions` | Approve everything | All tools (use with extreme caution) |

### Setting Permission Mode

```python
# At initialization
options = ClaudeAgentOptions(permission_mode="acceptEdits")

# Dynamically (ClaudeSDKClient)
await client.set_permission_mode("bypassPermissions")

# Dynamically (query generator)
q = query(prompt="...", options=options)
await q.set_permission_mode("acceptEdits")
```

---

## allowed_tools

Tools listed here are auto-approved without prompts:

```python
options = ClaudeAgentOptions(
    allowed_tools=[
        "Read",                              # Exact tool name
        "Glob",
        "Grep",
        "mcp__github__*",                    # Wildcard: all tools from server
        "mcp__my-tools__search_*",           # Prefix wildcard
    ],
)
```

## disallowed_tools

Tools listed here are always denied (overrides allowed_tools):

```python
options = ClaudeAgentOptions(
    disallowed_tools=[
        "Bash",                              # Block shell access
        "mcp__github__delete_repository",    # Block specific dangerous tool
    ],
)
```

---

## canUseTool Callback

Custom permission logic for tools not resolved by hooks, deny rules, mode, or allow rules:

### Python
```python
from claude_agent_sdk import PermissionResultAllow, PermissionResultDeny

async def custom_permission(tool_name, input_data, context):
    # Block dangerous bash commands
    if tool_name == "Bash":
        command = input_data.get("command", "")
        if "rm -rf" in command or "sudo" in command:
            return PermissionResultDeny(
                message="Dangerous command blocked by policy"
            )

    # Allow with modified input
    if tool_name == "Write" and input_data.get("file_path", "").endswith(".env"):
        return PermissionResultDeny(message="Cannot write to .env files")

    # Allow everything else
    return PermissionResultAllow(updated_input=input_data)

options = ClaudeAgentOptions(can_use_tool=custom_permission)
```

### TypeScript
```typescript
const options = {
  canUseTool: async (toolName: string, inputData: any) => {
    if (toolName === "Bash" && inputData.command?.includes("rm -rf")) {
      return { type: "deny", message: "Dangerous command blocked" };
    }
    return { type: "allow", updatedInput: inputData };
  },
};
```

---

## Common Permission Patterns

### Read-Only Agent
```python
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Glob", "Grep"],
    disallowed_tools=["Write", "Edit", "Bash", "NotebookEdit"],
    permission_mode="dontAsk",  # Deny anything not explicitly allowed
)
```

### Code Review Agent
```python
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Glob", "Grep", "Bash"],
    disallowed_tools=["Write", "Edit"],
    can_use_tool=lambda name, input, ctx: (
        PermissionResultAllow(updated_input=input)
        if name == "Bash" and input.get("command", "").startswith("git ")
        else PermissionResultDeny(message="Only git commands allowed")
    ),
)
```

### Full Autonomy (Headless)
```python
options = ClaudeAgentOptions(
    permission_mode="bypassPermissions",
    max_turns=50,
    max_budget_usd=1.00,
)
```
