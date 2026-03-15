# Cost Tracking

## Total Cost (Python)

```python
from claude_agent_sdk.types import ResultMessage

async for message in query(prompt="...", options=options):
    if isinstance(message, ResultMessage):
        print(f"Total cost: ${message.total_cost_usd or 0:.4f}")
        print(f"Input tokens: {message.usage.get('input_tokens', 0)}")
        print(f"Output tokens: {message.usage.get('output_tokens', 0)}")
        print(f"Cache read tokens: {message.usage.get('cache_read_input_tokens', 0)}")
        print(f"Cache creation tokens: {message.usage.get('cache_creation_input_tokens', 0)}")
```

## Total Cost (TypeScript)

```typescript
if (message.type === "result") {
  console.log(`Total cost: $${message.totalCostUsd?.toFixed(4)}`);
  console.log(`Input tokens: ${message.usage?.inputTokens}`);
  console.log(`Output tokens: ${message.usage?.outputTokens}`);
}
```

---

## Per-Model Breakdown (TypeScript)

```typescript
if (message.type === "result" && message.modelUsage) {
  for (const [model, usage] of Object.entries(message.modelUsage)) {
    console.log(`Model: ${model}`);
    console.log(`  Cost: $${usage.costUSD.toFixed(4)}`);
    console.log(`  Input: ${usage.inputTokens}`);
    console.log(`  Output: ${usage.outputTokens}`);
  }
}
```

---

## Budget Limits

```python
options = ClaudeAgentOptions(
    max_budget_usd=1.00,  # Stop if cost exceeds $1.00
)
```

When the budget is exceeded, the agent stops with `subtype="error_max_budget_usd"`. You can resume to continue:

```python
if message.subtype == "error_max_budget_usd":
    # Resume with additional budget
    async for msg in query(
        prompt="Continue",
        options=ClaudeAgentOptions(
            resume=message.session_id,
            max_budget_usd=0.50,  # Additional budget
        ),
    ):
        ...
```

---

## Cost Optimization Strategies

| Strategy | How | Savings |
|----------|-----|---------|
| Use cheaper models for subagents | `model="haiku"` in AgentDefinition | 10-40x per subagent |
| Limit turns | `max_turns=10` | Prevents runaway loops |
| Set budgets | `max_budget_usd=0.50` | Hard cost cap |
| Restrict tools | Fewer tools = shorter system prompt | Reduces input tokens |
| Use effort levels | `effort="low"` for simple tasks | Fewer output tokens |
| Enable caching | Default behavior | Reduces repeat token costs |
