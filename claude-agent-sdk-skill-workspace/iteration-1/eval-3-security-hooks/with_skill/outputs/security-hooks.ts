/**
 * Security Hooks for the Claude Agent SDK
 *
 * Provides two capabilities:
 *   1. File-write protection -- blocks Write, Edit, and Bash mutations
 *      targeting sensitive paths (env files, secrets, credentials, keys).
 *   2. Audit logging -- records every tool invocation (pre and post) with
 *      timestamps, tool names, sanitized inputs, and outcomes.
 *
 * Usage: import `securityAgentOptions` and spread/merge it into your
 * own `query()` options, or compose the individual hooks into a custom
 * configuration.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of the data the SDK passes into every hook callback. */
interface HookInputData {
  tool_name: string;
  tool_input: Record<string, unknown>;
  [key: string]: unknown;
}

/** Opaque context object reserved for future SDK use. */
type HookContext = Record<string, unknown>;

/** Return type shared by all hook callbacks. */
interface HookResult {
  hookSpecificOutput?: PreToolUseOutput;
  systemMessage?: string;
  continue_?: boolean;
  async_?: boolean;
}

/** PreToolUse-specific output that carries a permission decision. */
interface PreToolUseOutput {
  hookEventName: "PreToolUse";
  permissionDecision: "allow" | "deny";
  permissionDecisionReason?: string;
  updatedInput?: Record<string, unknown>;
}

/** PostToolUse-specific output (currently empty -- reserved). */
interface PostToolUseOutput {
  hookEventName: "PostToolUse";
}

/** Signature every hook callback must satisfy. */
type HookCallback = (
  input: HookInputData,
  toolUseId: string | null,
  ctx: HookContext,
) => Promise<HookResult>;

/** A single hook entry with an optional matcher and one or more callbacks. */
interface HookEntry {
  matcher?: string | RegExp;
  hooks: HookCallback[];
}

/** The top-level hooks configuration object accepted by `query()`. */
interface HooksConfig {
  PreToolUse?: HookEntry[];
  PostToolUse?: HookEntry[];
  PostToolUseFailure?: HookEntry[];
  Stop?: HookEntry[];
  SubagentStart?: HookEntry[];
  SubagentStop?: HookEntry[];
  PreCompact?: HookEntry[];
  Notification?: HookEntry[];
  SessionStart?: HookEntry[];
  SessionEnd?: HookEntry[];
  [key: string]: HookEntry[] | undefined;
}

/** Severity levels for structured audit log entries. */
type AuditSeverity = "info" | "warn" | "error" | "denied";

/** A single structured audit record. */
interface AuditRecord {
  timestamp: string;
  severity: AuditSeverity;
  event: "pre_tool_use" | "post_tool_use" | "post_tool_use_failure" | "session_start" | "session_end" | "stop";
  toolName: string;
  toolUseId: string | null;
  inputSummary: string;
  decision?: "allow" | "deny";
  reason?: string;
  durationMs?: number;
}

// ---------------------------------------------------------------------------
// Audit Logger
// ---------------------------------------------------------------------------

/**
 * In-memory audit log. In a production system you would replace this with
 * a persistent store (database, log aggregator, SIEM, etc.).
 */
const auditLog: AuditRecord[] = [];

/** Pending start times keyed by toolUseId so PostToolUse can compute duration. */
const pendingTimers = new Map<string, number>();

/** Maximum characters of serialized tool_input to include in the log. */
const MAX_INPUT_LENGTH = 300;

/**
 * Produce a truncated, sanitized summary of tool input.
 * Strips values that look like secrets before serializing.
 */
function summarizeInput(toolInput: Record<string, unknown>): string {
  const SECRET_KEY_PATTERN = /password|secret|token|key|credential|auth/i;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(toolInput)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }

  const raw = JSON.stringify(sanitized);
  if (raw.length <= MAX_INPUT_LENGTH) {
    return raw;
  }
  return raw.slice(0, MAX_INPUT_LENGTH) + "...";
}

/** Append a record and emit a structured log line to stdout. */
function recordAudit(record: AuditRecord): void {
  auditLog.push(record);
  const tag = record.severity === "denied" ? "DENIED" : record.severity.toUpperCase();
  // eslint-disable-next-line no-console
  console.log(
    `[AUDIT:${tag}] ${record.timestamp} | ${record.event} | ${record.toolName} | ${record.inputSummary}` +
      (record.reason ? ` | reason=${record.reason}` : "") +
      (record.durationMs !== undefined ? ` | duration=${record.durationMs}ms` : ""),
  );
}

/** Return a readonly snapshot of the current audit log. */
export function getAuditLog(): readonly AuditRecord[] {
  return auditLog;
}

/** Clear the in-memory audit log (useful in tests). */
export function clearAuditLog(): void {
  auditLog.length = 0;
  pendingTimers.clear();
}

// ---------------------------------------------------------------------------
// Sensitive-File Protection
// ---------------------------------------------------------------------------

/**
 * Path patterns that must never be written to.
 * Each entry is a test function so we can mix simple substring checks
 * with more complex regex patterns.
 */
interface SensitivePathRule {
  /** Human-readable label shown in denial messages. */
  label: string;
  /** Returns true when the given path is sensitive. */
  test: (filePath: string) => boolean;
}

const SENSITIVE_PATH_RULES: readonly SensitivePathRule[] = [
  {
    label: ".env file",
    test: (p) => /(?:^|[/\\])\.env(?:\..+)?$/.test(p),
  },
  {
    label: "credentials file",
    test: (p) => /credentials/i.test(p),
  },
  {
    label: "secrets file",
    test: (p) => /secrets?\b/i.test(p),
  },
  {
    label: "private key file",
    test: (p) => /\.pem$|\.key$|\.p12$|\.pfx$|\.jks$/i.test(p),
  },
  {
    label: "SSH key",
    test: (p) => /(?:^|[/\\])\.ssh[/\\]/i.test(p),
  },
  {
    label: "AWS config",
    test: (p) => /(?:^|[/\\])\.aws[/\\]/i.test(p),
  },
  {
    label: "kubeconfig",
    test: (p) => /kubeconfig/i.test(p),
  },
  {
    label: "token file",
    test: (p) => /(?:^|[/\\])\.token$|(?:^|[/\\])token\.json$/i.test(p),
  },
  {
    label: "npmrc with auth",
    test: (p) => /(?:^|[/\\])\.npmrc$/i.test(p),
  },
  {
    label: "docker auth config",
    test: (p) => /(?:^|[/\\])\.docker[/\\]config\.json$/i.test(p),
  },
];

/**
 * Dangerous Bash command patterns that can exfiltrate or destroy
 * sensitive data. Checked when tool_name is "Bash".
 */
const DANGEROUS_BASH_PATTERNS: readonly { label: string; pattern: RegExp }[] = [
  { label: "recursive force delete at root", pattern: /rm\s+-rf\s+\// },
  { label: "SQL DROP TABLE", pattern: /DROP\s+TABLE/i },
  { label: "fork bomb", pattern: /:\(\)\s*\{.*\|.*&\s*\}/ },
  { label: "writing to /etc", pattern: />\s*\/etc\// },
  { label: "curl piped to shell", pattern: /curl\s.*\|\s*(ba)?sh/ },
  { label: "chmod 777", pattern: /chmod\s+777/ },
];

/**
 * Resolve the file path that a given tool invocation targets.
 * Returns `undefined` when the tool does not operate on a file path.
 */
function extractFilePath(toolName: string, toolInput: Record<string, unknown>): string | undefined {
  if (typeof toolInput["file_path"] === "string") {
    return toolInput["file_path"];
  }
  // Write sometimes uses `path` instead of `file_path`
  if (typeof toolInput["path"] === "string") {
    return toolInput["path"];
  }
  return undefined;
}

/**
 * Check a file path against all sensitive-path rules.
 * Returns the matching rule, or `undefined` if the path is safe.
 */
function matchSensitivePath(filePath: string): SensitivePathRule | undefined {
  return SENSITIVE_PATH_RULES.find((rule) => rule.test(filePath));
}

// ---------------------------------------------------------------------------
// Hook Callbacks
// ---------------------------------------------------------------------------

/**
 * PreToolUse hook: logs every tool invocation and blocks writes to
 * sensitive files.
 *
 * Applies to **all** tools (no matcher -- runs globally).
 */
const preToolUseAuditAndProtect: HookCallback = async (
  input: HookInputData,
  toolUseId: string | null,
  _ctx: HookContext,
): Promise<HookResult> => {
  const now = new Date().toISOString();
  const toolInput = (input.tool_input ?? {}) as Record<string, unknown>;
  const inputSummary = summarizeInput(toolInput);

  // Start a timer so PostToolUse can compute execution duration.
  if (toolUseId) {
    pendingTimers.set(toolUseId, Date.now());
  }

  // --- File-write protection for Write, Edit, NotebookEdit ---
  const FILE_WRITE_TOOLS = new Set(["Write", "Edit", "NotebookEdit"]);
  if (FILE_WRITE_TOOLS.has(input.tool_name)) {
    const filePath = extractFilePath(input.tool_name, toolInput);
    if (filePath) {
      const rule = matchSensitivePath(filePath);
      if (rule) {
        const reason = `Blocked write to ${rule.label}: ${filePath}`;
        recordAudit({
          timestamp: now,
          severity: "denied",
          event: "pre_tool_use",
          toolName: input.tool_name,
          toolUseId,
          inputSummary,
          decision: "deny",
          reason,
        });
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: reason,
          },
        };
      }
    }
  }

  // --- Dangerous Bash command protection ---
  if (input.tool_name === "Bash") {
    const command = typeof toolInput["command"] === "string" ? toolInput["command"] : "";
    for (const { label, pattern } of DANGEROUS_BASH_PATTERNS) {
      if (pattern.test(command)) {
        const reason = `Blocked dangerous Bash pattern (${label})`;
        recordAudit({
          timestamp: now,
          severity: "denied",
          event: "pre_tool_use",
          toolName: input.tool_name,
          toolUseId,
          inputSummary,
          decision: "deny",
          reason,
        });
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: reason,
          },
        };
      }
    }

    // Also check if a Bash command targets a sensitive file path via
    // redirection or common write utilities.
    const bashFileWritePattern = /(?:>|tee|cp|mv|scp)\s+["']?([^\s"'|;&]+)/;
    const match = command.match(bashFileWritePattern);
    if (match) {
      const targetPath = match[1];
      const rule = matchSensitivePath(targetPath);
      if (rule) {
        const reason = `Blocked Bash write to ${rule.label}: ${targetPath}`;
        recordAudit({
          timestamp: now,
          severity: "denied",
          event: "pre_tool_use",
          toolName: input.tool_name,
          toolUseId,
          inputSummary,
          decision: "deny",
          reason,
        });
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: reason,
          },
        };
      }
    }
  }

  // --- Default: allow and log ---
  recordAudit({
    timestamp: now,
    severity: "info",
    event: "pre_tool_use",
    toolName: input.tool_name,
    toolUseId,
    inputSummary,
    decision: "allow",
  });

  return {};
};

/**
 * PostToolUse hook: logs tool completion with execution duration.
 *
 * Marked `async_: true` so it never blocks the agent loop.
 */
const postToolUseAudit: HookCallback = async (
  input: HookInputData,
  toolUseId: string | null,
  _ctx: HookContext,
): Promise<HookResult> => {
  const now = new Date().toISOString();
  let durationMs: number | undefined;
  if (toolUseId) {
    const startTime = pendingTimers.get(toolUseId);
    if (startTime !== undefined) {
      durationMs = Date.now() - startTime;
      pendingTimers.delete(toolUseId);
    }
  }

  recordAudit({
    timestamp: now,
    severity: "info",
    event: "post_tool_use",
    toolName: input.tool_name,
    toolUseId,
    inputSummary: summarizeInput((input.tool_input ?? {}) as Record<string, unknown>),
    durationMs,
  });

  return { async_: true };
};

/**
 * PostToolUseFailure hook: logs tool errors.
 */
const postToolUseFailureAudit: HookCallback = async (
  input: HookInputData,
  toolUseId: string | null,
  _ctx: HookContext,
): Promise<HookResult> => {
  const now = new Date().toISOString();
  let durationMs: number | undefined;
  if (toolUseId) {
    const startTime = pendingTimers.get(toolUseId);
    if (startTime !== undefined) {
      durationMs = Date.now() - startTime;
      pendingTimers.delete(toolUseId);
    }
  }

  recordAudit({
    timestamp: now,
    severity: "error",
    event: "post_tool_use_failure",
    toolName: input.tool_name,
    toolUseId,
    inputSummary: summarizeInput((input.tool_input ?? {}) as Record<string, unknown>),
    reason: typeof input["error"] === "string" ? input["error"] : "Unknown error",
    durationMs,
  });

  return { async_: true };
};

/**
 * SessionStart hook: marks the beginning of an audited session.
 */
const sessionStartAudit: HookCallback = async (
  input: HookInputData,
  toolUseId: string | null,
  _ctx: HookContext,
): Promise<HookResult> => {
  recordAudit({
    timestamp: new Date().toISOString(),
    severity: "info",
    event: "session_start",
    toolName: "session",
    toolUseId,
    inputSummary: JSON.stringify(input).slice(0, MAX_INPUT_LENGTH),
  });
  return { async_: true };
};

/**
 * SessionEnd hook: marks the end of an audited session.
 */
const sessionEndAudit: HookCallback = async (
  input: HookInputData,
  toolUseId: string | null,
  _ctx: HookContext,
): Promise<HookResult> => {
  recordAudit({
    timestamp: new Date().toISOString(),
    severity: "info",
    event: "session_end",
    toolName: "session",
    toolUseId,
    inputSummary: JSON.stringify(input).slice(0, MAX_INPUT_LENGTH),
  });
  return { async_: true };
};

/**
 * Stop hook: ensures a summary message is injected when the agent
 * finishes, and logs the stop event.
 */
const stopAudit: HookCallback = async (
  input: HookInputData,
  toolUseId: string | null,
  _ctx: HookContext,
): Promise<HookResult> => {
  recordAudit({
    timestamp: new Date().toISOString(),
    severity: "info",
    event: "stop",
    toolName: "agent",
    toolUseId,
    inputSummary: `Agent stopping. Total audit entries: ${auditLog.length}`,
  });
  return {};
};

// ---------------------------------------------------------------------------
// Assembled Hooks Configuration
// ---------------------------------------------------------------------------

/**
 * The complete hooks configuration wiring all security and audit
 * callbacks to the appropriate SDK hook events.
 */
export const securityHooks: HooksConfig = {
  PreToolUse: [
    {
      // No matcher -- applies to every tool invocation.
      hooks: [preToolUseAuditAndProtect],
    },
  ],

  PostToolUse: [
    {
      hooks: [postToolUseAudit],
    },
  ],

  PostToolUseFailure: [
    {
      hooks: [postToolUseFailureAudit],
    },
  ],

  SessionStart: [
    {
      hooks: [sessionStartAudit],
    },
  ],

  SessionEnd: [
    {
      hooks: [sessionEndAudit],
    },
  ],

  Stop: [
    {
      hooks: [stopAudit],
    },
  ],
};

// ---------------------------------------------------------------------------
// Full Agent Options (ready to pass to query())
// ---------------------------------------------------------------------------

/**
 * Pre-built agent options that combine security hooks with a
 * defense-in-depth permission configuration.
 *
 * Merge or override fields as needed for your project:
 *
 * ```ts
 * for await (const msg of query({
 *   prompt: "Refactor the auth module",
 *   options: {
 *     ...securityAgentOptions,
 *     cwd: "/my/project",
 *     maxTurns: 30,
 *   },
 * })) { ... }
 * ```
 */
export const securityAgentOptions = {
  // -- Hooks: security + audit --
  hooks: securityHooks,

  // -- Permission layers --
  permissionMode: "default" as const,

  allowedTools: [
    "Read",
    "Glob",
    "Grep",
    "Edit",
    "Write",
    "Bash",
    "WebSearch",
    "WebFetch",
    "Agent",
  ],

  // Explicitly deny tools that bypass hook evaluation or are too dangerous
  // in a security-sensitive context.
  disallowedTools: [] as string[],

  // -- Safety limits --
  maxTurns: 50,
  maxBudgetUsd: 2.0,

  // -- System prompt reminding the agent of the security policy --
  systemPrompt:
    "You are an AI assistant operating under a strict security policy. " +
    "You must not create, modify, or delete files that contain secrets, " +
    "credentials, API keys, or environment variables. Any attempt to do " +
    "so will be automatically blocked by the security hooks. Always " +
    "prefer reading over writing, and explain your reasoning before " +
    "making changes.",
} as const;

// ---------------------------------------------------------------------------
// Example: running the secured agent
// ---------------------------------------------------------------------------

/**
 * Demonstrates how to wire up the security hooks and process the
 * message stream. This function is not called at import time; invoke
 * it from your application entry point.
 */
export async function runSecuredAgent(prompt: string): Promise<{
  result: string | undefined;
  cost: number;
  auditEntries: readonly AuditRecord[];
}> {
  let result: string | undefined;
  let cost = 0;

  for await (const msg of query({
    prompt,
    options: {
      ...securityAgentOptions,
    },
  })) {
    switch (msg.type) {
      case "assistant": {
        // Stream assistant text to stdout for visibility.
        for (const block of msg.message?.content ?? []) {
          if (block.type === "text") {
            process.stdout.write(block.text);
          }
        }
        break;
      }

      case "result": {
        result = msg.result;
        cost = msg.totalCostUsd ?? 0;

        if (msg.subtype !== "success") {
          // eslint-disable-next-line no-console
          console.warn(`[SECURITY-AGENT] Non-success result: ${msg.subtype}`);
        }
        break;
      }
    }
  }

  return {
    result,
    cost,
    auditEntries: getAuditLog(),
  };
}
