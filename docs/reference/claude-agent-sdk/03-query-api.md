# Query API Reference

## `query()` Function

The primary API. Returns an async generator/iterator that yields messages as the agent works.

### Python Signature

```python
async def query(
    *,
    prompt: str | AsyncIterable[dict[str, Any]],
    options: ClaudeAgentOptions | None = None,
    transport: Transport | None = None,
) -> AsyncIterator[Message]
```

### query() vs ClaudeSDKClient

| Feature | `query()` | `ClaudeSDKClient` |
|---------|-----------|-------------------|
| **Session** | Creates new session each time | Reuses same session |
| **Conversation** | Single exchange | Multiple exchanges in same context |
| **Streaming Input** | Supported | Supported |
| **Interrupts** | Not supported | Supported |
| **Hooks** | Supported | Supported |
| **Custom Tools** | Supported | Supported |
| **Continue Chat** | New session each time | Maintains conversation |
| **Use Case** | One-off tasks | Continuous conversations |

Use `query()` for one-off questions and independent tasks.
Use `ClaudeSDKClient` for continuing conversations, follow-up questions, and interactive applications.

### Python Example

```python
from claude_agent_sdk import query, ClaudeAgentOptions

async for message in query(
    prompt="Your task description",
    options=ClaudeAgentOptions(
        # See 04-configuration.md for all options
    ),
):
    # Process messages
    pass
```

### TypeScript

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Your task description",
  options: {
    // See 04-configuration.md for all options
  }
})) {
  // Process messages
}
```

---

## Processing Messages

### Python Pattern

```python
from claude_agent_sdk import query, ClaudeAgentOptions
from claude_agent_sdk.types import (
    AssistantMessage,
    UserMessage,
    ResultMessage,
    SystemMessage,
    StreamEvent,
)

async for message in query(prompt="...", options=options):
    if isinstance(message, SystemMessage):
        print(f"System: {message.subtype}")

    elif isinstance(message, AssistantMessage):
        for block in message.content:
            if block.get("type") == "text":
                print(f"Claude: {block['text']}")
            elif block.get("type") == "tool_use":
                print(f"Tool call: {block['name']}({block['input']})")

    elif isinstance(message, UserMessage):
        for block in message.content:
            if block.get("type") == "tool_result":
                print(f"Tool result: {block['content'][:100]}")

    elif isinstance(message, ResultMessage):
        print(f"Done: {message.result}")
        print(f"Subtype: {message.subtype}")
        print(f"Session: {message.session_id}")
        print(f"Cost: ${message.total_cost_usd:.4f}")
```

### TypeScript Pattern

```typescript
for await (const message of query({ prompt: "...", options })) {
  switch (message.type) {
    case "system":
      console.log(`System: ${message.subtype}`);
      break;
    case "assistant":
      for (const block of message.content) {
        if (block.type === "text") console.log(`Claude: ${block.text}`);
        if (block.type === "tool_use") console.log(`Tool: ${block.name}`);
      }
      break;
    case "result":
      console.log(`Done: ${message.result}`);
      console.log(`Cost: $${message.totalCostUsd?.toFixed(4)}`);
      break;
  }
}
```

---

## ClaudeSDKClient (Python)

Stateful client for multi-turn conversations within a single process:

```python
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions

async with ClaudeSDKClient(options=ClaudeAgentOptions(
    allowed_tools=["Read", "Edit"],
    permission_mode="acceptEdits",
)) as client:
    # First turn
    await client.query("Analyze the auth module")
    async for message in client.receive_response():
        if hasattr(message, "result"):
            print(message.result)

    # Second turn (same session, full context preserved)
    await client.query("Now refactor the login function")
    async for message in client.receive_response():
        if hasattr(message, "result"):
            print(message.result)
```

### ClaudeSDKClient Methods

| Method | Description |
|--------|-------------|
| `query(prompt)` | Send a new prompt |
| `receive_response()` | Async iterator over response messages |
| `interrupt()` | Send interrupt signal |
| `set_model(model)` | Change model dynamically |
| `set_permission_mode(mode)` | Change permission mode |
| `add_mcp_server(name, config)` | Add MCP server |
| `remove_mcp_server(name)` | Remove MCP server |
| `get_mcp_status()` | Get MCP server status |
| `rewind_files(checkpoint_id)` | Rewind to file checkpoint |

---

## TypeScript V2 Preview (Unstable)

Simplified session-based API:

```typescript
import {
  unstable_v2_createSession,
  unstable_v2_prompt,
  unstable_v2_resumeSession,
} from "@anthropic-ai/claude-agent-sdk";

// One-shot query
const result = await unstable_v2_prompt("What is 2 + 2?", {
  model: "claude-opus-4-6",
});

// Session-based
await using session = unstable_v2_createSession({
  model: "claude-opus-4-6",
});
await session.send("Hello!");
for await (const msg of session.stream()) {
  // Process messages
}

// Resume existing session
await using resumed = unstable_v2_resumeSession(sessionId, {
  model: "claude-opus-4-6",
});
```
