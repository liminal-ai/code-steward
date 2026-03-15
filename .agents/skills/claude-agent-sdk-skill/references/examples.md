# Full Examples

## WebSocket Chat Session

Long-running chat with persistent context via message queue:

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
        yield await new Promise<any>((resolve) => { this.waiting = resolve; });
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

// Usage
const session = new AgentSession();
session.sendMessage("Hello!");

for await (const msg of session.getOutputStream()) {
  if (msg.type === "assistant") {
    for (const block of msg.message.content) {
      if (block.type === "text") broadcast({ type: "text", content: block.text });
    }
  }
}
```

---

## Reusable AIClient Wrapper

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import * as path from "path";

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
  private defaults: AIQueryOptions;

  constructor(options?: Partial<AIQueryOptions>) {
    this.defaults = {
      maxTurns: 100,
      cwd: path.join(process.cwd(), "agent"),
      model: "opus",
      allowedTools: [
        "Agent", "Bash", "Glob", "Grep", "Read", "Edit",
        "Write", "WebFetch", "TodoWrite", "WebSearch",
      ],
      settingSources: ["local", "project"],
      ...options,
    };
  }

  async *queryStream(prompt: string | AsyncIterable<any>, options?: Partial<AIQueryOptions>) {
    for await (const msg of query({ prompt, options: { ...this.defaults, ...options } })) {
      yield msg;
    }
  }

  async querySingle(prompt: string, options?: Partial<AIQueryOptions>) {
    const messages: any[] = [];
    let cost = 0, duration = 0;

    for await (const msg of this.queryStream(prompt, options)) {
      messages.push(msg);
      if (msg.type === "result" && msg.subtype === "success") {
        cost = msg.total_cost_usd;
        duration = msg.duration_ms;
      }
    }
    return { messages, cost, duration };
  }
}

// Usage
const client = new AIClient({ model: "sonnet" });
const { cost, duration } = await client.querySingle("Fix the auth bug");
console.log(`Cost: $${cost.toFixed(4)}, Duration: ${duration}ms`);
```

---

## Multi-Agent Research System

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const options = {
  permissionMode: "bypassPermissions" as const,
  systemPrompt: "You coordinate research by delegating to specialized subagents.",
  allowedTools: ["Agent"],
  model: "sonnet",
  agents: {
    researcher: {
      description: "Gather research using web search.",
      tools: ["WebSearch", "Write"],
      prompt: "Search thoroughly and save findings.",
      model: "haiku",
    },
    analyst: {
      description: "Analyze research data and create visualizations.",
      tools: ["Glob", "Read", "Bash", "Write"],
      prompt: "Extract metrics and generate charts.",
      model: "haiku",
    },
    writer: {
      description: "Create formal reports from research.",
      tools: ["Write", "Glob", "Read", "Bash"],
      prompt: "Synthesize into professional reports.",
      model: "haiku",
    },
  },
  hooks: {
    PreToolUse: [{
      hooks: [async (input: any) => {
        console.log(`[Tool] ${input.tool_name}`);
        return { async_: true };
      }],
    }],
  },
};

for await (const msg of query({ prompt: "Research quantum computing in 2025", options })) {
  if (msg.type === "result") console.log(msg.result);
}
```

---

## Email Classifier with Structured Output

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

interface Classification {
  category: "urgent" | "newsletter" | "personal" | "work" | "spam";
  priority: "high" | "normal" | "low";
  suggestedAction: "archive" | "star" | "label" | "none";
  suggestedLabels?: string[];
}

async function classifyEmail(email: { from: string; subject: string; body: string }) {
  for await (const msg of query({
    prompt: `Classify: From=${email.from}, Subject=${email.subject}, Body=${email.body.slice(0, 500)}`,
    options: {
      model: "haiku",
      outputFormat: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["urgent", "newsletter", "personal", "work", "spam"] },
            priority: { type: "string", enum: ["high", "normal", "low"] },
            suggestedAction: { type: "string", enum: ["archive", "star", "label", "none"] },
            suggestedLabels: { type: "array", items: { type: "string" } },
          },
          required: ["category", "priority", "suggestedAction"],
        },
      },
    },
  })) {
    if (msg.type === "result") return msg.structuredOutput as Classification;
  }
}
```
