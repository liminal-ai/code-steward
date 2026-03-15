# Getting Started

## Installation

### Python
```bash
# Using pip
pip install claude-agent-sdk

# Using uv
uv init && uv add claude-agent-sdk
```
**Prerequisites:** Python 3.10+. The Claude Code CLI is bundled with the package.

### TypeScript
```bash
npm install @anthropic-ai/claude-agent-sdk
# or
yarn add @anthropic-ai/claude-agent-sdk
# or
pnpm add @anthropic-ai/claude-agent-sdk
```
**Prerequisites:** Node.js 18+.

### Rust (Unofficial)
```toml
[dependencies]
anthropic-agent-sdk = "*"
```

---

## Authentication

```bash
# Primary: Anthropic API key
export ANTHROPIC_API_KEY=your-api-key

# Amazon Bedrock
export CLAUDE_CODE_USE_BEDROCK=1
# + configure AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)

# Google Vertex AI
export CLAUDE_CODE_USE_VERTEX=1
# + configure Google Cloud credentials

# Microsoft Azure AI Foundry
export CLAUDE_CODE_USE_FOUNDRY=1
# + configure Azure credentials
```

### Third-Party Proxy
```bash
export ANTHROPIC_BASE_URL="https://your-proxy.example.com"
```

---

## Quickstart: Python

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="What files are in the current directory?",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Glob", "Bash"],
            permission_mode="bypassPermissions",
            max_turns=5,
        ),
    ):
        if hasattr(message, "result"):
            print(f"Result: {message.result}")
            print(f"Cost: ${message.total_cost_usd:.4f}")

asyncio.run(main())
```

## Quickstart: TypeScript

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "What files are in the current directory?",
  options: {
    allowedTools: ["Read", "Glob", "Bash"],
    permissionMode: "bypassPermissions",
    maxTurns: 5,
  }
})) {
  if ("result" in message) {
    console.log(`Result: ${message.result}`);
    console.log(`Cost: $${message.totalCostUsd?.toFixed(4)}`);
  }
}
```

---

## Minimal Custom Tool Example

```python
import asyncio
from claude_agent_sdk import query, tool, create_sdk_mcp_server, ClaudeAgentOptions

@tool("greet", "Greet a user by name", {"name": str})
async def greet(args):
    return {"content": [{"type": "text", "text": f"Hello, {args['name']}!"}]}

server = create_sdk_mcp_server(name="my-tools", tools=[greet])

async def main():
    async for message in query(
        prompt="Greet the user named Alice",
        options=ClaudeAgentOptions(
            mcp_servers={"my-tools": server},
            allowed_tools=["mcp__my-tools__greet"],
        ),
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```
