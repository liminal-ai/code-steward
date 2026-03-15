# Structured Output

Force the agent to return typed JSON matching a schema.

## Python with Pydantic

```python
from pydantic import BaseModel
from claude_agent_sdk import query, ClaudeAgentOptions
from claude_agent_sdk.types import ResultMessage

class FeaturePlan(BaseModel):
    feature_name: str
    summary: str
    steps: list[dict]
    risks: list[str]
    estimated_complexity: str

options = ClaudeAgentOptions(
    output_format={
        "type": "json_schema",
        "schema": FeaturePlan.model_json_schema(),
    },
    allowed_tools=["Read", "Glob", "Grep"],
)

async for message in query(prompt="Plan a dark mode feature", options=options):
    if isinstance(message, ResultMessage) and message.structured_output:
        plan = FeaturePlan.model_validate(message.structured_output)
        print(f"Feature: {plan.feature_name}")
        print(f"Summary: {plan.summary}")
        for step in plan.steps:
            print(f"  - {step}")
```

## Python with Raw JSON Schema

```python
options = ClaudeAgentOptions(
    output_format={
        "type": "json_schema",
        "schema": {
            "type": "object",
            "properties": {
                "bugs": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "file": {"type": "string"},
                            "line": {"type": "integer"},
                            "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                            "description": {"type": "string"},
                        },
                        "required": ["file", "line", "severity", "description"],
                    },
                },
                "summary": {"type": "string"},
            },
            "required": ["bugs", "summary"],
        },
    },
)
```

## TypeScript with Zod

```typescript
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const FeaturePlan = z.object({
  featureName: z.string(),
  summary: z.string(),
  steps: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })),
  risks: z.array(z.string()),
});

for await (const message of query({
  prompt: "Plan a dark mode feature",
  options: {
    outputFormat: {
      type: "json_schema",
      schema: zodToJsonSchema(FeaturePlan),
    },
    allowedTools: ["Read", "Glob", "Grep"],
  },
})) {
  if (message.type === "result" && message.structuredOutput) {
    const plan = FeaturePlan.parse(message.structuredOutput);
    console.log(plan.featureName);
  }
}
```

---

## Accessing Structured Output

```python
if isinstance(message, ResultMessage):
    if message.structured_output:
        # Parsed JSON object
        data = message.structured_output
    if message.result:
        # Raw text result (also available)
        text = message.result
```

---

## Error Handling

If the agent fails to produce valid output after retries:

```python
if isinstance(message, ResultMessage):
    if message.subtype == "error_max_structured_output_retries":
        print("Failed to generate valid structured output")
        print(f"Last attempt: {message.result}")
```

---

## Tips

- Keep schemas simple and well-documented with `description` fields
- Use `enum` types to constrain values
- The agent still executes tools normally - structured output only affects the final response
- Combine with `max_turns` to prevent runaway tool usage before returning output
