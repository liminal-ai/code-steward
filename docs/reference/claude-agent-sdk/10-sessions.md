# Sessions

Sessions enable multi-turn conversations with persistent context across queries.

## Session Approaches

| Use Case | Approach |
|----------|----------|
| One-shot task | Single `query()` call |
| Multi-turn in one process | `ClaudeSDKClient` (Python) or `continue: true` (TS) |
| Resume after restart | `continue_conversation=True` or `resume=session_id` |
| Specific past session | Capture and pass `resume=session_id` |
| Explore alternatives | `fork_session=True` |

---

## One-Shot Query

```python
async for message in query(
    prompt="Analyze this codebase",
    options=ClaudeAgentOptions(allowed_tools=["Read", "Glob", "Grep"]),
):
    if isinstance(message, ResultMessage):
        print(message.result)
        # Session ends here
```

---

## Multi-Turn with ClaudeSDKClient (Python)

```python
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions

async with ClaudeSDKClient(options=ClaudeAgentOptions(
    allowed_tools=["Read", "Edit", "Bash"],
    permission_mode="acceptEdits",
)) as client:
    # First turn
    await client.query("Analyze the auth module")
    async for message in client.receive_response():
        if hasattr(message, "result"):
            print(f"Turn 1: {message.result}")

    # Second turn (same session, full context preserved)
    await client.query("Now add rate limiting to the login endpoint")
    async for message in client.receive_response():
        if hasattr(message, "result"):
            print(f"Turn 2: {message.result}")

    # Third turn
    await client.query("Write tests for the changes")
    async for message in client.receive_response():
        if hasattr(message, "result"):
            print(f"Turn 3: {message.result}")
```

---

## Capturing Session IDs

```python
session_id = None

async for message in query(prompt="Build the feature", options=options):
    if isinstance(message, ResultMessage):
        session_id = message.session_id
        print(f"Session ID: {session_id}")
```

---

## Resuming Sessions

Resume a previous session to continue where you left off:

```python
# Resume with new prompt
async for message in query(
    prompt="Now add error handling to what you built",
    options=ClaudeAgentOptions(
        resume=session_id,
        allowed_tools=["Read", "Edit"],
    ),
):
    if isinstance(message, ResultMessage):
        print(message.result)
```

### Continue Most Recent Session

```python
async for message in query(
    prompt="Continue with the next step",
    options=ClaudeAgentOptions(
        continue_conversation=True,
    ),
):
    ...
```

---

## Forking Sessions

Create a new session branch from an existing session (original untouched):

```python
async for message in query(
    prompt="Try the OAuth2 approach instead",
    options=ClaudeAgentOptions(
        resume=session_id,
        fork_session=True,  # Creates new branch
    ),
):
    if isinstance(message, ResultMessage):
        new_session_id = message.session_id  # Different from original
```

Use cases:
- Explore alternative approaches without losing progress
- A/B testing different implementations
- Branching after a checkpoint

---

## Cross-Host Session Resume

Sessions can be resumed on different hosts if the session storage is accessible:

```python
# Host A: Create session
async for message in query(prompt="Start the task", options=options):
    if isinstance(message, ResultMessage):
        session_id = message.session_id

# Host B: Resume session (needs access to same session storage)
async for message in query(
    prompt="Continue the task",
    options=ClaudeAgentOptions(resume=session_id),
):
    ...
```

---

## Session Lifecycle

```
┌─────────────┐
│  query()    │ → SystemMessage (init)
│  called     │
└──────┬──────┘
       │
┌──────▼──────┐
│ Agent Loop  │ → AssistantMessage, UserMessage (repeated)
│ (turns)     │
└──────┬──────┘
       │
┌──────▼──────┐
│ ResultMsg   │ → session_id, result, cost, usage
│ (end)       │
└──────┬──────┘
       │
       ├── resume=session_id → Continue
       ├── fork_session=True → Branch
       └── (done) → Session stored for later
```
