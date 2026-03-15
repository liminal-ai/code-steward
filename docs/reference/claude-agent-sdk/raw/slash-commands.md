---
source: https://platform.claude.com/docs/en/agent-sdk/slash-commands
scraped_at: 2026-03-14
title: Slash Commands in the SDK
---

# Slash Commands in the SDK

Slash commands provide a way to control Claude Code sessions with special commands that start with `/`. These commands can be sent through the SDK to perform actions like clearing conversation history, compacting messages, or getting help.

## Discovering Available Slash Commands

The Claude Agent SDK provides information about available slash commands in the system initialization message:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Hello Claude",
  options: { maxTurns: 1 }
})) {
  if (message.type === "system" && message.subtype === "init") {
    console.log("Available slash commands:", message.slash_commands);
    // Example output: ["/compact", "/clear", "/help"]
  }
}
```

## Sending Slash Commands

Send slash commands by including them in your prompt string, just like regular text:

```typescript
for await (const message of query({
  prompt: "/compact",
  options: { maxTurns: 1 }
})) {
  if (message.type === "result") {
    console.log("Command executed:", message.result);
  }
}
```

## Common Slash Commands

### `/compact` — Compact Conversation History

Reduces the size of your conversation history by summarizing older messages while preserving important context:

```typescript
for await (const message of query({
  prompt: "/compact",
  options: { maxTurns: 1 }
})) {
  if (message.type === "system" && message.subtype === "compact_boundary") {
    console.log("Compaction completed");
    console.log("Pre-compaction tokens:", message.compact_metadata.pre_tokens);
    console.log("Trigger:", message.compact_metadata.trigger);
  }
}
```

### `/clear` — Clear Conversation

Starts a fresh conversation by clearing all previous history:

```typescript
for await (const message of query({
  prompt: "/clear",
  options: { maxTurns: 1 }
})) {
  if (message.type === "system" && message.subtype === "init") {
    console.log("Conversation cleared, new session started");
    console.log("Session ID:", message.session_id);
  }
}
```

## Creating Custom Slash Commands

Custom commands are defined as markdown files in specific directories.

> **Recommendation:** The `.claude/commands/` directory is the legacy format. Use `.claude/skills/<name>/SKILL.md` instead, which supports the same slash-command invocation (`/name`) plus autonomous invocation by Claude. See [Skills](./skills.md) for the current format.

### File Locations

- **Project commands**: `.claude/commands/` — Available only in the current project
- **Personal commands**: `~/.claude/commands/` — Available across all your projects

### File Format

Create `.claude/commands/refactor.md`:
```markdown
Refactor the selected code to improve readability and maintainability.
Focus on clean code principles and best practices.
```

This creates the `/refactor` command.

### With Frontmatter

Create `.claude/commands/security-check.md`:
```markdown
---
allowed-tools: Read, Grep, Glob
description: Run security vulnerability scan
model: claude-opus-4-6
---

Analyze the codebase for security vulnerabilities including:
- SQL injection risks
- XSS vulnerabilities
- Exposed credentials
- Insecure configurations
```

### Using Custom Commands in the SDK

```typescript
for await (const message of query({
  prompt: "/refactor src/auth/login.ts",
  options: { maxTurns: 3 }
})) {
  if (message.type === "assistant") {
    console.log("Refactoring suggestions:", message.message);
  }
}
```

### Advanced Features

#### Arguments and Placeholders

Create `.claude/commands/fix-issue.md`:
```markdown
---
argument-hint: [issue-number] [priority]
description: Fix a GitHub issue
---

Fix issue #$1 with priority $2.
Check the issue description and implement the necessary changes.
```

Use with arguments:
```typescript
for await (const message of query({
  prompt: "/fix-issue 123 high",
  options: { maxTurns: 5 }
})) {
  // Command will process with $1="123" and $2="high"
}
```

#### Bash Command Execution

Create `.claude/commands/git-commit.md`:
```markdown
---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
description: Create a git commit
---

## Context

- Current status: !`git status`
- Current diff: !`git diff HEAD`

## Task

Create a git commit with appropriate message based on the changes.
```

#### File References

Create `.claude/commands/review-config.md`:
```markdown
---
description: Review configuration files
---

Review the following configuration files for issues:
- Package config: @package.json
- TypeScript config: @tsconfig.json
- Environment config: @.env
```

### Organization with Namespacing

```
.claude/commands/
├── frontend/
│   ├── component.md      # Creates /component (project:frontend)
│   └── style-check.md    # Creates /style-check (project:frontend)
├── backend/
│   ├── api-test.md       # Creates /api-test (project:backend)
│   └── db-migrate.md     # Creates /db-migrate (project:backend)
└── review.md             # Creates /review (project)
```

## Practical Examples

### Code Review Command

`.claude/commands/code-review.md`:
```markdown
---
allowed-tools: Read, Grep, Glob, Bash(git diff:*)
description: Comprehensive code review
---

## Changed Files
!`git diff --name-only HEAD~1`

## Detailed Changes
!`git diff HEAD~1`

## Review Checklist

Review the above changes for:
1. Code quality and readability
2. Security vulnerabilities
3. Performance implications
4. Test coverage
5. Documentation completeness
```

### Test Runner Command

`.claude/commands/test.md`:
```markdown
---
allowed-tools: Bash, Read, Edit
argument-hint: [test-pattern]
description: Run tests with optional pattern
---

Run tests matching pattern: $ARGUMENTS

1. Detect the test framework (Jest, pytest, etc.)
2. Run tests with the provided pattern
3. If tests fail, analyze and fix them
4. Re-run to verify fixes
```

Use:
```typescript
for await (const message of query({
  prompt: "/test auth",
  options: { maxTurns: 5 }
})) {
  // Handle test results
}
```
