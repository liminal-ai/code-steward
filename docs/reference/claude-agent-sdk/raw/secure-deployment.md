---
source: https://platform.claude.com/docs/en/agent-sdk/secure-deployment
scraped_at: 2026-03-14
title: Securely Deploying AI Agents
---

# Securely Deploying AI Agents

Claude Code and the Agent SDK can execute code, access files, and interact with external services. Their behavior can be influenced by the content they process (prompt injection). This guide covers practical ways to reduce this risk.

The same principles that apply to running any semi-trusted code apply here: isolation, least privilege, and defense in depth.

## Threat Model

Agents can take unintended actions due to prompt injection (instructions embedded in content they process) or model error. Claude models are designed to resist this. Claude Opus 4.6 is the most robust frontier model available.

Defense in depth is still good practice. For example, if an agent processes a malicious file instructing it to send customer data to an external server, network controls can block that request entirely.

## Built-in Security Features

- **Permissions system**: Every tool and bash command can be configured to allow, block, or prompt for approval. Use glob patterns like "allow all npm commands" or "block any command with sudo".
- **Static analysis**: Before executing bash commands, Claude Code runs static analysis to identify potentially risky operations.
- **Web search summarization**: Search results are summarized rather than passing raw content directly into context.
- **Sandbox mode**: Bash commands can run in a sandboxed environment that restricts filesystem and network access.

## Security Principles

### Security Boundaries

A security boundary separates components with different trust levels. For high-security deployments, place sensitive resources (credentials) outside the boundary containing the agent.

**Example:** Rather than giving an agent direct access to an API key, run a proxy outside the agent's environment that injects the key into requests. The agent can make API calls, but it never sees the credential itself.

### Least Privilege

| Resource | Restriction options |
| --- | --- |
| Filesystem | Mount only needed directories, prefer read-only |
| Network | Restrict to specific endpoints via proxy |
| Credentials | Inject via proxy rather than exposing directly |
| System capabilities | Drop Linux capabilities in containers |

## Isolation Technologies

| Technology | Isolation strength | Performance overhead | Complexity |
| --- | --- | --- | --- |
| Sandbox runtime | Good (secure defaults) | Very low | Low |
| Containers (Docker) | Setup dependent | Low | Medium |
| gVisor | Excellent (with correct setup) | Medium/High | Medium |
| VMs (Firecracker, QEMU) | Excellent (with correct setup) | High | Medium/High |

### Sandbox Runtime

For lightweight isolation without containers, [sandbox-runtime](https://github.com/anthropic-experimental/sandbox-runtime) enforces filesystem and network restrictions at the OS level.

```bash
npm install @anthropic-ai/sandbox-runtime
```

Then create a configuration file specifying allowed paths and domains.

### Containers (Docker)

A security-hardened container configuration:

```bash
docker run \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --security-opt seccomp=/path/to/seccomp-profile.json \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \
  --tmpfs /home/agent:rw,noexec,nosuid,size=500m \
  --network none \
  --memory 2g \
  --cpus 2 \
  --pids-limit 100 \
  --user 1000:1000 \
  -v /path/to/code:/workspace:ro \
  -v /var/run/proxy.sock:/var/run/proxy.sock:ro \
  agent-image
```

| Option | Purpose |
| --- | --- |
| `--cap-drop ALL` | Removes Linux capabilities like `NET_ADMIN` and `SYS_ADMIN` |
| `--security-opt no-new-privileges` | Prevents processes from gaining privileges through setuid binaries |
| `--security-opt seccomp=...` | Restricts available syscalls |
| `--read-only` | Makes the container's root filesystem immutable |
| `--tmpfs /tmp:...` | Provides writable temporary directory cleared when container stops |
| `--network none` | Removes all network interfaces; agent communicates through mounted Unix socket |
| `--memory 2g` | Limits memory usage |
| `--pids-limit 100` | Limits process count to prevent fork bombs |
| `--user 1000:1000` | Runs as non-root user |
| `-v ...:/workspace:ro` | Mounts code read-only. **Avoid mounting `~/.ssh`, `~/.aws`, `~/.config`** |
| `-v .../proxy.sock:...` | Unix socket connected to a proxy running outside the container |

### gVisor

gVisor intercepts system calls in userspace before they reach the host kernel. With `--network none`, use a Unix socket proxy for network access.

```json
// /etc/docker/daemon.json
{
  "runtimes": {
    "runsc": {
      "path": "/usr/local/bin/runsc"
    }
  }
}
```

```bash
docker run --runtime=runsc agent-image
```

Performance overhead varies: ~0% for CPU-bound computation, ~2x for simple syscalls, up to 10-200x for file I/O intensive workloads.

## Credential Management

### The Proxy Pattern

Run a proxy outside the agent's security boundary that injects credentials into outgoing requests. The agent sends requests without credentials, the proxy adds them, and forwards to the destination.

Benefits:
1. The agent never sees the actual credentials
2. The proxy can enforce an allowlist of permitted endpoints
3. The proxy can log all requests for auditing

### Configuring Claude Code to Use a Proxy

**Option 1: `ANTHROPIC_BASE_URL`** (sampling API only)
```bash
export ANTHROPIC_BASE_URL="http://localhost:8080"
```

**Option 2: `HTTP_PROXY` / `HTTPS_PROXY`** (system-wide)
```bash
export HTTP_PROXY="http://localhost:8080"
export HTTPS_PROXY="http://localhost:8080"
```

### Proxy Options

- [Envoy Proxy](https://www.envoyproxy.io/): production-grade with `credential_injector` filter
- [mitmproxy](https://mitmproxy.org/): TLS-terminating proxy for inspecting HTTPS traffic
- [Squid](http://www.squid-cache.org/): caching proxy with access control lists
- [LiteLLM](https://github.com/BerriAI/litellm): LLM gateway with credential injection and rate limiting

## Filesystem Configuration

### Read-Only Code Mounting

```bash
docker run -v /path/to/code:/workspace:ro agent-image
```

**Files to exclude or sanitize before mounting:**

| File | Risk |
| --- | --- |
| `.env`, `.env.local` | API keys, database passwords, secrets |
| `~/.git-credentials` | Git passwords/tokens in plaintext |
| `~/.aws/credentials` | AWS access keys |
| `~/.config/gcloud/application_default_credentials.json` | Google Cloud ADC tokens |
| `~/.azure/` | Azure CLI credentials |
| `~/.docker/config.json` | Docker registry auth tokens |
| `~/.kube/config` | Kubernetes cluster credentials |
| `.npmrc`, `.pypirc` | Package registry tokens |
| `*-service-account.json` | GCP service account keys |
| `*.pem`, `*.key` | Private keys |

### Writable Locations

Ephemeral (cleared when container stops):
```bash
docker run \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \
  --tmpfs /workspace:rw,noexec,size=500m \
  agent-image
```

## Further Reading

- [Claude Code security documentation](https://code.claude.com/docs/en/security)
- [Hosting the Agent SDK](./hosting.md)
- [Handling permissions](./permissions.md)
- [Sandbox runtime](https://github.com/anthropic-experimental/sandbox-runtime)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [gVisor Documentation](https://gvisor.dev/docs/)
