# Sessions Reference

## Session Approaches

| Use Case | Approach |
|----------|----------|
| One-shot task | Single `query()` call |
| Resume after completion | `resume: sessionId` |
| Continue most recent | `continue: true` |
| Explore alternatives | `resume: sessionId, forkSession: true` |
| Multi-turn interactive | TS V2: `createSession()` + `send()` |

---

## Capturing Session IDs

```typescript
let sessionId: string;

for await (const msg of query({ prompt: "Build the feature", options })) {
  if (msg.type === "result") {
    sessionId = msg.sessionId;
    console.log(`Session: ${sessionId}`);
  }
}
```

---

## Resuming Sessions

```typescript
for await (const msg of query({
  prompt: "Now add error handling to what you built",
  options: { resume: sessionId, allowedTools: ["Read", "Edit"] },
})) {
  if (msg.type === "result") console.log(msg.result);
}
```

### Continue Most Recent
```typescript
for await (const msg of query({
  prompt: "Continue with the next step",
  options: { continue: true },
})) { /* ... */ }
```

---

## Forking Sessions

Create a branch from an existing session (original untouched):

```typescript
for await (const msg of query({
  prompt: "Try the OAuth2 approach instead",
  options: { resume: sessionId, forkSession: true },
})) {
  if (msg.type === "result") {
    const newSessionId = msg.sessionId;  // Different from original
  }
}
```

Use cases: explore alternatives, A/B test implementations, branch after checkpoints.

---

## TypeScript V2 Preview (Unstable)

Simplified session-based API:

```typescript
import {
  unstable_v2_createSession,
  unstable_v2_prompt,
  unstable_v2_resumeSession,
} from "@anthropic-ai/claude-agent-sdk";

// One-shot
const result = await unstable_v2_prompt("What is 2+2?", { model: "claude-opus-4-6" });

// Session with send/stream
await using session = unstable_v2_createSession({ model: "claude-opus-4-6" });
await session.send("Hello!");
for await (const msg of session.stream()) {
  // Process messages
}

// Resume
await using resumed = unstable_v2_resumeSession(sessionId, { model: "claude-opus-4-6" });
```

---

## Session Lifecycle

```
query() called  →  SystemMessage (init)
                      ↓
                   Agent Loop (AssistantMessage, UserMessage — repeated)
                      ↓
                   ResultMessage → sessionId, result, cost, usage
                      ↓
    resume ─────→ Continue with full context
    fork ───────→ New branch, original untouched
    (done) ─────→ Session stored for later
```

---

## Cross-Host Resume

Sessions can be resumed on different hosts if session storage is accessible:

```typescript
// Host A
const sessionId = /* captured from ResultMessage */;

// Host B (needs access to same session storage)
for await (const msg of query({
  prompt: "Continue the task",
  options: { resume: sessionId },
})) { /* ... */ }
```
