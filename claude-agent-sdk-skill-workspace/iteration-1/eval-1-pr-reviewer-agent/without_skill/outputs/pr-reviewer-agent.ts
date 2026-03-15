/**
 * PR Reviewer Agent - A TypeScript agent that reviews GitHub Pull Requests
 * using the Claude Agent SDK with custom MCP tools for GitHub interaction.
 *
 * This agent:
 * 1. Fetches PR metadata, diff, and file contents via custom MCP tools
 * 2. Analyzes code changes for bugs, style issues, security concerns, and best practices
 * 3. Posts structured review comments back to the PR
 * 4. Returns a structured summary of findings
 *
 * Prerequisites:
 *   - npm install @anthropic-ai/claude-agent-sdk zod zod-to-json-schema
 *   - ANTHROPIC_API_KEY environment variable set
 *   - GITHUB_TOKEN environment variable set (with repo + pull_request scopes)
 *
 * Usage:
 *   npx tsx pr-reviewer-agent.ts <owner> <repo> <pr-number>
 */

import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single review comment targeting a specific file and line range. */
interface ReviewComment {
  path: string;
  startLine: number;
  endLine: number;
  body: string;
  severity: "critical" | "warning" | "suggestion" | "nitpick";
  category: "bug" | "security" | "performance" | "style" | "maintainability" | "testing";
}

/** The structured output the agent must produce at the end of its review. */
interface ReviewSummary {
  overallAssessment: "approve" | "request_changes" | "comment";
  summaryMarkdown: string;
  comments: ReviewComment[];
  stats: {
    filesReviewed: number;
    criticalIssues: number;
    warnings: number;
    suggestions: number;
    nitpicks: number;
  };
}

/** Metadata returned by the get_pr_details tool. */
interface PullRequestDetails {
  number: number;
  title: string;
  body: string;
  author: string;
  baseBranch: string;
  headBranch: string;
  state: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

/** A single changed file entry from the PR diff. */
interface PullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
}

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Make an authenticated request to the GitHub REST API.
 * Throws on non-2xx responses with the status and body for diagnostics.
 */
async function githubApiFetch(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set.");
  }

  const url = `${GITHUB_API_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "pr-reviewer-agent",
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `GitHub API error ${response.status} for ${path}: ${body.slice(0, 500)}`,
    );
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// MCP Tool Definitions
// ---------------------------------------------------------------------------

/**
 * Tool: get_pr_details
 * Fetches high-level metadata about a pull request (title, author, branches,
 * label list, line-count stats, etc.).
 */
const getPrDetails = tool(
  "get_pr_details",
  "Fetch metadata for a GitHub pull request including title, author, branches, labels, and change stats.",
  {
    owner: z.string().describe("Repository owner (user or organization)"),
    repo: z.string().describe("Repository name"),
    pull_number: z.number().int().positive().describe("Pull request number"),
  },
  async (args) => {
    const data = (await githubApiFetch(
      `/repos/${args.owner}/${args.repo}/pulls/${args.pull_number}`,
    )) as Record<string, unknown>;

    const details: PullRequestDetails = {
      number: data.number as number,
      title: data.title as string,
      body: (data.body as string) ?? "",
      author: (data.user as Record<string, unknown>)?.login as string,
      baseBranch: (data.base as Record<string, unknown>)?.ref as string,
      headBranch: (data.head as Record<string, unknown>)?.ref as string,
      state: data.state as string,
      additions: data.additions as number,
      deletions: data.deletions as number,
      changedFiles: data.changed_files as number,
      labels: ((data.labels as Array<Record<string, unknown>>) ?? []).map(
        (l) => l.name as string,
      ),
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(details, null, 2),
        },
      ],
    };
  },
);

/**
 * Tool: get_pr_diff
 * Returns the list of changed files along with their unified diff patches.
 * Supports pagination for large PRs.
 */
const getPrDiff = tool(
  "get_pr_diff",
  "Get the list of changed files and their diffs for a GitHub pull request. Returns filename, status, additions, deletions, and patch for each file.",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    pull_number: z.number().int().positive().describe("Pull request number"),
    page: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Page number for pagination (default 1, 30 files per page)"),
  },
  async (args) => {
    const page = args.page ?? 1;
    const data = (await githubApiFetch(
      `/repos/${args.owner}/${args.repo}/pulls/${args.pull_number}/files?per_page=30&page=${page}`,
    )) as Array<Record<string, unknown>>;

    const files: PullRequestFile[] = data.map((f) => ({
      filename: f.filename as string,
      status: f.status as string,
      additions: f.additions as number,
      deletions: f.deletions as number,
      patch: (f.patch as string) ?? "(binary or too large)",
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { page, fileCount: files.length, files },
            null,
            2,
          ),
        },
      ],
    };
  },
);

/**
 * Tool: get_file_content
 * Retrieves the full content of a file at a specific git ref. Useful when the
 * agent needs broader context beyond just the diff patch.
 */
const getFileContent = tool(
  "get_file_content",
  "Get the full content of a file from a GitHub repository at a specific ref (branch, tag, or commit SHA).",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    path: z.string().describe("File path relative to repository root"),
    ref: z
      .string()
      .optional()
      .describe(
        "Git ref (branch name, tag, or commit SHA). Defaults to the repo default branch.",
      ),
  },
  async (args) => {
    const refParam = args.ref ? `?ref=${encodeURIComponent(args.ref)}` : "";
    const data = (await githubApiFetch(
      `/repos/${args.owner}/${args.repo}/contents/${args.path}${refParam}`,
    )) as Record<string, unknown>;

    if (data.type !== "file") {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: path "${args.path}" is not a file (type: ${data.type as string}).`,
          },
        ],
        isError: true,
      };
    }

    const contentBase64 = data.content as string;
    const decoded = Buffer.from(contentBase64.replace(/\n/g, ""), "base64").toString("utf-8");

    return {
      content: [
        {
          type: "text" as const,
          text: decoded,
        },
      ],
    };
  },
);

/**
 * Tool: get_pr_comments
 * Fetches existing review comments on the PR so the agent can avoid duplicates
 * and understand prior feedback.
 */
const getPrComments = tool(
  "get_pr_comments",
  "Fetch existing review comments on a pull request to understand prior feedback and avoid duplicate comments.",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    pull_number: z.number().int().positive().describe("Pull request number"),
  },
  async (args) => {
    const data = (await githubApiFetch(
      `/repos/${args.owner}/${args.repo}/pulls/${args.pull_number}/comments?per_page=100`,
    )) as Array<Record<string, unknown>>;

    const comments = data.map((c) => ({
      id: c.id,
      author: (c.user as Record<string, unknown>)?.login,
      body: c.body,
      path: c.path,
      line: c.line ?? c.original_line,
      createdAt: c.created_at,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(comments, null, 2),
        },
      ],
    };
  },
);

/**
 * Tool: post_review
 * Submits a pull request review with inline comments. This is the final action
 * tool the agent uses to publish its feedback.
 */
const postReview = tool(
  "post_review",
  "Submit a pull request review with an overall verdict and inline comments. Use event APPROVE, REQUEST_CHANGES, or COMMENT.",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    pull_number: z.number().int().positive().describe("Pull request number"),
    event: z
      .enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"])
      .describe("Review verdict"),
    body: z.string().describe("Top-level review summary in markdown"),
    comments: z
      .array(
        z.object({
          path: z.string().describe("File path relative to repo root"),
          line: z.number().int().positive().describe("Line number in the diff to comment on"),
          body: z.string().describe("Comment body in markdown"),
        }),
      )
      .optional()
      .describe("Inline review comments"),
  },
  async (args) => {
    const payload: Record<string, unknown> = {
      event: args.event,
      body: args.body,
    };

    if (args.comments && args.comments.length > 0) {
      payload.comments = args.comments;
    }

    const result = (await githubApiFetch(
      `/repos/${args.owner}/${args.repo}/pulls/${args.pull_number}/reviews`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    )) as Record<string, unknown>;

    return {
      content: [
        {
          type: "text" as const,
          text: `Review submitted successfully (ID: ${result.id as number}). Event: ${args.event}. Comments: ${(args.comments ?? []).length}.`,
        },
      ],
    };
  },
);

// ---------------------------------------------------------------------------
// MCP Server Assembly
// ---------------------------------------------------------------------------

/** In-process MCP server bundling all GitHub PR review tools. */
const githubPrServer = createSdkMcpServer({
  name: "github-pr",
  tools: [getPrDetails, getPrDiff, getFileContent, getPrComments, postReview],
});

// ---------------------------------------------------------------------------
// Structured Output Schema
// ---------------------------------------------------------------------------

/** Zod schema that mirrors the ReviewSummary interface. */
const ReviewSummarySchema = z.object({
  overallAssessment: z
    .enum(["approve", "request_changes", "comment"])
    .describe("Your overall verdict for this PR"),
  summaryMarkdown: z
    .string()
    .describe("A concise markdown summary of your review findings"),
  comments: z.array(
    z.object({
      path: z.string().describe("File path"),
      startLine: z.number().int().describe("Start line of the relevant code"),
      endLine: z.number().int().describe("End line of the relevant code"),
      body: z.string().describe("Review comment body in markdown"),
      severity: z
        .enum(["critical", "warning", "suggestion", "nitpick"])
        .describe("Severity level"),
      category: z
        .enum([
          "bug",
          "security",
          "performance",
          "style",
          "maintainability",
          "testing",
        ])
        .describe("Category of the issue"),
    }),
  ),
  stats: z.object({
    filesReviewed: z.number().int(),
    criticalIssues: z.number().int(),
    warnings: z.number().int(),
    suggestions: z.number().int(),
    nitpicks: z.number().int(),
  }),
});

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert code reviewer. Your job is to thoroughly review a GitHub pull request and provide actionable, specific feedback.

## Review Process

1. **Fetch PR metadata** using get_pr_details to understand the scope and context.
2. **Fetch existing comments** using get_pr_comments to avoid duplicating prior feedback.
3. **Fetch the diff** using get_pr_diff to see all changed files.
4. **For complex changes**, use get_file_content to read the full file for broader context.
5. **Analyze each changed file** for:
   - Bugs and logic errors
   - Security vulnerabilities (injection, auth bypass, data exposure, etc.)
   - Performance issues (N+1 queries, unnecessary allocations, missing indexes)
   - Style and readability concerns
   - Maintainability (dead code, duplication, missing abstractions)
   - Missing or inadequate tests
6. **Post your review** using post_review with inline comments on specific lines.
7. **Return your structured summary** as the final output.

## Guidelines

- Be specific: reference exact lines, variable names, and code paths.
- Be constructive: suggest fixes, not just problems.
- Prioritize: focus on critical and warning issues first.
- Be fair: acknowledge good patterns and improvements you see.
- Don't nitpick formatting if a formatter/linter is configured.
- If the PR is small and correct, approve it with a brief positive note.
- Use severity levels accurately:
  - **critical**: Must fix before merge (bugs, security holes, data loss risks)
  - **warning**: Should fix before merge (performance, error handling gaps)
  - **suggestion**: Consider improving (maintainability, readability)
  - **nitpick**: Very minor optional improvements (naming, comment wording)
`;

// ---------------------------------------------------------------------------
// PreToolUse Hook: Audit logging
// ---------------------------------------------------------------------------

/**
 * Logs every tool invocation so operators can audit what the agent did.
 * Returns immediately (non-blocking) so it does not slow down the agent.
 */
async function auditToolUse(
  inputData: Record<string, unknown>,
  _toolUseId: string | null,
  _context: unknown,
): Promise<Record<string, unknown>> {
  const toolName = inputData.tool_name as string;
  const toolInput = inputData.tool_input as Record<string, unknown>;

  const timestamp = new Date().toISOString();
  const inputSummary = JSON.stringify(toolInput).slice(0, 200);
  console.error(`[${timestamp}] TOOL_USE: ${toolName} | ${inputSummary}`);

  return { async_: true };
}

/**
 * Safety hook that prevents the agent from posting reviews on the wrong PR.
 * Validates that the owner/repo/pull_number match the CLI arguments.
 */
function createPrScopeGuard(
  expectedOwner: string,
  expectedRepo: string,
  expectedPrNumber: number,
) {
  return async function prScopeGuard(
    inputData: Record<string, unknown>,
    _toolUseId: string | null,
    _context: unknown,
  ): Promise<Record<string, unknown>> {
    const toolInput = inputData.tool_input as Record<string, unknown>;
    const owner = toolInput.owner as string | undefined;
    const repo = toolInput.repo as string | undefined;
    const pullNumber = toolInput.pull_number as number | undefined;

    if (
      owner !== undefined &&
      repo !== undefined &&
      pullNumber !== undefined
    ) {
      if (
        owner !== expectedOwner ||
        repo !== expectedRepo ||
        pullNumber !== expectedPrNumber
      ) {
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason:
              `Scope violation: tool attempted to access ${owner}/${repo}#${pullNumber} ` +
              `but this review is scoped to ${expectedOwner}/${expectedRepo}#${expectedPrNumber}.`,
          },
        };
      }
    }

    return {};
  };
}

// ---------------------------------------------------------------------------
// PostToolUse Hook: Warn on large diffs
// ---------------------------------------------------------------------------

/**
 * After fetching the diff, inject a system message reminding the agent to
 * prioritize if the diff is very large.
 */
async function warnOnLargeDiff(
  inputData: Record<string, unknown>,
  _toolUseId: string | null,
  _context: unknown,
): Promise<Record<string, unknown>> {
  const toolName = inputData.tool_name as string;
  if (toolName !== "mcp__github-pr__get_pr_diff") {
    return {};
  }

  const toolResult = inputData.tool_result as Record<string, unknown> | undefined;
  if (!toolResult) return {};

  const content = toolResult.content as Array<Record<string, unknown>> | undefined;
  if (!content || content.length === 0) return {};

  const text = content[0].text as string;
  if (text.length > 50_000) {
    return {
      systemMessage:
        "This is a very large diff. Focus your review on the most impactful files first: " +
        "security-sensitive code, business logic, and public API changes. " +
        "Deprioritize auto-generated files, lock files, and simple renames.",
    };
  }

  return {};
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error("Usage: npx tsx pr-reviewer-agent.ts <owner> <repo> <pr-number>");
    console.error("Example: npx tsx pr-reviewer-agent.ts octocat hello-world 42");
    process.exit(1);
  }

  const [owner, repo, prNumberStr] = args;
  const prNumber = parseInt(prNumberStr, 10);

  if (Number.isNaN(prNumber) || prNumber <= 0) {
    console.error(`Error: Invalid PR number "${prNumberStr}". Must be a positive integer.`);
    process.exit(1);
  }

  // Validate environment
  if (!process.env.GITHUB_TOKEN) {
    console.error("Error: GITHUB_TOKEN environment variable is required.");
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is required.");
    process.exit(1);
  }

  console.error(`Starting PR review for ${owner}/${repo}#${prNumber}...`);

  // Build the prompt
  const prompt = [
    `Review the pull request #${prNumber} in the repository ${owner}/${repo}.`,
    "",
    "Follow your review process carefully:",
    "1. Fetch the PR details to understand context.",
    "2. Check for existing review comments.",
    "3. Fetch the diff and analyze all changed files.",
    "4. If you need more context for a file, fetch its full content.",
    "5. Post your review with inline comments using post_review.",
    "6. Return your structured summary as the final output.",
  ].join("\n");

  // Run the agent
  let reviewResult: ReviewSummary | undefined;
  let sessionId: string | undefined;
  let totalCost = 0;

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      model: "claude-sonnet-4-20250514",
      maxTurns: 30,
      maxBudgetUsd: 1.0,
      permissionMode: "bypassPermissions",

      // MCP server with all GitHub PR tools
      mcpServers: {
        "github-pr": githubPrServer,
      },

      // Auto-approve all tools on our server
      allowedTools: ["mcp__github-pr__*"],

      // Structured output for the final review summary
      outputFormat: {
        type: "json_schema",
        schema: zodToJsonSchema(ReviewSummarySchema),
      },

      // Pass the GitHub token to the agent environment
      env: {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      },

      // Hooks for auditing and safety
      hooks: {
        PreToolUse: [
          // Audit every tool call
          { hooks: [auditToolUse] },
          // Scope guard: prevent cross-PR access
          {
            matcher: "^mcp__github-pr__",
            hooks: [createPrScopeGuard(owner, repo, prNumber)],
          },
        ],
        PostToolUse: [
          // Warn agent when diffs are very large
          { hooks: [warnOnLargeDiff] },
        ],
        Stop: [
          {
            hooks: [
              async () => {
                console.error("Agent execution completed.");
                return {};
              },
            ],
          },
        ],
      },
    },
  })) {
    // Process messages
    switch (message.type) {
      case "system":
        console.error(`[system] ${message.subtype}`);
        break;

      case "assistant":
        // Log assistant text output (non-tool-use blocks)
        for (const block of message.message?.content ?? []) {
          if (block.type === "text") {
            console.error(`[assistant] ${block.text.slice(0, 200)}...`);
          } else if (block.type === "tool_use") {
            console.error(`[tool_call] ${block.name}`);
          }
        }
        break;

      case "result":
        sessionId = message.session_id;
        totalCost = message.totalCostUsd ?? 0;

        if (message.subtype === "success" && message.structuredOutput) {
          // Validate the structured output against our Zod schema
          const parsed = ReviewSummarySchema.safeParse(message.structuredOutput);
          if (parsed.success) {
            reviewResult = parsed.data;
          } else {
            console.error(
              "[warn] Structured output did not match schema:",
              parsed.error.message,
            );
            // Fall back to the raw output
            reviewResult = message.structuredOutput as ReviewSummary;
          }
        } else if (message.subtype !== "success") {
          console.error(`[error] Agent ended with subtype: ${message.subtype}`);
          if (message.result) {
            console.error(`[error] Details: ${message.result}`);
          }
        }
        break;

      default:
        // StreamEvent or other message types - ignore in batch mode
        break;
    }
  }

  // Output results
  console.error("---");
  console.error(`Session: ${sessionId ?? "unknown"}`);
  console.error(`Total cost: $${totalCost.toFixed(4)}`);

  if (reviewResult) {
    console.error(
      `Review: ${reviewResult.overallAssessment} | ` +
        `Files: ${reviewResult.stats.filesReviewed} | ` +
        `Critical: ${reviewResult.stats.criticalIssues} | ` +
        `Warnings: ${reviewResult.stats.warnings} | ` +
        `Suggestions: ${reviewResult.stats.suggestions}`,
    );

    // Structured JSON output goes to stdout for downstream consumption
    console.log(JSON.stringify(reviewResult, null, 2));
  } else {
    console.error("No structured review output was produced.");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(`Fatal error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error("Fatal error:", error);
  }
  process.exit(1);
});
