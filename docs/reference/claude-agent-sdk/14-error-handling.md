# Error Handling

## Exception Types (Python)

| Exception | Description | Key Fields |
|-----------|-------------|------------|
| `ClaudeSDKError` | Base exception for all SDK errors | `message` |
| `CLINotFoundError` | Claude Code CLI not found or not installed | `message` |
| `CLIConnectionError` | Failed to connect to CLI process | `message` |
| `ProcessError` | CLI process failed | `exit_code`, `stderr` |
| `CLIJSONDecodeError` | Failed to parse JSON from CLI | `raw_data` |

### Catching Exceptions

```python
from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    ClaudeSDKError,
    CLINotFoundError,
    CLIConnectionError,
    ProcessError,
    CLIJSONDecodeError,
)

try:
    async for message in query(prompt="...", options=options):
        pass
except CLINotFoundError:
    print("Claude Code CLI not found. Install with: pip install claude-agent-sdk")
except CLIConnectionError as e:
    print(f"Connection failed: {e}")
except ProcessError as e:
    print(f"Process error (exit {e.exit_code}): {e.stderr}")
except CLIJSONDecodeError as e:
    print(f"JSON parse error: {e.raw_data[:200]}")
except ClaudeSDKError as e:
    print(f"SDK error: {e}")
```

---

## Result Subtypes

The `ResultMessage.subtype` indicates how the agent completed:

```python
from claude_agent_sdk.types import ResultMessage

async for message in query(prompt="...", options=options):
    if isinstance(message, ResultMessage):
        match message.subtype:
            case "success":
                print(f"Completed: {message.result}")

            case "error_max_turns":
                print(f"Hit turn limit ({options.max_turns})")
                print(f"Resume with: resume={message.session_id}")

            case "error_max_budget_usd":
                print(f"Hit budget limit (${options.max_budget_usd})")
                print(f"Spent: ${message.total_cost_usd:.4f}")

            case "error_during_execution":
                print(f"Runtime error: {message.result}")

            case "error_max_structured_output_retries":
                print("Failed to produce valid structured output")
```

---

## Recovery Patterns

### Resume After Turn Limit

```python
session_id = None

async for message in query(
    prompt="Build the feature",
    options=ClaudeAgentOptions(max_turns=10),
):
    if isinstance(message, ResultMessage):
        session_id = message.session_id
        if message.subtype == "error_max_turns":
            print("Continuing...")

if session_id:
    async for message in query(
        prompt="Continue where you left off",
        options=ClaudeAgentOptions(resume=session_id, max_turns=10),
    ):
        if isinstance(message, ResultMessage):
            print(message.result)
```

### Retry with Backoff

```python
import asyncio

async def query_with_retry(prompt, options, max_retries=3):
    for attempt in range(max_retries):
        try:
            async for message in query(prompt=prompt, options=options):
                yield message
            return
        except CLIConnectionError:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
            else:
                raise
```

### Budget Guard

```python
async for message in query(
    prompt="Analyze this large codebase",
    options=ClaudeAgentOptions(
        max_budget_usd=0.50,
        max_turns=20,
    ),
):
    if isinstance(message, ResultMessage):
        print(f"Cost: ${message.total_cost_usd:.4f}")
        if message.subtype.startswith("error_"):
            print(f"Stopped: {message.subtype}")
```
