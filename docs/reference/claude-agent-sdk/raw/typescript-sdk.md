---
source: https://platform.claude.com/docs/en/agent-sdk/typescript
scraped_at: 2026-03-14
title: TypeScript SDK Reference
---

# TypeScript SDK Reference

> **Try the new V2 interface (preview):** A simplified interface with `send()` and `stream()` patterns is now available. See the [TypeScript V2 preview docs](https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview).

## Installation

```bash
npm install @anthropic-ai/claude-agent-sdk
```

## Functions

### `query()`

The primary function for interacting with Claude Code. Creates an async generator that streams messages as they arrive.

```typescript
function query({
  prompt,
  options
}: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): Query;
```

Returns a `Query` object that extends `AsyncGenerator<SDKMessage, void>` with additional methods.

### `tool()`

Creates a type-safe MCP tool definition for use with SDK MCP servers.

```typescript
function tool<Schema extends AnyZodRawShape>(
  name: string,
  description: string,
  inputSchema: Schema,
  handler: (args: InferShape<Schema>, extra: unknown) => Promise<CallToolResult>,
  extras?: { annotations?: ToolAnnotations }
): SdkMcpToolDefinition<Schema>;
```

### `createSdkMcpServer()`

Creates an MCP server instance that runs in the same process as your application.

```typescript
function createSdkMcpServer(options: {
  name: string;
  version?: string;
  tools?: Array<SdkMcpToolDefinition<any>>;
}): McpSdkServerConfigWithInstance;
```

### `listSessions()`

Discovers and lists past sessions with light metadata.

```typescript
function listSessions(options?: ListSessionsOptions): Promise<SDKSessionInfo[]>;
```

### `getSessionMessages()`

Reads user and assistant messages from a past session transcript.

```typescript
function getSessionMessages(
  sessionId: string,
  options?: GetSessionMessagesOptions
): Promise<SessionMessage[]>;
```

## Types

### `Options`

Configuration object for the `query()` function.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `abortController` | `AbortController` | `new AbortController()` | Controller for cancelling operations |
| `agents` | `Record<string, AgentDefinition>` | `undefined` | Programmatically define subagents |
| `allowedTools` | `string[]` | `[]` | Tools to auto-approve. Does NOT restrict Claude to only these; unlisted tools fall through to `permissionMode`. Use `disallowedTools` to block. |
| `betas` | `SdkBeta[]` | `[]` | Enable beta features (e.g., `['context-1m-2025-08-07']`) |
| `canUseTool` | `CanUseTool` | `undefined` | Custom permission function for tool usage |
| `continue` | `boolean` | `false` | Continue the most recent conversation |
| `cwd` | `string` | `process.cwd()` | Current working directory |
| `disallowedTools` | `string[]` | `[]` | Tools to always deny, even in `bypassPermissions` mode. |
| `effort` | `'low' | 'medium' | 'high' | 'max'` | `'high'` | Controls reasoning depth |
| `enableFileCheckpointing` | `boolean` | `false` | Enable file change tracking for rewinding |
| `env` | `Record<string, string \| undefined>` | `process.env` | Environment variables |
| `forkSession` | `boolean` | `false` | When resuming, fork to a new session ID |
| `hooks` | `Partial<Record<HookEvent, HookCallbackMatcher[]>>` | `{}` | Hook callbacks for events |
| `includePartialMessages` | `boolean` | `false` | Include partial message events |
| `maxBudgetUsd` | `number` | `undefined` | Maximum budget in USD |
| `maxTurns` | `number` | `undefined` | Maximum tool-use round trips |
| `mcpServers` | `Record<string, McpServerConfig>` | `{}` | MCP server configurations |
| `model` | `string` | Default from CLI | Claude model to use |
| `permissionMode` | `PermissionMode` | `'default'` | `'default'`, `'acceptEdits'`, `'plan'`, `'dontAsk'`, `'bypassPermissions'` |
| `persistSession` | `boolean` | `true` | When `false`, disables session persistence to disk |
| `plugins` | `SdkPluginConfig[]` | `[]` | Load custom plugins from local paths |
| `resume` | `string` | `undefined` | Session ID to resume |
| `settingSources` | `SettingSource[]` | `[]` (no settings) | Load filesystem settings. Must include `'project'` to load CLAUDE.md. |
| `systemPrompt` | `string \| { type: 'preset'; preset: 'claude_code'; append?: string }` | `undefined` | System prompt. Use `{ type: 'preset', preset: 'claude_code' }` for Claude Code's system prompt. |
| `thinking` | `ThinkingConfig` | `{ type: 'adaptive' }` for supported models | Controls Claude's thinking/reasoning behavior |
| `toolConfig` | `ToolConfig` | `undefined` | Configuration for built-in tool behavior |
| `tools` | `string[] \| { type: 'preset'; preset: 'claude_code' }` | `undefined` | Tool configuration |

`allowedTools` vs `disallowedTools`:
- `allowedTools`: Auto-approves listed tools. Unlisted tools fall through to permission checks — they are NOT blocked.
- `disallowedTools`: Always blocks listed tools, even in `bypassPermissions` mode.

### `Query` Object

Extends `AsyncGenerator<SDKMessage, void>` with additional methods:

| Method | Description |
| --- | --- |
| `interrupt()` | Interrupts the query (streaming input mode only) |
| `rewindFiles(userMessageId, options?)` | Restores files to their state at the specified user message. Requires `enableFileCheckpointing: true`. |
| `setPermissionMode(mode)` | Changes the permission mode (streaming input mode only) |
| `setModel(model?)` | Changes the model (streaming input mode only) |
| `initializationResult()` | Returns full initialization result |
| `supportedCommands()` | Returns available slash commands |
| `supportedModels()` | Returns available models |
| `supportedAgents()` | Returns available subagents |
| `mcpServerStatus()` | Returns status of connected MCP servers |
| `accountInfo()` | Returns account information |
| `reconnectMcpServer(serverName)` | Reconnect an MCP server |
| `toggleMcpServer(serverName, enabled)` | Enable or disable an MCP server |
| `setMcpServers(servers)` | Dynamically replace the set of MCP servers |
| `streamInput(stream)` | Stream input messages for multi-turn conversations |
| `stopTask(taskId)` | Stop a running background task |
| `close()` | Close the query and terminate the underlying process |

### `AgentDefinition`

```typescript
type AgentDefinition = {
  description: string;
  tools?: string[];
  disallowedTools?: string[];
  prompt: string;
  model?: "sonnet" | "opus" | "haiku" | "inherit";
  mcpServers?: AgentMcpServerSpec[];
  skills?: string[];
  maxTurns?: number;
};
```

| Field | Required | Description |
| --- | --- | --- |
| `description` | Yes | Natural language description of when to use this agent |
| `prompt` | Yes | The agent's system prompt |
| `tools` | No | Allowed tool names. If omitted, inherits all tools from parent |
| `disallowedTools` | No | Tool names to explicitly disallow |
| `model` | No | `'sonnet'`, `'opus'`, `'haiku'`, or `'inherit'` (default) |
| `skills` | No | Skill names to preload into agent context |
| `maxTurns` | No | Maximum API round-trips before stopping |

### `PermissionMode`

```typescript
type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'dontAsk' | 'bypassPermissions';
```

| Mode | Behavior |
| --- | --- |
| `'default'` | No auto-approvals; unmatched tools trigger `canUseTool` callback |
| `'acceptEdits'` | Auto-approves file edits and filesystem operations |
| `'plan'` | No tool execution; Claude produces a plan |
| `'dontAsk'` | Anything not pre-approved is denied; `canUseTool` is never called |
| `'bypassPermissions'` | All tools run without prompts (use only in isolated environments) |

### `CanUseTool`

```typescript
type CanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  context?: ToolPermissionContext
) => Promise<CanUseToolResult> | CanUseToolResult;

type CanUseToolResult =
  | { behavior: "allow"; updatedInput?: Record<string, unknown> }
  | { behavior: "deny"; message?: string };
```

### `SettingSource`

```typescript
type SettingSource = "user" | "project" | "local";
```

| Value | Location |
| --- | --- |
| `"user"` | `~/.claude/settings.json` |
| `"project"` | `.claude/settings.json` |
| `"local"` | `.claude/settings.local.json` |

When `settingSources` is `[]` (default), no filesystem settings are loaded.

### `ThinkingConfig`

```typescript
type ThinkingConfig =
  | { type: "adaptive" }
  | { type: "enabled"; budget_tokens: number }
  | { type: "disabled" };
```

### `SdkBeta`

```typescript
type SdkBeta = "context-1m-2025-08-07";
```

Enable 1M-token context window for Sonnet 4.5 and Sonnet 4.

### `McpServerConfig`

```typescript
type McpServerConfig =
  | McpStdioServerConfig
  | McpSSEServerConfig
  | McpHttpServerConfig
  | McpSdkServerConfig;

type McpStdioServerConfig = {
  command: string;
  args?: string[];
  env?: Record<string, string>;
};

type McpSSEServerConfig = {
  type: "sse";
  url: string;
  headers?: Record<string, string>;
};

type McpHttpServerConfig = {
  type: "http";
  url: string;
  headers?: Record<string, string>;
};
```

## Message Types

### `SDKMessage` (Union)

```typescript
type SDKMessage =
  | SDKSystemMessage
  | SDKAssistantMessage
  | SDKUserMessage
  | SDKResultMessage
  | StreamEvent;
```

### `SDKAssistantMessage`

```typescript
type SDKAssistantMessage = {
  type: "assistant";
  message: BetaMessage;  // Raw Claude API message with .id, .usage, .content
  session_id: string;
  parent_tool_use_id?: string;
};
```

**Important:** Content is at `message.message.content`, not `message.content`.

### `SDKResultMessage`

```typescript
type SDKResultMessage = {
  type: "result";
  subtype: "success" | "error_max_turns" | "error_max_budget_usd" | "error_during_execution";
  result?: string;  // Only present on "success" subtype
  session_id: string;
  total_cost_usd?: number;
  usage?: Usage;
  num_turns: number;
  stop_reason?: string;  // "end_turn" | "max_tokens" | "refusal"
  modelUsage: Record<string, ModelUsage>;
};
```

### `ModelUsage`

```typescript
type ModelUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  costUSD: number;
};
```

### `SDKSystemMessage`

```typescript
type SDKSystemMessage = {
  type: "system";
  subtype: "init" | "compact_boundary";
  session_id: string;
  // For "init": includes mcp_servers, slash_commands, tools, etc.
};
```

### `HookEvent`

Available hook event names:
`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `PreCompact`, `PermissionRequest`, `Notification`, `SessionStart`, `SessionEnd`, `Setup`, `TeammateIdle`, `TaskCompleted`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`

### `HookCallbackMatcher`

```typescript
type HookCallbackMatcher = {
  matcher?: string;  // Regex pattern for tool name matching
  hooks: HookCallback[];
  timeout?: number;  // Seconds
};
```

### `HookCallback`

```typescript
type HookCallback = (
  input: HookInput,
  toolUseId: string | undefined,
  context: { signal: AbortSignal }
) => Promise<HookOutput> | HookOutput;
```

### `HookOutput`

```typescript
type HookOutput = {
  continue?: boolean;
  systemMessage?: string;
  hookSpecificOutput?: {
    hookEventName: string;
    permissionDecision?: "allow" | "deny" | "ask";
    permissionDecisionReason?: string;
    updatedInput?: Record<string, unknown>;
    additionalContext?: string;
  };
  async?: true;
  asyncTimeout?: number;
};
```

## Tool Input Types

| Tool | Key input fields |
| --- | --- |
| `Bash` | `command: string`, `description?: string`, `timeout?: number` |
| `Read` | `file_path: string`, `offset?: number`, `limit?: number` |
| `Write` | `file_path: string`, `content: string` |
| `Edit` | `file_path: string`, `old_string: string`, `new_string: string`, `replace_all?: boolean` |
| `Glob` | `pattern: string`, `path?: string` |
| `Grep` | `pattern: string`, `path?: string`, `include?: string`, `-i?: boolean` |
| `WebFetch` | `url: string`, `prompt: string` |
| `WebSearch` | `query: string` |
| `Agent` | `description?: string`, `prompt: string`, `subagent_type?: string` |
