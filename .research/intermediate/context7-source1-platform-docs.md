# Claude Agent SDK - Context7 Source 1: Official Platform Docs
## Library ID: /websites/platform_claude_en_agent-sdk
## Source Reputation: High | Benchmark Score: 86.14 | Code Snippets: 988

---

### Connect to External Systems via MCP with Claude Agent SDK (Python/TypeScript)

Source: https://platform.claude.com/docs/en/agent-sdk/overview

This example illustrates how to integrate external systems using the Model Context Protocol (MCP) in the Claude Agent SDK. It connects to a Playwright MCP server to enable browser automation, allowing the agent to open a webpage and describe its content.

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions


async def main():
    async for message in query(
        prompt="Open example.com and describe what you see",
        options=ClaudeAgentOptions(
            mcp_servers={
                "playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]}
            }
        ),
    ):
        if hasattr(message, "result"):
            print(message.result)


asyncio.run(main())
```

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Open example.com and describe what you see",
  options: {
    mcpServers: {
      playwright: { command: "npx", args: ["@playwright/mcp@latest"] }
    }
  }
})) {
  if ("result" in message) console.log(message.result);
}
```

---

### Configure Claude Agent with Custom MCP Server and Tools (Python)

Source: https://docs.claude.com/en/api/agent-sdk/python

This example demonstrates how to define custom tools using the `@tool` decorator, create an MCP (Multi-Component Protocol) server with `create_sdk_mcp_server`, and integrate it into `ClaudeAgentOptions`. The `create_sdk_mcp_server` function returns an `McpSdkServerConfig` object, which is then passed to `ClaudeAgentOptions.mcp_servers` along with a list of allowed tools. This setup enables Claude to utilize the custom-defined 'add' and 'multiply' tools.

```python
from claude_agent_sdk import tool, create_sdk_mcp_server


@tool("add", "Add two numbers", {"a": float, "b": float})
async def add(args):
    return {"content": [{"type": "text", "text": f"Sum: {args['a'] + args['b']}"}]}


@tool("multiply", "Multiply two numbers", {"a": float, "b": float})
async def multiply(args):
    return {"content": [{"type": "text", "text": f"Product: {args['a'] * args['b']}"}]}


calculator = create_sdk_mcp_server(
    name="calculator",
    version="2.0.0",
    tools=[add, multiply],  # Pass decorated functions
)

# Use with Claude
options = ClaudeAgentOptions(
    mcp_servers={"calc": calculator},
    allowed_tools=["mcp__calc__add", "mcp__calc__multiply"],
)
```

---

### Grant Access to MCP Tools with allowedTools (TypeScript)

Source: https://platform.claude.com/docs/en/agent-sdk/mcp

This TypeScript-like code snippet shows how to configure the `allowedTools` option to control which Model Context Protocol (MCP) tools an agent can use. It demonstrates granting access to all tools from a server using a wildcard (`mcp__github__*`), as well as specifying individual tools from different servers (`mcp__db__query`, `mcp__slack__send_message`). This is crucial for security and managing agent capabilities.

```typescript
const _ = {
  options: {
    mcpServers: {
      // your servers
    },
    allowedTools: [
      "mcp__github__*", // All tools from the github server
      "mcp__db__query", // Only the query tool from db server
      "mcp__slack__send_message" // Only send_message from slack server
    ]
  }
};
```

---

### Connect to Claude Code Docs MCP Server (TypeScript/Python)

Source: https://platform.claude.com/docs/en/agent-sdk/mcp

This example demonstrates how to connect to an HTTP-based Model Context Protocol (MCP) server, specifically the Claude Code documentation server. It uses the `query` function from the SDK to send a prompt and retrieve information, allowing all tools from the server using a wildcard in `allowedTools`. The output is logged to the console upon successful retrieval.

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

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage


async def main():
    options = ClaudeAgentOptions(
        mcp_servers={
            "claude-code-docs": {
                "type": "http",
                "url": "https://code.claude.com/docs/mcp",
            }
        },
        allowed_tools=["mcp__claude-code-docs__*"],
    )

    async for message in query(
        prompt="Use the docs MCP server to explain what hooks are in Claude Code",
        options=options,
    ):
        if isinstance(message, ResultMessage) and message.subtype == "success":
            print(message.result)


asyncio.run(main())
```

---

### Create an MCP Server with Multiple Tools in Python

Source: https://platform.claude.com/docs/en/agent-sdk/python

Illustrates the creation of an in-process MCP server named 'calculator' using `create_sdk_mcp_server`, registering two distinct tools ('add' and 'multiply') defined with the `@tool` decorator. This example also shows how to integrate the created server into `ClaudeAgentOptions` for use with a Claude agent, specifying allowed tools.

```python
from claude_agent_sdk import tool, create_sdk_mcp_server


@tool("add", "Add two numbers", {"a": float, "b": float})
async def add(args):
    return {"content": [{"type": "text", "text": f"Sum: {args['a'] + args['b']}"}]}


@tool("multiply", "Multiply two numbers", {"a": float, "b": float})
async def multiply(args):
    return {"content": [{"type": "text", "text": f"Product: {args['a'] * args['b']}"}]}


calculator = create_sdk_mcp_server(
    name="calculator",
    version="2.0.0",
    tools=[add, multiply]
)

# Use with Claude
options = ClaudeAgentOptions(
    mcp_servers={"calc": calculator},
    allowed_tools=["mcp__calc__add", "mcp__calc__multiply"]
)
```
