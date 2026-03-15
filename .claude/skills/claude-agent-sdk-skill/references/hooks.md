# Hooks Reference

## All Hook Events

| Event | Trigger | Notes |
|-------|---------|-------|
| `PreToolUse` | Before tool execution | Can allow/deny/modify input |
| `PostToolUse` | After tool execution | Access to results |
| `PostToolUseFailure` | After tool failure | Error handling |
| `UserPromptSubmit` | User prompt sent | Input validation |
| `Stop` | Agent stopping | Cleanup, logging |
| `SubagentStart` | Subagent init | Track spawns |
| `SubagentStop` | Subagent done | Process results |
| `PreCompact` | Before compaction | Preserve important context |
| `Notification` | Status messages | Logging |
| `PermissionRequest` | Permission dialog | Custom UI |
| `SessionStart` | Session init | Setup (TS only) |
| `SessionEnd` | Session end | Cleanup (TS only) |
| `Setup` | Session setup | Init (TS only) |
| `TeammateIdle` | Teammate idle | Coordination (TS only) |
| `TaskCompleted` | Background task done | Process results (TS only) |
| `ConfigChange` | Config file changes | Reload (TS only) |

---

## Hook Callback Signature

```typescript
async function myHook(
  inputData: Record<string, any>,    // Event details: tool_name, tool_input, etc.
  toolUseId: string | null,          // Correlates Pre/PostToolUse events
  context: HookContext               // Reserved for future use
): Promise<Record<string, any>> {
  return {};  // Empty = allow unchanged
}
```

---

## Hook Output Options

### Allow (No Changes)
```typescript
return {};
```

### Deny Operation (PreToolUse)
```typescript
return {
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: "Writing to .env is not allowed",
  },
};
```

### Allow with Modified Input (PreToolUse)
```typescript
return {
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    updatedInput: { command: input.tool_input.command.replace("rm -rf", "echo BLOCKED") },
  },
};
```

### Inject System Message
```typescript
return { systemMessage: "Remember: always use the staging database." };
```

### Stop Execution
```typescript
return { continue_: false };
```

### Fire-and-Forget (Non-Blocking)
```typescript
return { async_: true };
```

---

## Hook Configuration with Matchers

```typescript
const options = {
  hooks: {
    PreToolUse: [
      { matcher: "Write|Edit", hooks: [protectEnvFiles] },    // Regex match
      { matcher: /^mcp__/, hooks: [mcpAuditHook] },           // MCP tools
      { hooks: [globalLogger] },                                // No matcher = all
    ],
    PostToolUse: [{ hooks: [auditLogger] }],
    Stop: [{ hooks: [saveSession] }],
    PreCompact: [{ hooks: [preserveContext] }],
  },
};
```

---

## Practical Examples

### Protect Sensitive Files
```typescript
async function protectSensitiveFiles(input: any, toolUseId: string | null, ctx: any) {
  const filePath = input.tool_input?.file_path ?? "";
  if (filePath.includes(".env") || filePath.toLowerCase().includes("credentials")) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `Cannot modify sensitive file: ${filePath}`,
      },
    };
  }
  return {};
}
```

### Audit All Tool Usage
```typescript
async function auditLogger(input: any, toolUseId: string | null, ctx: any) {
  console.log(`[AUDIT] ${input.tool_name}: ${JSON.stringify(input.tool_input).slice(0, 200)}`);
  return { async_: true };  // Non-blocking
}
```

### Block Dangerous Commands
```typescript
const BLOCKED = ["rm -rf /", "DROP TABLE", ":(){ :|:& };:"];

async function blockDangerous(input: any, toolUseId: string | null, ctx: any) {
  if (input.tool_name !== "Bash") return {};
  const cmd = input.tool_input?.command ?? "";
  const match = BLOCKED.find((p) => cmd.includes(p));
  if (match) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `Blocked dangerous pattern: ${match}`,
      },
    };
  }
  return {};
}
```

### Inject Context Before Stop
```typescript
async function addSummary(input: any, toolUseId: string | null, ctx: any) {
  return { systemMessage: "Before finishing, provide a summary of all changes." };
}
```

---

## Hook Chaining

Multiple hooks on the same event run in order. Each sees the (potentially modified) input from the previous:

```typescript
hooks: {
  PreToolUse: [
    { hooks: [logger] },       // Runs first
    { hooks: [validator] },    // Runs second (sees logger's output)
    { hooks: [transformer] },  // Runs third
  ],
}
```

If any hook returns a deny decision, subsequent hooks for that event are skipped.
