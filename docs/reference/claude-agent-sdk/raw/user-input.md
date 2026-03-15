---
source: https://platform.claude.com/docs/en/agent-sdk/user-input
scraped_at: 2026-03-14
title: User Approvals and Input
---

# User Approvals and Input

While working on a task, Claude sometimes needs to check in with users. It might need permission before deleting files, or need to ask which database to use. Your application needs to surface these requests.

Claude requests user input in two situations:
1. **Permission to use a tool** (like deleting files or running commands)
2. **Clarifying questions** (via the `AskUserQuestion` tool)

Both trigger your `canUseTool` callback, which pauses execution until you return a response.

## Detect When Claude Needs Input

Pass a `canUseTool` callback in your query options:

```python
async def handle_tool_request(tool_name, input_data, context):
    # Prompt user and return allow or deny
    ...

options = ClaudeAgentOptions(can_use_tool=handle_tool_request)
```

The callback fires in two cases:
1. **Tool needs approval**: `tool_name` is the tool (e.g., `"Bash"`, `"Write"`)
2. **Claude asks a question**: `tool_name == "AskUserQuestion"`. If you specify a `tools` array, include `AskUserQuestion`.

## Handle Tool Approval Requests

Your callback receives:

| Argument | Description |
| --- | --- |
| `toolName` | The name of the tool Claude wants to use |
| `input` | The parameters Claude is passing to the tool |

Common tool input fields:

| Tool | Input fields |
| --- | --- |
| `Bash` | `command`, `description`, `timeout` |
| `Write` | `file_path`, `content` |
| `Edit` | `file_path`, `old_string`, `new_string` |
| `Read` | `file_path`, `offset`, `limit` |

### Example: y/n Terminal Approval

```python
import asyncio

from claude_agent_sdk import ClaudeAgentOptions, query
from claude_agent_sdk.types import (
    HookMatcher,
    PermissionResultAllow,
    PermissionResultDeny,
    ToolPermissionContext,
)

async def can_use_tool(
    tool_name: str, input_data: dict, context: ToolPermissionContext
) -> PermissionResultAllow | PermissionResultDeny:
    print(f"\nTool: {tool_name}")
    if tool_name == "Bash":
        print(f"Command: {input_data.get('command')}")
        if input_data.get("description"):
            print(f"Description: {input_data.get('description')}")
    else:
        print(f"Input: {input_data}")

    response = input("Allow this action? (y/n): ")

    if response.lower() == "y":
        return PermissionResultAllow(updated_input=input_data)
    else:
        return PermissionResultDeny(message="User denied this action")

# Required workaround: dummy hook keeps the stream open for can_use_tool
async def dummy_hook(input_data, tool_use_id, context):
    return {"continue_": True}

async def prompt_stream():
    yield {
        "type": "user",
        "message": {
            "role": "user",
            "content": "Create a test file in /tmp and then delete it",
        },
    }

async def main():
    async for message in query(
        prompt=prompt_stream(),
        options=ClaudeAgentOptions(
            can_use_tool=can_use_tool,
            hooks={"PreToolUse": [HookMatcher(matcher=None, hooks=[dummy_hook])]},
        ),
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

**Note:** In Python, `can_use_tool` requires streaming mode and a `PreToolUse` hook that returns `{"continue_": True}` to keep the stream open.

### Respond to Tool Requests

| Response | Python | TypeScript |
| --- | --- | --- |
| **Allow** | `PermissionResultAllow(updated_input=...)` | `{ behavior: "allow", updatedInput }` |
| **Deny** | `PermissionResultDeny(message=...)` | `{ behavior: "deny", message }` |

Beyond allowing or denying, you can:
- **Approve with changes**: modify the input before execution
- **Reject**: block the tool and tell Claude why
- **Suggest alternative**: block but guide Claude toward what the user wants
- **Redirect entirely**: use streaming input to send Claude a completely new instruction

## Handle Clarifying Questions

When Claude needs more direction, it calls the `AskUserQuestion` tool. This triggers your `canUseTool` callback with `toolName` set to `AskUserQuestion`.

### Steps

1. Pass a `canUseTool` callback and include `AskUserQuestion` in your tools list:
   ```python
   async for message in query(
       prompt="Analyze this codebase",
       options=ClaudeAgentOptions(
           tools=["Read", "Glob", "Grep", "AskUserQuestion"],
           can_use_tool=can_use_tool,
       ),
   ):
       print(message)
   ```

2. Detect `AskUserQuestion` in your callback:
   ```python
   async def can_use_tool(tool_name: str, input_data: dict, context):
       if tool_name == "AskUserQuestion":
           return await handle_clarifying_questions(input_data)
       return await prompt_for_approval(tool_name, input_data)
   ```

3. Parse the question input:
   ```json
   {
     "questions": [
       {
         "question": "How should I format the output?",
         "header": "Format",
         "options": [
           { "label": "Summary", "description": "Brief overview" },
           { "label": "Detailed", "description": "Full explanation" }
         ],
         "multiSelect": false
       }
     ]
   }
   ```

4. Return answers:
   ```python
   return PermissionResultAllow(
       updated_input={
           "questions": input_data.get("questions", []),
           "answers": {
               "How should I format the output?": "Summary",
               "Which sections should I include?": "Introduction, Conclusion",
           },
       }
   )
   ```

### Question Format

| Field | Description |
| --- | --- |
| `question` | The full question text to display |
| `header` | Short label (max 12 characters) |
| `options` | Array of 2-4 choices, each with `label` and `description` |
| `multiSelect` | If `true`, users can select multiple options |

For multi-select questions, join multiple labels with `", "`.

### Support Free-Text Input

To let users type their own answer:
- Display an additional "Other" choice after Claude's options
- Use the user's custom text as the answer value (not the word "Other")

### Complete Example

```python
import asyncio

from claude_agent_sdk import ClaudeAgentOptions, query
from claude_agent_sdk.types import HookMatcher, PermissionResultAllow

def parse_response(response: str, options: list) -> str:
    try:
        indices = [int(s.strip()) - 1 for s in response.split(",")]
        labels = [options[i]["label"] for i in indices if 0 <= i < len(options)]
        return ", ".join(labels) if labels else response
    except ValueError:
        return response

async def handle_ask_user_question(input_data: dict) -> PermissionResultAllow:
    answers = {}

    for q in input_data.get("questions", []):
        print(f"\n{q['header']}: {q['question']}")
        options = q["options"]
        for i, opt in enumerate(options):
            print(f"  {i + 1}. {opt['label']} - {opt['description']}")
        if q.get("multiSelect"):
            print("  (Enter numbers separated by commas, or type your own answer)")
        else:
            print("  (Enter a number, or type your own answer)")

        response = input("Your choice: ").strip()
        answers[q["question"]] = parse_response(response, options)

    return PermissionResultAllow(
        updated_input={
            "questions": input_data.get("questions", []),
            "answers": answers,
        }
    )

async def can_use_tool(tool_name: str, input_data: dict, context) -> PermissionResultAllow:
    if tool_name == "AskUserQuestion":
        return await handle_ask_user_question(input_data)
    return PermissionResultAllow(updated_input=input_data)

async def prompt_stream():
    yield {
        "type": "user",
        "message": {"role": "user", "content": "Help me decide on the tech stack for a new mobile app"},
    }

async def dummy_hook(input_data, tool_use_id, context):
    return {"continue_": True}

async def main():
    async for message in query(
        prompt=prompt_stream(),
        options=ClaudeAgentOptions(
            can_use_tool=can_use_tool,
            hooks={"PreToolUse": [HookMatcher(matcher=None, hooks=[dummy_hook])]},
        ),
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

## Limitations

- `AskUserQuestion` is not currently available in subagents spawned via the Agent tool
- Each `AskUserQuestion` call supports 1-4 questions with 2-4 options each

## Other Ways to Get User Input

- **[Streaming input](./streaming-vs-single-mode.md)**: interrupt the agent mid-task, provide additional context, or build chat interfaces
- **[Custom tools](./custom-tools.md)**: collect structured input, integrate external approval systems, implement domain-specific interactions
