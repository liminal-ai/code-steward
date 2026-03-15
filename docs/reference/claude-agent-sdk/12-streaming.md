# Streaming

## Output Streaming

Enable `include_partial_messages` to receive real-time `StreamEvent` messages as Claude generates responses:

### Python

```python
from claude_agent_sdk import query, ClaudeAgentOptions
from claude_agent_sdk.types import StreamEvent

options = ClaudeAgentOptions(
    include_partial_messages=True,
    allowed_tools=["Read", "Edit"],
)

async for message in query(prompt="Explain this code", options=options):
    if isinstance(message, StreamEvent):
        event = message.event
        if event.get("type") == "content_block_delta":
            delta = event.get("delta", {})
            if delta.get("type") == "text_delta":
                print(delta.get("text", ""), end="", flush=True)
    elif isinstance(message, ResultMessage):
        print(f"\n\nDone. Cost: ${message.total_cost_usd:.4f}")
```

### TypeScript

```typescript
for await (const message of query({
  prompt: "Explain this code",
  options: {
    includePartialMessages: true,
    allowedTools: ["Read", "Edit"],
  },
})) {
  if (message.type === "stream_event") {
    const event = message.event;
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      process.stdout.write(event.delta.text);
    }
  } else if (message.type === "result") {
    console.log(`\n\nDone. Cost: $${message.totalCostUsd?.toFixed(4)}`);
  }
}
```

---

## StreamEvent Types

| Event Type | Description |
|------------|-------------|
| `content_block_start` | Beginning of a new content block |
| `content_block_delta` | Incremental content update |
| `content_block_stop` | End of a content block |
| `message_start` | Beginning of a new message |
| `message_delta` | Message-level update |
| `message_stop` | End of message |

### Delta Subtypes

| Delta Type | Contains |
|------------|----------|
| `text_delta` | `text` - incremental text content |
| `input_json_delta` | `partial_json` - incremental tool input JSON |
| `thinking_delta` | `thinking` - incremental thinking content |

---

## Input Streaming (Interactive Sessions)

Send messages as an async generator for interactive multi-turn patterns:

### Python

```python
async def message_generator():
    yield {"type": "user", "message": {"role": "user", "content": "Analyze auth.py"}}
    # Wait for some condition...
    await asyncio.sleep(5)
    yield {"type": "user", "message": {"role": "user", "content": "Now fix the bug you found"}}

async for message in query(prompt=message_generator(), options=options):
    if isinstance(message, ResultMessage):
        print(message.result)
```

---

## Non-Streaming Mode

By default (without `include_partial_messages`), you only receive complete messages:

```python
# Only AssistantMessage, UserMessage, SystemMessage, ResultMessage
# No StreamEvent messages
async for message in query(prompt="...", options=options):
    if isinstance(message, AssistantMessage):
        # Full message, not incremental
        print(message.content)
```

---

## Streaming vs Non-Streaming Decision

| Use Case | Mode | Setting |
|----------|------|---------|
| Headless/batch processing | Non-streaming | Default (no setting needed) |
| CLI with live output | Streaming | `include_partial_messages=True` |
| Web app with typewriter effect | Streaming | `include_partial_messages=True` |
| Logging/audit | Non-streaming | Default |
| Interactive chat UI | Streaming | `include_partial_messages=True` |
