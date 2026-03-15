# Hosting & Security

## System Requirements

| Resource | Minimum |
|----------|---------|
| CPU | 1 core per agent |
| RAM | ~1 GiB per agent |
| Disk | 5 GiB (CLI + workspace) |
| Network | Outbound HTTPS to api.anthropic.com |
| Runtime | Node.js 18+ |

---

## Deployment Patterns

### 1. Ephemeral Sessions
New container per task, destroyed on completion.
```
Request → Container → Agent → Result → Destroy
```
Best for: CI/CD, batch processing, one-shot tasks.

### 2. Long-Running Sessions
Persistent containers for proactive agents.
```
Container → Agent Watches → Reacts → Runs Continuously
```
Best for: Monitoring, chat assistants, always-on services.

### 3. Hybrid Sessions
Ephemeral containers hydrated with session history.
```
Request → Container → Load Session → Continue → Destroy
```
Best for: Stateful conversations + serverless infra.

### 4. Multi-Agent Container
Multiple agents in one container.
```
Container → Agent 1 + Agent 2 + Agent 3 → Coordinate
```
Best for: Simulations, testing, dev environments.

---

## Docker

### Dockerfile
```dockerfile
FROM node:18-slim
RUN apt-get update && apt-get install -y git
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV ANTHROPIC_API_KEY=""
CMD ["node", "main.js"]
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

| Provider | Isolation |
|----------|-----------|
| Modal Sandbox | Container |
| Cloudflare | V8 isolate |
| Daytona | VM |
| E2B | Firecracker VM |
| Fly Machines | Firecracker VM |
| Vercel Sandbox | Container |

---

## Security Hardening

### Container Security
```yaml
security_opt:
  - no-new-privileges:true
read_only: true
tmpfs:
  - /tmp
cap_drop:
  - ALL
```

### Proxy Pattern (Credential Injection)
```typescript
// Agent never sees the API key — proxy injects it
const options = {
  env: { ANTHROPIC_BASE_URL: "https://internal-proxy.company.com" },
};
```

### Filesystem Restrictions via Hooks
```typescript
async function restrictPaths(input: any, toolUseId: string | null, ctx: any) {
  const filePath = input.tool_input?.file_path ?? "";
  if (!filePath.startsWith("/workspace/project/")) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "Access restricted to /workspace/project/",
      },
    };
  }
  return {};
}

const options = {
  hooks: {
    PreToolUse: [{ matcher: "Write|Edit|Read", hooks: [restrictPaths] }],
  },
};
```

### Permission Layering (Defense in Depth)
```typescript
const options = {
  permissionMode: "acceptEdits",                  // Layer 1: mode
  allowedTools: ["Read", "Edit", "Glob"],         // Layer 2: allow
  disallowedTools: ["Bash"],                      // Layer 3: deny
  canUseTool: customPermission,                   // Layer 4: callback
  hooks: { PreToolUse: [{ hooks: [secHook] }] },  // Layer 5: hooks
  maxTurns: 30,                                    // Layer 6: limits
  maxBudgetUsd: 2.0,                               // Layer 7: budget
};
```
