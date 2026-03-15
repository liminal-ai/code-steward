"""
Multi-Agent System using the Claude Agent SDK (Python).

Architecture:
  - Coordinator Agent: receives a user request, delegates research tasks
    to a Researcher subagent an writing tasks to a Writer subagent, then
    synthesizes their outputs into a final response.
  - Researcher Agent: specialises in gathering, analysing, and summarising
    information on a given topic.
  - Writer Agent: specialises in producing well-structured, polished prose
    from raw research notes.

The SDK's recommended delegation pattern is to expose each subagent as a
*tool* that the coordinator can call.  The coordinator's system prompt
instructs it when and how to use each tool.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import anthropic
from claude_code_sdk import (
    Agent,
    AgentConfig,
    Message,
    Tool,
    tool,
)


# ---------------------------------------------------------------------------
# 1. Define tools that wrap the subagents
# ---------------------------------------------------------------------------

class ResearcherTool(Tool):
    """Tool that delegates a research query to the Researcher subagent."""

    name: str = "research"
    description: str = (
        "Delegate a research task to the Researcher subagent. "
        "Provide a clear research question or topic. "
        "Returns structured research findings."
    )

    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The research question or topic to investigate.",
            },
            "depth": {
                "type": "string",
                "enum": ["brief", "standard", "deep"],
                "description": "How thorough the research should be.",
                "default": "standard",
            },
        },
        "required": ["query"],
    }

    async def run(self, input: dict[str, Any]) -> str:
        """Execute the Researcher subagent and return its findings."""
        query: str = input["query"]
        depth: str = input.get("depth", "standard")

        researcher = _build_researcher_agent()
        user_message = (
            f"Research the following topic at '{depth}' depth:\n\n{query}\n\n"
            "Provide your findings in a structured format with:\n"
            "- Key facts and data points\n"
            "- Important context\n"
            "- Relevant sources or references where applicable\n"
            "- A concise summary"
        )
        result: Message = await researcher.run(user_message)
        return result.content


class WriterTool(Tool):
    """Tool that delegates a writing task to the Writer subagent."""

    name: str = "write"
    description: str = (
        "Delegate a writing task to the Writer subagent. "
        "Provide the topic, raw research notes, and desired format. "
        "Returns polished, well-structured prose."
    )

    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "topic": {
                "type": "string",
                "description": "The subject of the piece to write.",
            },
            "research_notes": {
                "type": "string",
                "description": "Raw research findings to incorporate.",
            },
            "format": {
                "type": "string",
                "enum": ["article", "report", "summary", "essay", "blog_post"],
                "description": "The desired output format.",
                "default": "article",
            },
            "tone": {
                "type": "string",
                "enum": ["formal", "conversational", "technical", "persuasive"],
                "description": "The desired tone of the writing.",
                "default": "formal",
            },
            "max_words": {
                "type": "integer",
                "description": "Approximate maximum word count.",
                "default": 1000,
            },
        },
        "required": ["topic", "research_notes"],
    }

    async def run(self, input: dict[str, Any]) -> str:
        """Execute the Writer subagent and return the finished piece."""
        topic: str = input["topic"]
        research_notes: str = input["research_notes"]
        fmt: str = input.get("format", "article")
        tone: str = input.get("tone", "formal")
        max_words: int = input.get("max_words", 1000)

        writer = _build_writer_agent()
        user_message = (
            f"Write a {fmt} about the following topic in a {tone} tone.\n"
            f"Target length: ~{max_words} words.\n\n"
            f"## Topic\n{topic}\n\n"
            f"## Research Notes\n{research_notes}\n\n"
            "Produce polished, publication-ready prose. Use clear headings, "
            "smooth transitions, and ensure factual accuracy based on the "
            "research notes provided."
        )
        result: Message = await writer.run(user_message)
        return result.content


# ---------------------------------------------------------------------------
# 2. Build individual agents
# ---------------------------------------------------------------------------

def _build_researcher_agent() -> Agent:
    """Construct the Researcher subagent."""
    return Agent(
        config=AgentConfig(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system_prompt=(
                "You are a meticulous Research Analyst. Your sole purpose is "
                "to gather, verify, and structure information on a given topic.\n\n"
                "Guidelines:\n"
                "- Present facts clearly, with bullet points where appropriate.\n"
                "- Distinguish between well-established facts and uncertain claims.\n"
                "- Cite sources or note when a claim needs verification.\n"
                "- Provide a brief executive summary at the end.\n"
                "- Be thorough but concise -- avoid filler."
            ),
        ),
    )


def _build_writer_agent() -> Agent:
    """Construct the Writer subagent."""
    return Agent(
        config=AgentConfig(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system_prompt=(
                "You are an expert Writer and Editor. Your sole purpose is to "
                "transform raw research notes into polished, engaging prose.\n\n"
                "Guidelines:\n"
                "- Write in the requested tone and format.\n"
                "- Use clear structure: introduction, body sections, conclusion.\n"
                "- Employ strong topic sentences and smooth transitions.\n"
                "- Ensure every claim is grounded in the research notes provided.\n"
                "- Do not invent facts that are not in the research notes.\n"
                "- Aim for the requested word count (approximate is fine)."
            ),
        ),
    )


def build_coordinator_agent() -> Agent:
    """
    Construct the top-level Coordinator agent.

    The Coordinator has access to two tools -- ``research`` and ``write`` --
    each of which delegates to its respective subagent.
    """
    return Agent(
        config=AgentConfig(
            model="claude-sonnet-4-20250514",
            max_tokens=8192,
            system_prompt=(
                "You are a Coordinator Agent that manages a small team of "
                "specialist subagents to fulfil user requests.\n\n"
                "Your team:\n"
                "  1. **Researcher** -- invoke via the `research` tool. "
                "Use this to gather information on any topic.\n"
                "  2. **Writer** -- invoke via the `write` tool. "
                "Use this to produce polished written content from research notes.\n\n"
                "Workflow:\n"
                "  1. Analyse the user's request to determine what information "
                "is needed.\n"
                "  2. Call the `research` tool one or more times to gather the "
                "necessary material.\n"
                "  3. Once you have sufficient research, call the `write` tool "
                "with the collected notes and any format/tone preferences the "
                "user specified.\n"
                "  4. Review the Writer's output for quality. If it needs "
                "revision, call `write` again with additional instructions.\n"
                "  5. Present the final output to the user, along with a brief "
                "note on the process you followed.\n\n"
                "Important rules:\n"
                "- Always research before writing.\n"
                "- Never fabricate information yourself -- rely on the Researcher.\n"
                "- If the user's request is ambiguous, ask clarifying questions "
                "before proceeding.\n"
                "- Keep your own commentary concise; let the subagents do the "
                "heavy lifting."
            ),
        ),
        tools=[ResearcherTool(), WriterTool()],
    )


# ---------------------------------------------------------------------------
# 3. Alternative pattern: function-based tools with @tool decorator
# ---------------------------------------------------------------------------
# The SDK also supports a simpler decorator-based approach.  Below is an
# equivalent implementation using @tool for reference.

@tool(
    name="research_fn",
    description="Research a topic using the Researcher subagent (function-based).",
)
async def research_fn(
    query: str,
    depth: str = "standard",
) -> str:
    """
    Functional wrapper around the Researcher subagent.

    Parameters
    ----------
    query:
        The research question or topic.
    depth:
        How thorough: 'brief', 'standard', or 'deep'.

    Returns
    -------
    str
        Structured research findings.
    """
    researcher = _build_researcher_agent()
    message = (
        f"Research the following at '{depth}' depth:\n\n{query}\n\n"
        "Return structured findings with key facts, context, and a summary."
    )
    result: Message = await researcher.run(message)
    return result.content


@tool(
    name="write_fn",
    description="Write polished content using the Writer subagent (function-based).",
)
async def write_fn(
    topic: str,
    research_notes: str,
    format: str = "article",
    tone: str = "formal",
    max_words: int = 1000,
) -> str:
    """
    Functional wrapper around the Writer subagent.

    Parameters
    ----------
    topic:
        Subject of the piece.
    research_notes:
        Raw research to incorporate.
    format:
        Output format (article, report, summary, essay, blog_post).
    tone:
        Desired tone (formal, conversational, technical, persuasive).
    max_words:
        Approximate word-count target.

    Returns
    -------
    str
        Polished, publication-ready text.
    """
    writer = _build_writer_agent()
    message = (
        f"Write a {format} about '{topic}' in a {tone} tone (~{max_words} words).\n\n"
        f"## Research Notes\n{research_notes}"
    )
    result: Message = await writer.run(message)
    return result.content


def build_coordinator_agent_functional() -> Agent:
    """
    Build the Coordinator using function-based tool definitions.

    This is an alternative to the class-based ``build_coordinator_agent``.
    Both approaches are fully supported by the SDK.
    """
    return Agent(
        config=AgentConfig(
            model="claude-sonnet-4-20250514",
            max_tokens=8192,
            system_prompt=(
                "You are a Coordinator Agent managing a Researcher and a Writer. "
                "Use `research_fn` to gather information and `write_fn` to produce "
                "polished content. Always research before writing."
            ),
        ),
        tools=[research_fn, write_fn],
    )


# ---------------------------------------------------------------------------
# 4. Conversation runner with streaming support
# ---------------------------------------------------------------------------

async def run_multi_agent_conversation(
    user_request: str,
    *,
    use_functional_style: bool = False,
    stream: bool = True,
) -> str:
    """
    Execute a full multi-agent conversation for the given user request.

    Parameters
    ----------
    user_request:
        The end-user's natural-language request.
    use_functional_style:
        If True, use the ``@tool``-decorated function-based coordinator.
        If False (default), use the class-based coordinator.
    stream:
        If True (default), stream tokens to stdout as they arrive.

    Returns
    -------
    str
        The final text response from the Coordinator.
    """
    coordinator = (
        build_coordinator_agent_functional()
        if use_functional_style
        else build_coordinator_agent()
    )

    if stream:
        collected_text: list[str] = []
        async for event in coordinator.run_stream(user_request):
            if event.type == "text_delta":
                print(event.text, end="", flush=True)
                collected_text.append(event.text)
            elif event.type == "tool_use":
                print(f"\n[Coordinator is calling tool: {event.name}]")
            elif event.type == "tool_result":
                print(f"[Tool '{event.name}' returned a result]\n")
        print()  # final newline
        return "".join(collected_text)
    else:
        result: Message = await coordinator.run(user_request)
        return result.content


# ---------------------------------------------------------------------------
# 5. Entry point
# ---------------------------------------------------------------------------

async def main() -> None:
    """Run an example multi-agent conversation."""
    user_request = (
        "I need a comprehensive yet accessible blog post about the current state "
        "of quantum computing. Cover the key technological approaches (superconducting "
        "qubits, trapped ions, photonic), recent breakthroughs, and practical "
        "applications that are emerging. The tone should be conversational but "
        "technically accurate, aimed at a software-engineer audience. "
        "Target around 1200 words."
    )

    print("=" * 72)
    print("Multi-Agent System -- Coordinator / Researcher / Writer")
    print("=" * 72)
    print(f"\nUser request:\n{user_request}\n")
    print("-" * 72)
    print("Coordinator processing...\n")

    final_output = await run_multi_agent_conversation(
        user_request,
        use_functional_style=False,
        stream=True,
    )

    print("\n" + "=" * 72)
    print("Done. Final output length:", len(final_output.split()), "words")
    print("=" * 72)


if __name__ == "__main__":
    asyncio.run(main())
