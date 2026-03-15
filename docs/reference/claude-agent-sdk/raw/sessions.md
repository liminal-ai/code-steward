---
source: https://platform.claude.com/docs/en/agent-sdk/sessions
scraped_at: 2026-03-14
title: Work with Sessions
---

# Work with Sessions

A session is the conversation history the SDK accumulates while your agent works. It contains your prompt, every tool call the agent made, every tool result, and every response. The SDK writes it to disk automatically so you can return to it later.

Returning to a session means the agent has full context from before: files it already read, analysis it already performed, decisions it already made.

**Sessions persist the conversation, not the filesystem.** To snapshot and revert file changes the agent made, use file checkpointing.

## Choose an Approach

| What you're building | What to use |
| --- | --- |
| One-shot task: single prompt, no follow-up | Nothing extra. One `query()` call handles it. |
| Multi-turn chat in one process | `ClaudeSDKClient` (Python) or `continue: true` (TypeScript) |
| Pick up where you left off after a process restart | `continue_conversation=True` (Python) / `continue: true` (TypeScript) |
| Resume a specific past session (not the most recent) | Capture the session ID and pass it to `resume` |
| Try an alternative approach without losing the original | Fork the session |
| Stateless task (TypeScript only) | Set `persistSession: false` |

### Continue, Resume, and Fork

- **Continue**: finds the most recent session in the current directory. No ID tracking needed.
- **Resume**: takes a specific session ID. Required for multiple sessions or non-most-recent.
- **Fork**: creates a new session starting with a copy of the original's history. The original stays unchanged.

## Automatic Session Management

### Python: `ClaudeSDKClient`

`ClaudeSDKClient` handles session IDs internally. Each call to `client.query()` automatically continues the same session.

```python
import asyncio
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    ResultMessage,
    TextBlock,
)

def print_response(message):
    if isinstance(message, AssistantMessage):
        for block in message.content:
            if isinstance(block, TextBlock):
                print(block.text)
    elif isinstance(message, ResultMessage):
        cost = (
            f"${message.total_cost_usd:.4f}"
            if message.total_cost_usd is not None
            else "N/A"
        )
        print(f"[done: {message.subtype}, cost: {cost}]")

async def main():
    options = ClaudeAgentOptions(
        allowed_tools=["Read", "Edit", "Glob", "Grep"],
    )

    async with ClaudeSDKClient(options=options) as client:
        # First query: client captures the session ID internally
        await client.query("Analyze the auth module")
        async for message in client.receive_response():
            print_response(message)

        # Second query: automatically continues the same session
        await client.query("Now refactor it to use JWT")
        async for message in client.receive_response():
            print_response(message)

asyncio.run(main())
```

### TypeScript: `continue: true`

Pass `continue: true` on each subsequent `query()` call and the SDK picks up the most recent session.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// First query: creates a new session
for await (const message of query({
  prompt: "Analyze the auth module",
  options: { allowedTools: ["Read", "Glob", "Grep"] }
})) {
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result);
  }
}

// Second query: continue: true resumes the most recent session
for await (const message of query({
  prompt: "Now refactor it to use JWT",
  options: {
    continue: true,
    allowedTools: ["Read", "Edit", "Write", "Glob", "Grep"]
  }
})) {
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result);
  }
}
```

## Use Session Options with `query()`

### Capture the Session ID

Read from the `session_id` field on the result message:

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

async def main():
    session_id = None

    async for message in query(
        prompt="Analyze the auth module and suggest improvements",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Glob", "Grep"],
        ),
    ):
        if isinstance(message, ResultMessage):
            session_id = message.session_id
            if message.subtype == "success":
                print(message.result)

    print(f"Session ID: {session_id}")
    return session_id

session_id = asyncio.run(main())
```

### Resume by ID

Pass a session ID to `resume` to return to that specific session.

Common reasons to resume:
- **Follow up on a completed task.** The agent already analyzed something; now you want it to act.
- **Recover from a limit.** The first run ended with `error_max_turns` or `error_max_budget_usd`.
- **Restart your process.** You captured the ID before shutdown.

```python
# Earlier session analyzed the code; now build on that analysis
async for message in query(
    prompt="Now implement the refactoring you suggested",
    options=ClaudeAgentOptions(
        resume=session_id,
        allowed_tools=["Read", "Edit", "Write", "Glob", "Grep"],
    ),
):
    if isinstance(message, ResultMessage) and message.subtype == "success":
        print(message.result)
```

**Troubleshooting:** If a `resume` call returns a fresh session instead of the expected history, the most common cause is a mismatched `cwd`. Sessions are stored under `~/.claude/projects/<encoded-cwd>/*.jsonl`.

### Fork to Explore Alternatives

Forking creates a new session that starts with a copy of the original's history. The fork gets its own session ID; the original's ID and history stay unchanged.

```python
# Fork: branch from session_id into a new session
forked_id = None
async for message in query(
    prompt="Instead of JWT, implement OAuth2 for the auth module",
    options=ClaudeAgentOptions(
        resume=session_id,
        fork_session=True,
    ),
):
    if isinstance(message, ResultMessage):
        forked_id = message.session_id  # The fork's ID, distinct from session_id
        if message.subtype == "success":
            print(message.result)

print(f"Forked session: {forked_id}")

# Original session is untouched; resuming it continues the JWT thread
async for message in query(
    prompt="Continue with the JWT approach",
    options=ClaudeAgentOptions(resume=session_id),
):
    if isinstance(message, ResultMessage) and message.subtype == "success":
        print(message.result)
```

**Note:** Forking branches the conversation history, not the filesystem. If a forked agent edits files, those changes are real and visible to all sessions in the same directory.

## Resume Across Hosts

Session files are local to the machine that created them. Options:
- **Move the session file:** persist `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl` and restore it on the new host. The `cwd` must match.
- **Don't rely on session resume:** capture results as application state and pass them into a fresh session's prompt.

Both SDKs expose functions for session management:
- TypeScript: `listSessions()`, `getSessionMessages()`
- Python: `list_sessions()`, `get_session_messages()`
