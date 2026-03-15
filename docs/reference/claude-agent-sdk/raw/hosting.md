---
source: https://platform.claude.com/docs/en/agent-sdk/hosting
scraped_at: 2026-03-14
title: Hosting the Agent SDK
---

# Hosting the Agent SDK

The Claude Agent SDK differs from traditional stateless LLM APIs in that it maintains conversational state and executes commands in a persistent environment.

## Hosting Requirements

### Container-Based Sandboxing

For security and isolation, the SDK should run inside a sandboxed container environment. This provides process isolation, resource limits, network control, and ephemeral filesystems.

### System Requirements

Each SDK instance requires:
- **Runtime:** Python 3.10+ (Python SDK) or Node.js 18+ (TypeScript SDK)
- **Node.js** (required by Claude Code CLI)
- **Claude Code CLI:** `npm install -g @anthropic-ai/claude-code`
- **Resource allocation:** Recommended 1GiB RAM, 5GiB disk, 1 CPU
- **Network:** Outbound HTTPS to `api.anthropic.com`

## Understanding the SDK Architecture

Unlike stateless API calls, the Claude Agent SDK operates as a long-running process that:
- Executes commands in a persistent shell environment
- Manages file operations within a working directory
- Handles tool execution with context from previous interactions

## Sandbox Provider Options

- **[Modal Sandbox](https://modal.com/docs/guide/sandbox)**
- **[Cloudflare Sandboxes](https://github.com/cloudflare/sandbox-sdk)**
- **[Daytona](https://www.daytona.io/)**
- **[E2B](https://e2b.dev/)**
- **[Fly Machines](https://fly.io/docs/machines/)**
- **[Vercel Sandbox](https://vercel.com/docs/functions/sandbox)**

## Production Deployment Patterns

### Pattern 1: Ephemeral Sessions

Create a new container for each user task, then destroy it when complete.

**Best for:** One-off tasks where the user may interact with the AI while the task completes, but once completed the container is destroyed.

**Examples:**
- Bug Investigation & Fix
- Invoice Processing
- Translation Tasks
- Image/Video Processing

### Pattern 2: Long-Running Sessions

Maintain persistent container instances for long running tasks. Often running multiple Claude Agent processes inside a container based on demand.

**Best for:** Proactive agents that take action without user input, agents serving content, agents processing high amounts of messages.

**Examples:**
- Email Agent: Monitors incoming emails and autonomously triages, responds, or takes actions
- Site Builder: Hosts custom websites per user with live editing capabilities
- High-Frequency Chat Bots: Handles continuous message streams from Slack

### Pattern 3: Hybrid Sessions

Ephemeral containers hydrated with history and state from a database or from the SDK's session resumption features.

**Best for:** Containers with intermittent interaction that kick off work and spin down when complete, but can be continued.

**Examples:**
- Personal Project Manager: Manages ongoing projects with intermittent check-ins
- Deep Research: Conducts multi-hour research tasks, saves findings and resumes
- Customer Support Agent: Handles support tickets that span multiple interactions

### Pattern 4: Single Containers

Run multiple Claude Agent SDK processes in one global container.

**Best for:** Agents that must collaborate closely together. Least popular pattern due to risk of agents overwriting each other.

**Examples:**
- Simulations: Agents that interact with each other in simulations such as video games

## FAQ

**How do I communicate with my sandboxes?**
When hosting in containers, expose ports to communicate with your SDK instances. Your application can expose HTTP/WebSocket endpoints for external clients while the SDK runs internally.

**What is the cost of hosting a container?**
The dominant cost is tokens; containers vary based on provisioning, but minimum cost is roughly 5 cents per hour running.

**When should I shut down idle containers?**
This is provider-dependent. Tune the idle timeout based on how frequent you think user responses will be.

**How often should I update the Claude Code CLI?**
The Claude Code CLI is versioned with semver, so any breaking changes will be versioned.

**How do I monitor container health and agent performance?**
Since containers are just servers, the same logging infrastructure you use for the backend will work.

**How long can an agent session run before timing out?**
An agent session will not timeout, but consider setting `maxTurns` to prevent Claude from getting stuck in a loop.

## Next Steps

- [Secure Deployment](./secure-deployment.md) — Network controls, credential management, and isolation hardening
- [Sessions Guide](./sessions.md) — Learn about session management
- [Permissions](./permissions.md) — Configure tool permissions
- [Cost Tracking](./cost-tracking.md) — Monitor API usage
- [MCP Integration](./mcp.md) — Extend with custom tools
