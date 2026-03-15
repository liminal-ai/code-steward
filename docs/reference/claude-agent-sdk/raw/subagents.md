---
source: https://platform.claude.com/docs/en/agent-sdk/subagents
scraped_at: 2026-03-14
title: Subagents in the Agent SDK
---

# Subagents in the Agent SDK

Subagents are separate agent instances that your main agent can spawn to handle focused subtasks. Use subagents to isolate context for focused subtasks, run multiple analyses in parallel, and apply specialized instructions without bloating the main agent's prompt.

## Overview

You can create subagents in three ways:
- **Programmatically**: use the `agents` parameter in your `query()` options
- **Filesystem-based**: define agents as markdown files in `.claude/agents/` directories
- **Built-in general-purpose**: Claude can invoke the built-in `general-purpose` subagent at any time via the Agent tool without you defining anything

## Benefits of Using Subagents

### Context Isolation

Each subagent runs in its own fresh conversation. Intermediate tool calls and results stay inside the subagent; only its final message returns to the parent.

**Example:** a `research-assistant` subagent can explore dozens of files without any of that content accumulating in the main conversation.

### Parallelization

Multiple subagents can run concurrently, dramatically speeding up complex workflows.

**Example:** during a code review, run `style-checker`, `security-scanner`, and `test-coverage` subagents simultaneously.

### Specialized Instructions

Each subagent can have tailored system prompts with specific expertise, best practices, and constraints.

### Tool Restrictions

Subagents can be limited to specific tools, reducing the risk of unintended actions.

## Creating Subagents

### Programmatic Definition (Recommended)

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async def main():
    async for message in query(
        prompt="Review the authentication module for security issues",
        options=ClaudeAgentOptions(
            # Agent tool is required for subagent invocation
            allowed_tools=["Read", "Grep", "Glob", "Agent"],
            agents={
                "code-reviewer": AgentDefinition(
                    description="Expert code review specialist. Use for quality, security, and maintainability reviews.",
                    prompt="""You are a code review specialist with expertise in security, performance, and best practices.

When reviewing code:
- Identify security vulnerabilities
- Check for performance issues
- Verify adherence to coding standards
- Suggest specific improvements

Be thorough but concise in your feedback.""",
                    tools=["Read", "Grep", "Glob"],  # Read-only
                    model="sonnet",
                ),
                "test-runner": AgentDefinition(
                    description="Runs and analyzes test suites. Use for test execution and coverage analysis.",
                    prompt="""You are a test execution specialist. Run tests and provide clear analysis of results.

Focus on:
- Running test commands
- Analyzing test output
- Identifying failing tests
- Suggesting fixes for failures""",
                    tools=["Bash", "Read", "Grep"],  # Bash access for running tests
                ),
            },
        ),
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

### AgentDefinition Configuration

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `description` | `string` | Yes | Natural language description of when to use this agent |
| `prompt` | `string` | Yes | The agent's system prompt defining its role and behavior |
| `tools` | `string[]` | No | Array of allowed tool names. If omitted, inherits all tools |
| `model` | `'sonnet' | 'opus' | 'haiku' | 'inherit'` | No | Model override for this agent |

**Important:** Subagents cannot spawn their own subagents. Don't include `Agent` in a subagent's `tools` array.

## What Subagents Inherit

A subagent's context window starts fresh (no parent conversation) but isn't empty.

| The subagent receives | The subagent does not receive |
| --- | --- |
| Its own system prompt (`AgentDefinition.prompt`) and the Agent tool's prompt | The parent's conversation history or tool results |
| Project CLAUDE.md (loaded via `settingSources`) | Skills (unless listed in `AgentDefinition.skills`, TypeScript only) |
| Tool definitions (inherited from parent, or the subset in `tools`) | The parent's system prompt |

The only channel from parent to subagent is the Agent tool's prompt string — include any file paths, error messages, or decisions the subagent needs directly in that prompt.

## Invoking Subagents

### Automatic Invocation

Claude automatically decides when to invoke subagents based on the task and each subagent's `description`. Write clear, specific descriptions so Claude can match tasks to the right subagent.

### Explicit Invocation

To guarantee Claude uses a specific subagent, mention it by name in your prompt:

```
"Use the code-reviewer agent to check the authentication module"
```

### Dynamic Agent Configuration

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

def create_security_agent(security_level: str) -> AgentDefinition:
    is_strict = security_level == "strict"
    return AgentDefinition(
        description="Security code reviewer",
        prompt=f"You are a {'strict' if is_strict else 'balanced'} security reviewer...",
        tools=["Read", "Grep", "Glob"],
        model="opus" if is_strict else "sonnet",
    )

async def main():
    async for message in query(
        prompt="Review this PR for security issues",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Grep", "Glob", "Agent"],
            agents={
                "security-reviewer": create_security_agent("strict")
            },
        ),
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

## Detecting Subagent Invocation

Subagents are invoked via the Agent tool. Check for `tool_use` blocks where `name` is `"Agent"` (or `"Task"` in older SDK versions).

```python
async for message in query(...):
    if hasattr(message, "content") and message.content:
        for block in message.content:
            if getattr(block, "type", None) == "tool_use" and block.name in ("Task", "Agent"):
                print(f"Subagent invoked: {block.input.get('subagent_type')}")

    if hasattr(message, "parent_tool_use_id") and message.parent_tool_use_id:
        print("  (running inside subagent)")
```

## Resuming Subagents

Subagents can be resumed to continue where they left off. Resumed subagents retain their full conversation history.

TypeScript example:
```typescript
import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";

function extractAgentId(message: SDKMessage): string | undefined {
  if (!("message" in message)) return undefined;
  const content = JSON.stringify(message.message.content);
  const match = content.match(/agentId:\s*([a-f0-9-]+)/);
  return match?.[1];
}

let agentId: string | undefined;
let sessionId: string | undefined;

// First invocation
for await (const message of query({
  prompt: "Use the Explore agent to find all API endpoints in this codebase",
  options: { allowedTools: ["Read", "Grep", "Glob", "Agent"] }
})) {
  if ("session_id" in message) sessionId = message.session_id;
  const extractedId = extractAgentId(message);
  if (extractedId) agentId = extractedId;
  if ("result" in message) console.log(message.result);
}

// Second invocation - resume and ask follow-up
if (agentId && sessionId) {
  for await (const message of query({
    prompt: `Resume agent ${agentId} and list the top 3 most complex endpoints`,
    options: { allowedTools: ["Read", "Grep", "Glob", "Agent"], resume: sessionId }
  })) {
    if ("result" in message) console.log(message.result);
  }
}
```

## Tool Restrictions

| Use case | Tools | Description |
| --- | --- | --- |
| Read-only analysis | `Read`, `Grep`, `Glob` | Can examine code but not modify or execute |
| Test execution | `Bash`, `Read`, `Grep` | Can run commands and analyze output |
| Code modification | `Read`, `Edit`, `Write`, `Grep`, `Glob` | Full read/write access without command execution |
| Full access | All tools | Inherits all tools from parent (omit `tools` field) |

## Troubleshooting

**Claude not delegating to subagents:**
1. Include the Agent tool: `allowedTools: ["...", "Agent"]`
2. Use explicit prompting: "Use the code-reviewer agent to..."
3. Write a clear description explaining exactly when the subagent should be used

**Filesystem-based agents not loading:**
Agents defined in `.claude/agents/` are loaded at startup only. Restart the session to load new files.

**Windows: long prompt failures:**
On Windows, subagents with very long prompts may fail due to command line length limits (8191 chars). Keep prompts concise or use filesystem-based agents.
