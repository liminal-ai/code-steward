# Claude Agent SDK - Context7 Source 2: Nothflare Docs
## Library ID: /nothflare/claude-agent-sdk-docs
## Source Reputation: Medium | Benchmark Score: 82.97 | Code Snippets: 821

---

### Connecting to External Systems with MCP

Source: https://github.com/nothflare/claude-agent-sdk-docs/blob/main/docs/en/agent-sdk/overview.md

This snippet shows how to connect the Claude Agent SDK to external systems using the Model Context Protocol (MCP). It includes examples for both Python and TypeScript, demonstrating how to integrate with the Playwright MCP server for browser automation capabilities.

```Python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="Open example.com and describe what you see",
        options=ClaudeAgentOptions(
            mcp_servers={
                "playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]}
            }
        )
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

```TypeScript
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

### Configure MCP Servers for External Connections - TypeScript

Source: https://context7.com/nothflare/claude-agent-sdk-docs/llms.txt

Shows how to connect external MCP (Model Context Protocol) servers for services like databases, browsers, and APIs. This configuration allows the agent to interact with external resources.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Open example.com and describe what you see",
  options: {
    mcpServers: {
      playwright: { command: "npx", args: ["@playwright/mcp@latest"] },
      filesystem: {
        command: "npx",
        args: ["@modelcontextprotocol/server-filesystem"],
        env: { ALLOWED_PATHS: "/Users/me/projects" }
      }
    }
  }
})) {
  if (message.type === "result") console.log(message.result);
}
```

---

### Create an In-Process MCP Server (Python)

Source: https://github.com/nothflare/claude-agent-sdk-docs/blob/main/docs/en/agent-sdk/python.md

Shows how to create an in-process Message Communication Protocol (MCP) server using `create_sdk_mcp_server`. This function allows you to bundle multiple tools into a single server configuration that can be passed to `ClaudeAgentOptions`. The example includes defining 'add' and 'multiply' tools and then creating a 'calculator' server.

```python
from claude_agent_sdk import tool, create_sdk_mcp_server

@tool("add", "Add two numbers", {"a": float, "b": float})
async def add(args):
    return {
        "content": [{
            "type": "text",
            "text": f"Sum: {args['a'] + args['b']}"
        }]
    }

@tool("multiply", "Multiply two numbers", {"a": float, "b": float})
async def multiply(args):
    return {
        "content": [{
            "type": "text",
            "text": f"Product: {args['a'] * args['b']}"
        }]
    }

calculator = create_sdk_mcp_server(
    name="calculator",
    version="2.0.0",
    tools=[add, multiply]  # Pass decorated functions
)

# Use with Claude
options = ClaudeAgentOptions(
    mcp_servers={"calc": calculator},
    allowed_tools=["mcp__calc__add", "mcp__calc__multiply"]
)
```

---

### Python Custom Tools with ClaudeSDKClient

Source: https://github.com/nothflare/claude-agent-sdk-docs/blob/main/docs/en/agent-sdk/python.md

Demonstrates how to integrate custom tools with the ClaudeSDKClient. This example defines two tools, 'calculate' and 'get_time', using the @tool decorator and configures the SDK MCP server to make them available for the agent. It then shows how to use the client to invoke these tools and process their responses.

```python
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    tool,
    create_sdk_mcp_server,
    AssistantMessage,
    TextBlock
)
import asyncio
from typing import Any

# Define custom tools with @tool decorator
@tool("calculate", "Perform mathematical calculations", {"expression": str})
async def calculate(args: dict[str, Any]) -> dict[str, Any]:
    try:
        result = eval(args["expression"], {"__builtins__": {}})
        return {
            "content": [{
                "type": "text",
                "text": f"Result: {result}"
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error: {str(e)}"
            }],
            "is_error": True
        }

@tool("get_time", "Get current time", {})
async def get_time(args: dict[str, Any]) -> dict[str, Any]:
    from datetime import datetime
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return {
        "content": [{
            "type": "text",
            "text": f"Current time: {current_time}"
        }]
    }

async def main():
    # Create SDK MCP server with custom tools
    my_server = create_sdk_mcp_server(
        name="utilities",
        version="1.0.0",
        tools=[calculate, get_time]
    )

    # Configure options with the server
    options = ClaudeAgentOptions(
        mcp_servers={"utils": my_server},
        allowed_tools=[
            "mcp__utils__calculate",
            "mcp__utils__get_time"
        ]
    )

    # Use ClaudeSDKClient for interactive tool usage
    async with ClaudeSDKClient(options=options) as client:
        await client.query("What's 123 * 456?")

        # Process calculation response
        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Calculation: {block.text}")

        # Follow up with time query
        await client.query("What time is it now?")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Time: {block.text}")

asyncio.run(main())
```

---

### Multiple Tools Example with Selective Allowance

Source: https://github.com/nothflare/claude-agent-sdk-docs/blob/main/docs/en/agent-sdk/guides/custom-tools.md

Demonstrates how to configure an MCP server with multiple tools and selectively allow specific tools for use in queries. This example shows how to define tools and then restrict their usage via the 'allowedTools' option in the query.

```typescript
const multiToolServer = createSdkMcpServer({
  name: "utilities",
  version: "1.0.0",
  tools: [
    tool("calculate", "Perform calculations", { /* ... */ }, async (args) => { /* ... */ }),
    tool("translate", "Translate text", { /* ... */ }, async (args) => { /* ... */ }),
    tool("search_web", "Search the web", { /* ... */ }, async (args) => { /* ... */ })
  ]
});

// Allow only specific tools with streaming input
async function* generateMessages() {
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: "Calculate 5 + 3 and translate 'hello' to Spanish"
    }
  };
}

for await (const message of query({
  prompt: generateMessages(),  // Use async generator for streaming input
  options: {
    mcpServers: {
      utilities: multiToolServer
    },
    allowedTools: [
      "mcp__utilities__calculate",   // Allow calculator
      "mcp__utilities__translate",   // Allow translator
      // "mcp__utilities__search_web" is NOT allowed
    ]
  }
})) {
  // Process messages
}
```

```python
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions, tool, create_sdk_mcp_server
from typing import Any
import asyncio

# Define multiple tools using the @tool decorator
@tool("calculate", "Perform calculations", {"expression": str})
async def calculate(args: dict[str, Any]) -> dict[str, Any]:
    result = eval(args["expression"])  # Use safe eval in production
    return {"content": [{"type": "text", "text": f"Result: {result}"}]}

@tool("translate", "Translate text", {"text": str, "target_lang": str})
async def translate(args: dict[str, Any]) -> dict[str, Any]:
    # Translation logic here
    return {"content": [{"type": "text", "text": f"Translated: {args['text']}"}]}

@tool("search_web", "Search the web", {"query": str})
async def search_web(args: dict[str, Any]) -> dict[str, Any]:
    # Search logic here
    return {"content": [{"type": "text", "text": f"Search results for: {args['query']}"}]}

multi_tool_server = create_sdk_mcp_server(
    name="utilities",
    version="1.0.0",
    tools=[calculate, translate, search_web]  # Pass decorated functions
)

# Allow only specific tools with streaming input
async def message_generator():
    yield {
        "type": "user",
        "message": {
            "role": "user",
            "content": "Calculate 5 + 3 and translate 'hello' to Spanish"
        }
    }

async for message in query(
    prompt=message_generator(),  # Use async generator for streaming input
    options=ClaudeAgentOptions(
        mcp_servers={"utilities": multi_tool_server},
        allowed_tools=[
            "mcp__utilities__calculate",   # Allow calculator
            "mcp__utilities__translate",   # Allow translator
            # "mcp__utilities__search_web" is NOT allowed
        ]
    )
):
    if hasattr(message, 'result'):
        print(message.result)
```
