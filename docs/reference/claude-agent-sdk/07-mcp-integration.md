# MCP Integration

Model Context Protocol (MCP) is the standard for defining and connecting tools to agents.

## Transport Types

| Type | Config Key | Use Case |
|------|-----------|----------|
| **stdio** | `command`, `args`, `env` | Local process servers (most common) |
| **SSE** | `type: "sse"`, `url`, `headers` | Cloud-hosted streaming servers |
| **HTTP** | `type: "http"`, `url`, `headers` | Cloud-hosted non-streaming servers |
| **SDK** | `type: "sdk"`, `name`, instance | In-process custom tools |

---

## stdio Transport

Local process-based MCP servers:

```python
options = ClaudeAgentOptions(
    mcp_servers={
        "github": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {"GITHUB_TOKEN": os.environ["GITHUB_TOKEN"]},
        },
        "postgres": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://..."],
        },
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"],
        },
    },
)
```

## SSE Transport

Server-Sent Events streaming:

```python
options = ClaudeAgentOptions(
    mcp_servers={
        "my-cloud-tools": {
            "type": "sse",
            "url": "https://my-server.example.com/mcp/sse",
            "headers": {"Authorization": "Bearer token"},
        },
    },
)
```

## HTTP Transport

Standard HTTP request/response:

```python
options = ClaudeAgentOptions(
    mcp_servers={
        "my-api": {
            "type": "http",
            "url": "https://my-server.example.com/mcp",
            "headers": {"Authorization": "Bearer token"},
        },
    },
)
```

## SDK Transport (In-Process)

In-process tools using `create_sdk_mcp_server()`:

```python
from claude_agent_sdk import tool, create_sdk_mcp_server

@tool("my_tool", "Description", {"param": str})
async def my_tool(args):
    return {"content": [{"type": "text", "text": "result"}]}

server = create_sdk_mcp_server(name="my-tools", tools=[my_tool])

options = ClaudeAgentOptions(
    mcp_servers={"my-tools": server},
)
```

---

## Tool Approval Patterns

```python
options = ClaudeAgentOptions(
    allowed_tools=[
        "mcp__github__*",                    # All tools from github server
        "mcp__my-tools__get_data",           # Specific tool only
        "mcp__my-tools__search_*",           # Prefix wildcard
    ],
    disallowed_tools=[
        "mcp__github__delete_repository",    # Block dangerous tool
    ],
)
```

---

## MCP Tool Search

When MCP tool definitions exceed 10% of the context window, the SDK automatically enables deferred tool loading via `ToolSearch`. The agent uses `ToolSearch` to discover and load tools on-demand.

### Configuration

```bash
# Environment variable control
export ENABLE_TOOL_SEARCH=auto       # Default: enable when tools > 10% context
export ENABLE_TOOL_SEARCH=auto:5     # Custom threshold: 5%
export ENABLE_TOOL_SEARCH=true       # Always enabled
export ENABLE_TOOL_SEARCH=false      # Always disabled
```

---

## .mcp.json Configuration File

Project-level MCP configuration (loaded when `setting_sources` includes `"project"`):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your-token"
      }
    }
  }
}
```

Place at project root. Loaded automatically when:
```python
options = ClaudeAgentOptions(
    setting_sources=["project"],  # or ["user", "project", "local"]
)
```

---

## Dynamic MCP Server Management

Using `ClaudeSDKClient` (Python):

```python
async with ClaudeSDKClient(options=options) as client:
    # Add server at runtime
    await client.add_mcp_server("github", {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {"GITHUB_TOKEN": token},
    })

    # Check status
    status = await client.get_mcp_status()

    # Remove server
    await client.remove_mcp_server("github")
```
