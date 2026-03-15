# Hosting & Deployment

## System Requirements

| Resource | Minimum |
|----------|---------|
| CPU | 1 core per agent instance |
| RAM | ~1 GiB per agent instance |
| Disk | 5 GiB (CLI + workspace) |
| Network | Outbound HTTPS to api.anthropic.com |
| Runtime | Python 3.10+ or Node.js 18+ |

---

## Deployment Patterns

### 1. Ephemeral Sessions
New container per task, destroyed when complete.

```
Request → Spawn Container → Run Agent → Return Result → Destroy Container
```

**Best for:** One-shot tasks, CI/CD pipelines, batch processing.

### 2. Long-Running Sessions
Persistent containers for proactive agents.

```
Container Started → Agent Watches → Reacts to Events → Runs Continuously
```

**Best for:** Monitoring agents, chat assistants, always-on services.

### 3. Hybrid Sessions
Ephemeral containers hydrated with session history.

```
Request → Spawn Container → Load Session → Continue → Return → Destroy
```

**Best for:** Stateful multi-turn conversations with serverless infrastructure.

### 4. Single Container Multi-Agent
Multiple agents in one container.

```
Container → Agent 1 (reviewer) ─┐
          → Agent 2 (fixer)    ──┤→ Coordinate
          → Agent 3 (tester)   ──┘
```

**Best for:** Agent simulations, testing, development.

---

## Docker Deployment

### Dockerfile
```dockerfile
FROM python:3.12-slim

# Install Node.js (required for some MCP servers)
RUN apt-get update && apt-get install -y nodejs npm git

# Install SDK
RUN pip install claude-agent-sdk

# Copy application
WORKDIR /app
COPY . .

# Set API key at runtime
ENV ANTHROPIC_API_KEY=""

CMD ["python", "main.py"]
```

### Docker Compose
```yaml
version: "3.8"
services:
  agent:
    build: .
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./workspace:/workspace
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "1.0"
```

---

## Sandbox Providers

| Provider | Type | Isolation |
|----------|------|-----------|
| Modal Sandbox | Cloud | Container |
| Cloudflare Sandboxes | Edge | V8 isolate |
| Daytona | Cloud | VM |
| E2B | Cloud | Firecracker VM |
| Fly Machines | Cloud | Firecracker VM |
| Vercel Sandbox | Cloud | Container |

### Sandbox Configuration

```python
options = ClaudeAgentOptions(
    sandbox={
        "provider": "modal",
        "config": {
            "image": "my-agent-image",
            "timeout": 300,
        },
    },
)
```

---

## Security Hardening

### Container Isolation
```yaml
# Docker security options
security_opt:
  - no-new-privileges:true
read_only: true
tmpfs:
  - /tmp
cap_drop:
  - ALL
```

### Network Controls
```python
# Proxy pattern for credential injection
options = ClaudeAgentOptions(
    env={
        "ANTHROPIC_BASE_URL": "https://internal-proxy.company.com",
        # Proxy injects API key - agent never sees it
    },
)
```

### Filesystem Restrictions
```python
options = ClaudeAgentOptions(
    cwd="/workspace/project",
    disallowed_tools=["Bash"],  # No shell access
    allowed_tools=["Read", "Edit", "Write", "Glob", "Grep"],
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Write|Edit", hooks=[restrict_paths]),
        ],
    },
)

async def restrict_paths(input_data, tool_use_id, context):
    file_path = input_data.get("tool_input", {}).get("file_path", "")
    if not file_path.startswith("/workspace/project/"):
        return {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": "Access restricted to /workspace/project/",
            }
        }
    return {}
```

### Permission Layering
```python
# Defense in depth
options = ClaudeAgentOptions(
    permission_mode="acceptEdits",           # Layer 1: mode
    allowed_tools=["Read", "Edit", "Glob"],  # Layer 2: allow list
    disallowed_tools=["Bash"],               # Layer 3: deny list
    can_use_tool=custom_permission,           # Layer 4: callback
    hooks={                                   # Layer 5: hooks
        "PreToolUse": [HookMatcher(hooks=[security_hook])],
    },
    max_turns=30,                            # Layer 6: limits
    max_budget_usd=2.00,                     # Layer 7: budget
)
```
