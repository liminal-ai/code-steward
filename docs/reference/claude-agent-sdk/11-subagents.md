# Subagents

Subagents are isolated child agents spawned by a parent agent to handle specific tasks.

## Key Properties

- **Isolated context** - Subagents have their own context window (no parent history)
- **Parent receives summary** - Only the subagent's final message is returned to parent
- **No nesting** - Subagents cannot spawn their own subagents
- **Restricted tools** - Can limit which tools subagents can use
- **Model override** - Can run subagents on different models (cheaper/faster)
- **Resumable** - Subagents can be resumed via agent ID

---

## Defining Subagents

### Python

```python
from claude_agent_sdk import AgentDefinition, ClaudeAgentOptions

options = ClaudeAgentOptions(
    allowed_tools=["Read", "Grep", "Glob", "Agent"],  # Agent tool required!
    agents={
        "code-reviewer": AgentDefinition(
            description="Expert code reviewer for quality and security analysis.",
            prompt="You are a senior code reviewer. Analyze code for bugs, security issues, and quality problems. Be thorough but concise.",
            tools=["Read", "Glob", "Grep"],  # Restricted tool set
            model="sonnet",                    # Use faster/cheaper model
        ),
        "test-writer": AgentDefinition(
            description="Test writer that creates comprehensive test suites.",
            prompt="You are a test engineering specialist. Write thorough unit and integration tests.",
            tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
            model="opus",  # Use most capable model
        ),
        "researcher": AgentDefinition(
            description="Research agent for exploring codebases and documentation.",
            prompt="You are a research specialist. Thoroughly explore and document findings.",
            tools=["Read", "Glob", "Grep", "WebSearch", "WebFetch"],
            model="haiku",  # Use cheapest model for exploration
        ),
    },
)
```

### TypeScript

```typescript
const options = {
  allowedTools: ["Read", "Grep", "Glob", "Agent"],
  agents: {
    "code-reviewer": {
      description: "Expert code reviewer for quality and security analysis.",
      prompt: "You are a senior code reviewer...",
      tools: ["Read", "Glob", "Grep"],
      model: "sonnet",
    },
  },
};
```

---

## AgentDefinition Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | `string` | Yes | When to use this agent (shown to parent) |
| `prompt` | `string` | Yes | Agent's system prompt / instructions |
| `tools` | `list[str]` | No | Allowed tools (inherits all parent tools if omitted) |
| `model` | `"sonnet" \| "opus" \| "haiku" \| "inherit"` | No | Model override (`"inherit"` = parent's model) |

---

## How the Parent Invokes Subagents

The parent agent uses the built-in `Agent` tool to spawn subagents. You don't call subagents directly - Claude decides when to use them based on the `description`:

```python
# The parent sees your agent definitions and may invoke them like:
# Tool: Agent
# Input: {
#   "prompt": "Review the auth module for security issues",
#   "subagent_type": "code-reviewer",
#   "description": "Security review of auth"
# }
```

---

## Identifying Subagent Messages

```python
async for message in query(prompt="Review and test this code", options=options):
    if hasattr(message, "parent_tool_use_id") and message.parent_tool_use_id:
        print(f"[Subagent] {message}")
    else:
        print(f"[Main] {message}")
```

---

## Resuming Subagents

Subagents return an agent ID that can be used to resume them:

```python
# Parent agent can resume a subagent:
# Tool: Agent
# Input: {
#   "prompt": "Continue where you left off",
#   "resume": "agent-id-from-previous-run"
# }
```

---

## Patterns

### Parallel Research
```python
agents={
    "frontend-explorer": AgentDefinition(
        description="Explore frontend code and React components.",
        prompt="You specialize in React/TypeScript frontend code...",
        tools=["Read", "Glob", "Grep"],
        model="haiku",
    ),
    "backend-explorer": AgentDefinition(
        description="Explore backend code, APIs, and database schemas.",
        prompt="You specialize in backend services and databases...",
        tools=["Read", "Glob", "Grep"],
        model="haiku",
    ),
}
```

### Review-Then-Fix Pipeline
```python
agents={
    "reviewer": AgentDefinition(
        description="Review code for issues before making changes.",
        prompt="Analyze code and report issues. Do not make changes.",
        tools=["Read", "Glob", "Grep"],
        model="sonnet",
    ),
    "fixer": AgentDefinition(
        description="Fix code issues identified by reviews.",
        prompt="Apply fixes based on review findings.",
        tools=["Read", "Edit", "Write", "Bash"],
        model="opus",
    ),
}
```

### Cost-Optimized Triage
```python
agents={
    "triage": AgentDefinition(
        description="Quick triage and classification of issues.",
        prompt="Quickly assess and classify the issue...",
        tools=["Read", "Glob"],
        model="haiku",           # Cheap: $0.25/$1.25 per MTok
    ),
    "deep-analysis": AgentDefinition(
        description="Deep analysis requiring careful reasoning.",
        prompt="Perform thorough analysis...",
        tools=["Read", "Glob", "Grep", "Bash"],
        model="opus",            # Expensive but thorough
    ),
}
```
