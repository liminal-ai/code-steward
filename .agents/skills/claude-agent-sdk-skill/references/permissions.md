# Permissions Reference

## Evaluation Order

First match wins:

```
1. Hooks (PreToolUse)       → can allow/deny/continue
   ↓ (if no decision)
2. disallowedTools          → always block
   ↓ (if not denied)
3. Permission mode          → mode-specific auto-approvals
   ↓ (if not resolved)
4. allowedTools             → auto-approve if matched
   ↓ (if not matched)
5. canUseTool callback      → custom logic
   ↓ (if no callback)
6. Default behavior         → depends on mode
```

---

## Permission Modes

| Mode | Auto-Approves | Denies |
|------|---------------|--------|
| `default` | Nothing | Nothing — falls through to canUseTool |
| `acceptEdits` | Edit, Write, mkdir, rm, mv, cp | Nothing |
| `dontAsk` | Nothing | Everything not in allowedTools |
| `bypassPermissions` | Everything | Nothing (dangerous) |
| `plan` | Nothing | All tool execution |

---

## canUseTool Callback

Custom permission logic for tools not resolved by prior layers:

```typescript
const options = {
  canUseTool: async (toolName: string, inputData: any) => {
    // Block dangerous bash commands
    if (toolName === "Bash" && inputData.command?.includes("rm -rf")) {
      return { type: "deny", message: "Dangerous command blocked" };
    }

    // Block writing to .env
    if (toolName === "Write" && inputData.file_path?.endsWith(".env")) {
      return { type: "deny", message: "Cannot write to .env files" };
    }

    // Allow everything else
    return { type: "allow", updatedInput: inputData };
  },
};
```

---

## Common Patterns

### Read-Only Agent
```typescript
const options = {
  allowedTools: ["Read", "Glob", "Grep"],
  disallowedTools: ["Write", "Edit", "Bash", "NotebookEdit"],
  permissionMode: "dontAsk",
};
```

### Code Review Agent
```typescript
const options = {
  allowedTools: ["Read", "Glob", "Grep", "Bash"],
  disallowedTools: ["Write", "Edit"],
  canUseTool: async (name: string, input: any) => {
    if (name === "Bash" && input.command?.startsWith("git ")) {
      return { type: "allow", updatedInput: input };
    }
    return { type: "deny", message: "Only git commands allowed" };
  },
};
```

### Full Autonomy (Headless)
```typescript
const options = {
  permissionMode: "bypassPermissions",
  maxTurns: 50,
  maxBudgetUsd: 1.0,
};
```

### Defense in Depth
```typescript
const options = {
  permissionMode: "acceptEdits",                  // Layer 1
  allowedTools: ["Read", "Edit", "Glob"],         // Layer 2
  disallowedTools: ["Bash"],                      // Layer 3
  canUseTool: customPermission,                   // Layer 4
  hooks: { PreToolUse: [{ hooks: [secHook] }] },  // Layer 5
  maxTurns: 30,                                    // Layer 6
  maxBudgetUsd: 2.0,                               // Layer 7
};
```

### Dynamic Permission Changes
```typescript
// Change mid-session
const q = query({ prompt: "...", options: { permissionMode: "default" } });
await q.setPermissionMode("acceptEdits");
```
