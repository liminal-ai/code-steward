# Security Hooks for Claude Agent SDK

## Approach

This implementation provides a reusable hooks configuration for the Claude Agent SDK that addresses two security concerns:

1. **File write protection** -- intercepts tool calls that could write to the filesystem and blocks any that target sensitive files or directories (`.env`, credentials, SSH keys, certificates, etc.).
2. **Audit logging** -- records every tool invocation (allowed and blocked) as structured JSONL entries to a file or stdout, enabling compliance review and incident investigation.

The design follows an interface-first, composition-oriented pattern. A `createSecurityHooks` factory accepts a `SecurityHooksConfig` and returns an `AgentHooks` object that plugs directly into the SDK's agent lifecycle.

## SDK Features Used

- **`beforeToolCall` hook** -- the primary interception point. Called before the SDK executes any tool. The hook inspects the tool name and input, checks extracted file paths against the configured sensitive-path rules, and returns either `{ decision: "allow" }` or `{ decision: "block", message }`. A blocked tool is never executed; instead the block message is returned to the model as the tool result.

- **`afterToolCall` hook** -- called after a tool finishes. Used here purely for audit logging the tool result event. This creates a complete timeline of tool activity.

- **`HookToolInput` shape** -- each hook receives `toolName`, `toolInput`, and `toolUseId`, giving full visibility into what the model requested.

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Three-tier path matching (patterns, exact files, directory prefixes) | Covers glob-style rules, specific files, and entire directory trees without requiring a single overly-broad regex. |
| Bash command path extraction | Write-blocking would be trivially bypassed if `bash` tool inputs were not scanned for embedded file paths. A regex tokeniser extracts absolute paths from command strings. |
| Audit log sanitisation | Large tool inputs (e.g., file contents) are truncated before logging to avoid unbounded log growth and accidental secret leakage into logs. |
| `throwOnBlock` option | Some integrations prefer an exception to halt the agent loop entirely; others prefer a soft rejection that lets the model retry with a different approach. Both modes are supported. |
| `DEFAULT_SECURITY_CONFIG` preset | Provides a production-ready starting point covering `.env`, SSH, AWS, GnuPG, Docker, Kubernetes, and certificate files. Users can extend it via `createDefaultSecurityHooks(overrides)`. |

## File Structure

```
security-hooks.ts   -- Complete implementation (single file, zero runtime dependencies beyond Node.js built-ins and the Anthropic SDK types)
```

## Usage Example

```ts
import Anthropic from "@anthropic-ai/sdk";
import { createDefaultSecurityHooks } from "./security-hooks";

const hooks = createDefaultSecurityHooks({
  auditLogPath: "./logs/audit.jsonl",
  sensitivePatterns: [/my-company-secret/],
});

// Pass `hooks` into the agent orchestration layer when running the agentic loop.
```
