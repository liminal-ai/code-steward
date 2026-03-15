---
source: https://platform.claude.com/docs/en/agent-sdk/permissions
scraped_at: 2026-03-14
title: Handling Permissions
---

# Handling Permissions

The Claude Agent SDK provides permission controls to manage how Claude uses tools. Use permission modes and rules to define what's allowed automatically, and the `canUseTool` callback to handle everything else at runtime.

## How Permissions Are Evaluated

When Claude requests a tool, the SDK checks permissions in this order:

1. **Hooks** — Run first; can allow, deny, or continue to next step
2. **Deny rules** — Check `disallowed_tools` and `settings.json`. If a deny rule matches, the tool is blocked, **even in `bypassPermissions` mode**.
3. **Permission mode** — Apply the active mode. `bypassPermissions` approves everything. `acceptEdits` approves file operations.
4. **Allow rules** — Check `allowed_tools` and `settings.json`. If a rule matches, the tool is approved.
5. **canUseTool callback** — If not resolved above, call your callback. In `dontAsk` mode, this step is skipped and the tool is denied.

## Allow and Deny Rules

`allowed_tools` / `allowedTools` and `disallowed_tools` / `disallowedTools` add entries to the allow and deny rule lists.

| Option | Effect |
| --- | --- |
| `allowed_tools=["Read", "Grep"]` | `Read` and `Grep` are auto-approved. Other tools fall through to permission mode and `canUseTool`. |
| `disallowed_tools=["Bash"]` | `Bash` is always denied. Deny rules hold in every permission mode including `bypassPermissions`. |

**Locked-down agent pattern (TypeScript):**
```typescript
const options = {
  allowedTools: ["Read", "Glob", "Grep"],
  permissionMode: "dontAsk"
};
```
Listed tools are approved; anything else is denied outright instead of prompting.

> **Note for Python:** `dontAsk` is not yet available. Use `disallowed_tools` to explicitly block tools you don't want Claude to attempt.

> **Important:** `allowed_tools` does **not** constrain `bypassPermissions`. Unlisted tools are not matched by allow rules and fall through to the permission mode, where `bypassPermissions` approves them.

You can also configure rules declaratively in `.claude/settings.json`. The SDK does not load filesystem settings by default — set `setting_sources=["project"]` (Python) or `settingSources: ["project"]` (TypeScript) to enable.

## Permission Modes

| Mode | Description | Tool behavior |
| --- | --- | --- |
| `default` | Standard permission behavior | No auto-approvals; unmatched tools trigger your `canUseTool` callback |
| `dontAsk` (TypeScript only) | Deny instead of prompting | Anything not pre-approved is denied; `canUseTool` is never called |
| `acceptEdits` | Auto-accept file edits | File edits and filesystem operations are automatically approved |
| `bypassPermissions` | Bypass all permission checks | All tools run without permission prompts (use with caution) |
| `plan` | Planning mode | No tool execution; Claude plans without making changes |

**Subagent inheritance:** When using `bypassPermissions`, all subagents inherit this mode and it cannot be overridden.

### Set Permission Mode

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="Help me refactor this code",
        options=ClaudeAgentOptions(
            permission_mode="default",
        ),
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

### Mode Details

#### Accept Edits Mode (`acceptEdits`)

Auto-approved operations:
- File edits (Edit, Write tools)
- Filesystem commands: `mkdir`, `touch`, `rm`, `mv`, `cp`

Use when: you trust Claude's edits and want faster iteration during prototyping.

#### Don't Ask Mode (`dontAsk`, TypeScript only)

Converts any permission prompt into a denial. Tools pre-approved by `allowedTools`, `settings.json` allow rules, or a hook run normally. Everything else is denied without calling `canUseTool`.

#### Bypass Permissions Mode (`bypassPermissions`)

Auto-approves all tool uses without prompts. Hooks still execute and can block operations.

Use with extreme caution — Claude has full system access. Only use in controlled environments. Cannot be used when running as root on Unix.

#### Plan Mode (`plan`)

Prevents tool execution entirely. Claude can analyze code and create plans but cannot make changes. Claude may use `AskUserQuestion` to clarify requirements.

Use when: you want Claude to propose changes without executing them.

## Related Resources

- [Handle approvals and user input](./user-input.md): interactive approval prompts
- [Hooks guide](./hooks.md): run custom code at key points in the agent lifecycle
