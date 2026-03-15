# Claude Agent SDK - Comprehensive Documentation Reference
## Compiled from Context7 MCP Sources | 2026-03-14

---

## Table of Contents

1. [Overview and Core Concepts](#overview-and-core-concepts)
2. [Installation and Getting Started](#installation-and-getting-started)
3. [Core API: The `query()` Function](#core-api-the-query-function)
4. [ClaudeAgentOptions Configuration](#claudeagentoptions-configuration)
5. [Tool Use and Custom Tools](#tool-use-and-custom-tools)
6. [MCP (Model Context Protocol) Integration](#mcp-model-context-protocol-integration)
7. [Hooks and Lifecycle](#hooks-and-lifecycle)
8. [Permission System and Guardrails](#permission-system-and-guardrails)
9. [Multi-Agent / Subagent System](#multi-agent--subagent-system)
10. [Session Management](#session-management)
11. [Streaming and Real-Time Interactions](#streaming-and-real-time-interactions)
12. [Sandbox Configuration](#sandbox-configuration)
13. [ClaudeSDKClient (Interactive/Bidirectional)](#claudesdkclient-interactivebidirectional)
14. [TypeScript-Specific Patterns](#typescript-specific-patterns)
15. [Python-Specific Patterns](#python-specific-patterns)
16. [Demo Applications and Examples](#demo-applications-and-examples)
17. [Sources and Library IDs](#sources-and-library-ids)

---

## Overview and Core Concepts

The Claude Agent SDK is a Python and TypeScript library for building production AI agents that autonomously read files, run commands, search the web, edit code, and execute tools with built-in agent loop management.

**Key packages:**
- Python: `claude_agent_sdk`
- TypeScript/Node: `@anthropic-ai/claude-agent-sdk`

**Core architecture:**
- The primary interface is the `query()` function which returns an async iterable of messages
- Configuration is done through `ClaudeAgentOptions` (Python) or an options object (TypeScript)
- Tools are provided through MCP servers (external or in-process)
- Hooks provide lifecycle interception points (PreToolUse, PostToolUse)
- Sessions maintain conversation context across queries
- Subagents enable multi-agent orchestration via the `Task` tool

---

## Installation and Getting Started

### Python
```python
# Install the SDK
pip install claude-agent-sdk
```

### TypeScript
```bash
# Install the SDK
npm install @anthropic-ai/claude-agent-sdk
```

### Minimal Example (Python)
```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="Hello, Claude!",
        options=ClaudeAgentOptions()
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

### Minimal Example (TypeScript)
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function basicAgent() {
  const q = query({
    prompt: 'Hello, Claude! Please introduce yourself in one sentence.',
    options: {
      maxTurns: 100,
      cwd: process.cwd(),
      model: "sonnet", // "opus", "sonnet", "haiku", or "inherit"
      allowedTools: [
        "Task", "Bash", "Glob", "Grep", "Read", "Edit", "Write",
        "WebFetch", "TodoWrite", "WebSearch"
      ],
    },
  });

  for await (const message of q) {
    if (message.type === 'assistant' && message.message) {
      const textContent = message.message.content.find((c: any) => c.type === 'text');
      if (textContent && 'text' in textContent) {
        console.log('Claude says:', textContent.text);
      }
    }
    if (message.type === 'result' && message.subtype === 'success') {
      console.log(`Cost: $${message.total_cost_usd.toFixed(4)}`);
      console.log(`Duration: ${message.duration_ms}ms`);
    }
  }
}

basicAgent().catch(console.error);
```

---

## Core API: The `query()` Function

The `query()` function is the primary entry point. It:
- Takes a `prompt` (string or async generator for streaming input) and `options`
- Returns an async iterable of messages
- Manages the full agent loop internally (tool calls, responses, etc.)

### Message Types
- **`system`** messages with `subtype: "init"` - contain `session_id`
- **`assistant`** messages - contain `message.content` array with `text` and `tool_use` blocks
- **`result`** messages - contain `result` (final text), `total_cost_usd`, `duration_ms`, and `subtype` ("success" or "error")
- **`StreamEvent`** messages - partial streaming events (when `include_partial_messages` is enabled)

### Python Signature
```python
async for message in query(
    prompt="Your prompt here",           # str or async generator
    options=ClaudeAgentOptions(...)       # Configuration
):
    # Process messages
```

### TypeScript Signature
```typescript
for await (const message of query({
  prompt: "Your prompt here",   // string or AsyncIterable
  options: { ... }              // Configuration object
})) {
  // Process messages
}
```

---

## ClaudeAgentOptions Configuration

### Full Configuration Reference (Python)
```python
from pathlib import Path
from claude_agent_sdk import ClaudeAgentOptions, AgentDefinition

options = ClaudeAgentOptions(
    # Tool configuration
    allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    disallowed_tools=["WebFetch"],

    # System prompt configuration
    system_prompt="You are a helpful coding assistant specializing in Python.",

    # Permission and execution settings
    permission_mode="acceptEdits",  # Options: "default", "acceptEdits", "plan", "bypassPermissions"
    max_turns=10,
    max_budget_usd=0.50,

    # Model configuration
    model="claude-sonnet-4-5",
    fallback_model="claude-haiku-3-5",

    # Working directory
    cwd=Path("/path/to/project"),
    add_dirs=["/additional/allowed/path"],

    # Environment variables
    env={"MY_API_KEY": "secret_key"},

    # Session management
    continue_conversation=True,
    resume="session-uuid-to-resume",
    fork_session=True,

    # Custom agents (subagents)
    agents={
        "code-reviewer": AgentDefinition(
            description="Reviews code for quality",
            prompt="Review the provided code for best practices",
            tools=["Read", "Grep"],
            model="sonnet",
        ),
    },

    # Sandbox configuration for bash isolation
    sandbox={
        "enabled": True,
        "autoAllowBashIfSandboxed": True,
        "excludedCommands": ["git", "docker"],
    },

    # Extended thinking configuration
    thinking={"type": "adaptive"},
    effort="high",

    # Streaming configuration
    include_partial_messages=True,
    enable_file_checkpointing=True,

    # Hook configurations
    hooks={
        "PreToolUse": [...],
        "PostToolUse": [...],
    },

    # Permission callback
    can_use_tool=my_permission_callback,

    # User identity
    user="user-123",

    # Plugin support
    plugins=[],

    # Settings loading
    setting_sources=["project"],  # Include "project" to load CLAUDE.md files
)
```

### Core Parameter Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `allowed_tools` | `list[str]` | None | Tools the agent can use |
| `disallowed_tools` | `list[str]` | None | Tools explicitly blocked |
| `system_prompt` | `str` | None | Custom system prompt |
| `permission_mode` | `str` | "default" | One of: "default", "acceptEdits", "plan", "bypassPermissions" |
| `max_turns` | `int` | None | Maximum agent loop turns |
| `max_budget_usd` | `float` | None | Cost budget limit |
| `model` | `str` | None | Model to use: "opus", "sonnet", "haiku", or full model ID |
| `fallback_model` | `str` | None | Fallback model if primary unavailable |
| `cwd` | `Path` | None | Working directory |
| `add_dirs` | `list[str]` | None | Additional allowed directories |
| `env` | `dict` | None | Environment variables |
| `resume` | `str` | None | Session ID to resume |
| `fork_session` | `bool` | False | Fork instead of continuing session |
| `continue_conversation` | `bool` | None | Continue existing conversation |
| `agents` | `dict[str, AgentDefinition]` | None | Subagent definitions |
| `sandbox` | `dict` | None | Sandbox settings |
| `thinking` | `dict` | None | Extended thinking config |
| `effort` | `str` | None | Effort level: "low", "medium", "high", "max" |
| `include_partial_messages` | `bool` | False | Enable streaming partial messages |
| `enable_file_checkpointing` | `bool` | None | Enable file checkpointing |
| `hooks` | `dict` | None | Hook matchers for lifecycle events |
| `can_use_tool` | `callable` | None | Permission callback function |
| `user` | `str` | None | User identifier |
| `plugins` | `list` | [] | Plugin configurations |
| `setting_sources` | `list[str]` | None | Settings to load (e.g., "project") |
| `mcp_servers` | `dict` | None | MCP server configurations |
| `max_thinking_tokens` | `int` | None | Deprecated - use `thinking` instead |

---

## Tool Use and Custom Tools

### Built-in Tools
The SDK provides access to built-in tools:
- `Read` - Read files
- `Write` - Write files
- `Edit` - Edit files
- `Bash` - Execute shell commands
- `Glob` - File pattern matching
- `Grep` - Search file contents
- `WebFetch` - Fetch web content
- `WebSearch` - Search the web
- `Task` - Spawn subagents
- `TodoWrite` - Write todo items
- `Skill` - Use skills

### Creating Custom Tools (Python)

Use the `@tool` decorator and `create_sdk_mcp_server`:

```python
from claude_agent_sdk import tool, create_sdk_mcp_server

@tool("add", "Add two numbers", {"a": float, "b": float})
async def add(args):
    return {"content": [{"type": "text", "text": f"Sum: {args['a'] + args['b']}"}]}

@tool("multiply", "Multiply two numbers", {"a": float, "b": float})
async def multiply(args):
    return {"content": [{"type": "text", "text": f"Product: {args['a'] * args['b']}"}]}

calculator = create_sdk_mcp_server(
    name="calculator",
    version="2.0.0",
    tools=[add, multiply]
)

options = ClaudeAgentOptions(
    mcp_servers={"calc": calculator},
    allowed_tools=["mcp__calc__add", "mcp__calc__multiply"]
)
```

### Creating Custom Tools (TypeScript)

```typescript
const multiToolServer = createSdkMcpServer({
  name: "utilities",
  version: "1.0.0",
  tools: [
    tool("calculate", "Perform calculations", { /* schema */ }, async (args) => { /* handler */ }),
    tool("translate", "Translate text", { /* schema */ }, async (args) => { /* handler */ }),
  ]
});
```

### Tool Naming Convention
MCP tools follow the pattern: `mcp__<server_name>__<tool_name>`
- Example: `mcp__calc__add` for the "add" tool on the "calc" server
- Wildcard: `mcp__github__*` to allow all tools from a server

### Tool Response Format
Custom tools must return a response with this structure:
```python
{
    "content": [{"type": "text", "text": "Result text"}],
    "is_error": False  # Optional, defaults to False
}
```

---

## MCP (Model Context Protocol) Integration

### External MCP Servers (stdio)
```python
options = ClaudeAgentOptions(
    mcp_servers={
        "playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]},
        "filesystem": {
            "command": "npx",
            "args": ["@modelcontextprotocol/server-filesystem"],
            "env": {"ALLOWED_PATHS": "/Users/me/projects"}
        }
    }
)
```

### HTTP MCP Servers
```python
options = ClaudeAgentOptions(
    mcp_servers={
        "claude-code-docs": {
            "type": "http",
            "url": "https://code.claude.com/docs/mcp",
        }
    },
    allowed_tools=["mcp__claude-code-docs__*"],
)
```

### In-Process MCP Servers
Created with `create_sdk_mcp_server()` - see Custom Tools section above.

### Controlling Tool Access with allowedTools
```typescript
const options = {
  mcpServers: { /* your servers */ },
  allowedTools: [
    "mcp__github__*",            // All tools from github server
    "mcp__db__query",            // Only query tool from db server
    "mcp__slack__send_message"   // Only send_message from slack
  ]
};
```

### Managing MCP Server Status (Python)
```python
async with ClaudeSDKClient(options=options) as client:
    # Get current MCP server status
    status = await client.get_mcp_status()
    for server in status["mcpServers"]:
        print(f"Server: {server['name']}, Status: {server['status']}")

    # Reconnect a failed server
    await client.reconnect_mcp_server("server-name")

    # Toggle server enabled state
    await client.toggle_mcp_server("external", enabled=False)
    await client.toggle_mcp_server("external", enabled=True)
```

---

## Hooks and Lifecycle

Hooks intercept agent behavior at specific lifecycle points. They use `HookMatcher` objects with regex patterns to target specific tools.

### Hook Events
- **`PreToolUse`** - Fires before a tool is executed. Can allow, deny, or modify the tool call.
- **`PostToolUse`** - Fires after a tool execution completes. Can inject system messages or additional context.

### HookMatcher Configuration
```python
HookMatcher(
    matcher="Bash",           # Regex pattern to match tool names (None = match all)
    hooks=[my_callback],      # List of hook functions to execute
    timeout=120               # Optional timeout in seconds (default 60s)
)
```

### Regex Matcher Examples
```python
options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            # Match file modification tools
            HookMatcher(matcher="Write|Edit|Delete", hooks=[file_security_hook]),
            # Match all MCP tools
            HookMatcher(matcher="^mcp__", hooks=[mcp_audit_hook]),
            # Match everything (no matcher)
            HookMatcher(hooks=[global_logger]),
        ]
    }
)
```

### PreToolUse Hook Function Signature
```python
async def my_hook(
    input_data: dict[str, Any],   # Contains "tool_name" and "tool_input"
    tool_use_id: str | None,      # Unique identifier for the tool use
    context: HookContext           # Hook execution context
) -> dict[str, Any]:
    # Return {} to allow, or return denial/modification
    pass
```

### PreToolUse Hook - Deny a Tool Call
```python
return {
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": "Blocked dangerous pattern: rm -rf",
    }
}
```

### PostToolUse Hook - Inject Context
```python
return {
    "systemMessage": "Tool execution encountered an error",
    "hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "additionalContext": "Consider trying a different approach.",
    }
}
```

### Complete Hook Example (Security + Logging)
```python
from claude_agent_sdk import query, ClaudeAgentOptions, HookMatcher, HookContext
from typing import Any

async def validate_bash_command(
    input_data: dict[str, Any], tool_use_id: str | None, context: HookContext
) -> dict[str, Any]:
    if input_data["tool_name"] == "Bash":
        command = input_data["tool_input"].get("command", "")
        if "rm -rf /" in command:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": "Dangerous command blocked",
                }
            }
    return {}

async def log_tool_use(
    input_data: dict[str, Any], tool_use_id: str | None, context: HookContext
) -> dict[str, Any]:
    print(f"Tool used: {input_data.get('tool_name')}")
    return {}

options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Bash", hooks=[validate_bash_command], timeout=120),
            HookMatcher(hooks=[log_tool_use]),
        ],
        "PostToolUse": [HookMatcher(hooks=[log_tool_use])],
    }
)

async for message in query(prompt="Analyze this codebase", options=options):
    print(message)
```

---

## Permission System and Guardrails

### Permission Callback (`can_use_tool`)

The `can_use_tool` callback provides fine-grained control over tool permissions:

```python
from claude_agent_sdk import (
    PermissionResultAllow,
    PermissionResultDeny,
    ToolPermissionContext,
)

async def my_permission_callback(
    tool_name: str,
    input_data: dict,
    context: ToolPermissionContext
) -> PermissionResultAllow | PermissionResultDeny:
    # Always allow read-only operations
    if tool_name in ["Read", "Glob", "Grep"]:
        return PermissionResultAllow()

    # Block writes to system directories
    if tool_name in ["Write", "Edit"]:
        file_path = input_data.get("file_path", "")
        if file_path.startswith("/etc/") or file_path.startswith("/usr/"):
            return PermissionResultDeny(
                message=f"Cannot write to system directory: {file_path}"
            )

        # Redirect writes to a safe directory
        if not file_path.startswith("/tmp/"):
            safe_path = f"/tmp/safe_output/{file_path.split('/')[-1]}"
            return PermissionResultAllow(
                updated_input={**input_data, "file_path": safe_path}
            )

    # Block dangerous bash commands
    if tool_name == "Bash":
        command = input_data.get("command", "")
        dangerous = ["rm -rf", "sudo", "dd if="]
        for pattern in dangerous:
            if pattern in command:
                return PermissionResultDeny(
                    message=f"Dangerous command blocked: {pattern}"
                )

    return PermissionResultAllow()

options = ClaudeAgentOptions(
    can_use_tool=my_permission_callback,
    permission_mode="default",
)
```

### Permission Modes
- `"default"` - Standard permission checks
- `"acceptEdits"` - Auto-accept file edit operations
- `"plan"` - Planning mode
- `"bypassPermissions"` - Skip all permission checks (use with caution)

### PermissionResultAllow
- `PermissionResultAllow()` - Allow as-is
- `PermissionResultAllow(updated_input={...})` - Allow with modified input

### PermissionResultDeny
- `PermissionResultDeny(message="Reason")` - Deny with explanation

---

## Multi-Agent / Subagent System

The SDK supports multi-agent orchestration through `AgentDefinition` and the `Task` tool.

### Defining Subagents
```python
from claude_agent_sdk import ClaudeAgentOptions, AgentDefinition

agents = {
    "researcher": AgentDefinition(
        description="Use this agent to gather research information. Uses web search.",
        tools=["WebSearch", "Write"],
        prompt="You are a research assistant. Search thoroughly and save findings.",
        model="haiku"
    ),
    "data-analyst": AgentDefinition(
        description="Use AFTER researchers complete to generate analysis and charts.",
        tools=["Glob", "Read", "Bash", "Write"],
        prompt="Analyze research data, extract metrics, generate charts.",
        model="haiku"
    ),
    "report-writer": AgentDefinition(
        description="Creates formal PDF reports from research and analysis.",
        tools=["Skill", "Write", "Glob", "Read", "Bash"],
        prompt="Synthesize findings into clear, professional PDF reports.",
        model="haiku"
    )
}

options = ClaudeAgentOptions(
    system_prompt="You coordinate research by delegating to specialized subagents.",
    allowed_tools=["Task"],  # Lead agent only uses Task to spawn subagents
    agents=agents,
    model="haiku"
)
```

### AgentDefinition Fields
- `description` (str) - Description of what the agent does (used by the lead agent to decide when to delegate)
- `tools` (list[str]) - Tools available to this subagent
- `prompt` (str) - System prompt for the subagent
- `model` (str) - Model to use: "opus", "sonnet", "haiku"

### Orchestration Pattern
The lead agent uses the `Task` tool to spawn subagents. Each subagent runs independently with its own tools and prompt. The lead agent coordinates the workflow.

---

## Session Management

Sessions maintain context across multiple queries.

### Capturing Session ID
```python
session_id = None
async for message in query(
    prompt="Read the authentication module",
    options=ClaudeAgentOptions(allowed_tools=["Read", "Glob"])
):
    if hasattr(message, 'subtype') and message.subtype == 'init':
        session_id = message.session_id
```

### Resuming a Session
```python
async for message in query(
    prompt="Now find all places that call it",
    options=ClaudeAgentOptions(resume=session_id)
):
    if hasattr(message, "result"):
        print(message.result)
```

### Forking a Session (TypeScript)
```typescript
for await (const message of query({
  prompt: "Redesign as GraphQL instead",
  options: { resume: sessionId, forkSession: true }
})) {
  if (message.type === "system" && message.subtype === "init") {
    console.log(`Forked to: ${message.session_id}`);
  }
}
```

### How Sessions Work
- A new query automatically creates a session
- The session ID is returned in the initial `system` message with `subtype: "init"`
- Use `resume` to continue a session with full context preserved
- Use `forkSession: true` with `resume` to branch from a session into a new one

---

## Streaming and Real-Time Interactions

### Partial Message Streaming
Enable `include_partial_messages` to receive partial streaming events:
```python
options = ClaudeAgentOptions(
    include_partial_messages=True,
)
```

### Streaming Input with Async Generators
Both Python and TypeScript support streaming input via async generators:

```python
async def message_generator():
    yield {
        "type": "user",
        "message": {
            "role": "user",
            "content": "Calculate 5 + 3 and translate 'hello' to Spanish"
        }
    }

async for message in query(
    prompt=message_generator(),
    options=ClaudeAgentOptions(...)
):
    if hasattr(message, 'result'):
        print(message.result)
```

```typescript
async function* generateMessages() {
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: "Calculate 5 + 3"
    }
  };
}

for await (const message of query({
  prompt: generateMessages(),
  options: { ... }
})) {
  // Process messages
}
```

### Long-Running Chat Sessions (TypeScript WebSocket Example)
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

class MessageQueue {
  private messages: any[] = [];
  private waiting: ((msg: any) => void) | null = null;
  private closed = false;

  push(content: string) {
    const msg = { type: "user", message: { role: "user", content } };
    if (this.waiting) {
      this.waiting(msg);
      this.waiting = null;
    } else {
      this.messages.push(msg);
    }
  }

  async *[Symbol.asyncIterator]() {
    while (!this.closed) {
      if (this.messages.length > 0) {
        yield this.messages.shift()!;
      } else {
        yield await new Promise<any>((resolve) => {
          this.waiting = resolve;
        });
      }
    }
  }

  close() { this.closed = true; }
}

export class AgentSession {
  private queue = new MessageQueue();
  private outputIterator: AsyncIterator<any>;

  constructor() {
    this.outputIterator = query({
      prompt: this.queue as any,
      options: {
        maxTurns: 100,
        model: "opus",
        allowedTools: ["Bash", "Read", "Write", "WebSearch", "WebFetch"],
        systemPrompt: "You are a helpful AI assistant.",
      },
    })[Symbol.asyncIterator]();
  }

  sendMessage(content: string) { this.queue.push(content); }

  async *getOutputStream() {
    while (true) {
      const { value, done } = await this.outputIterator.next();
      if (done) break;
      yield value;
    }
  }

  close() { this.queue.close(); }
}
```

---

## Sandbox Configuration

The sandbox isolates Bash command execution for security:

```python
options = ClaudeAgentOptions(
    sandbox={
        "enabled": True,
        "autoAllowBashIfSandboxed": True,
        "excludedCommands": ["git", "docker"],
        "allowUnsandboxedCommands": True,
    }
)
```

### Sandbox Settings
- `enabled` (bool) - Enable sandbox isolation
- `autoAllowBashIfSandboxed` (bool) - Auto-allow bash when sandboxed
- `excludedCommands` (list[str]) - Commands excluded from sandbox restrictions
- `allowUnsandboxedCommands` (bool) - Allow commands outside the sandbox

---

## ClaudeSDKClient (Interactive/Bidirectional)

The `ClaudeSDKClient` provides a bidirectional interface for interactive tool usage:

```python
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock
)

async with ClaudeSDKClient(options=options) as client:
    # Send a query
    await client.query("What's 123 * 456?")

    # Process response
    async for message in client.receive_response():
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"Claude: {block.text}")

    # Send follow-up query (maintains context)
    await client.query("What time is it now?")

    async for message in client.receive_response():
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"Time: {block.text}")
```

### ClaudeSDKClient Methods
- `await client.query(prompt)` - Send a query
- `async for msg in client.receive_response()` - Stream responses
- `await client.get_mcp_status()` - Get MCP server status
- `await client.reconnect_mcp_server(name)` - Reconnect a failed MCP server
- `await client.toggle_mcp_server(name, enabled=bool)` - Enable/disable an MCP server

---

## TypeScript-Specific Patterns

### AIClient Wrapper Class
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { HookJSONOutput } from "@anthropic-ai/claude-agent-sdk";

interface AIQueryOptions {
  maxTurns?: number;
  cwd?: string;
  model?: string;
  allowedTools?: string[];
  appendSystemPrompt?: string;
  mcpServers?: any;
  hooks?: any;
  resume?: string;
  settingSources?: string[];
}

export class AIClient {
  private defaultOptions: AIQueryOptions;

  constructor(options?: Partial<AIQueryOptions>) {
    this.defaultOptions = {
      maxTurns: 100,
      cwd: path.join(process.cwd(), 'agent'),
      model: "opus",
      allowedTools: [
        "Task", "Bash", "Glob", "Grep", "Read", "Edit", "Write",
        "WebFetch", "TodoWrite", "WebSearch"
      ],
      settingSources: ['local', 'project'],
      ...options
    };
  }

  async *queryStream(prompt: string | AsyncIterable<any>, options?: Partial<AIQueryOptions>) {
    const mergedOptions = { ...this.defaultOptions, ...options };
    for await (const message of query({ prompt, options: mergedOptions })) {
      yield message;
    }
  }

  async querySingle(prompt: string, options?: Partial<AIQueryOptions>) {
    const messages: any[] = [];
    let totalCost = 0;
    let duration = 0;

    for await (const message of this.queryStream(prompt, options)) {
      messages.push(message);
      if (message.type === "result" && message.subtype === "success") {
        totalCost = message.total_cost_usd;
        duration = message.duration_ms;
      }
    }

    return { messages, cost: totalCost, duration };
  }
}
```

### TypeScript Options Property Names (camelCase)
Note: TypeScript uses camelCase while Python uses snake_case:
- `allowedTools` (TS) vs `allowed_tools` (Python)
- `maxTurns` (TS) vs `max_turns` (Python)
- `mcpServers` (TS) vs `mcp_servers` (Python)
- `systemPrompt` (TS) vs `system_prompt` (Python)
- `forkSession` (TS) vs `fork_session` (Python)
- `settingSources` (TS) vs `setting_sources` (Python)
- `permissionMode` (TS) vs `permission_mode` (Python)

---

## Python-Specific Patterns

### Key Imports
```python
from claude_agent_sdk import (
    # Core
    query,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    AgentDefinition,

    # Tool creation
    tool,
    create_sdk_mcp_server,

    # Message types
    AssistantMessage,
    ResultMessage,
    TextBlock,

    # Hooks
    HookMatcher,

    # Permissions
    PermissionResultAllow,
    PermissionResultDeny,
    ToolPermissionContext,
)

from claude_agent_sdk.types import HookInput, HookContext, HookJSONOutput
```

---

## Demo Applications and Examples

### Research Multi-Agent System
A complete multi-agent research system with researcher, data-analyst, and report-writer subagents. See Multi-Agent section above for full code.

### Email Classification System
An event-driven listener system that uses Claude to classify emails by category (urgent, newsletter, personal, work, spam) and priority, with automated actions like archiving, starring, and labeling.

### WebSocket Chat Integration
A long-running chat session implementation using a MessageQueue and WebSocket for real-time bidirectional communication with the agent.

---

## Sources and Library IDs

### Context7 Libraries Used

| Library ID | Title | Reputation | Score | Snippets |
|------------|-------|------------|-------|----------|
| `/websites/platform_claude_en_agent-sdk` | Claude Agent SDK (Official Platform Docs) | High | 86.14 | 988 |
| `/nothflare/claude-agent-sdk-docs` | Claude Agent SDK Docs | Medium | 82.97 | 821 |
| `/anthropics/claude-agent-sdk-python` | Claude Agent SDK for Python | High | 77.54 | 51 |
| `/anthropics/claude-agent-sdk-demos` | Claude Agent SDK Demos | High | 77.19 | 345 |

### Also Discovered (Not Queried)

| Library ID | Title | Reputation | Score | Snippets |
|------------|-------|------------|-------|----------|
| `/anthropics/anthropic-sdk-typescript` | Anthropic SDK TypeScript | High | 71.5 | 182 |
| `/anthropics/anthropic-sdk-python` | Anthropic SDK for Python | High | 72.85 | 127 |
| `/anthropics/anthropic-sdk-go` | Anthropic SDK Go | High | 79.15 | 95 |
| `/amyodov/pytest-claude-agent-sdk` | pytest-claude-agent-sdk | Medium | 82.6 | 45 |
| `/amscotti/claude-agent-cr` | Claude Agent SDK for Crystal | High | 74.41 | 65 |

### Source URLs Referenced
- https://platform.claude.com/docs/en/agent-sdk/overview
- https://platform.claude.com/docs/en/agent-sdk/python
- https://platform.claude.com/docs/en/agent-sdk/mcp
- https://platform.claude.com/docs/en/agent-sdk/hooks
- https://docs.claude.com/en/api/agent-sdk/python
- https://github.com/anthropics/claude-agent-sdk-python/blob/main/README.md
- https://github.com/nothflare/claude-agent-sdk-docs/blob/main/docs/en/agent-sdk/overview.md
- https://github.com/nothflare/claude-agent-sdk-docs/blob/main/docs/en/agent-sdk/python.md
- https://github.com/nothflare/claude-agent-sdk-docs/blob/main/docs/en/agent-sdk/guides/custom-tools.md
- https://github.com/nothflare/claude-agent-sdk-docs/blob/main/docs/en/agent-sdk/guides/sessions.md
