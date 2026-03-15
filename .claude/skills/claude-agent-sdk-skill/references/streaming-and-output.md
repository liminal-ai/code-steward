# Streaming & Structured Output

## Output Streaming

Enable `includePartialMessages` to receive real-time `StreamEvent` messages:

```typescript
for await (const msg of query({
  prompt: "Explain this code",
  options: { includePartialMessages: true, allowedTools: ["Read"] },
})) {
  if (msg.type === "stream_event") {
    const event = msg.event;
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      process.stdout.write(event.delta.text);
    }
  } else if (msg.type === "result") {
    console.log(`\nCost: $${msg.totalCostUsd?.toFixed(4)}`);
  }
}
```

---

## StreamEvent Types

| Event | Description |
|-------|-------------|
| `content_block_start` | New content block beginning |
| `content_block_delta` | Incremental update |
| `content_block_stop` | Content block end |
| `message_start` | New message beginning |
| `message_delta` | Message-level update |
| `message_stop` | Message end |

### Delta Subtypes

| Delta Type | Contains |
|------------|----------|
| `text_delta` | `text` — incremental text |
| `input_json_delta` | `partial_json` — incremental tool input |
| `thinking_delta` | `thinking` — incremental thinking |

---

## Input Streaming (Interactive Sessions)

Send messages as an async generator for multi-turn patterns:

```typescript
async function* messageGenerator() {
  yield { type: "user", message: { role: "user", content: "Analyze auth.ts" } };
  // Wait for condition...
  await new Promise((r) => setTimeout(r, 5000));
  yield { type: "user", message: { role: "user", content: "Now fix the bug" } };
}

for await (const msg of query({
  prompt: messageGenerator(),
  options,
})) { /* ... */ }
```

---

## Streaming vs Non-Streaming

| Use Case | Mode | Setting |
|----------|------|---------|
| Headless / batch | Non-streaming | Default |
| CLI live output | Streaming | `includePartialMessages: true` |
| Web typewriter | Streaming | `includePartialMessages: true` |
| Logging / audit | Non-streaming | Default |

---

## Structured Output with Zod

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
  complexity: z.enum(["low", "medium", "high"]),
});

for await (const msg of query({
  prompt: "Plan a dark mode feature",
  options: {
    outputFormat: { type: "json_schema", schema: zodToJsonSchema(FeaturePlan) },
    allowedTools: ["Read", "Glob", "Grep"],
  },
})) {
  if (msg.type === "result" && msg.structuredOutput) {
    const plan = FeaturePlan.parse(msg.structuredOutput);
    console.log(plan.featureName);
  }
}
```

---

## Raw JSON Schema (Without Zod)

```typescript
const options = {
  outputFormat: {
    type: "json_schema",
    schema: {
      type: "object",
      properties: {
        bugs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              file: { type: "string" },
              line: { type: "integer" },
              severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
              description: { type: "string" },
            },
            required: ["file", "line", "severity", "description"],
          },
        },
        summary: { type: "string" },
      },
      required: ["bugs", "summary"],
    },
  },
};
```

---

## Accessing Structured Output

```typescript
if (msg.type === "result") {
  if (msg.structuredOutput) {
    // Parsed JSON matching schema
    const data = msg.structuredOutput;
  }
  if (msg.result) {
    // Raw text also available
    const text = msg.result;
  }
}
```

If validation fails after retries: `msg.subtype === "error_max_structured_output_retries"`
