# Claude Agent SDK - Comprehensive Research Report

**Research Date:** 2026-03-14
**SDK Versions:** Python v0.1.48, TypeScript v0.2.76

---

## Summary

The Claude Agent SDK (formerly Claude Code SDK) is Anthropic's framework for building autonomous AI agents programmatically. It provides the same tools, agent loop, and context management that power Claude Code, available as libraries in Python and TypeScript. The SDK enables agents to read files, run commands, search the web, edit code, and interact with external services via MCP (Model Context Protocol) -- all without developers needing to implement tool execution themselves.

The SDK operates on a streaming async generator pattern where you call `query()` with a prompt and options, then iterate over messages as the agent works. It supports sessions for multi-turn conversations, subagents for parallel/isolated tasks, hooks for intercepting agent behavior, structured output for typed JSON responses, and comprehensive permission controls. The SDK can authenticate via Anthropic API keys, Amazon Bedrock, Google Vertex AI, or Microsoft Azure AI Foundry.

The SDK was renamed from "Claude Code SDK" to "Claude Agent SDK" in early 2026 to reflect its broader capabilities beyond coding tasks. The migration involves updating package names and a few breaking changes around default system prompts and settings loading.

---

## Key Findings

- **Two SDKs:** Python (`pip install claude-agent-sdk`, MIT license, 5416 GitHub stars) and TypeScript (`npm install @anthropic-ai/claude-agent-sdk`, 958 stars). Both are actively maintained with frequent releases.
- **Core Architecture:** Built on top of Claude Code CLI. The SDK bundles the CLI automatically (Python) or requires it installed (TypeScript). Agents run in a persistent process with filesystem access.
- **Primary API:** `query()` function returns an async generator/iterator that yields messages as the agent works. `ClaudeSDKClient` (Python) provides a stateful client for multi-turn conversations.
- **Built-in Tools:** Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion, Agent, Skill, TodoWrite, NotebookEdit, and more.
- **MCP Integration:** First-class support for Model Context Protocol servers (stdio, SSE, HTTP, and in-process SDK servers). Custom tools are defined as MCP servers.
- **Hooks System:** 10+ hook events (PreToolUse, PostToolUse, Stop, SubagentStop, etc.) for intercepting and modifying agent behavior at runtime.
- **Subagents:** Agents can spawn specialized subagents with isolated context, restricted tools, and different models.
- **TypeScript V2 Preview:** A simplified interface with `createSession()`, `send()`, and `stream()` patterns is available as an unstable preview.
- **Production-Ready:** Includes hosting guidance for Docker/cloud, sandbox configuration, secure deployment patterns, cost tracking, and file checkpointing.

---

## 1. Installation

### Python
```bash
# Using pip
pip install claude-agent-sdk

# Using uv
uv init && uv add claude-agent-sdk
```
**Prerequisites:** Python 3.10+. The Claude Code CLI is bundled with the package.

### TypeScript
```bash
npm install @anthropic-ai/claude-agent-sdk
# or
yarn add @anthropic-ai/claude-agent-sdk
# or
pnpm add @anthropic-ai/claude-agent-sdk
```
**Prerequisites:** Node.js 18+.

### Rust (Unofficial)
```
[dependencies]
anthropic-agent-sdk = "*"
```

---

## 2. Authentication & API Key Setup

```bash
# Primary: Anthropic API key
export ANTHROPIC_API_KEY=your-api-key

# Amazon Bedrock
export CLAUDE_CODE_USE_BEDROCK=1
# + configure AWS credentials

# Google Vertex AI
export CLAUDE_CODE_USE_VERTEX=1
# + configure Google Cloud credentials

# Microsoft Azure AI Foundry
export CLAUDE_CODE_USE_FOUNDRY=1
# + configure Azure credentials
```

The SDK also supports third-party proxies via `ANTHROPIC_BASE_URL`:
```bash
export ANTHROPIC_BASE_URL="https://your-proxy.example.com"
```

---

## 3. Core Concepts

### 3.1 The Agent Loop

The SDK runs the same execution loop that powers Claude Code:

1. **Receive prompt** - Claude receives your prompt, system prompt, tool definitions, and conversation history
2. **Evaluate and respond** - Claude responds with text and/or tool call requests
3. **Execute tools** - SDK runs requested tools and collects results
4. **Repeat** - Steps 2-3 repeat (each cycle = one "turn")
5. **Return result** - Final `ResultMessage` with text, cost, usage, and session ID

### 3.2 Message Types

| Type | Description |
|------|-------------|
| `SystemMessage` | Session lifecycle events (init, compact_boundary) |
| `AssistantMessage` | Claude's responses including text and tool calls |
| `UserMessage` | User inputs and tool results |
| `StreamEvent` | Real-time streaming events (when partial messages enabled) |
| `ResultMessage` | Final message with result, cost, usage, session ID |

### 3.3 Result Subtypes

| Subtype | Meaning |
|---------|---------|
| `success` | Task completed normally |
| `error_max_turns` | Hit maxTurns limit |
| `error_max_budget_usd` | Hit maxBudgetUsd limit |
| `error_during_execution` | Runtime error |
| `error_max_structured_output_retries` | Structured output validation failed |

---

## 4. Primary API: `query()`

### Python
```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="Find and fix the bug in auth.py",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit", "Bash"],
            permission_mode="acceptEdits",
        ),
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

### TypeScript
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Find and fix the bug in auth.py",
  options: {
    allowedTools: ["Read", "Edit", "Bash"],
    permissionMode: "acceptEdits"
  }
})) {
  if ("result" in message) console.log(message.result);
}
```

---

## 5. Configuration Options (ClaudeAgentOptions / Options)

| Option (Python / TypeScript) | Type | Default | Description |
|-----|------|---------|-------------|
| `allowed_tools` / `allowedTools` | `list[str]` / `string[]` | `[]` | Tools to auto-approve |
| `disallowed_tools` / `disallowedTools` | `list[str]` / `string[]` | `[]` | Tools to always deny |
| `system_prompt` / `systemPrompt` | `str` / `string` | `None` | Custom system prompt or preset |
| `permission_mode` / `permissionMode` | `str` | `None` | Permission mode (default, acceptEdits, plan, bypassPermissions, dontAsk) |
| `mcp_servers` / `mcpServers` | `dict` / `object` | `{}` | MCP server configurations |
| `max_turns` / `maxTurns` | `int` / `number` | No limit | Maximum tool-use turns |
| `max_budget_usd` / `maxBudgetUsd` | `float` / `number` | No limit | Maximum cost in USD |
| `model` | `str` / `string` | Default | Claude model to use |
| `fallback_model` / `fallbackModel` | `str` / `string` | `None` | Fallback model |
| `effort` | `"low"/"medium"/"high"/"max"` | SDK-dependent | Reasoning effort level |
| `cwd` | `str` / `string` | Current dir | Working directory |
| `resume` | `str` / `string` | `None` | Session ID to resume |
| `continue_conversation` / `continue` | `bool` | `False` | Continue most recent session |
| `fork_session` / `forkSession` | `bool` | `False` | Fork session when resuming |
| `hooks` | `dict` / `object` | `None` | Hook configurations |
| `agents` | `dict` / `object` | `None` | Subagent definitions |
| `can_use_tool` / `canUseTool` | Callback | `None` | Tool permission callback |
| `include_partial_messages` / `includePartialMessages` | `bool` | `False` | Enable streaming events |
| `output_format` / `outputFormat` | `dict` / `object` | `None` | Structured output schema |
| `setting_sources` / `settingSources` | `list` / `array` | `None` | Filesystem settings to load ("user", "project", "local") |
| `plugins` | `list` | `[]` | Plugin configurations |
| `sandbox` | `dict` / `object` | `None` | Sandbox settings |
| `thinking` | `dict` / `object` | `None` | Extended thinking config |
| `betas` | `list` | `[]` | Beta features (e.g., "context-1m-2025-08-07") |
| `env` | `dict` / `object` | `{}` | Environment variables |
| `enable_file_checkpointing` / `enableFileCheckpointing` | `bool` | `False` | Track file changes for rewind |
| `user` | `str` / `string` | `None` | User identifier |

---

## 6. Built-in Tools

| Tool | What it does |
|------|-------------|
| **Read** | Read any file (supports images, PDFs, notebooks) |
| **Write** | Create new files |
| **Edit** | Make precise string-replacement edits |
| **Bash** | Run terminal commands, scripts, git operations |
| **Glob** | Find files by pattern |
| **Grep** | Search file contents with regex |
| **WebSearch** | Search the web |
| **WebFetch** | Fetch and parse web page content |
| **AskUserQuestion** | Ask users clarifying questions with multiple choice |
| **Agent** | Spawn subagents for isolated tasks |
| **Skill** | Invoke Skills defined in .claude/skills/ |
| **TodoWrite** | Track task status |
| **NotebookEdit** | Modify Jupyter notebook cells |
| **BashOutput** | Get output from background bash processes |
| **KillBash** | Kill background bash processes |
| **ListMcpResources** | List MCP server resources |
| **ReadMcpResource** | Read MCP server resource content |
| **ToolSearch** | Dynamically find and load tools on-demand |

---

## 7. Custom Tools (MCP)

Custom tools are defined as in-process MCP servers using `tool()` and `create_sdk_mcp_server()` / `createSdkMcpServer()`.

### Python
```python
from claude_agent_sdk import tool, create_sdk_mcp_server, ClaudeAgentOptions
from typing import Any

@tool("get_weather", "Get temperature for a location", {"latitude": float, "longitude": float})
async def get_weather(args: dict[str, Any]) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": f"Temperature: 72F"}]}

server = create_sdk_mcp_server(name="my-tools", tools=[get_weather])

options = ClaudeAgentOptions(
    mcp_servers={"my-tools": server},
    allowed_tools=["mcp__my-tools__get_weather"],
)
```

### TypeScript
```typescript
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const server = createSdkMcpServer({
  name: "my-tools",
  tools: [
    tool("get_weather", "Get temperature", {
      latitude: z.number(),
      longitude: z.number()
    }, async (args) => ({
      content: [{ type: "text", text: `Temperature: 72F` }]
    }))
  ]
});
```

### Tool Naming Convention
MCP tools follow the pattern: `mcp__<server-name>__<tool-name>`

---

## 8. MCP (Model Context Protocol) Integration

### Transport Types

| Type | Config | Use Case |
|------|--------|----------|
| **stdio** | `{ command, args, env }` | Local process servers |
| **SSE** | `{ type: "sse", url, headers }` | Cloud-hosted streaming servers |
| **HTTP** | `{ type: "http", url, headers }` | Cloud-hosted non-streaming servers |
| **SDK** | `{ type: "sdk", name, instance }` | In-process custom tools |

### Configuration
```python
options = ClaudeAgentOptions(
    mcp_servers={
        "github": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {"GITHUB_TOKEN": os.environ["GITHUB_TOKEN"]},
        }
    },
    allowed_tools=["mcp__github__*"],  # Wildcard for all tools
)
```

### MCP Tool Search
Automatically enabled when MCP tool definitions exceed 10% of context window. Configurable via `ENABLE_TOOL_SEARCH` env var: `auto`, `auto:5` (custom %), `true`, `false`.

### .mcp.json File
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    }
  }
}
```

---

## 9. Hooks System

### Available Hook Events

| Hook Event | Python | TypeScript | Trigger |
|------------|--------|------------|---------|
| `PreToolUse` | Yes | Yes | Before tool execution |
| `PostToolUse` | Yes | Yes | After tool execution |
| `PostToolUseFailure` | Yes | Yes | After tool failure |
| `UserPromptSubmit` | Yes | Yes | User prompt sent |
| `Stop` | Yes | Yes | Agent execution stop |
| `SubagentStart` | Yes | Yes | Subagent initialization |
| `SubagentStop` | Yes | Yes | Subagent completion |
| `PreCompact` | Yes | Yes | Before compaction |
| `Notification` | Yes | Yes | Agent status messages |
| `PermissionRequest` | Yes | Yes | Permission dialog |
| `SessionStart` | No | Yes | Session initialization |
| `SessionEnd` | No | Yes | Session termination |
| `Setup` | No | Yes | Session setup |
| `TeammateIdle` | No | Yes | Teammate idle |
| `TaskCompleted` | No | Yes | Background task done |
| `ConfigChange` | No | Yes | Config file changes |

### Hook Callback Signature (Python)
```python
async def my_hook(
    input_data: dict[str, Any],    # Event details (tool_name, tool_input, etc.)
    tool_use_id: str | None,        # Correlates Pre/PostToolUse events
    context: HookContext             # Reserved for future use
) -> dict[str, Any]:                # Output controlling agent behavior
    return {}  # Empty = allow
```

### Hook Output Options
- `{}` - Allow operation unchanged
- `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "..."}}` - Block operation
- `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "allow", "updatedInput": {...}}}` - Allow with modified input
- `{"systemMessage": "..."}` - Inject context into conversation
- `{"continue_": False}` - Stop agent execution
- `{"async_": True}` - Fire-and-forget (non-blocking)

### Hook Configuration
```python
from claude_agent_sdk import ClaudeAgentOptions, HookMatcher

options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Write|Edit", hooks=[protect_env_files]),
            HookMatcher(matcher="^mcp__", hooks=[mcp_audit_hook]),
            HookMatcher(hooks=[global_logger]),  # No matcher = all tools
        ],
        "PostToolUse": [HookMatcher(hooks=[audit_logger])],
        "Stop": [HookMatcher(hooks=[save_session])],
    }
)
```

---

## 10. Permissions

### Permission Evaluation Order
1. Hooks (can allow/deny/continue)
2. Deny rules (`disallowed_tools`)
3. Permission mode
4. Allow rules (`allowed_tools`)
5. `canUseTool` callback

### Permission Modes

| Mode | Description |
|------|-------------|
| `default` | Standard - unmatched tools trigger canUseTool callback |
| `acceptEdits` | Auto-approve file edits (Edit, Write, mkdir, rm, mv, cp) |
| `dontAsk` (TS only) | Deny anything not pre-approved |
| `bypassPermissions` | Approve everything (use with caution) |
| `plan` | No tool execution, planning only |

### canUseTool Callback
```python
async def custom_permission(tool_name, input_data, context):
    if tool_name == "Bash" and "rm -rf" in input_data.get("command", ""):
        return PermissionResultDeny(message="Dangerous command blocked")
    return PermissionResultAllow(updated_input=input_data)

options = ClaudeAgentOptions(can_use_tool=custom_permission)
```

---

## 11. Sessions

### Approaches

| Use Case | Approach |
|----------|----------|
| One-shot task | Single `query()` call |
| Multi-turn in one process | `ClaudeSDKClient` (Python) or `continue: true` (TS) |
| Resume after restart | `continue_conversation=True` or `resume=session_id` |
| Specific past session | Capture and pass `resume=session_id` |
| Explore alternatives | `fork_session=True` |

### Python ClaudeSDKClient
```python
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions

async with ClaudeSDKClient(options=ClaudeAgentOptions(...)) as client:
    await client.query("First question")
    async for message in client.receive_response():
        print(message)

    await client.query("Follow-up")  # Same session automatically
    async for message in client.receive_response():
        print(message)
```

### Session Resume
```python
# Capture session ID
session_id = None
async for message in query(prompt="Analyze auth", options=...):
    if isinstance(message, ResultMessage):
        session_id = message.session_id

# Resume later
async for message in query(
    prompt="Now refactor it",
    options=ClaudeAgentOptions(resume=session_id),
):
    ...
```

### Session Fork
```python
async for message in query(
    prompt="Try OAuth2 approach instead",
    options=ClaudeAgentOptions(resume=session_id, fork_session=True),
):
    ...  # New session, original untouched
```

---

## 12. Subagents

### Programmatic Definition
```python
from claude_agent_sdk import AgentDefinition

options = ClaudeAgentOptions(
    allowed_tools=["Read", "Grep", "Glob", "Agent"],  # Agent tool required
    agents={
        "code-reviewer": AgentDefinition(
            description="Expert code reviewer for quality and security reviews.",
            prompt="You are a code review specialist...",
            tools=["Read", "Glob", "Grep"],  # Restricted tool set
            model="sonnet",  # Model override: sonnet, opus, haiku, inherit
        ),
    },
)
```

### AgentDefinition Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | `string` | Yes | When to use this agent |
| `prompt` | `string` | Yes | Agent's system prompt |
| `tools` | `list[str]` | No | Allowed tools (inherits all if omitted) |
| `model` | `"sonnet"/"opus"/"haiku"/"inherit"` | No | Model override |

### Key Properties
- Subagents have isolated context windows (no parent history)
- Parent receives only subagent's final message
- Subagents cannot spawn their own subagents
- `parent_tool_use_id` field identifies messages from subagents
- Subagents can be resumed via agent ID

---

## 13. Streaming

### Output Streaming
```python
from claude_agent_sdk import ClaudeAgentOptions
from claude_agent_sdk.types import StreamEvent

options = ClaudeAgentOptions(include_partial_messages=True)

async for message in query(prompt="...", options=options):
    if isinstance(message, StreamEvent):
        event = message.event
        if event.get("type") == "content_block_delta":
            delta = event.get("delta", {})
            if delta.get("type") == "text_delta":
                print(delta.get("text", ""), end="", flush=True)
```

### Input Streaming (Interactive Sessions)
```python
async def message_generator():
    yield {"type": "user", "message": {"role": "user", "content": "First message"}}
    await asyncio.sleep(1)
    yield {"type": "user", "message": {"role": "user", "content": "Follow-up"}}

async for message in query(prompt=message_generator(), options=...):
    ...
```

---

## 14. Structured Output

```python
from pydantic import BaseModel

class FeaturePlan(BaseModel):
    feature_name: str
    summary: str
    steps: list[dict]
    risks: list[str]

options = ClaudeAgentOptions(
    output_format={
        "type": "json_schema",
        "schema": FeaturePlan.model_json_schema(),
    }
)

async for message in query(prompt="Plan dark mode", options=options):
    if isinstance(message, ResultMessage) and message.structured_output:
        plan = FeaturePlan.model_validate(message.structured_output)
```

---

## 15. Error Handling

### Python Error Types
- `ClaudeSDKError` - Base exception
- `CLINotFoundError` - Claude Code CLI not found
- `CLIConnectionError` - Connection failed
- `ProcessError` - Process failed (has `exit_code`, `stderr`)
- `CLIJSONDecodeError` - JSON parsing failed

### Result Error Handling
```python
if isinstance(message, ResultMessage):
    if message.subtype == "success":
        print(message.result)
    elif message.subtype == "error_max_turns":
        print(f"Hit turn limit. Resume: {message.session_id}")
    elif message.subtype == "error_max_budget_usd":
        print("Hit budget limit")
    elif message.subtype == "error_during_execution":
        print("Execution error")

    if message.total_cost_usd is not None:
        print(f"Cost: ${message.total_cost_usd:.4f}")
```

---

## 16. Cost Tracking

### Total Cost
```python
async for message in query(prompt="..."):
    if isinstance(message, ResultMessage):
        print(f"Cost: ${message.total_cost_usd or 0}")
        print(f"Input tokens: {message.usage.get('input_tokens', 0)}")
        print(f"Output tokens: {message.usage.get('output_tokens', 0)}")
        print(f"Cache read: {message.usage.get('cache_read_input_tokens', 0)}")
        print(f"Cache creation: {message.usage.get('cache_creation_input_tokens', 0)}")
```

### TypeScript Per-Model Breakdown
```typescript
if (message.type === "result") {
  for (const [model, usage] of Object.entries(message.modelUsage)) {
    console.log(`${model}: $${usage.costUSD.toFixed(4)}`);
  }
}
```

---

## 17. File Checkpointing

Enable tracking of file changes for rewind capability:

```python
options = ClaudeAgentOptions(
    enable_file_checkpointing=True,
    permission_mode="acceptEdits",
    extra_args={"replay-user-messages": None},  # Required for checkpoint UUIDs
)

# Capture checkpoint UUID from UserMessage.uuid
# Later: client.rewind_files(checkpoint_id)
```

Only tracks changes made through Write, Edit, and NotebookEdit tools (not Bash).

---

## 18. TypeScript V2 Preview (Unstable)

Simplified interface with session-based send/stream patterns:

```typescript
import { unstable_v2_createSession, unstable_v2_prompt } from "@anthropic-ai/claude-agent-sdk";

// One-shot
const result = await unstable_v2_prompt("What is 2 + 2?", { model: "claude-opus-4-6" });

// Session
await using session = unstable_v2_createSession({ model: "claude-opus-4-6" });
await session.send("Hello!");
for await (const msg of session.stream()) {
  // Process messages
}

// Resume
await using resumed = unstable_v2_resumeSession(sessionId, { model: "claude-opus-4-6" });
```

---

## 19. Hosting & Deployment

### System Requirements
- Python 3.10+ or Node.js 18+
- ~1 GiB RAM, 5 GiB disk, 1 CPU per instance
- Outbound HTTPS to api.anthropic.com

### Deployment Patterns
1. **Ephemeral Sessions** - New container per task, destroyed when complete
2. **Long-Running Sessions** - Persistent containers for proactive agents
3. **Hybrid Sessions** - Ephemeral containers hydrated with session history
4. **Single Containers** - Multiple agents in one container (for simulations)

### Sandbox Providers
- Modal Sandbox, Cloudflare Sandboxes, Daytona, E2B, Fly Machines, Vercel Sandbox

### Security Features
- Programmatic sandbox configuration
- Container isolation (Docker, gVisor, Firecracker VMs)
- Network controls (proxy pattern for credential injection)
- Filesystem restrictions (read-only mounts, tmpfs)
- Permission system with hooks

---

## 20. Migration from Claude Code SDK

### Package Changes
| Aspect | Old | New |
|--------|-----|-----|
| TS Package | `@anthropic-ai/claude-code` | `@anthropic-ai/claude-agent-sdk` |
| Python Package | `claude-code-sdk` | `claude-agent-sdk` |
| Python Options | `ClaudeCodeOptions` | `ClaudeAgentOptions` |
| Python Import | `from claude_code_sdk import ...` | `from claude_agent_sdk import ...` |

### Breaking Changes
1. **System prompt no longer default** - Must explicitly use `system_prompt={"type": "preset", "preset": "claude_code"}` to get Claude Code's prompt
2. **Settings sources no longer loaded** - Must set `setting_sources=["user", "project", "local"]` to load filesystem settings
3. **ClaudeCodeOptions renamed** to ClaudeAgentOptions (Python)

---

## 21. Skills

Skills are specialized capabilities defined as `SKILL.md` files in `.claude/skills/` directories. They are automatically discovered and invoked by Claude when relevant.

**Requirements:**
- Include `"Skill"` in `allowed_tools`
- Set `setting_sources=["user", "project"]` to load from filesystem
- Skills must be filesystem artifacts (not programmatic)

---

## 22. Plugins

Plugins extend Claude Code with custom commands, agents, skills, hooks, and MCP servers.

```python
options = ClaudeAgentOptions(
    plugins=[
        {"type": "local", "path": "./my-plugin"},
        {"type": "local", "path": "/absolute/path/to/plugin"},
    ]
)
```

Plugin directory structure:
```
my-plugin/
  .claude-plugin/plugin.json  # Required manifest
  skills/                      # Agent skills
  agents/                      # Custom agents
  hooks/                       # Event handlers
  .mcp.json                   # MCP server definitions
```

---

## 23. Advanced Features

### Thinking Configuration
```python
# Adaptive thinking
options = ClaudeAgentOptions(thinking={"type": "adaptive"})

# Enabled with budget
options = ClaudeAgentOptions(thinking={"type": "enabled", "budget_tokens": 10000})

# Disabled
options = ClaudeAgentOptions(thinking={"type": "disabled"})
```

### Extended Context (1M tokens)
```python
options = ClaudeAgentOptions(betas=["context-1m-2025-08-07"])
```

### Dynamic Permission Changes
```python
q = query(prompt="...", options=ClaudeAgentOptions(permission_mode="default"))
await q.set_permission_mode("acceptEdits")
```

### Dynamic Model Changes (ClaudeSDKClient)
```python
await client.set_model("claude-sonnet-4-6")
```

### Dynamic MCP Server Management
```python
await client.add_mcp_server("github", {"command": "npx", "args": [...]})
await client.remove_mcp_server("github")
status = await client.get_mcp_status()
```

### Interrupts
```python
await client.interrupt()  # Send interrupt signal
```

### Context Compaction
Automatic when context approaches limit. Customizable via:
- CLAUDE.md summarization instructions
- PreCompact hook
- Manual `/compact` slash command

---

## Sources

### Official Documentation (High Authority)
- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) - Primary documentation hub
- [Quickstart](https://platform.claude.com/docs/en/agent-sdk/quickstart) - Getting started guide
- [TypeScript SDK Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) - Complete TS API reference
- [Python SDK Reference](https://platform.claude.com/docs/en/agent-sdk/python) - Complete Python API reference
- [TypeScript V2 Preview](https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview) - V2 interface preview
- [Hooks](https://platform.claude.com/docs/en/agent-sdk/hooks) - Hook system documentation
- [MCP](https://platform.claude.com/docs/en/agent-sdk/mcp) - MCP integration guide
- [Permissions](https://platform.claude.com/docs/en/agent-sdk/permissions) - Permission system
- [Sessions](https://platform.claude.com/docs/en/agent-sdk/sessions) - Session management
- [Subagents](https://platform.claude.com/docs/en/agent-sdk/subagents) - Subagent patterns
- [Custom Tools](https://platform.claude.com/docs/en/agent-sdk/custom-tools) - Custom tool creation
- [Streaming](https://platform.claude.com/docs/en/agent-sdk/streaming-output) - Output streaming
- [Agent Loop](https://platform.claude.com/docs/en/agent-sdk/agent-loop) - Loop architecture
- [User Input](https://platform.claude.com/docs/en/agent-sdk/user-input) - Approval and input handling
- [Structured Outputs](https://platform.claude.com/docs/en/agent-sdk/structured-outputs) - Typed JSON responses
- [Cost Tracking](https://platform.claude.com/docs/en/agent-sdk/cost-tracking) - Usage monitoring
- [File Checkpointing](https://platform.claude.com/docs/en/agent-sdk/file-checkpointing) - File rewind
- [Hosting](https://platform.claude.com/docs/en/agent-sdk/hosting) - Deployment guide
- [Secure Deployment](https://platform.claude.com/docs/en/agent-sdk/secure-deployment) - Security hardening
- [Migration Guide](https://platform.claude.com/docs/en/agent-sdk/migration-guide) - SDK migration
- [Skills](https://platform.claude.com/docs/en/agent-sdk/skills) - Agent skills
- [Plugins](https://platform.claude.com/docs/en/agent-sdk/plugins) - Plugin system

### GitHub Repositories (High Authority)
- [Python SDK](https://github.com/anthropics/claude-agent-sdk-python) - v0.1.48, 5416 stars, MIT License
- [TypeScript SDK](https://github.com/anthropics/claude-agent-sdk-typescript) - v0.2.76, 958 stars
- [Demo Examples](https://github.com/anthropics/claude-agent-sdk-demos) - Official examples

### Package Registries (High Authority)
- [NPM: @anthropic-ai/claude-agent-sdk](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) - v0.2.76
- [PyPI: claude-agent-sdk](https://pypi.org/project/claude-agent-sdk/) - v0.1.48

### Blog Posts (High Authority)
- [Building Agents with the Claude Agent SDK](https://claude.com/blog/building-agents-with-the-claude-agent-sdk) - Anthropic engineering blog

### Community Resources (Medium Authority)
- [Claude Lab Guide](https://claudelab.net/en/articles/api-sdk/agent-sdk-guide) - Comprehensive third-party guide, dated 2026-03-10
- [DataCamp Tutorial](https://www.datacamp.com/tutorial/how-to-use-claude-agent-sdk) - Tutorial, dated 2025-09-29
- [Promptfoo Integration](https://www.promptfoo.dev/docs/providers/claude-agent-sdk/) - Eval integration
- [LiteLLM Integration](https://docs.litellm.ai/docs/tutorials/claude_agent_sdk) - Multi-provider proxy
- [OpenRouter Integration](https://openrouter.ai/docs/guides/community/anthropic-agent-sdk) - OpenRouter guide
- [Arize Phoenix](https://arize.com/docs/phoenix/integrations/typescript/claude-agent-sdk) - Observability integration

---

## Confidence Assessment

- **Overall Confidence:** HIGH - All content sourced from official Anthropic documentation and verified GitHub repositories.
- **Areas of High Confidence:** Installation, core API, configuration options, hooks, MCP, permissions, sessions, subagents, hosting.
- **Areas of Moderate Confidence:** TypeScript V2 preview (unstable, may change), some advanced features like file checkpointing.
- **Areas of Lower Confidence:** Pricing details (not covered in SDK docs, varies by model), exact behavior differences between Python and TypeScript SDKs in edge cases.
- **No Conflicting Information Found:** All sources are consistent regarding API patterns and capabilities.
- **Recommendation:** This report covers the full official documentation surface. For implementation specifics, consult the TypeScript and Python SDK reference pages directly.
