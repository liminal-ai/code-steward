# PR Reviewer Agent - Implementation Summary

## Overview

A TypeScript agent that reviews GitHub Pull Requests using the Claude Agent SDK. The agent fetches PR metadata and diffs through custom MCP tools, analyzes code changes, posts inline review comments back to GitHub, and returns a structured JSON summary of its findings.

## Architecture

The implementation is a single self-contained file (`pr-reviewer-agent.ts`) with the following logical sections:

1. **Type definitions** - Interfaces for PR details, review comments, and the structured output schema.
2. **GitHub API helper** - A `githubApiFetch` function that handles authentication and error handling for GitHub REST API calls.
3. **MCP tool definitions** - Five custom tools registered on an in-process MCP server.
4. **Hooks** - PreToolUse and PostToolUse hooks for auditing and safety.
5. **Agent configuration and execution** - The `query()` call with full options.
6. **CLI entry point** - Argument parsing, validation, and output formatting.

## Claude Agent SDK Features Used

### Custom MCP Tools (`tool()` + `createSdkMcpServer()`)

Five tools defined using the `tool()` function with Zod schemas for input validation:

| Tool | Purpose |
|------|---------|
| `get_pr_details` | Fetch PR metadata (title, author, branches, stats) |
| `get_pr_diff` | Fetch changed files with unified diff patches (paginated) |
| `get_file_content` | Retrieve full file content at a specific git ref |
| `get_pr_comments` | Fetch existing review comments to avoid duplicates |
| `post_review` | Submit a review with inline comments and a verdict |

All five tools are bundled into a single in-process MCP server named `github-pr` using `createSdkMcpServer()`. This uses the SDK transport type (in-process), so no external process is spawned.

### Structured Output (`outputFormat`)

The agent is configured with a JSON schema (generated from a Zod schema via `zod-to-json-schema`) that forces it to return a `ReviewSummary` object containing:

- An overall assessment (`approve`, `request_changes`, or `comment`)
- A markdown summary
- An array of typed review comments with severity and category
- Aggregate statistics

This ensures machine-parseable output suitable for CI/CD integration.

### Hooks System

Three hook patterns are used:

1. **Audit hook** (`PreToolUse`, all tools) - Logs every tool invocation with timestamp, tool name, and input summary. Runs as fire-and-forget (`async_: true`) so it does not block the agent loop.

2. **Scope guard hook** (`PreToolUse`, matched on `^mcp__github-pr__`) - Validates that every GitHub API tool call targets the correct owner/repo/PR number. Returns a `deny` permission decision if the agent attempts to access a different PR. This prevents accidental cross-repository operations.

3. **Large diff warning hook** (`PostToolUse`) - After the diff is fetched, checks the response size. If the diff exceeds 50KB, injects a system message instructing the agent to prioritize security-sensitive and business logic files over auto-generated content.

### Query Configuration

- **`systemPrompt`** - A detailed custom system prompt defining the review process, analysis categories, and severity-level guidelines.
- **`model`** - Uses `claude-sonnet-4-20250514` for a good balance of speed and quality.
- **`maxTurns: 30`** - Allows enough turns for the agent to fetch data, analyze, and post its review.
- **`maxBudgetUsd: 1.0`** - Cost ceiling to prevent runaway spending.
- **`permissionMode: "bypassPermissions"`** - Auto-approves all tool calls (appropriate for headless/CI usage).
- **`allowedTools: ["mcp__github-pr__*"]`** - Wildcard approval for all tools on the `github-pr` server.
- **`env`** - Passes `GITHUB_TOKEN` into the agent environment.

### Message Processing

The agent loop processes all message types from `query()`:

- **`SystemMessage`** - Logged for diagnostics.
- **`AssistantMessage`** - Text blocks and tool_use blocks are logged.
- **`ResultMessage`** - Extracts structured output, session ID, and cost. Validates the output against the Zod schema with `safeParse`.

## How to Run

```bash
# Install dependencies
npm install @anthropic-ai/claude-agent-sdk zod zod-to-json-schema

# Set environment variables
export ANTHROPIC_API_KEY=your-api-key
export GITHUB_TOKEN=your-github-token

# Run the agent
npx tsx pr-reviewer-agent.ts <owner> <repo> <pr-number>

# Example
npx tsx pr-reviewer-agent.ts facebook react 28000
```

Diagnostic output goes to stderr. The structured JSON review summary goes to stdout, making it easy to pipe into downstream tools:

```bash
npx tsx pr-reviewer-agent.ts owner repo 123 > review.json 2> review.log
```

## Design Decisions

- **Single file**: Keeps the example self-contained and easy to understand. In production, you would split types, tools, hooks, and the main function into separate modules.
- **In-process MCP server**: Avoids the overhead of spawning an external GitHub MCP server process. The tools call the GitHub REST API directly using `fetch`.
- **Zod for schemas**: Used both for tool input validation (MCP tool definitions) and structured output validation. Provides runtime type safety at both ends.
- **stderr for diagnostics, stdout for data**: Standard Unix convention that enables piping the JSON output to other tools while keeping human-readable logs separate.
- **Scope guard hook**: A safety measure that prevents the agent from accidentally accessing or modifying PRs other than the one it was asked to review.
