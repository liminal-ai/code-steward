---
source: https://platform.claude.com/docs/en/agent-sdk/plugins
scraped_at: 2026-03-14
title: Plugins in the SDK
---

# Plugins in the SDK

Plugins allow you to extend Claude Code with custom functionality that can be shared across projects. Through the Agent SDK, you can programmatically load plugins from local directories to add custom slash commands, agents, skills, hooks, and MCP servers to your agent sessions.

## What Are Plugins?

Plugins are packages of Claude Code extensions that can include:

- **Skills**: Model-invoked capabilities (can also be invoked with `/skill-name`)
- **Agents**: Specialized subagents for specific tasks
- **Hooks**: Event handlers that respond to tool use and other events
- **MCP servers**: External tool integrations via Model Context Protocol

The `commands/` directory is a legacy format. Use `skills/` for new plugins.

## Loading Plugins

Load plugins by providing their local file system paths in your options configuration:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Hello",
  options: {
    plugins: [
      { type: "local", path: "./my-plugin" },
      { type: "local", path: "/absolute/path/to/another-plugin" }
    ]
  }
})) {
  // Plugin commands, agents, and other features are now available
}
```

### Path Specifications

Plugin paths can be:
- **Relative paths**: Resolved relative to your current working directory (e.g., `"./plugins/my-plugin"`)
- **Absolute paths**: Full file system paths (e.g., `"/home/user/plugins/my-plugin"`)

The path should point to the plugin's root directory (containing `.claude-plugin/plugin.json`).

## Verifying Plugin Installation

When plugins load successfully, they appear in the system initialization message:

```typescript
for await (const message of query({
  prompt: "Hello",
  options: {
    plugins: [{ type: "local", path: "./my-plugin" }]
  }
})) {
  if (message.type === "system" && message.subtype === "init") {
    console.log("Plugins:", message.plugins);
    // Example: [{ name: "my-plugin", path: "./my-plugin" }]

    console.log("Commands:", message.slash_commands);
    // Example: ["/help", "/compact", "my-plugin:custom-command"]
  }
}
```

## Using Plugin Skills

Skills from plugins are namespaced with the plugin name: `plugin-name:skill-name`.

```typescript
for await (const message of query({
  prompt: "/my-plugin:greet",  // Use plugin skill with namespace
  options: {
    plugins: [{ type: "local", path: "./my-plugin" }]
  }
})) {
  if (message.type === "assistant") {
    console.log(message.content);
  }
}
```

## Complete Example

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import * as path from "path";

async function runWithPlugin() {
  const pluginPath = path.join(__dirname, "plugins", "my-plugin");

  for await (const message of query({
    prompt: "What custom commands do you have available?",
    options: {
      plugins: [{ type: "local", path: pluginPath }],
      maxTurns: 3
    }
  })) {
    if (message.type === "system" && message.subtype === "init") {
      console.log("Loaded plugins:", message.plugins);
      console.log("Available commands:", message.slash_commands);
    }

    if (message.type === "assistant") {
      console.log("Assistant:", message.content);
    }
  }
}

runWithPlugin().catch(console.error);
```

## Plugin Structure Reference

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Required: plugin manifest
├── skills/                   # Agent Skills (invoked autonomously or via /skill-name)
│   └── my-skill/
│       └── SKILL.md
├── commands/                 # Legacy: use skills/ instead
│   └── custom-cmd.md
├── agents/                   # Custom agents
│   └── specialist.md
├── hooks/                    # Event handlers
│   └── hooks.json
└── .mcp.json                 # MCP server definitions
```

## Common Use Cases

**Development and testing:**
```typescript
plugins: [{ type: "local", path: "./dev-plugins/my-plugin" }];
```

**Project-specific extensions:**
```typescript
plugins: [{ type: "local", path: "./project-plugins/team-workflows" }];
```

**Multiple plugin sources:**
```typescript
plugins: [
  { type: "local", path: "./local-plugin" },
  { type: "local", path: "~/.claude/custom-plugins/shared-plugin" }
];
```

## Troubleshooting

**Plugin not loading:**
1. Check the path points to the plugin root directory (containing `.claude-plugin/`)
2. Validate `plugin.json` has valid JSON syntax
3. Check file permissions

**Skills not appearing:**
1. Plugin skills require the `plugin-name:skill-name` format when invoked as slash commands
2. Check init message to verify the skill appears in `slash_commands` with the correct namespace
3. Ensure each skill has a `SKILL.md` file in its own subdirectory under `skills/`

**Path resolution issues:**
1. Relative paths are resolved from your current working directory
2. Use absolute paths for reliability
