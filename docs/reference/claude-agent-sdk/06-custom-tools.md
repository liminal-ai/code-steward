# Custom Tools

Custom tools are defined as in-process MCP servers using `tool()` and `create_sdk_mcp_server()` / `createSdkMcpServer()`.

## Tool Naming Convention

MCP tools follow the pattern: `mcp__<server-name>__<tool-name>`

Example: A tool named `get_weather` on server `my-tools` → `mcp__my-tools__get_weather`

---

## Python

### Basic Tool Definition

```python
from claude_agent_sdk import tool, create_sdk_mcp_server, ClaudeAgentOptions
from typing import Any

@tool("get_weather", "Get temperature for a location", {
    "latitude": float,
    "longitude": float,
})
async def get_weather(args: dict[str, Any]) -> dict[str, Any]:
    lat, lon = args["latitude"], args["longitude"]
    # Call your weather API here
    return {
        "content": [{"type": "text", "text": f"Temperature at ({lat}, {lon}): 72°F"}]
    }

server = create_sdk_mcp_server(name="weather", tools=[get_weather])

options = ClaudeAgentOptions(
    mcp_servers={"weather": server},
    allowed_tools=["mcp__weather__get_weather"],
)
```

### Multiple Tools on One Server

```python
@tool("search_docs", "Search documentation", {"query": str})
async def search_docs(args):
    return {"content": [{"type": "text", "text": f"Results for: {args['query']}"}]}

@tool("get_user", "Get user by ID", {"user_id": int})
async def get_user(args):
    return {"content": [{"type": "text", "text": f"User {args['user_id']}: Alice"}]}

server = create_sdk_mcp_server(name="my-api", tools=[search_docs, get_user])

options = ClaudeAgentOptions(
    mcp_servers={"my-api": server},
    allowed_tools=["mcp__my-api__*"],  # Wildcard: approve all tools on this server
)
```

---

## TypeScript

### Basic Tool Definition

```typescript
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const server = createSdkMcpServer({
  name: "weather",
  tools: [
    tool(
      "get_weather",
      "Get temperature for a location",
      {
        latitude: z.number().describe("Latitude"),
        longitude: z.number().describe("Longitude"),
      },
      async (args) => ({
        content: [{ type: "text", text: `Temperature at (${args.latitude}, ${args.longitude}): 72°F` }],
      })
    ),
  ],
});

for await (const message of query({
  prompt: "What's the weather at 40.7, -74.0?",
  options: {
    mcpServers: { weather: server },
    allowedTools: ["mcp__weather__get_weather"],
  },
})) {
  if ("result" in message) console.log(message.result);
}
```

### Tool with Complex Schema (Zod)

```typescript
const createIssue = tool(
  "create_issue",
  "Create a GitHub issue",
  {
    title: z.string().describe("Issue title"),
    body: z.string().describe("Issue body in markdown"),
    labels: z.array(z.string()).optional().describe("Labels to apply"),
    priority: z.enum(["low", "medium", "high"]).describe("Priority level"),
  },
  async (args) => {
    // Call GitHub API
    return {
      content: [{ type: "text", text: `Created issue: ${args.title}` }],
    };
  }
);
```

---

## Tool Return Format

Tools must return MCP-compatible content:

```python
# Text response
return {"content": [{"type": "text", "text": "result text"}]}

# Multiple content blocks
return {
    "content": [
        {"type": "text", "text": "Found 3 results:"},
        {"type": "text", "text": "1. First result"},
        {"type": "text", "text": "2. Second result"},
    ]
}

# Error response
return {
    "content": [{"type": "text", "text": "Error: User not found"}],
    "isError": True,
}
```

---

## External MCP Servers as Custom Tools

You can also use external MCP servers (not just in-process):

```python
options = ClaudeAgentOptions(
    mcp_servers={
        "github": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {"GITHUB_TOKEN": os.environ["GITHUB_TOKEN"]},
        },
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
        },
    },
    allowed_tools=["mcp__github__*", "mcp__filesystem__*"],
)
```

See [MCP Integration](./07-mcp-integration.md) for full transport type details.
