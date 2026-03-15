# PR Reviewer Agent -- Implementation Summary

## Approach

The agent is a single-file TypeScript program that uses the Claude Agent SDK to orchestrate an automated pull request review. It accepts a repository (`owner/repo`) and PR number from the command line, delegates all GitHub interaction to custom MCP tools, and produces a structured JSON review as its final output.

The design follows a "tools + structured output" pattern: the agent is given a focused set of read-only GitHub tools and a JSON schema it must conform to, with no ability to modify code or run arbitrary commands. This makes it safe for unattended use.

## SDK Features Used

### 1. Custom MCP Tools via `createSdkMcpServer` and `tool()`

Four in-process MCP tools are defined using `createSdkMcpServer` with Zod schemas for input validation:

- **`get_pr_details`** -- Fetches PR metadata (title, description, author, branches, change stats).
- **`get_pr_diff`** -- Fetches the full unified diff, with truncation for large PRs.
- **`list_pr_files`** -- Lists changed files with per-file stats and patches, paginated.
- **`get_file_content`** -- Fetches a file at a specific git ref for surrounding context.

All tools follow the SDK return format (`{ content: [{ type: "text", text: ... }] }`) and use `isError: true` for error conditions.

### 2. Structured Output via `outputFormat` + Zod

A `PRReviewSchema` defined with Zod is converted to JSON Schema via `zodToJsonSchema` and passed as the `outputFormat` option. This forces the agent to produce a typed JSON object containing `summary`, `approval` verdict, `risk_level`, per-file `comments` with severity levels, `test_coverage_assessment`, and `security_concerns`. The result is validated at runtime with `PRReviewSchema.safeParse()`.

### 3. Permission Mode (`dontAsk`)

The agent uses `permissionMode: "dontAsk"` combined with an explicit `allowedTools` list that names only the four custom MCP tools. This denies access to all built-in tools (Bash, Write, Edit, etc.), ensuring the agent is strictly read-only and cannot modify anything.

### 4. Hooks (PreToolUse, PostToolUse, Stop)

Three hooks are registered:

- **PreToolUse** -- Logs every tool invocation with a timestamp and truncated input (non-blocking via `async_: true`).
- **PostToolUse** -- Logs tool completion timestamps (non-blocking).
- **Stop** -- Injects a system message reminding the agent to conform to the structured output schema before finishing.

### 5. System Prompt

A detailed system prompt guides the agent through the review process: fetch PR details, list files, get the diff, optionally fetch full files for context, then analyze for correctness, security, performance, maintainability, testing, and API design.

### 6. Cost and Turn Limits

The agent is configured with `maxTurns: 15` and `maxBudgetUsd: 0.50` as safety rails. Both error subtypes (`error_max_turns`, `error_max_budget_usd`) are handled in the result processing.

### 7. Result Handling with All Subtypes

The message processing loop handles all five result subtypes: `success`, `error_max_turns`, `error_max_budget_usd`, `error_during_execution`, and `error_max_structured_output_retries`.

### 8. Environment Variable Forwarding

The `GITHUB_TOKEN` is passed to the agent via the `env` option, making it available to the MCP tool server's HTTP calls.

## Architecture Decisions

- **Single file**: The entire implementation is self-contained for easy deployment and review. In production you would split the MCP server, schemas, and orchestration into separate modules.
- **Read-only by design**: The agent cannot write files, run shell commands, or call any built-in tools. This is enforced by permission mode, not just by prompt.
- **Stderr for logs, stdout for data**: All observability output goes to stderr. The structured JSON review is written to stdout, making it easy to pipe into downstream systems (`npx tsx pr-reviewer-agent.ts owner/repo 42 > review.json`).
- **Truncation guards**: Large diffs and files are truncated to avoid exceeding context limits, with clear markers indicating truncation.
- **Sonnet model**: Uses `claude-sonnet-4-20250514` for a good balance of quality and cost. The `effort: "high"` setting ensures thorough analysis.
