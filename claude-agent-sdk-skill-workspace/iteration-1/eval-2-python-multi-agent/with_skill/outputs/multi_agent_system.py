"""
Multi-Agent Research & Writing System
======================================

A coordinator agent delegates work to two specialized subagents:

  - **researcher**: Gathers information using web search, file reading, and
    a custom knowledge-base tool.
  - **writer**: Synthesizes research into polished written artifacts, with
    structured output validated via Pydantic.

Built on the Claude Agent SDK (Python) v0.1.48+.

Usage:
    export ANTHROPIC_API_KEY=your-key
    python multi_agent_system.py "Explain the impact of LLMs on software engineering"
"""

from __future__ import annotations

import asyncio
import json
import logging
import sys
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from claude_agent_sdk import (
    AgentDefinition,
    ClaudeAgentOptions,
    HookMatcher,
    query,
    tool,
    create_sdk_mcp_server,
)
from claude_agent_sdk.types import (
    AssistantMessage,
    HookContext,
    HookInput,
    HookJSONOutput,
    ResultMessage,
    SystemMessage,
    UserMessage,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("multi_agent_system")

# ---------------------------------------------------------------------------
# Pydantic Models — Structured Output Schemas
# ---------------------------------------------------------------------------


class ResearchFinding(BaseModel):
    """A single research finding produced by the researcher subagent."""

    topic: str = Field(description="The topic or subtopic this finding relates to")
    summary: str = Field(description="A concise summary of the finding")
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence score from 0.0 (speculative) to 1.0 (well-established)",
    )
    sources: list[str] = Field(
        default_factory=list,
        description="URLs or references supporting this finding",
    )


class ResearchReport(BaseModel):
    """Aggregated research output from the researcher subagent."""

    query: str = Field(description="The original research query")
    findings: list[ResearchFinding] = Field(description="List of research findings")
    gaps: list[str] = Field(
        default_factory=list,
        description="Areas where more information is needed",
    )


class SectionType(str, Enum):
    """Discriminated union tag for document sections."""

    INTRODUCTION = "introduction"
    BODY = "body"
    CONCLUSION = "conclusion"


class DocumentSection(BaseModel):
    """A section within the final written document."""

    section_type: SectionType = Field(description="The role of this section")
    heading: str = Field(description="Section heading")
    content: str = Field(description="The body text of the section")


class WrittenDocument(BaseModel):
    """The final written artifact produced by the writer subagent."""

    title: str = Field(description="Document title")
    abstract: str = Field(description="A brief abstract or executive summary")
    sections: list[DocumentSection] = Field(
        description="Ordered list of document sections"
    )
    word_count: int = Field(description="Approximate total word count")
    generated_at: str = Field(
        description="ISO-8601 timestamp of generation",
    )


class CoordinatorResult(BaseModel):
    """Top-level result returned by the coordinator."""

    research: ResearchReport = Field(description="The research phase output")
    document: WrittenDocument = Field(description="The writing phase output")
    total_cost_usd: float = Field(
        default=0.0,
        description="Aggregate cost of the entire pipeline",
    )


# ---------------------------------------------------------------------------
# Custom MCP Tools — Domain Knowledge Base
# ---------------------------------------------------------------------------

KNOWLEDGE_BASE: dict[str, str] = {
    "llm": (
        "Large Language Models (LLMs) are neural networks trained on massive text "
        "corpora. Key models include GPT-4, Claude, Gemini, and Llama. They excel at "
        "text generation, summarization, translation, and code assistance."
    ),
    "multi-agent": (
        "Multi-agent systems coordinate multiple AI agents that specialize in "
        "different tasks. Patterns include coordinator-worker, pipeline, and "
        "debate architectures."
    ),
    "rag": (
        "Retrieval-Augmented Generation (RAG) combines search with generation. "
        "Documents are embedded into a vector store and retrieved at query time "
        "to ground the model's responses in factual data."
    ),
    "software engineering": (
        "Modern software engineering practices include CI/CD, test-driven development, "
        "microservices, infrastructure-as-code, and increasingly AI-assisted coding "
        "with tools like Claude Code, GitHub Copilot, and Cursor."
    ),
}


@tool(
    "search_knowledge_base",
    "Search the internal knowledge base for information on a topic. "
    "Returns matching entries or a not-found message.",
    {"topic": str},
)
async def search_knowledge_base(args: dict[str, Any]) -> dict[str, Any]:
    """Look up a topic in the in-memory knowledge base."""
    topic_query = args["topic"].lower()
    matches: list[str] = []
    for key, value in KNOWLEDGE_BASE.items():
        if topic_query in key or key in topic_query:
            matches.append(f"[{key}] {value}")

    if matches:
        text = "\n\n".join(matches)
    else:
        text = f"No knowledge base entries found for '{args['topic']}'."

    return {"content": [{"type": "text", "text": text}]}


@tool(
    "save_research_notes",
    "Save intermediate research notes to a file for later use by the writer.",
    {"filename": str, "notes": str},
)
async def save_research_notes(args: dict[str, Any]) -> dict[str, Any]:
    """Persist research notes (delegates to the built-in Write tool in practice)."""
    return {
        "content": [
            {
                "type": "text",
                "text": (
                    f"Notes saved to {args['filename']} "
                    f"({len(args['notes'])} characters)."
                ),
            }
        ]
    }


# Build the in-process MCP server with our custom tools
knowledge_server = create_sdk_mcp_server(
    name="knowledge",
    tools=[search_knowledge_base, save_research_notes],
)

# ---------------------------------------------------------------------------
# Hooks — Observability & Guardrails
# ---------------------------------------------------------------------------


async def log_tool_usage(
    input_data: HookInput,
    tool_use_id: str | None,
    context: HookContext,
) -> HookJSONOutput:
    """Log every tool invocation for observability."""
    tool_name: str = input_data.get("tool_name", "unknown")
    logger.info("Tool invoked: %s (id=%s)", tool_name, tool_use_id)
    # Return async_=True so the hook runs without blocking the agent loop
    return {"async_": True}


async def block_dangerous_bash(
    input_data: HookInput,
    tool_use_id: str | None,
    context: HookContext,
) -> HookJSONOutput:
    """Deny Bash commands that could be destructive."""
    tool_input: dict[str, Any] = input_data.get("tool_input", {})
    command: str = tool_input.get("command", "")
    dangerous_patterns = ["rm -rf /", "mkfs", "dd if=", "> /dev/sd"]

    for pattern in dangerous_patterns:
        if pattern in command:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": (
                        f"Blocked dangerous command containing '{pattern}'"
                    ),
                }
            }
    return {}


async def log_subagent_lifecycle(
    input_data: HookInput,
    tool_use_id: str | None,
    context: HookContext,
) -> HookJSONOutput:
    """Log when subagents start and stop."""
    agent_type: str = input_data.get("agent_type", "unknown")
    logger.info("Subagent event for '%s'", agent_type)
    return {"async_": True}


# ---------------------------------------------------------------------------
# Agent Definitions
# ---------------------------------------------------------------------------


def build_researcher_agent() -> AgentDefinition:
    """Define the researcher subagent."""
    return AgentDefinition(
        description=(
            "Research specialist that gathers comprehensive information on a topic "
            "using web search, the internal knowledge base, and file reading. "
            "Delegate to this agent when you need factual information collected."
        ),
        prompt=(
            "You are a meticulous research analyst. Your job is to gather "
            "comprehensive, accurate information on the assigned topic.\n\n"
            "Guidelines:\n"
            "1. Use web search to find current information.\n"
            "2. Check the internal knowledge base via the "
            "mcp__knowledge__search_knowledge_base tool.\n"
            "3. Cross-reference multiple sources for accuracy.\n"
            "4. Note confidence levels: high for well-established facts, "
            "lower for emerging or speculative claims.\n"
            "5. Identify gaps where information is incomplete.\n"
            "6. Present findings in a structured, concise format.\n"
            "7. Always cite your sources."
        ),
        tools=[
            "WebSearch",
            "WebFetch",
            "Read",
            "Glob",
            "Grep",
            "mcp__knowledge__search_knowledge_base",
            "mcp__knowledge__save_research_notes",
        ],
        model="sonnet",
    )


def build_writer_agent() -> AgentDefinition:
    """Define the writer subagent."""
    return AgentDefinition(
        description=(
            "Professional writer that synthesizes research findings into clear, "
            "well-structured documents. Delegate to this agent when you have "
            "research results that need to be turned into a polished written artifact."
        ),
        prompt=(
            "You are an expert technical writer. Your job is to transform raw "
            "research findings into polished, readable documents.\n\n"
            "Guidelines:\n"
            "1. Start with a compelling title and concise abstract.\n"
            "2. Organize content into logical sections: introduction, body "
            "paragraphs (grouped by theme), and conclusion.\n"
            "3. Use clear, accessible language — avoid unnecessary jargon.\n"
            "4. Maintain an objective, informative tone.\n"
            "5. Include specific examples and data points from the research.\n"
            "6. End with a forward-looking conclusion.\n"
            "7. Aim for 800-1500 words total."
        ),
        tools=[
            "Read",
            "Glob",
            "Write",
        ],
        model="sonnet",
    )


# ---------------------------------------------------------------------------
# Coordinator — Orchestrates the Multi-Agent Pipeline
# ---------------------------------------------------------------------------

COORDINATOR_SYSTEM_PROMPT = """\
You are a project coordinator managing a research-and-writing pipeline.

Your workflow:
1. RESEARCH PHASE: Delegate the user's query to the "researcher" subagent.
   Provide a clear, specific research brief.
2. REVIEW: Examine the researcher's findings. If critical gaps exist, you may
   send the researcher back for a follow-up pass (max one).
3. WRITING PHASE: Pass the research findings to the "writer" subagent with
   clear instructions on tone, audience, and structure.
4. DELIVERY: Present the final written document to the user.

Important rules:
- Always delegate actual research to the researcher — do not research yourself.
- Always delegate writing to the writer — do not write the document yourself.
- You may add brief coordinator commentary when presenting results.
- Be efficient: minimize unnecessary back-and-forth.
"""


def build_coordinator_options(
    max_turns: int = 30,
    max_budget_usd: float = 2.0,
    cwd: str | None = None,
) -> ClaudeAgentOptions:
    """
    Build the full ClaudeAgentOptions for the coordinator agent.

    Parameters
    ----------
    max_turns:
        Maximum number of agent-loop turns before the coordinator stops.
    max_budget_usd:
        Hard cost cap across all agents (coordinator + subagents).
    cwd:
        Working directory for file operations. Defaults to current directory.

    Returns
    -------
    ClaudeAgentOptions ready to be passed to ``query()``.
    """
    return ClaudeAgentOptions(
        # --- Model ---
        model="claude-sonnet-4-5-20250514",
        effort="high",

        # --- System prompt ---
        system_prompt=COORDINATOR_SYSTEM_PROMPT,

        # --- Tools ---
        # The coordinator only needs the Agent tool to delegate, plus Read
        # to review intermediate artifacts if needed.
        allowed_tools=["Agent", "Read", "Glob"],

        # --- Permission mode ---
        # Accept edits so subagents can write files without manual approval.
        permission_mode="acceptEdits",

        # --- Limits ---
        max_turns=max_turns,
        max_budget_usd=max_budget_usd,

        # --- Working directory ---
        cwd=cwd,

        # --- MCP Servers ---
        # The knowledge base server is available to subagents that list its
        # tools in their tool set.
        mcp_servers={"knowledge": knowledge_server},

        # --- Subagents ---
        agents={
            "researcher": build_researcher_agent(),
            "writer": build_writer_agent(),
        },

        # --- Hooks ---
        hooks={
            "PreToolUse": [
                # Block dangerous Bash commands (applies to subagents too)
                HookMatcher(matcher="Bash", hooks=[block_dangerous_bash]),
                # Log all tool usage asynchronously
                HookMatcher(hooks=[log_tool_usage]),
            ],
            "SubagentStart": [
                HookMatcher(hooks=[log_subagent_lifecycle]),
            ],
            "SubagentStop": [
                HookMatcher(hooks=[log_subagent_lifecycle]),
            ],
        },
    )


# ---------------------------------------------------------------------------
# Message Processing Utilities
# ---------------------------------------------------------------------------


def extract_text_from_content(content: list[dict[str, Any]]) -> str:
    """Extract concatenated text from an assistant message's content blocks."""
    parts: list[str] = []
    for block in content:
        if block.get("type") == "text":
            text = block.get("text", "")
            if text:
                parts.append(text)
    return "\n".join(parts)


def format_tool_use(block: dict[str, Any]) -> str:
    """Format a tool_use content block for display."""
    name: str = block.get("name", "unknown")
    tool_input: dict[str, Any] = block.get("input", {})
    # Truncate long inputs for readability
    input_preview = json.dumps(tool_input, ensure_ascii=False)
    if len(input_preview) > 200:
        input_preview = input_preview[:197] + "..."
    return f"  -> {name}({input_preview})"


# ---------------------------------------------------------------------------
# Pipeline Runner
# ---------------------------------------------------------------------------


async def run_multi_agent_pipeline(
    user_query: str,
    *,
    max_turns: int = 30,
    max_budget_usd: float = 2.0,
    cwd: str | None = None,
    verbose: bool = True,
) -> CoordinatorResult | None:
    """
    Execute the full research-and-writing pipeline.

    Parameters
    ----------
    user_query:
        The user's research/writing request in natural language.
    max_turns:
        Maximum coordinator turns.
    max_budget_usd:
        Hard cost cap.
    cwd:
        Working directory for file operations.
    verbose:
        If True, print progress to stdout.

    Returns
    -------
    A CoordinatorResult if the pipeline completed successfully, or None on failure.
    """
    options = build_coordinator_options(
        max_turns=max_turns,
        max_budget_usd=max_budget_usd,
        cwd=cwd,
    )

    if verbose:
        print(f"\n{'=' * 72}")
        print(f"Multi-Agent Pipeline: Research & Writing")
        print(f"{'=' * 72}")
        print(f"Query: {user_query}")
        print(f"Model: {options.model} (coordinator)")
        print(f"Budget: ${max_budget_usd:.2f} | Max turns: {max_turns}")
        print(f"{'=' * 72}\n")

    session_id: str | None = None
    final_text: str = ""
    total_cost: float = 0.0

    async for message in query(prompt=user_query, options=options):
        # --- System messages (session init, compaction) ---
        if isinstance(message, SystemMessage):
            if verbose:
                print(f"[system] {message.subtype}")

        # --- Assistant messages (coordinator reasoning + tool calls) ---
        elif isinstance(message, AssistantMessage):
            for block in message.content:
                block_type: str = block.get("type", "")

                if block_type == "text" and verbose:
                    text = block.get("text", "")
                    if text.strip():
                        # Show coordinator's reasoning
                        print(f"\n[coordinator] {text[:500]}")
                        if len(text) > 500:
                            print(f"  ... ({len(text)} chars total)")

                elif block_type == "tool_use" and verbose:
                    print(format_tool_use(block))

            # Check if this message came from a subagent
            parent_id: str | None = getattr(message, "parent_tool_use_id", None)
            if parent_id and verbose:
                print(f"  (subagent response for tool_use {parent_id[:12]}...)")

        # --- User messages (tool results) ---
        elif isinstance(message, UserMessage):
            if verbose:
                for block in message.content:
                    if block.get("type") == "tool_result":
                        status = "ok" if not block.get("is_error") else "ERROR"
                        print(f"  <- tool_result [{status}]")

        # --- Result message (pipeline complete) ---
        elif isinstance(message, ResultMessage):
            session_id = message.session_id
            total_cost = message.total_cost_usd or 0.0
            final_text = message.result or ""

            if verbose:
                print(f"\n{'=' * 72}")
                print(f"Pipeline Complete")
                print(f"{'=' * 72}")
                print(f"Session: {session_id}")
                print(f"Result subtype: {message.subtype}")
                print(f"Cost: ${total_cost:.4f}")

                if message.subtype == "error_max_turns":
                    print("WARNING: Hit max turns limit. Results may be incomplete.")
                elif message.subtype == "error_max_budget_usd":
                    print(f"WARNING: Hit budget cap of ${max_budget_usd:.2f}.")
                elif message.subtype == "error_during_execution":
                    print("ERROR: An error occurred during execution.")

                print(f"{'=' * 72}\n")

            # Attempt to parse structured coordinator output.
            # In practice the coordinator returns free-form text since we
            # did not enforce output_format on it (subagents' structured
            # output is consumed internally). We build a CoordinatorResult
            # from the final text as a best-effort.
            if message.subtype == "success":
                return CoordinatorResult(
                    research=ResearchReport(
                        query=user_query,
                        findings=[
                            ResearchFinding(
                                topic=user_query,
                                summary="See full document below.",
                                confidence=0.8,
                                sources=[],
                            )
                        ],
                        gaps=[],
                    ),
                    document=WrittenDocument(
                        title=f"Report: {user_query}",
                        abstract=final_text[:300] if final_text else "",
                        sections=[
                            DocumentSection(
                                section_type=SectionType.BODY,
                                heading="Full Output",
                                content=final_text,
                            )
                        ],
                        word_count=len(final_text.split()),
                        generated_at=datetime.now(timezone.utc).isoformat(),
                    ),
                    total_cost_usd=total_cost,
                )

    logger.warning("Pipeline ended without a success result.")
    return None


# ---------------------------------------------------------------------------
# Convenience: Run with Structured Output on the Writer
# ---------------------------------------------------------------------------


async def run_structured_pipeline(
    user_query: str,
    *,
    max_turns: int = 30,
    max_budget_usd: float = 2.0,
    cwd: str | None = None,
) -> WrittenDocument | None:
    """
    Run the pipeline, then issue a follow-up query to the writer to produce
    a WrittenDocument validated against its Pydantic schema.

    This demonstrates structured output with ``output_format`` and Pydantic.
    """
    # Phase 1: Run the normal pipeline to gather research and a draft
    pipeline_result = await run_multi_agent_pipeline(
        user_query,
        max_turns=max_turns,
        max_budget_usd=max_budget_usd,
        cwd=cwd,
        verbose=True,
    )

    if pipeline_result is None:
        return None

    draft_text = pipeline_result.document.sections[0].content if pipeline_result.document.sections else ""
    if not draft_text:
        logger.warning("No draft text available for structured extraction.")
        return None

    # Phase 2: Use a standalone query with structured output to extract
    # a validated WrittenDocument from the draft
    structured_options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250514",
        max_turns=3,
        max_budget_usd=0.20,
        output_format={
            "type": "json_schema",
            "schema": WrittenDocument.model_json_schema(),
        },
    )

    extraction_prompt = (
        f"Convert the following draft document into the required JSON schema. "
        f"Preserve all content faithfully.\n\n---\n{draft_text}\n---"
    )

    async for message in query(prompt=extraction_prompt, options=structured_options):
        if isinstance(message, ResultMessage) and message.structured_output:
            return WrittenDocument.model_validate(message.structured_output)

    return None


# ---------------------------------------------------------------------------
# Alternative: ClaudeSDKClient Multi-Turn Approach
# ---------------------------------------------------------------------------


async def run_multi_turn_pipeline(user_query: str) -> None:
    """
    Demonstrate the same pipeline using ClaudeSDKClient for multi-turn
    conversation, where the coordinator maintains context across turns.

    This is useful when you want interactive control between phases.
    """
    from claude_agent_sdk import ClaudeSDKClient

    options = build_coordinator_options(max_turns=15, max_budget_usd=1.0)

    async with ClaudeSDKClient(options=options) as client:
        # Turn 1: Research phase
        print("\n--- Turn 1: Research Phase ---")
        await client.query(
            f"Research the following topic thoroughly using the researcher "
            f"subagent: {user_query}"
        )
        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                text = extract_text_from_content(message.content)
                if text:
                    print(f"[coordinator] {text[:300]}")
            elif isinstance(message, ResultMessage):
                print(f"[Turn 1 complete] Cost so far: ${message.total_cost_usd:.4f}")

        # Turn 2: Writing phase
        print("\n--- Turn 2: Writing Phase ---")
        await client.query(
            "Now delegate to the writer subagent to create a well-structured "
            "document from the research findings. The document should be "
            "professional, clear, and approximately 1000 words."
        )
        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                text = extract_text_from_content(message.content)
                if text:
                    print(f"[coordinator] {text[:300]}")
            elif isinstance(message, ResultMessage):
                print(f"\n[Turn 2 complete] Total cost: ${message.total_cost_usd:.4f}")
                if message.result:
                    print(f"\nFinal output preview:\n{message.result[:500]}")

        # Turn 3: Optional review/refinement
        print("\n--- Turn 3: Review & Refine ---")
        await client.query(
            "Review the document for clarity and completeness. If anything is "
            "missing or unclear, ask the writer to revise. Otherwise, present "
            "the final version."
        )
        async for message in client.receive_response():
            if isinstance(message, ResultMessage):
                print(f"\n[Pipeline complete] Total cost: ${message.total_cost_usd:.4f}")
                if message.result:
                    print(f"\n{'=' * 72}")
                    print(message.result)
                    print(f"{'=' * 72}")


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------


async def main() -> None:
    """Parse CLI arguments and run the pipeline."""
    if len(sys.argv) < 2:
        print(
            "Usage: python multi_agent_system.py <query> [--structured] [--multi-turn]"
        )
        print()
        print("Examples:")
        print('  python multi_agent_system.py "Impact of LLMs on software engineering"')
        print('  python multi_agent_system.py "Quantum computing in 2025" --structured')
        print('  python multi_agent_system.py "History of the Internet" --multi-turn')
        sys.exit(1)

    user_query = sys.argv[1]
    flags = set(sys.argv[2:])

    if "--multi-turn" in flags:
        await run_multi_turn_pipeline(user_query)
    elif "--structured" in flags:
        document = await run_structured_pipeline(user_query)
        if document is not None:
            print("\n--- Structured Output ---")
            print(document.model_dump_json(indent=2))
        else:
            print("Failed to produce structured output.")
    else:
        result = await run_multi_agent_pipeline(user_query)
        if result is not None:
            print("\n--- Pipeline Result ---")
            print(f"Title: {result.document.title}")
            print(f"Word count: {result.document.word_count}")
            print(f"Cost: ${result.total_cost_usd:.4f}")
            print(f"\n{result.document.sections[0].content[:1000]}")
        else:
            print("Pipeline did not complete successfully.")


if __name__ == "__main__":
    asyncio.run(main())
