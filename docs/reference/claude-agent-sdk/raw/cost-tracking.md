---
source: https://platform.claude.com/docs/en/agent-sdk/cost-tracking
scraped_at: 2026-03-14
title: Track Cost and Usage
---

# Track Cost and Usage

The Claude Agent SDK provides detailed token usage information for each interaction with Claude.

## Understand Token Usage

The TypeScript and Python SDKs expose usage data at different levels:

- **TypeScript**: per-step token breakdowns on each assistant message, per-model cost via `modelUsage`, and a cumulative total on the result message.
- **Python**: accumulated total on the result message (`total_cost_usd` and `usage` dict). Per-step breakdowns are not available on individual assistant messages.

Key scoping concepts:
- **`query()` call**: one invocation of the SDK's `query()` function. Produces one `result` message at the end.
- **Step**: a single request/response cycle within a `query()` call. In TypeScript, each step produces assistant messages with token usage.
- **Session**: a series of `query()` calls linked by a session ID. Each call reports its own cost independently.

## Get the Total Cost of a Query

The result message is the last message in every `query()` call. It includes `total_cost_usd`, the cumulative cost across all steps.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({ prompt: "Summarize this project" })) {
  if (message.type === "result") {
    console.log(`Total cost: $${message.total_cost_usd}`);
  }
}
```

```python
import asyncio
from claude_agent_sdk import query, ResultMessage

async def main():
    async for message in query(prompt="Summarize this project"):
        if isinstance(message, ResultMessage):
            if message.total_cost_usd is not None:
                print(f"Total cost: ${message.total_cost_usd:.4f}")

asyncio.run(main())
```

## Track Detailed Usage in TypeScript

### Track Per-Step Usage

When Claude uses multiple tools in one turn, all messages in that turn share the same `id`. Deduplicate by ID to avoid double-counting.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const seenIds = new Set<string>();
let totalInputTokens = 0;
let totalOutputTokens = 0;

for await (const message of query({ prompt: "Summarize this project" })) {
  if (message.type === "assistant") {
    const msgId = message.message.id;

    // Parallel tool calls share the same ID, only count once
    if (!seenIds.has(msgId)) {
      seenIds.add(msgId);
      totalInputTokens += message.message.usage.input_tokens;
      totalOutputTokens += message.message.usage.output_tokens;
    }
  }
}

console.log(`Steps: ${seenIds.size}`);
console.log(`Input tokens: ${totalInputTokens}`);
console.log(`Output tokens: ${totalOutputTokens}`);
```

### Break Down Usage Per Model

The result message includes `modelUsage`, a map of model name to per-model token counts and cost:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({ prompt: "Summarize this project" })) {
  if (message.type !== "result") continue;

  for (const [modelName, usage] of Object.entries(message.modelUsage)) {
    console.log(`${modelName}: $${usage.costUSD.toFixed(4)}`);
    console.log(`  Input tokens: ${usage.inputTokens}`);
    console.log(`  Output tokens: ${usage.outputTokens}`);
    console.log(`  Cache read: ${usage.cacheReadInputTokens}`);
    console.log(`  Cache creation: ${usage.cacheCreationInputTokens}`);
  }
}
```

## Accumulate Costs Across Multiple Calls

Each `query()` call returns its own `total_cost_usd`. The SDK does not provide a session-level total, so accumulate totals yourself.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

let totalSpend = 0;

const prompts = [
  "Read the files in src/ and summarize the architecture",
  "List all exported functions in src/auth.ts"
];

for (const prompt of prompts) {
  for await (const message of query({ prompt })) {
    if (message.type === "result") {
      totalSpend += message.total_cost_usd ?? 0;
      console.log(`This call: $${message.total_cost_usd}`);
    }
  }
}

console.log(`Total spend: $${totalSpend.toFixed(4)}`);
```

## Handle Errors, Caching, and Token Discrepancies

### Track Costs on Failed Conversations

Both success and error result messages include `usage` and `total_cost_usd`. Always read cost data from the result message regardless of its `subtype`.

### Track Cache Tokens

The Agent SDK automatically uses prompt caching to reduce costs. The usage object includes:
- `cache_creation_input_tokens`: tokens used to create new cache entries (charged at higher rate)
- `cache_read_input_tokens`: tokens read from existing cache entries (charged at reduced rate)

In Python:
```python
if isinstance(message, ResultMessage):
    cache_read = message.usage.get("cache_read_input_tokens", 0) if message.usage else 0
    cache_created = message.usage.get("cache_creation_input_tokens", 0) if message.usage else 0
    print(f"Cache read: {cache_read}, Cache created: {cache_created}")
```

### Resolve Output Token Discrepancies

In rare cases, you might observe different `output_tokens` values for messages with the same ID. When this occurs:
1. **Use the highest value**: the final message in a group typically contains the accurate total
2. **Verify against total cost**: the `total_cost_usd` in the result message is authoritative
3. **Report inconsistencies**: file issues at the [Claude Code GitHub repository](https://github.com/anthropics/claude-code/issues)
