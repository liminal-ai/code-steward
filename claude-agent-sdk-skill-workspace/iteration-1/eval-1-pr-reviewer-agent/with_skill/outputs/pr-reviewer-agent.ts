/**
 * PR Reviewer Agent
 *
 * A TypeScript agent built on the Claude Agent SDK that reviews GitHub pull
 * requests using custom MCP tools. The agent fetches PR metadata, diffs, and
 * file contents from GitHub, then produces a structured review with
 * file-level comments, an overall summary, and an approval recommendation.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... GITHUB_TOKEN=ghp_... npx tsx pr-reviewer-agent.ts owner/repo 42
 */

import {
  query,
  tool,
  createSdkMcpServer,
} from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single file-level review comment produced by the agent. */
interface FileComment {
  file: string;
  line: number | null;
  severity: "critical" | "warning" | "suggestion" | "praise";
  comment: string;
}

/** The structured output the agent must conform to. */
interface PRReview {
  summary: string;
  approval: "approve" | "request_changes" | "comment";
  risk_level: "low" | "medium" | "high" | "critical";
  comments: FileComment[];
  test_coverage_assessment: string;
  security_concerns: string[];
}

/** Shape of a GitHub PR as returned by the REST API (subset). */
interface GitHubPR {
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: { login: string };
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  changed_files: number;
  additions: number;
  deletions: number;
}

/** Shape of a single file entry from the GitHub PR files endpoint. */
interface GitHubPRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

const GITHUB_API = "https://api.github.com";

function githubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is required");
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "pr-reviewer-agent",
  };
}

async function githubFetch<T>(path: string): Promise<T> {
  const url = `${GITHUB_API}${path}`;
  const response = await fetch(url, { headers: githubHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status} for ${url}: ${text}`);
  }
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Custom MCP tool definitions (in-process SDK server)
// ---------------------------------------------------------------------------

/**
 * Creates an MCP server exposing four GitHub-oriented tools that the agent
 * can call during its review loop. Using an in-process SDK server avoids any
 * external process management while giving the agent first-class tool access.
 */
function createGitHubToolServer(
  repoOwnerAndName: string,
): ReturnType<typeof createSdkMcpServer> {
  return createSdkMcpServer({
    name: "github-pr",
    tools: [
      // ── 1. get_pr_details ──────────────────────────────────────────────
      tool(
        "get_pr_details",
        "Fetch metadata for a GitHub pull request including title, description, author, branch info, and change stats.",
        {
          pr_number: z.number().describe("The pull request number"),
        },
        async (args) => {
          try {
            const pr = await githubFetch<GitHubPR>(
              `/repos/${repoOwnerAndName}/pulls/${args.pr_number}`,
            );
            const result = {
              number: pr.number,
              title: pr.title,
              body: pr.body ?? "(no description)",
              state: pr.state,
              author: pr.user.login,
              head_branch: pr.head.ref,
              head_sha: pr.head.sha,
              base_branch: pr.base.ref,
              changed_files: pr.changed_files,
              additions: pr.additions,
              deletions: pr.deletions,
            };
            return {
              content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
            };
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return {
              content: [{ type: "text" as const, text: `Error fetching PR: ${message}` }],
              isError: true,
            };
          }
        },
      ),

      // ── 2. get_pr_diff ─────────────────────────────────────────────────
      tool(
        "get_pr_diff",
        "Fetch the full unified diff for a pull request.",
        {
          pr_number: z.number().describe("The pull request number"),
        },
        async (args) => {
          try {
            const token = process.env.GITHUB_TOKEN;
            const url = `${GITHUB_API}/repos/${repoOwnerAndName}/pulls/${args.pr_number}`;
            const response = await fetch(url, {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3.diff",
                "User-Agent": "pr-reviewer-agent",
              },
            });
            if (!response.ok) {
              throw new Error(`GitHub API error ${response.status}`);
            }
            const diff = await response.text();

            // Truncate very large diffs to stay within context limits.
            const MAX_DIFF_CHARS = 100_000;
            const truncated =
              diff.length > MAX_DIFF_CHARS
                ? diff.slice(0, MAX_DIFF_CHARS) +
                  `\n\n... [diff truncated at ${MAX_DIFF_CHARS} characters] ...`
                : diff;

            return {
              content: [{ type: "text" as const, text: truncated }],
            };
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return {
              content: [{ type: "text" as const, text: `Error fetching diff: ${message}` }],
              isError: true,
            };
          }
        },
      ),

      // ── 3. list_pr_files ───────────────────────────────────────────────
      tool(
        "list_pr_files",
        "List all files changed in a pull request with per-file change stats and patches.",
        {
          pr_number: z.number().describe("The pull request number"),
          page: z.number().optional().describe("Page number (default 1, 100 files per page)"),
        },
        async (args) => {
          try {
            const page = args.page ?? 1;
            const files = await githubFetch<GitHubPRFile[]>(
              `/repos/${repoOwnerAndName}/pulls/${args.pr_number}/files?per_page=100&page=${page}`,
            );
            const result = files.map((f) => ({
              filename: f.filename,
              status: f.status,
              additions: f.additions,
              deletions: f.deletions,
              patch: f.patch
                ? f.patch.length > 5_000
                  ? f.patch.slice(0, 5_000) + "\n... [patch truncated]"
                  : f.patch
                : null,
            }));
            return {
              content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
            };
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return {
              content: [{ type: "text" as const, text: `Error listing files: ${message}` }],
              isError: true,
            };
          }
        },
      ),

      // ── 4. get_file_content ────────────────────────────────────────────
      tool(
        "get_file_content",
        "Fetch the full content of a file at a specific git ref (branch or SHA). Useful for reading the complete file to understand context around a change.",
        {
          path: z.string().describe("File path relative to repository root"),
          ref: z.string().describe("Git ref — branch name or commit SHA"),
        },
        async (args) => {
          try {
            const token = process.env.GITHUB_TOKEN;
            const url = `${GITHUB_API}/repos/${repoOwnerAndName}/contents/${args.path}?ref=${args.ref}`;
            const response = await fetch(url, {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3.raw",
                "User-Agent": "pr-reviewer-agent",
              },
            });
            if (!response.ok) {
              throw new Error(`GitHub API error ${response.status}`);
            }
            const content = await response.text();

            const MAX_FILE_CHARS = 50_000;
            const truncated =
              content.length > MAX_FILE_CHARS
                ? content.slice(0, MAX_FILE_CHARS) +
                  `\n\n... [file truncated at ${MAX_FILE_CHARS} characters] ...`
                : content;

            return {
              content: [{ type: "text" as const, text: truncated }],
            };
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return {
              content: [{ type: "text" as const, text: `Error fetching file: ${message}` }],
              isError: true,
            };
          }
        },
      ),
    ],
  });
}

// ---------------------------------------------------------------------------
// Structured output schema (Zod)
// ---------------------------------------------------------------------------

const FileCommentSchema = z.object({
  file: z.string().describe("Path to the file being commented on"),
  line: z.number().nullable().describe("Line number (null if comment is file-level)"),
  severity: z
    .enum(["critical", "warning", "suggestion", "praise"])
    .describe("How urgent this comment is"),
  comment: z.string().describe("The review comment text"),
});

const PRReviewSchema = z.object({
  summary: z.string().describe("High-level summary of the PR changes and review findings"),
  approval: z
    .enum(["approve", "request_changes", "comment"])
    .describe("Review verdict"),
  risk_level: z
    .enum(["low", "medium", "high", "critical"])
    .describe("Overall risk assessment of merging this PR"),
  comments: z
    .array(FileCommentSchema)
    .describe("File-level review comments"),
  test_coverage_assessment: z
    .string()
    .describe("Assessment of whether changes are adequately tested"),
  security_concerns: z
    .array(z.string())
    .describe("Any security issues identified (empty array if none)"),
});

// ---------------------------------------------------------------------------
// Hook: audit log for every tool call
// ---------------------------------------------------------------------------

async function auditToolUsage(
  input: Record<string, unknown>,
  _toolUseId: string | null,
  _ctx: unknown,
): Promise<Record<string, unknown>> {
  const toolName = input.tool_name as string;
  const toolInput = input.tool_input as Record<string, unknown> | undefined;
  const truncatedInput = JSON.stringify(toolInput).slice(0, 200);
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] TOOL_CALL  ${toolName}  ${truncatedInput}`);
  return { async_: true }; // non-blocking
}

async function auditToolResult(
  input: Record<string, unknown>,
  _toolUseId: string | null,
  _ctx: unknown,
): Promise<Record<string, unknown>> {
  const toolName = input.tool_name as string;
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] TOOL_DONE  ${toolName}`);
  return { async_: true };
}

// ---------------------------------------------------------------------------
// Hook: stop guard -- remind the agent to produce structured output
// ---------------------------------------------------------------------------

async function ensureStructuredReview(
  _input: Record<string, unknown>,
  _toolUseId: string | null,
  _ctx: unknown,
): Promise<Record<string, unknown>> {
  return {
    systemMessage:
      "Before finishing, ensure your final output conforms exactly to the required JSON review schema with summary, approval, risk_level, comments, test_coverage_assessment, and security_concerns.",
  };
}

// ---------------------------------------------------------------------------
// Main: run the PR review agent
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // -- Parse CLI arguments --------------------------------------------------
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: npx tsx pr-reviewer-agent.ts <owner/repo> <pr-number>");
    console.error("Example: npx tsx pr-reviewer-agent.ts octocat/hello-world 42");
    process.exit(1);
  }

  const repo = args[0];
  const prNumber = parseInt(args[1], 10);

  if (!repo.includes("/")) {
    console.error("Error: repository must be in owner/repo format");
    process.exit(1);
  }
  if (Number.isNaN(prNumber) || prNumber <= 0) {
    console.error("Error: pr-number must be a positive integer");
    process.exit(1);
  }

  // -- Validate environment -------------------------------------------------
  if (!process.env.GITHUB_TOKEN) {
    console.error("Error: GITHUB_TOKEN environment variable is required");
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is required");
    process.exit(1);
  }

  // -- Build MCP server with GitHub tools -----------------------------------
  const githubServer = createGitHubToolServer(repo);

  // -- Compose the agent configuration -------------------------------------
  const systemPrompt = `You are an expert code reviewer performing a thorough review of GitHub pull request #${prNumber} in the repository ${repo}.

Your review process:
1. First, fetch the PR details to understand the purpose and scope of the changes.
2. List all changed files to get an overview of what was modified.
3. Fetch the full diff to see all changes in context.
4. For files where you need more context (e.g., to understand surrounding code), fetch the full file content at the head ref.
5. Analyze the changes for:
   - Correctness: logic errors, off-by-one mistakes, race conditions
   - Security: injection, authentication/authorization gaps, data exposure
   - Performance: N+1 queries, unnecessary allocations, missing indexes
   - Maintainability: naming, complexity, duplication, missing abstractions
   - Testing: whether new/changed code paths are covered by tests
   - API design: breaking changes, backwards compatibility

Your review must be constructive and actionable. For each comment, include the exact file and line number when possible. Categorize comments by severity: critical (must fix), warning (should fix), suggestion (nice to have), or praise (good patterns worth calling out).

Produce your final review as structured JSON matching the required output schema.`;

  const options = {
    // -- Model & limits ---------------------------------------------------
    model: "claude-sonnet-4-20250514",
    effort: "high" as const,
    maxTurns: 15,
    maxBudgetUsd: 0.50,

    // -- System prompt ----------------------------------------------------
    systemPrompt,

    // -- MCP servers (custom GitHub tools) --------------------------------
    mcpServers: {
      "github-pr": githubServer,
    },

    // -- Tool permissions -------------------------------------------------
    allowedTools: [
      "mcp__github-pr__get_pr_details",
      "mcp__github-pr__get_pr_diff",
      "mcp__github-pr__list_pr_files",
      "mcp__github-pr__get_file_content",
    ],
    permissionMode: "dontAsk" as const, // deny anything not in allowedTools

    // -- Structured output ------------------------------------------------
    outputFormat: {
      type: "json_schema" as const,
      schema: zodToJsonSchema(PRReviewSchema),
    },

    // -- Hooks ------------------------------------------------------------
    hooks: {
      PreToolUse: [
        {
          // Audit every tool call
          hooks: [auditToolUsage],
        },
      ],
      PostToolUse: [
        {
          // Log tool completions
          hooks: [auditToolResult],
        },
      ],
      Stop: [
        {
          // Remind agent to produce structured output before finishing
          hooks: [ensureStructuredReview],
        },
      ],
    },

    // -- Environment forwarding -------------------------------------------
    env: {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    },
  };

  // -- Run the agent --------------------------------------------------------
  console.error(`\nReviewing PR #${prNumber} in ${repo}...\n`);

  let review: PRReview | null = null;
  let sessionId: string | undefined;
  let totalCost: number | undefined;

  for await (const message of query({
    prompt: `Review pull request #${prNumber}. Fetch the PR details, list changed files, get the diff, and perform a thorough code review. Produce your structured review as the final output.`,
    options,
  })) {
    switch (message.type) {
      case "assistant": {
        // Log assistant text blocks to stderr for observability.
        for (const block of message.message.content) {
          if (block.type === "text") {
            console.error(`[assistant] ${block.text.slice(0, 300)}`);
          }
          if (block.type === "tool_use") {
            console.error(`[tool_use] ${block.name}(${JSON.stringify(block.input).slice(0, 150)})`);
          }
        }
        break;
      }

      case "result": {
        sessionId = message.sessionId;
        totalCost = message.totalCostUsd;

        if (message.subtype === "success" && message.structuredOutput) {
          // Validate with Zod for runtime safety.
          const parsed = PRReviewSchema.safeParse(message.structuredOutput);
          if (parsed.success) {
            review = parsed.data;
          } else {
            console.error(
              "[warning] Structured output did not match schema, using raw output:",
              parsed.error.issues,
            );
            review = message.structuredOutput as PRReview;
          }
        } else if (message.subtype === "error_max_turns") {
          console.error(
            `[error] Agent hit max turns (${options.maxTurns}). Session: ${message.sessionId}`,
          );
          console.error("You can resume with: options.resume = sessionId");
        } else if (message.subtype === "error_max_budget_usd") {
          console.error(
            `[error] Agent exceeded budget ($${options.maxBudgetUsd}). Spent: $${message.totalCostUsd}`,
          );
        } else if (message.subtype === "error_during_execution") {
          console.error("[error] Runtime error during agent execution");
          if (message.result) console.error(message.result);
        } else if (message.subtype === "error_max_structured_output_retries") {
          console.error("[error] Agent could not produce valid structured output after retries");
        }
        break;
      }

      // system and user messages are informational; we log them at debug level
      case "system":
        console.error(`[system] ${JSON.stringify(message).slice(0, 200)}`);
        break;
      case "user":
        // Tool results flow through here; already captured in PostToolUse hook
        break;
    }
  }

  // -- Output results -------------------------------------------------------
  if (review) {
    // Write the structured review to stdout as clean JSON.
    console.log(JSON.stringify(review, null, 2));

    // Summary to stderr.
    console.error("\n--- Review Summary ---");
    console.error(`Verdict:    ${review.approval}`);
    console.error(`Risk Level: ${review.risk_level}`);
    console.error(`Comments:   ${review.comments.length}`);
    console.error(
      `  Critical:   ${review.comments.filter((c) => c.severity === "critical").length}`,
    );
    console.error(
      `  Warnings:   ${review.comments.filter((c) => c.severity === "warning").length}`,
    );
    console.error(
      `  Suggestions:${review.comments.filter((c) => c.severity === "suggestion").length}`,
    );
    console.error(
      `  Praise:     ${review.comments.filter((c) => c.severity === "praise").length}`,
    );
    console.error(`Security:   ${review.security_concerns.length} concern(s)`);
    console.error(`Session:    ${sessionId ?? "n/a"}`);
    console.error(`Cost:       $${totalCost?.toFixed(4) ?? "unknown"}`);
  } else {
    console.error("\n[error] No review was produced. Check the logs above for details.");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
