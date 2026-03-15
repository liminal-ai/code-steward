---
source: https://platform.claude.com/docs/en/agent-sdk/mcp
scraped_at: 2026-03-14
title: MCP in the Agent SDK
---

# MCP in the Agent SDK

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/docs/getting-started/intro) is an open standard for connecting AI agents to external tools and data sources. With MCP, your agent can query databases, integrate with APIs like Slack and GitHub, and connect to other services without writing custom tool implementations.

MCP servers can run as local processes, connect over HTTP, or execute directly within your SDK application.

## Quickstart

Connect to the Claude Code documentation MCP server using HTTP transport:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Use the docs MCP server to explain what hooks are in Claude Code",
  options: {
    mcpServers: {
      "claude-code-docs": {
        type: "http",
        url: "https://code.claude.com/docs/mcp"
      }
    },
    allowedTools: ["mcp__claude-code-docs__*"]
  }
})) {
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result);
  }
}
```

## Add an MCP Server

### In Code

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "List files in my project",
  options: {
    mcpServers: {
      filesystem: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
      }
    },
    allowedTools: ["mcp__filesystem__*"]
  }
})) {
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result);
  }
}
```

### From a Config File

Create `.mcp.json` at your project root (loaded automatically):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
    }
  }
}
```

## Allow MCP Tools

MCP tools require explicit permission before Claude can use them. Without permission, Claude will see tools are available but cannot call them.

### Tool Naming Convention

MCP tools follow the pattern `mcp__<server-name>__<tool-name>`. For example, a GitHub server named `"github"` with a `list_issues` tool becomes `mcp__github__list_issues`.

### Grant Access with allowedTools

```typescript
options: {
  mcpServers: { /* your servers */ },
  allowedTools: [
    "mcp__github__*",          // All tools from the github server
    "mcp__db__query",           // Only the query tool from db server
    "mcp__slack__send_message"  // Only send_message from slack server
  ]
}
```

Wildcards (`*`) let you allow all tools from a server without listing each one.

### Alternative: Change the Permission Mode

```typescript
options: {
  mcpServers: { /* your servers */ },
  permissionMode: "acceptEdits"  // No need for allowedTools
}
```

### Discover Available Tools

```typescript
for await (const message of query({ prompt: "...", options })) {
  if (message.type === "system" && message.subtype === "init") {
    console.log("Available MCP tools:", message.mcp_servers);
  }
}
```

## Transport Types

### stdio Servers

Local processes that communicate via stdin/stdout:

```typescript
options: {
  mcpServers: {
    github: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN
      }
    }
  },
  allowedTools: ["mcp__github__list_issues", "mcp__github__search_issues"]
}
```

### HTTP/SSE Servers

For cloud-hosted MCP servers and remote APIs:

```typescript
options: {
  mcpServers: {
    "remote-api": {
      type: "sse",
      url: "https://api.example.com/mcp/sse",
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`
      }
    }
  },
  allowedTools: ["mcp__remote-api__*"]
}
```

For HTTP (non-streaming), use `"type": "http"` instead.

### SDK MCP Servers

Define custom tools directly in your application code. See the [custom tools guide](./custom-tools.md).

## MCP Tool Search

When you have many MCP tools configured, tool definitions can consume a significant portion of your context window. MCP tool search dynamically loads tools on-demand instead of preloading all of them.

### How It Works

Tool search runs in auto mode by default. It activates when MCP tool descriptions would consume more than 10% of the context window. When triggered:
1. MCP tools are marked with `defer_loading: true` rather than loaded upfront
2. Claude uses a search tool to discover relevant MCP tools when needed
3. Only the tools Claude actually needs are loaded into context

**Requirements:** Sonnet 4 and later, or Opus 4 and later. Haiku models do not support tool search.

### Configure Tool Search

Control with the `ENABLE_TOOL_SEARCH` environment variable:

| Value | Behavior |
| --- | --- |
| `auto` | Activates when MCP tools exceed 10% of context (default) |
| `auto:5` | Activates at 5% threshold |
| `true` | Always enabled |
| `false` | Disabled, all MCP tools loaded upfront |

```typescript
const options = {
  mcpServers: { /* your MCP servers */ },
  env: {
    ENABLE_TOOL_SEARCH: "auto:5"
  }
};
```

## Authentication

### Pass Credentials via Environment Variables

```typescript
options: {
  mcpServers: {
    github: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN
      }
    }
  },
  allowedTools: ["mcp__github__list_issues"]
}
```

### HTTP Headers for Remote Servers

```typescript
options: {
  mcpServers: {
    "secure-api": {
      type: "http",
      url: "https://api.example.com/mcp",
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`
      }
    }
  },
  allowedTools: ["mcp__secure-api__*"]
}
```

### OAuth2 Authentication

The SDK doesn't handle OAuth flows automatically, but you can pass access tokens via headers after completing the OAuth flow:

```typescript
const accessToken = await getAccessTokenFromOAuthFlow();

const options = {
  mcpServers: {
    "oauth-api": {
      type: "http",
      url: "https://api.example.com/mcp",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  },
  allowedTools: ["mcp__oauth-api__*"]
};
```

## Examples

### List Issues from a Repository

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "List the 3 most recent issues in anthropics/claude-code",
  options: {
    mcpServers: {
      github: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: {
          GITHUB_TOKEN: process.env.GITHUB_TOKEN
        }
      }
    },
    allowedTools: ["mcp__github__list_issues"]
  }
})) {
  if (message.type === "system" && message.subtype === "init") {
    console.log("MCP servers:", message.mcp_servers);
  }
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result);
  }
}
```

### Query a Database

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const connectionString = process.env.DATABASE_URL;

for await (const message of query({
  prompt: "How many users signed up last week? Break it down by day.",
  options: {
    mcpServers: {
      postgres: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-postgres", connectionString]
      }
    },
    allowedTools: ["mcp__postgres__query"]  // Allow only read queries
  }
})) {
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result);
  }
}
```

## Error Handling

The SDK emits a `system` message with subtype `init` at the start of each query, containing the connection status for each MCP server:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Process data",
  options: {
    mcpServers: {
      "data-processor": dataServer
    }
  }
})) {
  if (message.type === "system" && message.subtype === "init") {
    const failedServers = message.mcp_servers.filter((s) => s.status !== "connected");
    if (failedServers.length > 0) {
      console.warn("Failed to connect:", failedServers);
    }
  }
}
```

## Troubleshooting

**Server shows "failed" status:**
- Missing environment variables
- Server not installed (check npm package exists)
- Invalid connection string (for database servers)
- Network issues (for HTTP/SSE servers)

**Tools not being called:**
- Check that you've granted permission with `allowedTools` or by changing the permission mode
- ```typescript
  options: {
    mcpServers: { /* your servers */ },
    allowedTools: ["mcp__servername__*"]  // Required for Claude to use the tools
  }
  ```

**Connection timeouts:**
The MCP SDK has a default timeout of 60 seconds. If your server takes longer to start, consider:
- Using a lighter-weight server if available
- Pre-warming the server before starting your agent
- Checking server logs for slow initialization
