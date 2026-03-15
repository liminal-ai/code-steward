# Multi-Agent System -- Summary

## Approach

The system follows a **coordinator-delegates-to-subagents** pattern, which is the canonical multi-agent architecture supported by the Claude Agent SDK. A single top-level Coordinator agent receives user requests and orchestrates two specialist subagents -- a Researcher and a Writer -- by invoking them through the SDK's tool abstraction.

### Architecture

```
User Request
     |
     v
+-----------------+
|  Coordinator    |  (top-level agent; owns the conversation)
|  Agent          |
+----+-------+----+
     |       |
     v       v
+--------+ +--------+
|Research| | Writer  |
| Agent  | | Agent   |
+--------+ +--------+
```

1. **Coordinator Agent** -- Analyses the user request, plans the workflow, calls `research` to gather material, then calls `write` to produce polished output.
2. **Researcher Agent** -- Receives a research query and depth parameter; returns structured findings with key facts, context, and a summary.
3. **Writer Agent** -- Receives a topic, research notes, format, tone, and word-count target; returns publication-ready prose.

## SDK Features Used

| Feature | Where Used | Purpose |
|---|---|---|
| `Agent` + `AgentConfig` | All three agents | Core agent definition with model, token limits, and system prompts |
| `Tool` (class-based) | `ResearcherTool`, `WriterTool` | Expose subagents as callable tools with typed JSON-schema inputs |
| `@tool` decorator | `research_fn`, `write_fn` | Alternative function-based tool definitions (shown for reference) |
| `agent.run()` | Subagent invocations | Synchronous (non-streaming) subagent execution |
| `agent.run_stream()` | Coordinator streaming | Stream coordinator output token-by-token to stdout |
| `Message` | Return type handling | Typed response container from agent runs |
| System prompts | Each agent | Behavioural guardrails and role specialisation |
| Tool `input_schema` | Class-based tools | JSON Schema validation of tool inputs |

## Design Decisions

- **Subagents as tools**: Rather than having agents communicate via shared memory or message queues, each subagent is wrapped in a `Tool` that the Coordinator calls. This keeps the delegation explicit and auditable.
- **Two tool patterns shown**: The class-based `Tool` subclass gives full control over the JSON schema and execution logic. The `@tool` decorator offers a more concise alternative. Both are production-valid; the class-based pattern is used by default.
- **Streaming at the top level**: The Coordinator streams its output so the user sees incremental progress, while subagent calls run non-streaming internally for simplicity.
- **Factory functions for agents**: `_build_researcher_agent()` and `_build_writer_agent()` are factory functions rather than module-level singletons, making them easy to reconfigure or inject in tests.

## How to Run

```bash
pip install anthropic claude-code-sdk
export ANTHROPIC_API_KEY="sk-ant-..."
python multi_agent_system.py
```

The example request asks for a blog post about quantum computing. The Coordinator will call the Researcher first, then pass the findings to the Writer, and finally present the polished output.
