# Claude Agent SDK - Context7 Source 6: Sessions & Management (Nothflare Docs)
## Library ID: /nothflare/claude-agent-sdk-docs
## Query: multi-agent handoff guardrails streaming hooks lifecycle runner getting started installation configuration session management

---

### Session Management: Resume and Fork Conversations with Claude Agent SDK

Source: https://context7.com/nothflare/claude-agent-sdk-docs/llms.txt

Demonstrates how to resume previous conversations to maintain context or fork to explore alternative paths using the Claude Agent SDK.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

let sessionId: string | undefined;

// First query - capture session ID
for await (const message of query({
  prompt: "Help me design a REST API",
  options: { allowedTools: ["Read", "Glob"] }
})) {
  if (message.type === "system" && message.subtype === "init") {
    sessionId = message.session_id;
    console.log(`Session: ${sessionId}`);
  }
}

// Resume same session - Claude remembers context
for await (const message of query({
  prompt: "Add authentication to the API",
  options: { resume: sessionId }
})) {
  if ("result" in message) console.log(message.result);
}

// Fork session to try different approach
for await (const message of query({
  prompt: "Redesign as GraphQL instead",
  options: { resume: sessionId, forkSession: true }
})) {
  if (message.type === "system" && message.subtype === "init") {
    console.log(`Forked to: ${message.session_id}`);
  }
}
```

---

### Managing Agent Sessions (Python and TypeScript)

Source: https://github.com/nothflare/claude-agent-sdk-docs/blob/main/docs/en/agent-sdk/overview.md

This snippet demonstrates how to maintain context across multiple exchanges using agent sessions.

```Python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    session_id = None

    # First query: capture the session ID
    async for message in query(
        prompt="Read the authentication module",
        options=ClaudeAgentOptions(allowed_tools=["Read", "Glob"])
    ):
        if hasattr(message, 'subtype') and message.subtype == 'init':
            session_id = message.session_id

    # Resume with full context from the first query
    async for message in query(
        prompt="Now find all places that call it",  # "it" = auth module
        options=ClaudeAgentOptions(resume=session_id)
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

```TypeScript
import { query } from "@anthropic-ai/claude-agent-sdk";

let sessionId: string | undefined;

// First query: capture the session ID
for await (const message of query({
      prompt: "Read the authentication module",
      options: { allowedTools: ["Read", "Glob"] }
    })) {
      if (message.type === "system" && message.subtype === "init") {
        sessionId = message.sessionId;
      }
    }

// Resume with full context from the first query
for await (const message of query({
      prompt: "Now find all places that call it",  // "it" = auth module
      options: { resume: sessionId }
    })) {
      if ("result" in message) console.log(message.result);
    }
```

---

### Get Session ID and Start Conversation

Source: https://github.com/nothflare/claude-agent-sdk-docs/blob/main/docs/en/agent-sdk/guides/sessions.md

Initiates a new conversation and captures the session ID from the system's initial message. This ID is crucial for resuming the conversation later.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk"

let sessionId: string | undefined

const response = query({
  prompt: "Help me build a web application",
  options: {
    model: "claude-sonnet-4-5"
  }
})

for await (const message of response) {
  // The first message is a system init message with the session ID
  if (message.type === 'system' && message.subtype === 'init') {
    sessionId = message.session_id
    console.log(`Session started with ID: ${sessionId}`)
  }

  // Process other messages...
  console.log(message)
}

// Later, you can use the saved sessionId to resume
if (sessionId) {
  const resumedResponse = query({
    prompt: "Continue where we left off",
    options: {
      resume: sessionId
    }
  })
}
```

```python
from claude_agent_sdk import query, ClaudeAgentOptions

session_id = None

async for message in query(
    prompt="Help me build a web application",
    options=ClaudeAgentOptions(
        model="claude-sonnet-4-5"
    )
):
    if hasattr(message, 'subtype') and message.subtype == 'init':
        session_id = message.data.get('session_id')
        print(f"Session started with ID: {session_id}")

    print(message)

# Later, you can use the saved session_id to resume
if session_id:
    async for message in query(
        prompt="Continue where we left off",
        options=ClaudeAgentOptions(
            resume=session_id
        )
    ):
        print(message)
```

### How Sessions Work

When you start a new query, the SDK automatically creates a session and returns a session ID in the initial system message. You can capture this ID to resume the session later.
