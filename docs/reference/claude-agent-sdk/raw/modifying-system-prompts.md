---
source: https://platform.claude.com/docs/en/agent-sdk/modifying-system-prompts
scraped_at: 2026-03-14
title: Modifying System Prompts
---

# Modifying System Prompts

System prompts define Claude's behavior, capabilities, and response style. The Claude Agent SDK provides several ways to customize system prompts.

## Understanding System Prompts

**Default behavior:** The Agent SDK uses a **minimal system prompt** by default. It contains only essential tool instructions but omits Claude Code's coding guidelines, response style, and project context.

To include the full Claude Code system prompt, specify:
- TypeScript: `systemPrompt: { type: "preset", preset: "claude_code" }`
- Python: `system_prompt={"type": "preset", "preset": "claude_code"}`

Claude Code's system prompt includes:
- Tool usage instructions and available tools
- Code style and formatting guidelines
- Response tone and verbosity settings
- Security and safety instructions
- Context about the current working directory and environment

## Methods of Modification

### Method 1: CLAUDE.md Files (Project-level Instructions)

CLAUDE.md files provide project-specific context and instructions that are automatically read by the Agent SDK when it runs in a directory.

**Location and discovery:**
- **Project-level:** `CLAUDE.md` or `.claude/CLAUDE.md` in your working directory
- **User-level:** `~/.claude/CLAUDE.md` for global instructions across all projects

**IMPORTANT:** The SDK only reads CLAUDE.md files when you explicitly configure `settingSources` (TypeScript) or `setting_sources` (Python). Include `'project'` to load project-level CLAUDE.md, and `'user'` to load `~/.claude/CLAUDE.md`.

The `claude_code` system prompt preset does **NOT** automatically load CLAUDE.md — you must also specify setting sources.

**Example CLAUDE.md:**
```markdown
# Project Guidelines

## Code Style

- Use TypeScript strict mode
- Prefer functional components in React
- Always include JSDoc comments for public APIs

## Testing

- Run `npm test` before committing
- Maintain >80% code coverage
- Use jest for unit tests, playwright for E2E

## Commands

- Build: `npm run build`
- Dev server: `npm run dev`
- Type check: `npm run typecheck`
```

**Using CLAUDE.md with the SDK:**
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Add a new React component for user profiles",
  options: {
    systemPrompt: {
      type: "preset",
      preset: "claude_code"   // Use Claude Code's system prompt
    },
    settingSources: ["project"]  // Required to load CLAUDE.md from project
  }
})) {
  // ...
}
```

**Best for:**
- Team-shared context — Guidelines everyone should follow
- Project conventions — Coding standards, file structure, naming patterns
- Common commands — Build, test, deploy commands specific to your project
- Long-term memory — Context that should persist across all sessions
- Version-controlled instructions — Commit to git so the team stays in sync

### Method 2: `systemPrompt` with `append`

Use the Claude Code preset with an `append` property to add custom instructions while preserving all built-in functionality:

```typescript
for await (const message of query({
  prompt: "Help me write a Python function to calculate fibonacci numbers",
  options: {
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
      append: "Always include detailed docstrings and type hints in Python code."
    }
  }
})) {
  // ...
}
```

Python equivalent:
```python
options = ClaudeAgentOptions(
    system_prompt={
        "type": "preset",
        "preset": "claude_code",
        "append": "Always include detailed docstrings and type hints in Python code."
    }
)
```

**Best for:**
- Adding specific coding standards or preferences
- Customizing output formatting
- Modifying response verbosity
- Enhancing Claude Code's default behavior without losing tool instructions

### Method 3: Custom System Prompts

Provide a custom string as `systemPrompt` to replace the default entirely:

```typescript
const customPrompt = `You are a Python coding specialist.
Follow these guidelines:
- Write clean, well-documented code
- Use type hints for all functions
- Include comprehensive docstrings
- Prefer functional programming patterns when appropriate
- Always explain your code choices`;

for await (const message of query({
  prompt: "Create a data processing pipeline",
  options: {
    systemPrompt: customPrompt
  }
})) {
  // ...
}
```

**Best for:**
- Complete control over Claude's behavior
- Specialized single-session tasks
- Situations where default tools aren't needed
- Building specialized agents with unique behavior

### Method 4: Output Styles (Persistent Configurations)

Output styles are saved configurations stored as markdown files that can be reused across sessions and projects.

**Creating an output style:**
```typescript
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

async function createOutputStyle(name: string, description: string, prompt: string) {
  const outputStylesDir = join(homedir(), ".claude", "output-styles");
  await mkdir(outputStylesDir, { recursive: true });

  const content = `---
name: ${name}
description: ${description}
---

${prompt}`;

  const filePath = join(outputStylesDir, `${name.toLowerCase().replace(/\s+/g, "-")}.md`);
  await writeFile(filePath, content, "utf-8");
}

await createOutputStyle(
  "Code Reviewer",
  "Thorough code review assistant",
  `You are an expert code reviewer.

For every code submission:
1. Check for bugs and security issues
2. Evaluate performance
3. Suggest improvements
4. Rate code quality (1-10)`
);
```

Output styles are loaded when you include `settingSources: ['user']` or `settingSources: ['project']` in your options.

## Comparison

| Feature | CLAUDE.md | `append` | Custom Prompt | Output Styles |
| --- | --- | --- | --- | --- |
| **Persistence** | Per-project file | Session only | Session only | Saved as files |
| **Reusability** | Per-project | Code duplication | Code duplication | Across projects |
| **Default tools** | Preserved | Preserved | Must be added | Preserved |
| **Built-in safety** | Maintained | Maintained | Must be added | Maintained |
| **Customization level** | Additions only | Additions only | Complete control | Replace default |
| **Version control** | With project | With code | With code | Yes |
| **Scope** | Project-specific | Code session | Code session | User or project |
