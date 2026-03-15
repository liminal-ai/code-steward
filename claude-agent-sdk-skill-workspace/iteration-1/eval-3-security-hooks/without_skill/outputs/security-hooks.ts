/**
 * Security Hooks for Claude Agent SDK
 *
 * Provides two critical security capabilities:
 *   1. File protection: Blocks writes to sensitive files and directories.
 *   2. Audit logging: Records every tool invocation for compliance and debugging.
 *
 * Usage:
 *   import { createSecurityHooks } from "./security-hooks";
 *
 *   const hooks = createSecurityHooks({
 *     sensitivePatterns: [/\.env/, /credentials/, /\/etc\/passwd/],
 *     auditLogPath: "./audit.log",
 *   });
 *
 *   const client = new Anthropic();
 *   const agent = client.agents.create({ hooks, ... });
 */

import { type MessageStream } from "@anthropic-ai/sdk";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for the security hooks system. */
export interface SecurityHooksConfig {
  /**
   * Regular expressions or glob-like strings that identify sensitive file paths.
   * Any tool invocation whose input references a matching path will be blocked.
   */
  readonly sensitivePatterns: ReadonlyArray<RegExp | string>;

  /**
   * Optional explicit list of sensitive file paths (exact match).
   * These are checked in addition to `sensitivePatterns`.
   */
  readonly sensitiveFiles?: ReadonlyArray<string>;

  /**
   * Optional list of sensitive directory prefixes.
   * Any path that starts with one of these prefixes is blocked.
   */
  readonly sensitiveDirs?: ReadonlyArray<string>;

  /**
   * File path where audit log entries are written.
   * If omitted, audit entries are written to stdout via `console.log`.
   */
  readonly auditLogPath?: string;

  /**
   * When true, blocked tool calls throw an error instead of returning a
   * descriptive rejection message. Defaults to `false`.
   */
  readonly throwOnBlock?: boolean;

  /**
   * Optional callback invoked for every audit event, in addition to
   * file / console logging. Useful for sending events to an external system.
   */
  readonly onAuditEvent?: (event: AuditLogEntry) => void | Promise<void>;
}

/** A single entry in the audit log. */
export interface AuditLogEntry {
  readonly timestamp: string;
  readonly eventType: "tool_call" | "tool_result" | "tool_blocked";
  readonly toolName: string;
  readonly toolInput: Record<string, unknown>;
  readonly blocked: boolean;
  readonly blockReason?: string;
  readonly sessionId?: string;
}

/**
 * The shape of a tool-use content block as surfaced by the Anthropic SDK.
 * We declare a minimal interface so this module does not depend on SDK internals.
 */
interface ToolUseBlock {
  readonly type: "tool_use";
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
}

/**
 * Minimal representation of tool input for the hooks callbacks.
 * Mirrors the `ToolInput` shape used in the Claude Agent SDK hooks API.
 */
export interface HookToolInput {
  readonly toolName: string;
  readonly toolInput: Record<string, unknown>;
  readonly toolUseId: string;
}

/**
 * Result that a `beforeToolCall` hook can return.
 *   - `undefined` means "allow the call to proceed".
 *   - An object with `{ decision: "block", message }` means "reject the call".
 */
export type BeforeToolCallResult =
  | undefined
  | { readonly decision: "allow" }
  | { readonly decision: "block"; readonly message: string };

/**
 * The hooks object compatible with the Claude Agent SDK's `hooks` option.
 *
 * The SDK recognises several lifecycle hooks. We implement the two that are
 * relevant for security: `beforeToolCall` and `afterToolCall`.
 */
export interface AgentHooks {
  /**
   * Called before every tool invocation. Return a block decision to prevent
   * the tool from executing.
   */
  beforeToolCall?: (
    tool: HookToolInput,
  ) => BeforeToolCallResult | Promise<BeforeToolCallResult>;

  /**
   * Called after every tool invocation with the tool result.
   */
  afterToolCall?: (
    tool: HookToolInput,
    result: unknown,
  ) => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Write-oriented tool names
// ---------------------------------------------------------------------------

/**
 * Tool names that are known to perform file-system writes.
 * We check inputs of these tools for sensitive path references.
 */
const WRITE_TOOL_NAMES: ReadonlySet<string> = new Set([
  "file_write",
  "write",
  "Write",
  "create_file",
  "edit",
  "Edit",
  "str_replace_editor",
  "bash",
  "Bash",
  "execute_bash",
  "shell",
  "computer",
  "text_editor",
  "notebook_edit",
  "NotebookEdit",
]);

/**
 * Input field names that commonly contain file paths.
 */
const PATH_FIELD_NAMES: ReadonlySet<string> = new Set([
  "path",
  "file_path",
  "filePath",
  "filename",
  "file",
  "destination",
  "target",
  "old_str",
  "new_str",
  "command",
  "content",
]);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Convert a user-supplied pattern (string or RegExp) into a RegExp. */
function toRegExp(pattern: RegExp | string): RegExp {
  if (pattern instanceof RegExp) {
    return pattern;
  }
  // Escape special regex characters, then convert glob-style `*` to `.*`
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(escaped, "i");
}

/**
 * Extract all string values from a nested object that might represent file paths.
 * We look at known field names and also scan string values heuristically.
 */
function extractPaths(input: Record<string, unknown>): string[] {
  const paths: string[] = [];

  function walk(obj: unknown, fieldName?: string): void {
    if (typeof obj === "string") {
      // If the field name is a known path field, always include it.
      if (fieldName && PATH_FIELD_NAMES.has(fieldName)) {
        paths.push(obj);
      }
      // Heuristic: if the string looks like a file path, include it.
      if (obj.startsWith("/") || obj.startsWith("./") || obj.startsWith("~")) {
        paths.push(obj);
      }
      // For bash/shell commands, try to extract paths from the command string.
      if (fieldName === "command") {
        const tokenRegex = /(?:\/[\w./-]+)+/g;
        let match: RegExpExecArray | null;
        while ((match = tokenRegex.exec(obj)) !== null) {
          paths.push(match[0]);
        }
      }
      return;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        walk(item, fieldName);
      }
      return;
    }
    if (obj !== null && typeof obj === "object") {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        walk(value, key);
      }
    }
  }

  walk(input);
  return paths;
}

/** Normalise a path for comparison. */
function normalisePath(p: string): string {
  return resolve(p.replace(/^~/, process.env["HOME"] ?? "~"));
}

// ---------------------------------------------------------------------------
// Audit logger
// ---------------------------------------------------------------------------

class AuditLogger {
  private readonly logPath: string | undefined;
  private readonly onEvent: ((event: AuditLogEntry) => void | Promise<void>) | undefined;

  constructor(logPath?: string, onEvent?: (event: AuditLogEntry) => void | Promise<void>) {
    this.logPath = logPath;
    this.onEvent = onEvent;

    if (this.logPath) {
      mkdirSync(dirname(this.logPath), { recursive: true });
    }
  }

  log(entry: AuditLogEntry): void {
    const line = JSON.stringify(entry);

    if (this.logPath) {
      appendFileSync(this.logPath, line + "\n", "utf-8");
    } else {
      console.log(`[AUDIT] ${line}`);
    }

    if (this.onEvent) {
      // Fire-and-forget; we do not block the hook on external callbacks.
      void Promise.resolve(this.onEvent(entry));
    }
  }
}

// ---------------------------------------------------------------------------
// Path checker
// ---------------------------------------------------------------------------

class SensitivePathChecker {
  private readonly patterns: ReadonlyArray<RegExp>;
  private readonly exactFiles: ReadonlySet<string>;
  private readonly dirPrefixes: ReadonlyArray<string>;

  constructor(config: SecurityHooksConfig) {
    this.patterns = config.sensitivePatterns.map(toRegExp);
    this.exactFiles = new Set(
      (config.sensitiveFiles ?? []).map(normalisePath),
    );
    this.dirPrefixes = (config.sensitiveDirs ?? []).map(normalisePath);
  }

  /**
   * Returns the reason a path is sensitive, or `undefined` if it is not.
   */
  check(rawPath: string): string | undefined {
    const normalised = normalisePath(rawPath);

    // Exact file match.
    if (this.exactFiles.has(normalised)) {
      return `Exact match on sensitive file: ${rawPath}`;
    }

    // Directory prefix match.
    for (const prefix of this.dirPrefixes) {
      if (normalised.startsWith(prefix)) {
        return `Path falls under sensitive directory: ${prefix}`;
      }
    }

    // Pattern match (run against both the raw and normalised forms).
    for (const pattern of this.patterns) {
      if (pattern.test(rawPath) || pattern.test(normalised)) {
        return `Path matches sensitive pattern: ${pattern.source}`;
      }
    }

    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates an `AgentHooks` object that can be passed directly to the
 * Claude Agent SDK's agent configuration.
 *
 * @example
 * ```ts
 * import Anthropic from "@anthropic-ai/sdk";
 * import { createSecurityHooks } from "./security-hooks";
 *
 * const hooks = createSecurityHooks({
 *   sensitivePatterns: [
 *     /\.env$/,
 *     /\.env\..+$/,
 *     /credentials\.json$/,
 *     /secrets?\./i,
 *     /private[_-]?key/i,
 *     /\/\.ssh\//,
 *     /\/\.aws\//,
 *     /\/\.gnupg\//,
 *   ],
 *   sensitiveFiles: [
 *     "/etc/passwd",
 *     "/etc/shadow",
 *     "/etc/sudoers",
 *   ],
 *   sensitiveDirs: [
 *     "/etc/ssl",
 *     "/root",
 *   ],
 *   auditLogPath: "./logs/agent-audit.jsonl",
 * });
 *
 * const client = new Anthropic();
 *
 * // Pass hooks when running the agent agentic loop
 * const result = await client.messages.create({
 *   model: "claude-sonnet-4-20250514",
 *   max_tokens: 8096,
 *   system: "You are a helpful assistant.",
 *   messages: [{ role: "user", content: "..." }],
 *   tools: [ ... ],
 *   // The hooks integrate at the agent orchestration layer:
 *   hooks,
 * });
 * ```
 */
export function createSecurityHooks(config: SecurityHooksConfig): AgentHooks {
  const checker = new SensitivePathChecker(config);
  const logger = new AuditLogger(config.auditLogPath, config.onAuditEvent);
  const shouldThrow = config.throwOnBlock ?? false;

  // ------------------------------------------------------------------
  // beforeToolCall
  // ------------------------------------------------------------------
  const beforeToolCall = (tool: HookToolInput): BeforeToolCallResult => {
    const { toolName, toolInput, toolUseId } = tool;

    // --- Check for sensitive file access on write-oriented tools ---
    let blockReason: string | undefined;

    if (WRITE_TOOL_NAMES.has(toolName)) {
      const paths = extractPaths(toolInput);
      for (const p of paths) {
        const reason = checker.check(p);
        if (reason) {
          blockReason = reason;
          break;
        }
      }
    }

    // Even for non-write tools, scan for obviously sensitive paths in inputs
    // (e.g., someone passing a sensitive path to a read tool for exfiltration
    // is worth auditing, though we only *block* writes).
    const blocked = blockReason !== undefined;

    // --- Audit log ---
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventType: blocked ? "tool_blocked" : "tool_call",
      toolName,
      toolInput: sanitiseForLog(toolInput),
      blocked,
      blockReason,
    };
    logger.log(entry);

    // --- Decision ---
    if (blocked) {
      const message =
        `BLOCKED: Tool "${toolName}" attempted to access a sensitive path. ` +
        `Reason: ${blockReason}`;

      if (shouldThrow) {
        throw new Error(message);
      }

      return { decision: "block", message };
    }

    return { decision: "allow" };
  };

  // ------------------------------------------------------------------
  // afterToolCall
  // ------------------------------------------------------------------
  const afterToolCall = (tool: HookToolInput, result: unknown): void => {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventType: "tool_result",
      toolName: tool.toolName,
      toolInput: sanitiseForLog(tool.toolInput),
      blocked: false,
    };
    logger.log(entry);
  };

  return {
    beforeToolCall,
    afterToolCall,
  };
}

// ---------------------------------------------------------------------------
// Sanitisation
// ---------------------------------------------------------------------------

/**
 * Remove or truncate potentially large / sensitive values before writing
 * them to the audit log.
 */
function sanitiseForLog(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const MAX_VALUE_LENGTH = 500;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && value.length > MAX_VALUE_LENGTH) {
      result[key] = value.slice(0, MAX_VALUE_LENGTH) + `... [truncated, ${value.length} chars]`;
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Preset configurations
// ---------------------------------------------------------------------------

/**
 * A sensible default configuration that protects common sensitive files
 * and directories. Use as a starting point and extend as needed.
 */
export const DEFAULT_SECURITY_CONFIG: SecurityHooksConfig = {
  sensitivePatterns: [
    /\.env$/,
    /\.env\.[a-zA-Z]+$/,
    /credentials\.json$/,
    /credentials\.ya?ml$/,
    /secrets?\./i,
    /private[_-]?key/i,
    /id_rsa/,
    /id_ed25519/,
    /id_ecdsa/,
    /\.pem$/,
    /\.key$/,
    /\.p12$/,
    /\.pfx$/,
    /\.jks$/,
    /token\.json$/,
    /auth\.json$/,
    /\.npmrc$/,
    /\.pypirc$/,
    /\.netrc$/,
    /\.docker\/config\.json$/,
    /kubeconfig/i,
  ],
  sensitiveFiles: [
    "/etc/passwd",
    "/etc/shadow",
    "/etc/sudoers",
    "/etc/hosts",
  ],
  sensitiveDirs: [
    "/etc/ssl",
    "/root",
    `${process.env["HOME"] ?? "~"}/.ssh`,
    `${process.env["HOME"] ?? "~"}/.aws`,
    `${process.env["HOME"] ?? "~"}/.gnupg`,
    `${process.env["HOME"] ?? "~"}/.config/gcloud`,
  ],
  auditLogPath: "./logs/agent-audit.jsonl",
} as const;

/**
 * Convenience: create hooks using the default security configuration,
 * optionally merging in additional patterns.
 */
export function createDefaultSecurityHooks(
  overrides?: Partial<SecurityHooksConfig>,
): AgentHooks {
  const merged: SecurityHooksConfig = {
    ...DEFAULT_SECURITY_CONFIG,
    ...overrides,
    sensitivePatterns: [
      ...DEFAULT_SECURITY_CONFIG.sensitivePatterns,
      ...(overrides?.sensitivePatterns ?? []),
    ],
    sensitiveFiles: [
      ...(DEFAULT_SECURITY_CONFIG.sensitiveFiles ?? []),
      ...(overrides?.sensitiveFiles ?? []),
    ],
    sensitiveDirs: [
      ...(DEFAULT_SECURITY_CONFIG.sensitiveDirs ?? []),
      ...(overrides?.sensitiveDirs ?? []),
    ],
  };

  return createSecurityHooks(merged);
}
