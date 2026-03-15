# Examples & Patterns

Real-world examples from the official `claude-agent-sdk-demos` repository.

## WebSocket Chat Session (TypeScript)

Long-running chat with persistent context using a message queue pattern:

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
        yield await new Promise<any>((resolve) => {
          this.waiting = resolve;
        });
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

  sendMessage(content: string) {
    this.queue.push(content);
  }

  async *getOutputStream() {
    while (true) {
      const { value, done } = await this.outputIterator.next();
      if (done) break;
      yield value;
    }
  }

  close() { this.queue.close(); }
}

// Usage with WebSocket
const session = new AgentSession();
session.sendMessage("Hello! What can you help me with?");

for await (const message of session.getOutputStream()) {
  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "text") {
        broadcast({ type: "assistant_message", content: block.text });
      } else if (block.type === "tool_use") {
        broadcast({ type: "tool_use", toolName: block.name });
      }
    }
  }
}
```

---

## Multi-Agent Research System (Python)

Orchestrates specialized subagents for research, analysis, and report writing:

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions, AgentDefinition, HookMatcher

async def research_system():
    agents = {
        "researcher": AgentDefinition(
            description="Gather research information using web search.",
            tools=["WebSearch", "Write"],
            prompt="You are a research assistant. Search thoroughly and save findings.",
            model="haiku",
        ),
        "data-analyst": AgentDefinition(
            description="Generate analysis and charts from research notes.",
            tools=["Glob", "Read", "Bash", "Write"],
            prompt="Analyze research data, extract metrics, generate charts.",
            model="haiku",
        ),
        "report-writer": AgentDefinition(
            description="Create formal PDF reports from research and analysis.",
            tools=["Skill", "Write", "Glob", "Read", "Bash"],
            prompt="Synthesize findings into clear, professional PDF reports.",
            model="haiku",
        ),
    }

    # Track tool usage with hooks
    async def log_tool_use(input_data, tool_use_id, context):
        print(f"Tool: {input_data['tool_name']} | Input: {str(input_data['tool_input'])[:100]}")
        return {"async_": True}

    options = ClaudeAgentOptions(
        permission_mode="bypassPermissions",
        setting_sources=["project"],
        system_prompt="You coordinate research by delegating to specialized subagents.",
        allowed_tools=["Agent"],
        agents=agents,
        hooks={
            "PreToolUse": [HookMatcher(hooks=[log_tool_use])],
        },
        model="haiku",
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(prompt="Research quantum computing developments in 2025")
        async for msg in client.receive_response():
            if hasattr(msg, "result"):
                print(f"Result: {msg.result}")

asyncio.run(research_system())
```

---

## Reusable AIClient Wrapper (TypeScript)

Encapsulates SDK configuration with sensible defaults:

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
  private defaultOptions: AIQueryOptions;

  constructor(options?: Partial<AIQueryOptions>) {
    this.defaultOptions = {
      maxTurns: 100,
      cwd: path.join(process.cwd(), "agent"),
      model: "opus",
      allowedTools: [
        "Agent", "Bash", "Glob", "Grep", "Read", "Edit", "Write",
        "WebFetch", "TodoWrite", "WebSearch",
      ],
      settingSources: ["local", "project"],
      ...options,
    };
  }

  async *queryStream(prompt: string | AsyncIterable<any>, options?: Partial<AIQueryOptions>) {
    const mergedOptions = { ...this.defaultOptions, ...options };
    for await (const message of query({ prompt, options: mergedOptions })) {
      yield message;
    }
  }

  async querySingle(prompt: string, options?: Partial<AIQueryOptions>) {
    const messages: any[] = [];
    let totalCost = 0;
    let duration = 0;

    for await (const message of this.queryStream(prompt, options)) {
      messages.push(message);
      if (message.type === "result" && message.subtype === "success") {
        totalCost = message.total_cost_usd;
        duration = message.duration_ms;
      }
    }

    return { messages, cost: totalCost, duration };
  }
}

// Usage
const client = new AIClient({
  model: "sonnet",
  appendSystemPrompt: "You are a helpful coding assistant.",
});

const { messages, cost, duration } = await client.querySingle(
  "Explain async/await vs Promises"
);
console.log(`Cost: $${cost.toFixed(4)}, Duration: ${duration}ms`);
```

---

## Email Classification (TypeScript)

Event-driven email classifier using structured output:

```typescript
interface ClassificationResult {
  category: "urgent" | "newsletter" | "personal" | "work" | "spam";
  priority: "high" | "normal" | "low";
  suggestedAction: "archive" | "star" | "label" | "none";
  suggestedLabels?: string[];
}

export async function classifyEmail(email: { from: string; subject: string; body: string }) {
  for await (const message of query({
    prompt: `Classify this email:
      From: ${email.from}
      Subject: ${email.subject}
      Body: ${email.body.substring(0, 500)}

      Provide category, priority, and suggested action.`,
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
    if (message.type === "result" && message.structuredOutput) {
      return message.structuredOutput as ClassificationResult;
    }
  }
}
```

---

## Security Hook with Typed Imports (Python)

Full-typed hook example blocking dangerous commands:

```python
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    ResultMessage,
    TextBlock,
    HookMatcher,
)
from claude_agent_sdk.types import HookInput, HookContext, HookJSONOutput

async def check_bash_command(
    input_data: HookInput, tool_use_id: str | None, context: HookContext
) -> HookJSONOutput:
    tool_name = input_data["tool_name"]
    tool_input = input_data["tool_input"]

    if tool_name != "Bash":
        return {}

    command = tool_input.get("command", "")
    blocked = ["rm -rf /", "sudo rm", "mkfs", "dd if="]

    for pattern in blocked:
        if pattern in command:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Blocked: {pattern}",
                }
            }
    return {}

options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Bash", hooks=[check_bash_command]),
        ],
    },
    allowed_tools=["Read", "Edit", "Bash"],
    permission_mode="acceptEdits",
)
```

---

## Sandbox Configuration (Python)

Isolated bash execution with command restrictions:

```python
options = ClaudeAgentOptions(
    sandbox={
        "enabled": True,
        "autoAllowBashIfSandboxed": True,  # Auto-approve Bash when sandboxed
        "excludedCommands": ["git", "docker"],  # Block specific commands
    },
    allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    permission_mode="acceptEdits",
)
```
