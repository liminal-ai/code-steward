---
source: https://platform.claude.com/docs/en/agent-sdk/agent-loop
scraped_at: 2026-03-14
title: How the Agent Loop Works
---

# How the Agent Loop Works

The Agent SDK lets you embed Claude Code's autonomous agent loop in your own applications. When you start an agent, the SDK runs the same execution loop that powers Claude Code: Claude evaluates your prompt, calls tools to take action, receives the results, and repeats until the task is complete.

## The Loop at a Glance

Every agent session follows the same cycle:

1. **Receive prompt.** Claude receives your prompt, along with the system prompt, tool definitions, and conversation history. The SDK yields a `SystemMessage` with subtype `"init"` containing session metadata.
2. **Evaluate and respond.** Claude evaluates the current state and determines how to proceed. It may respond with text, request one or more tool calls, or both. The SDK yields an `AssistantMessage`.
3. **Execute tools.** The SDK runs each requested tool and collects the results. You can use [hooks](./hooks.md) to intercept, modify, or block tool calls before they run.
4. **Repeat.** Steps 2 and 3 repeat as a cycle. Each full cycle is one turn. Claude continues calling tools and processing results until it produces a response with no tool calls.
5. **Return result.** The SDK yields a final `AssistantMessage` with the text response (no tool calls), followed by a `ResultMessage` with the final text, token usage, cost, and session ID.

## Turns and Messages

A turn is one round trip inside the loop: Claude produces output that includes tool calls, the SDK executes those tools, and the results feed back to Claude automatically.

**Example session for "Fix the failing tests in auth.ts":**
1. **Turn 1:** Claude calls `Bash` to run `npm test`. SDK yields `AssistantMessage`, executes command, yields `UserMessage` with output.
2. **Turn 2:** Claude calls `Read` on `auth.ts` and `auth.test.ts`. SDK returns file contents.
3. **Turn 3:** Claude calls `Edit` to fix `auth.ts`, then calls `Bash` to re-run `npm test`. All tests pass.
4. **Final turn:** Claude produces text-only response with no tool calls: "Fixed the auth bug, all three tests pass now."

You can cap the loop with `max_turns` / `maxTurns` (counts tool-use turns only) or `max_budget_usd` / `maxBudgetUsd`.

## Message Types

As the loop runs, the SDK yields a stream of messages:

- **`SystemMessage`:** session lifecycle events. `subtype: "init"` is the first message; `subtype: "compact_boundary"` fires after compaction.
- **`AssistantMessage`:** emitted after each Claude response. Contains text content blocks and tool call blocks.
- **`UserMessage`:** emitted after each tool execution with the tool result content sent back to Claude.
- **`StreamEvent`:** only emitted when partial messages are enabled. Contains raw API streaming events.
- **`ResultMessage`:** the last message, always. Contains the final text result, token usage, cost, and session ID.

**Checking message types:**
- **Python:** use `isinstance()` — e.g., `isinstance(message, ResultMessage)`
- **TypeScript:** check the `type` string field — e.g., `message.type === "result"`. Note: `AssistantMessage` content is at `message.message.content`.

## Tool Execution

### Built-in Tools

| Category | Tools | What they do |
| --- | --- | --- |
| **File operations** | `Read`, `Edit`, `Write` | Read, modify, and create files |
| **Search** | `Glob`, `Grep` | Find files by pattern, search content with regex |
| **Execution** | `Bash` | Run shell commands, scripts, git operations |
| **Web** | `WebSearch`, `WebFetch` | Search the web, fetch and parse pages |
| **Discovery** | `ToolSearch` | Dynamically find and load tools on-demand |
| **Orchestration** | `Agent`, `Skill`, `AskUserQuestion`, `TodoWrite` | Spawn subagents, invoke skills, ask the user, track tasks |

Beyond built-in tools:
- **Connect external services** with [MCP servers](./mcp.md)
- **Define custom tools** with [custom tool handlers](./custom-tools.md)
- **Load project skills** via [setting sources](./modifying-system-prompts.md)

### Parallel Tool Execution

When Claude requests multiple tool calls in a single turn:
- Read-only tools (`Read`, `Glob`, `Grep`, and read-only MCP tools) can run concurrently
- Tools that modify state (`Edit`, `Write`, `Bash`) run sequentially to avoid conflicts
- Custom tools default to sequential. Mark as read-only with `readOnly` (TypeScript) or `readOnlyHint` (Python)

## Control How the Loop Runs

### Turns and Budget

| Option | What it controls | Default |
| --- | --- | --- |
| `max_turns` / `maxTurns` | Maximum tool-use round trips | No limit |
| `max_budget_usd` / `maxBudgetUsd` | Maximum cost before stopping | No limit |

### Effort Level

Controls how much reasoning Claude applies. Not all models support this.

| Level | Behavior | Good for |
| --- | --- | --- |
| `"low"` | Minimal reasoning, fast responses | File lookups, listing directories |
| `"medium"` | Balanced reasoning | Routine edits, standard tasks |
| `"high"` | Thorough analysis | Refactors, debugging |
| `"max"` | Maximum reasoning depth | Multi-step problems requiring deep analysis |

Python SDK default: unset (defers to model default). TypeScript SDK default: `"high"`.

### Permission Mode

| Mode | Behavior |
| --- | --- |
| `"default"` | Tools not covered by allow rules trigger your approval callback |
| `"acceptEdits"` | Auto-approves file edits |
| `"plan"` | No tool execution; Claude produces a plan for review |
| `"dontAsk"` (TypeScript only) | Never prompts; everything not pre-approved is denied |
| `"bypassPermissions"` | Runs all allowed tools without asking. Use only in isolated environments. Cannot be used as root on Unix. |

## The Context Window

The context window accumulates across turns within a session: system prompt, tool definitions, conversation history, tool inputs, and tool outputs. Content that stays the same (system prompt, tool definitions, CLAUDE.md) is automatically prompt cached.

### What Consumes Context

| Source | When it loads | Impact |
| --- | --- | --- |
| **System prompt** | Every request | Small fixed cost |
| **CLAUDE.md files** | Session start (with `settingSources` enabled) | Full content, but prompt-cached |
| **Tool definitions** | Every request | Each tool adds its schema |
| **Conversation history** | Accumulates over turns | Grows with each turn |
| **Skill descriptions** | Session start (with setting sources enabled) | Short summaries; full content loads on invocation |

### Automatic Compaction

When the context window approaches its limit, the SDK automatically compacts the conversation by summarizing older history. The SDK emits a `SystemMessage` with subtype `"compact_boundary"` when this happens.

Customization options:
- **CLAUDE.md instructions**: include a section telling the compactor what to preserve
- **`PreCompact` hook**: run custom logic before compaction (e.g., archive full transcript)
- **Manual compaction**: send `/compact` as a prompt string

### Keep Context Efficient

- **Use subagents for subtasks**: each subagent starts fresh; only its final response returns to parent
- **Be selective with tools**: use `tools` field on `AgentDefinition` to scope subagents
- **Watch MCP server costs**: each server adds all its tool schemas to every request
- **Use lower effort for routine tasks**: reduces token usage and cost

## Handle the Result

The `ResultMessage` `subtype` field is the primary way to check termination state:

| Result subtype | What happened | `result` field available? |
| --- | --- | --- |
| `success` | Claude finished the task normally | Yes |
| `error_max_turns` | Hit the `maxTurns` limit | No |
| `error_max_budget_usd` | Hit the `maxBudgetUsd` limit | No |
| `error_during_execution` | An error interrupted the loop | No |
| `error_max_structured_output_retries` | Structured output validation failed | No |

Always check the subtype before reading `result`. All result subtypes carry `total_cost_usd`, `usage`, `num_turns`, and `session_id`.

The `stop_reason` field indicates why the model stopped: `end_turn`, `max_tokens`, or `refusal`.

## Complete Example

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

async def run_agent():
    session_id = None

    async for message in query(
        prompt="Find and fix the bug causing test failures in the auth module",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit", "Bash", "Glob", "Grep"],
            setting_sources=["project"],  # Load CLAUDE.md, skills, hooks
            max_turns=30,
            effort="high",
        ),
    ):
        if isinstance(message, ResultMessage):
            session_id = message.session_id  # Save for potential resumption

            if message.subtype == "success":
                print(f"Done: {message.result}")
            elif message.subtype == "error_max_turns":
                print(f"Hit turn limit. Resume session {session_id} to continue.")
            elif message.subtype == "error_max_budget_usd":
                print("Hit budget limit.")
            else:
                print(f"Stopped: {message.subtype}")
            if message.total_cost_usd is not None:
                print(f"Cost: ${message.total_cost_usd:.4f}")

asyncio.run(run_agent())
```
