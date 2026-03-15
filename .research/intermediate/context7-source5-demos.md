# Claude Agent SDK - Context7 Source 5: Demos (anthropics/claude-agent-sdk-demos)
## Library ID: /anthropics/claude-agent-sdk-demos
## Source Reputation: High | Benchmark Score: 77.19 | Code Snippets: 345

---

### Long-Running Chat Sessions with WebSocket using TypeScript

Source: https://context7.com/anthropics/claude-agent-sdk-demos/llms.txt

Enables real-time conversational interfaces with persistent context by streaming multiple user messages through a message queue. This example utilizes the SDK's query function to manage chat sessions and integrates with a WebSocket for message handling.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// Message queue for multi-turn conversations
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

// Agent session class
export class AgentSession {
  private queue = new MessageQueue();
  private outputIterator: AsyncIterator<any>;

  constructor() {
    this.outputIterator = query({
      prompt: this.queue as any, // Queue as input stream
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

// WebSocket integration
const session = new AgentSession();

// Handle user messages
session.sendMessage("Hello! What can you help me with?");

// Stream responses
for await (const message of session.getOutputStream()) {
  if (message.type === "assistant") {
    const content = message.message.content;
    for (const block of content) {
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

### Python Multi-Agent Research System Orchestration

Source: https://context7.com/anthropics/claude-agent-sdk-demos/llms.txt

This Python code defines and orchestrates a multi-agent research system. It initializes specialized agents for research, data analysis, and report writing, configures hooks for tool usage tracking, and runs an interactive session to research a given topic. Dependencies include 'claude_agent_sdk' and 'asyncio'.

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions, AgentDefinition, HookMatcher

# Assume SubagentTracker and extract_text are defined elsewhere
class SubagentTracker:
    async def pre_tool_use_hook(self, tool_name, tool_input):
        print(f"Pre-tool use: {tool_name} with input {tool_input}")

    async def post_tool_use_hook(self, tool_name, tool_output):
        print(f"Post-tool use: {tool_name} with output {tool_output}")

def extract_text(message):
    # Placeholder for actual text extraction logic
    return message.content if hasattr(message, 'content') else str(message)

async def research_system():
    # Define specialized subagents
    agents = {
        "researcher": AgentDefinition(
            description=(
                "Use this agent to gather research information. "
                "Uses web search to find relevant articles and sources."
            ),
            tools=["WebSearch", "Write"],
            prompt="You are a research assistant. Search thoroughly and save findings.",
            model="haiku"
        ),
        "data-analyst": AgentDefinition(
            description=(
                "Use AFTER researchers complete to generate analysis and charts. "
                "Reads research notes and creates visualizations with matplotlib."
            ),
            tools=["Glob", "Read", "Bash", "Write"],
            prompt="Analyze research data, extract metrics, generate charts.",
            model="haiku"
        ),
        "report-writer": AgentDefinition(
            description=(
                "Creates formal PDF reports from research and analysis. "
                "Reads findings and generates professional documents."
            ),
            tools=["Skill", "Write", "Glob", "Read", "Bash"],
            prompt="Synthesize findings into clear, professional PDF reports.",
            model="haiku"
        )
    }

    # Configure hooks for tracking tool usage
    tracker = SubagentTracker()
    hooks = {
        'PreToolUse': [
            HookMatcher(matcher=None, hooks=[tracker.pre_tool_use_hook])
        ],
        'PostToolUse': [
            HookMatcher(matcher=None, hooks=[tracker.post_tool_use_hook])
        ]
    }

    # Create lead agent options
    options = ClaudeAgentOptions(
        permission_mode="bypassPermissions",
        setting_sources=["project"],
        system_prompt="You coordinate research by delegating to specialized subagents.",
        allowed_tools=["Task"],  # Lead agent only uses Task to spawn subagents
        agents=agents,
        hooks=hooks,
        model="haiku"
    )

    # Run interactive session
    async with ClaudeSDKClient(options=options) as client:
        await client.query(prompt="Research quantum computing developments in 2025")

        async for msg in client.receive_response():
            if type(msg).__name__ == 'AssistantMessage':
                print(f"Agent: {extract_text(msg)}")

asyncio.run(research_system())
```

---

### AIClient Wrapper Class for Claude Agent SDK (TypeScript)

Source: https://context7.com/anthropics/claude-agent-sdk-demos/llms.txt

A reusable TypeScript class that encapsulates Claude Agent SDK configuration with sensible defaults. It provides streaming and single-query interfaces for integrating Claude agents into applications. Dependencies include '@anthropic-ai/claude-agent-sdk' and 'path'.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { HookJSONOutput } from "@anthropic-ai/claude-agent-sdk";
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
      cwd: path.join(process.cwd(), 'agent'),
      model: "opus",
      allowedTools: [
        "Task", "Bash", "Glob", "Grep", "Read", "Edit", "Write",
        "WebFetch", "TodoWrite", "WebSearch"
      ],
      settingSources: ['local', 'project'],
      ...options
    };
  }

  async *queryStream(
    prompt: string | AsyncIterable<any>,
    options?: Partial<AIQueryOptions>
  ): AsyncIterable<any> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    for await (const message of query({ prompt, options: mergedOptions })) {
      yield message;
    }
  }

  async querySingle(prompt: string, options?: Partial<AIQueryOptions>): Promise<{
    messages: any[];
    cost: number;
    duration: number;
  }> {
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
  appendSystemPrompt: "You are a helpful coding assistant."
});

const { messages, cost, duration } = await client.querySingle(
  "Explain the differences between async/await and Promises"
);
console.log(`Response cost: $${cost.toFixed(4)}, Duration: ${duration}ms`);
```

---

### Basic Agent Interaction with Claude SDK (TypeScript)

Source: https://context7.com/anthropics/claude-agent-sdk-demos/llms.txt

Demonstrates the fundamental usage of the Claude Agent SDK's `query()` function to interact with Claude. It sends a prompt and processes the streaming response, including assistant messages and result details like cost and duration. Requires the `@anthropic-ai/claude-agent-sdk` package.

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { HookJSONOutput } from "@anthropic-ai/claude-agent-sdk";

async function basicAgent() {
  const q = query({
    prompt: 'Hello, Claude! Please introduce yourself in one sentence.',
    options: {
      maxTurns: 100,
      cwd: process.cwd(),
      model: "sonnet", // "opus", "sonnet", "haiku", or "inherit"
      executable: "node",
      allowedTools: [
        "Task", "Bash", "Glob", "Grep", "Read", "Edit", "Write",
        "WebFetch", "TodoWrite", "WebSearch"
      ],
    },
  });

  for await (const message of q) {
    if (message.type === 'assistant' && message.message) {
      const textContent = message.message.content.find((c: any) => c.type === 'text');
      if (textContent && 'text' in textContent) {
        console.log('Claude says:', textContent.text);
      }
    }
    if (message.type === 'result' && message.subtype === 'success') {
      console.log(`Cost: $${message.total_cost_usd.toFixed(4)}`);
      console.log(`Duration: ${message.duration_ms}ms`);
    }
  }
}

basicAgent().catch(console.error);
```

---

### Event-Driven Listeners System for Email Classification with TypeScript

Source: https://context7.com/anthropics/claude-agent-sdk-demos/llms.txt

Implements an event-driven system where TypeScript scripts act as listeners to monitor events like incoming emails. It supports AI-powered classification, automated actions, and integrations with external services using the SDK's agent calling capabilities.

```typescript
// agent/custom_scripts/listeners/smart-classifier.ts
import type { ListenerConfig, Email, ListenerContext } from "../types";

export const config: ListenerConfig = {
  id: "smart_classifier",
  name: "AI Email Classifier",
  description: "Uses Claude to classify and categorize emails intelligently",
  enabled: true,
  event: "email_received"
};

interface ClassificationResult {
  category: "urgent" | "newsletter" | "personal" | "work" | "spam";
  priority: "high" | "normal" | "low";
  suggestedAction: "archive" | "star" | "label" | "none";
  suggestedLabels?: string[];
}

export async function handler(email: Email, context: ListenerContext): Promise<void> {
  // Use AI to classify the email
  const classification = await context.callAgent<ClassificationResult>({
    prompt: `Classify this email:
      From: ${email.from}
      Subject: ${email.subject}
      Body: ${email.body.substring(0, 500)}

      Provide category, priority, and suggested action.`,
    schema: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["urgent", "newsletter", "personal", "work", "spam"] },
        priority: { type: "string", enum: ["high", "normal", "low"] },
        suggestedAction: { type: "string", enum: ["archive", "star", "label", "none"] },
        suggestedLabels: { type: "array", items: { type: "string" } }
      },
      required: ["category", "priority", "suggestedAction"]
    },
    model: "haiku"
  });

  // Act on classification
  if (classification.category === "spam") {
    await context.archiveEmail(email.messageId);
    await context.addLabel(email.messageId, "spam");
    return;
  }

  if (classification.suggestedAction === "star") {
    await context.starEmail(email.messageId);
  }

  if (classification.suggestedLabels) {
    for (const label of classification.suggestedLabels) {
      await context.addLabel(email.messageId, label);
    }
  }

  if (classification.priority === "high") {
    await context.notify(
      `${classification.category.toUpperCase()}: ${email.subject}`,
      { priority: "high" }
    );
  }
}
```
