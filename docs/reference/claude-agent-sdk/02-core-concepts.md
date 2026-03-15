# Core Concepts

## The Agent Loop

The SDK runs the same execution loop that powers Claude Code:

```
┌──────────────┐
│ 1. Receive   │ ← Your prompt, system prompt, tool definitions, history
│    Prompt    │
└──────┬───────┘
       │
┌──────▼───────┐
│ 2. Claude    │ ← Claude responds with text and/or tool call requests
│    Responds  │
└──────┬───────┘
       │
┌──────▼───────┐
│ 3. Execute   │ ← SDK runs tools, collects results
│    Tools     │
└──────┬───────┘
       │
       │ ← Steps 2-3 repeat (each cycle = one "turn")
       │
┌──────▼───────┐
│ 4. Return    │ ← Final ResultMessage with text, cost, usage, session ID
│    Result    │
└──────────────┘
```

**Turn**: One cycle of Claude responding + tool execution. Controlled by `maxTurns`.

---

## Message Types

Messages yielded by `query()`:

| Type | Description | Key Fields |
|------|-------------|------------|
| `SystemMessage` | Session lifecycle events | `type: "system"`, `subtype: "init" \| "compact_boundary"` |
| `AssistantMessage` | Claude's responses | `type: "assistant"`, `content` (text + tool_use blocks) |
| `UserMessage` | User inputs and tool results | `type: "user"`, `content` (tool_result blocks) |
| `StreamEvent` | Real-time streaming deltas | `type: "stream_event"`, `event` (raw SSE data) |
| `ResultMessage` | Final completion message | `type: "result"`, `result`, `subtype`, `session_id`, `total_cost_usd` |

### Message Flow Example

```
SystemMessage (init)
  → AssistantMessage (Claude decides to use Read tool)
    → UserMessage (tool_result with file contents)
      → AssistantMessage (Claude analyzes and decides to Edit)
        → UserMessage (tool_result confirming edit)
          → AssistantMessage (Claude reports completion)
            → ResultMessage (final result with cost/usage)
```

---

## Result Subtypes

The `ResultMessage.subtype` indicates how the agent completed:

| Subtype | Meaning | Action |
|---------|---------|--------|
| `success` | Task completed normally | Process result |
| `error_max_turns` | Hit `maxTurns` limit | Resume session to continue |
| `error_max_budget_usd` | Hit `maxBudgetUsd` limit | Increase budget or resume |
| `error_during_execution` | Runtime error | Check logs, retry |
| `error_max_structured_output_retries` | Structured output validation failed repeatedly | Fix schema or prompt |

---

## Content Block Types

### AssistantMessage Content
- `text` - Claude's text response
- `tool_use` - Tool call request with `id`, `name`, `input`

### UserMessage Content
- `tool_result` - Tool execution result with `tool_use_id`, `content`

---

## Identifying Subagent Messages

Messages from subagents include a `parent_tool_use_id` field that correlates them to the parent's Agent tool call:

```python
async for message in query(prompt="...", options=options):
    if hasattr(message, "parent_tool_use_id") and message.parent_tool_use_id:
        print(f"Subagent message (parent tool: {message.parent_tool_use_id})")
    else:
        print("Main agent message")
```
