# Subagents Reference

## Key Properties

- **Isolated context** — own context window, no parent history
- **Summary only** — parent receives only subagent's final message
- **No nesting** — subagents cannot spawn their own subagents
- **Restricted tools** — limit which tools subagents can use
- **Model override** — run on different models for cost/speed
- **Resumable** — can be resumed via agent ID

---

## AgentDefinition

```typescript
const options = {
  allowedTools: ["Read", "Grep", "Glob", "Agent"],  // Agent tool required!
  agents: {
    "code-reviewer": {
      description: "Expert code reviewer for quality and security analysis.",
      prompt: "You are a senior code reviewer. Analyze for bugs, security issues, and quality.",
      tools: ["Read", "Glob", "Grep"],     // Restricted tool set
      model: "sonnet",                      // Model override
    },
    "test-writer": {
      description: "Test writer that creates comprehensive test suites.",
      prompt: "You are a test engineering specialist. Write thorough tests.",
      tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
      model: "opus",
    },
    "researcher": {
      description: "Research agent for exploring codebases and documentation.",
      prompt: "Thoroughly explore and document findings.",
      tools: ["Read", "Glob", "Grep", "WebSearch", "WebFetch"],
      model: "haiku",
    },
  },
};
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | `string` | Yes | When to use (shown to parent Claude) |
| `prompt` | `string` | Yes | System prompt / instructions |
| `tools` | `string[]` | No | Allowed tools (inherits all if omitted) |
| `model` | `string` | No | `"sonnet"`, `"opus"`, `"haiku"`, `"inherit"` |

---

## How Invocation Works

The parent agent decides when to spawn subagents based on the `description`. You don't call them directly — Claude uses the built-in `Agent` tool:

```json
{
  "prompt": "Review the auth module for security issues",
  "subagent_type": "code-reviewer",
  "description": "Security review of auth"
}
```

---

## Identifying Subagent Messages

Messages from subagents include `parentToolUseId`:

```typescript
for await (const msg of query({ prompt: "...", options })) {
  if (msg.parentToolUseId) {
    console.log(`[Subagent] ${msg}`);
  } else {
    console.log(`[Main] ${msg}`);
  }
}
```

---

## Orchestration Patterns

### Parallel Research
```typescript
agents: {
  "frontend-explorer": {
    description: "Explore React/TypeScript frontend code.",
    prompt: "Specialize in frontend analysis...",
    tools: ["Read", "Glob", "Grep"],
    model: "haiku",
  },
  "backend-explorer": {
    description: "Explore backend APIs and database schemas.",
    prompt: "Specialize in backend analysis...",
    tools: ["Read", "Glob", "Grep"],
    model: "haiku",
  },
}
```

### Review-Then-Fix Pipeline
```typescript
agents: {
  reviewer: {
    description: "Review code for issues before changes.",
    prompt: "Analyze and report issues. Do not make changes.",
    tools: ["Read", "Glob", "Grep"],
    model: "sonnet",
  },
  fixer: {
    description: "Fix issues identified by reviews.",
    prompt: "Apply fixes based on review findings.",
    tools: ["Read", "Edit", "Write", "Bash"],
    model: "opus",
  },
}
```

### Cost-Optimized Triage
```typescript
agents: {
  triage: {
    description: "Quick triage and classification.",
    prompt: "Quickly assess and classify...",
    tools: ["Read", "Glob"],
    model: "haiku",            // Cheapest
  },
  "deep-analysis": {
    description: "Deep analysis requiring careful reasoning.",
    prompt: "Perform thorough analysis...",
    tools: ["Read", "Glob", "Grep", "Bash"],
    model: "opus",             // Most capable
  },
}
```

---

## Resuming Subagents

Subagents return an agent ID. The parent can resume them:

```json
{
  "prompt": "Continue where you left off",
  "resume": "agent-id-from-previous-run"
}
```
