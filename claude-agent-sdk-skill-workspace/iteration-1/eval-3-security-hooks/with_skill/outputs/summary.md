# Security Hooks for the Claude Agent SDK

## Approach

The implementation provides a single-file, production-ready security hooks module that wires into the Claude Agent SDK's `query()` function. It delivers two core capabilities:

1. **Sensitive-file write protection** -- A `PreToolUse` hook that intercepts `Write`, `Edit`, `NotebookEdit`, and `Bash` tool invocations, extracts the target file path, and checks it against a configurable set of sensitive-path rules (`.env`, credentials, private keys, SSH keys, AWS configs, kubeconfig, tokens, `.npmrc`, Docker auth). If a match is found, the hook returns a `deny` decision with a descriptive reason, preventing the write from ever executing.

2. **Full tool-usage audit logging** -- Hooks on `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `SessionStart`, `SessionEnd`, and `Stop` events record structured audit entries with timestamps, tool names, sanitized input summaries (secrets in input values are redacted), permission decisions, denial reasons, and execution durations. The `PostToolUse` and failure hooks use `async_: true` so they never block the agent loop.

The module also blocks dangerous Bash patterns (recursive force-delete at root, SQL DROP TABLE, fork bombs, writes to `/etc`, curl-pipe-to-shell, chmod 777) as a defense-in-depth measure beyond simple file-path checks.

## SDK Features Used

| Feature | How It Is Used |
|---------|---------------|
| **Hooks (`PreToolUse`)** | Global hook (no matcher) inspects every tool call; returns `permissionDecision: "deny"` with reason for sensitive files, or empty object to allow |
| **Hooks (`PostToolUse`)** | Non-blocking (`async_: true`) audit of successful tool completions with duration tracking |
| **Hooks (`PostToolUseFailure`)** | Logs tool errors for post-incident review |
| **Hooks (`SessionStart` / `SessionEnd`)** | Marks audit session boundaries |
| **Hooks (`Stop`)** | Final audit entry when the agent finishes |
| **Hook matchers** | Demonstrated (though the primary hook uses no matcher for global coverage) |
| **Hook output shapes** | `hookSpecificOutput` with `permissionDecision` ("allow" / "deny"), `permissionDecisionReason`, and `updatedInput` |
| **Permission mode** | Set to `"default"` so hooks are evaluated first in the permission chain |
| **`allowedTools` / `disallowedTools`** | Defense-in-depth layer alongside hooks |
| **`systemPrompt`** | Reinforces the security policy in the agent's instructions |
| **`maxTurns` / `maxBudgetUsd`** | Safety limits to prevent runaway execution |
| **`query()` async iterator** | Full message-stream processing with `result` subtype handling |

## Key Design Decisions

- **No `any` types in exported API** -- All hook callbacks, audit records, and configuration objects are explicitly typed with named interfaces.
- **Input sanitization** -- Tool inputs are truncated and values matching secret-like keys are redacted before logging.
- **Configurable rules** -- Sensitive-path rules are defined as an array of `{ label, test }` objects, making it straightforward to add or remove rules without modifying hook logic.
- **Non-blocking post-hooks** -- `PostToolUse` and failure hooks return `{ async_: true }` so audit logging never adds latency to the agent loop.
- **Composable exports** -- The module exports `securityHooks` (just the hooks config), `securityAgentOptions` (full options object), and `runSecuredAgent()` (ready-to-call function), plus `getAuditLog()` and `clearAuditLog()` utilities for programmatic access.
