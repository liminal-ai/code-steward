# Tools & MCP Integration

## Built-in Tool Input Schemas

### Read
```json
{ "file_path": "/absolute/path", "offset": 0, "limit": 2000 }
```

### Write
```json
{ "file_path": "/absolute/path", "content": "file content" }
```

### Edit
```json
{ "file_path": "/absolute/path", "old_string": "find", "new_string": "replace", "replace_all": false }
```

### Bash
```json
{ "command": "ls -la", "description": "List files", "timeout": 120000, "run_in_background": false }
```

### Glob
```json
{ "pattern": "**/*.ts", "path": "/search/root" }
```

### Grep
```json
{ "pattern": "function\\s+\\w+", "path": "/root", "glob": "*.ts", "output_mode": "content" }
```

### Agent
```json
{ "prompt": "Task for subagent", "description": "Short desc", "subagent_type": "general-purpose" }
```

---

## Custom Tools via MCP

### In-Process SDK Server

```typescript
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const server = createSdkMcpServer({
  name: "my-api",
  tools: [
    tool("search_docs", "Search documentation", {
      query: z.string().describe("Search query"),
      limit: z.number().optional().describe("Max results"),
    }, async (args) => ({
      content: [{ type: "text", text: `Results for: ${args.query}` }],
    })),

    tool("get_user", "Get user by ID", {
      userId: z.number().describe("User ID"),
    }, async (args) => ({
      content: [{ type: "text", text: `User ${args.userId}: Alice` }],
    })),
  ],
});

const options = {
  mcpServers: { "my-api": server },
  allowedTools: ["mcp__my-api__*"],        // Wildcard: all tools
};
```

### Tool Return Format

```typescript
// Success
return { content: [{ type: "text", text: "result" }] };

// Multiple blocks
return { content: [
  { type: "text", text: "Found 3 results:" },
  { type: "text", text: "1. First\n2. Second\n3. Third" },
]};

// Error
return { content: [{ type: "text", text: "Error: not found" }], isError: true };
```

---

## MCP Transport Types

### stdio (Local Process)
```typescript
const options = {
  mcpServers: {
    github: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN! },
    },
    postgres: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://..."],
    },
  },
};
```

### SSE (Server-Sent Events)
```typescript
const options = {
  mcpServers: {
    "cloud-tools": {
      type: "sse",
      url: "https://my-server.example.com/mcp/sse",
      headers: { Authorization: "Bearer token" },
    },
  },
};
```

### HTTP
```typescript
const options = {
  mcpServers: {
    "my-api": {
      type: "http",
      url: "https://my-server.example.com/mcp",
      headers: { Authorization: "Bearer token" },
    },
  },
};
```

### SDK (In-Process) — shown above

---

## .mcp.json Project Config

Place at project root. Loaded when `settingSources` includes `"project"`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "your-token" }
    }
  }
}
```

---

## MCP Tool Search

Auto-enabled when tool definitions exceed 10% of context. Agent uses `ToolSearch` to discover tools on-demand.

```bash
ENABLE_TOOL_SEARCH=auto       # Default: 10% threshold
ENABLE_TOOL_SEARCH=auto:5     # Custom: 5%
ENABLE_TOOL_SEARCH=true       # Always on
ENABLE_TOOL_SEARCH=false      # Disabled
```

---

## Dynamic MCP Server Management

Using the TS V2 session API or Python `ClaudeSDKClient`:

```typescript
// Add at runtime
await client.addMcpServer("github", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
});

// Check status
const status = await client.getMcpStatus();

// Remove
await client.removeMcpServer("github");
```
