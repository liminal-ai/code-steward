# Multi-Agent System: Summary

## Approach

The system implements a **coordinator-delegate pattern** where a single coordinator agent orchestrates two specialized subagents through the Claude Agent SDK's built-in `Agent` tool and `AgentDefinition` API.

### Architecture

```
User Query
    |
    v
[Coordinator Agent]  (claude-sonnet-4-5, effort=high)
    |         |
    v         v
[Researcher]  [Writer]
  (sonnet)     (sonnet)
```

1. **Coordinator** receives the user's request and delegates to subagents in sequence: research first, then writing.
2. **Researcher** gathers information using web search, file reading, and a custom knowledge-base MCP tool.
3. **Writer** transforms research findings into a structured, polished document.

## SDK Features Used

| Feature | How It Is Used |
|---------|---------------|
| **`query()`** | Primary async iterator API for running the coordinator agent loop |
| **`ClaudeAgentOptions`** | Full typed configuration: model, tools, limits, hooks, agents, MCP servers, permission mode |
| **`AgentDefinition`** | Defines the researcher and writer subagents with description, prompt, restricted tool sets, and model overrides |
| **`Agent` built-in tool** | The coordinator uses this to spawn subagents; Claude decides when to invoke each based on the `description` field |
| **Custom MCP tools** | `search_knowledge_base` and `save_research_notes` defined via `@tool` decorator and `create_sdk_mcp_server` |
| **Hooks (`PreToolUse`, `SubagentStart`, `SubagentStop`)** | `HookMatcher` with typed hook functions for logging all tool usage, blocking dangerous Bash commands, and tracking subagent lifecycle |
| **Structured output** | Pydantic models (`WrittenDocument`, `ResearchReport`) with `output_format` using `model_json_schema()` for schema-validated JSON extraction |
| **`ClaudeSDKClient`** | Alternative multi-turn approach demonstrated in `run_multi_turn_pipeline()` using the stateful client with `async with`, `query()`, and `receive_response()` |
| **Message type handling** | `isinstance` checks against `SystemMessage`, `AssistantMessage`, `UserMessage`, `ResultMessage` for proper message processing |
| **Cost tracking** | `total_cost_usd` from `ResultMessage` tracked and reported at pipeline completion |
| **Error/result subtypes** | Handles `success`, `error_max_turns`, `error_max_budget_usd`, and `error_during_execution` result subtypes |
| **Permission mode** | `acceptEdits` so subagents can write files without manual approval |
| **Session management** | Captures `session_id` from results (available for resume/fork in subsequent runs) |

## Key Design Decisions

- **Coordinator does not research or write itself.** The system prompt explicitly instructs it to delegate all substantive work to the appropriate subagent. This enforces separation of concerns.
- **Subagents have restricted tool sets.** The researcher gets search and read tools; the writer gets read and write tools. Neither gets Bash, limiting the blast radius.
- **Model selection is intentional.** The coordinator and subagents all use Sonnet for a balance of capability and cost. The `model` field in `AgentDefinition` could be changed to `"haiku"` for cheaper subagents or `"opus"` for harder tasks.
- **Hooks provide observability without blocking.** Tool-logging hooks return `{"async_": True}` so they execute asynchronously. The Bash-blocking hook returns synchronously with a deny decision.
- **Three execution modes** are provided: single-shot pipeline (`run_multi_agent_pipeline`), structured output extraction (`run_structured_pipeline`), and interactive multi-turn (`run_multi_turn_pipeline`).

## File

- `multi_agent_system.py` -- Complete, single-file implementation. Requires `claude-agent-sdk>=0.1.48` and `pydantic>=2.0`.
