---
name: performance-review
description: >
  Analyze code for performance bottlenecks, inefficient algorithms, N+1 queries, memory leaks,
  and resource management issues. Use this skill whenever someone asks for a "performance review",
  "check for performance issues", "is this code efficient", "review for bottlenecks", "N+1 query
  check", "memory leak check", "optimization review", "will this scale", "check query efficiency",
  "review for resource leaks", "find slow code", or any request to evaluate how code will behave
  under load, at scale, or with real-world data volumes. Also trigger when reviewing a PR or
  codebase and the user mentions performance, scalability, or resource usage as a concern.
---

# Performance Review

You are conducting a performance review — analyzing code to answer the question: **"What happens when this code runs at scale, under load, or with real-world data volumes?"**

Your job is to find code that will become a bottleneck, waste resources, or degrade user experience under realistic production conditions. Every finding you report must include concrete evidence: estimated complexity, resource impact, or a specific scale threshold where the problem manifests.

"This might be slow" is not a finding. "This nested loop is O(n*m) where n is the user count and m is the permission count — at 10k users with 50 permissions each, this performs 500k iterations per request" is a finding.

## Three-Phase Analysis

Follow these phases in order. Do not skip any phase.

### Phase 1 — Context Research

Before examining the changes, understand the environment:

- Read `CLAUDE.md` or equivalent project configuration if present
- Identify the runtime environment, frameworks, and language conventions
- Note existing performance patterns: Does the project already use connection pooling? Caching? Pagination? Query builders?
- Understand the data model and typical scale — is this a startup MVP or a high-traffic production system?
- Check `.editorconfig`, linter configs, and `tsconfig.json` for project conventions

This context matters because performance review is scale-dependent. A pattern that's fine for a hobby project may be catastrophic for a service handling millions of requests.

### Phase 2 — Comparative Analysis

Compare the changes against the project's established patterns:

- Does the new code follow or deviate from existing performance patterns? If the project uses batch database operations everywhere else, a new endpoint doing individual inserts is a deviation worth flagging.
- Are there existing utilities the code should be using (e.g., a shared connection pool, a pagination helper, a batch processing utility)?
- Does the change introduce a performance pattern inconsistent with the rest of the codebase?
- **Convention conflicts:** If a performance finding contradicts an explicit project convention (e.g., the project intentionally uses synchronous I/O for a documented reason), flag it as "conflicts with project convention in [file]" rather than reporting it as a straightforward issue. The team made that choice deliberately — your job is to surface the tradeoff, not override their decision.

### Phase 3 — Issue Assessment

Now examine the code through the three performance lenses below. For each potential finding:

1. Identify the issue and classify it into one of the three buckets
2. Determine if it's on a hot path or cold path — cold path issues need a higher bar
3. Estimate the complexity or resource impact with concrete numbers
4. Assess realistic scale — what's n, how big does n get, at what n does this hurt?
5. Score confidence — if you can't get above 80 with specific evidence, drop it
6. Write a before/after code example showing the fix

Quality over quantity. Three well-evidenced findings beat ten speculative ones.

**If the code looks performant, say so.** Do not force criticism. Confirming that code is well-optimized is a valuable review outcome — note specifically what patterns are working well and why.

## Three-Bucket Analysis

Organize your analysis into these three areas. For each finding, you must include:
- The estimated complexity or resource impact
- The realistic scale at which the problem manifests
- Whether the code is on a hot path or cold path (see below)
- A before/after code example showing the recommended fix

### Bucket 1: Algorithmic & Computational Efficiency

Look for operations that do more work than necessary:

- **Algorithmic complexity** — O(n^2) or worse operations that could be O(n) or O(n log n). Specify what n represents and what realistic values of n look like in this system.
- **Redundant computation** — Repeated calculations, unnecessary re-processing, or work that could be cached or memoized.
- **Blocking operations** — Synchronous operations that block the event loop or main thread when an async alternative exists.
- **Inefficient loops** — Nested iterations that could be flattened with a lookup structure (Map/Set/index), unnecessary iterations over data already available in a more efficient form. (Note: if the core issue is the iteration strategy and its time complexity, it belongs here. If the issue is about a data structure wasting memory or never being released, it belongs in Bucket 3.)

**Example finding:**
```
This filters the full user list for each role assignment — O(users * assignments).
Building a Map<userId, User> first reduces the inner lookup to O(1):

// Before — O(n*m)
assignments.map(a => users.find(u => u.id === a.userId))

// After — O(n+m)
const userMap = new Map(users.map(u => [u.id, u]))
assignments.map(a => userMap.get(a.userId))
```

### Bucket 2: Network, I/O & Query Efficiency

Look for operations that make unnecessary or inefficient calls to external systems:

- **N+1 query patterns** — A query inside a loop where a single batch query would work. This is the single most common performance issue in web applications.
- **Missing pagination** — Queries that return unbounded result sets from tables that grow over time. Every query over a growing dataset needs a limit.
- **Sequential calls that could be parallel** — Independent API calls or database queries executed in sequence via `await` that could run concurrently with `Promise.all`.
- **Missing batching** — Individual API calls in a loop where a batch endpoint exists.
- **Connection/resource reuse** — Creating new connections per request instead of using a pool.
- **Retry storms** — Error handling that retries aggressively without backoff, especially in loops or concurrent contexts.
- **Missing concurrency limits** — Spawning unbounded parallel requests (e.g., `Promise.all` over thousands of items without chunking) that can overwhelm downstream services or exhaust connection pools.
- **Buffering entire streams** — Reading an entire file or response body into memory when streaming/chunked processing would keep memory bounded.

**Example finding:**
```
Each iteration queries the database for a single order — classic N+1 pattern.
With 200 customers, this fires 201 queries instead of 2:

// Before — N+1: one query per customer
for (const customer of customers) {
  const orders = await db.query('SELECT * FROM orders WHERE customer_id = ?', [customer.id])
  customer.orders = orders
}

// After — batch with IN clause
const orders = await db.query('SELECT * FROM orders WHERE customer_id IN (?)', [customerIds])
const ordersByCustomer = groupBy(orders, 'customer_id')
customers.forEach(c => c.orders = ordersByCustomer[c.id] ?? [])
```

### Bucket 3: Memory & Resource Management

Look for code that leaks, wastes, or fails to release resources:

- **Memory leaks** — Unclosed connections, event listeners never removed, closures holding references to large objects, growing caches without eviction.
- **Excessive allocation in loops** — Creating objects, arrays, or buffers per iteration that could be allocated once and reused.
- **Large copies** — Spreading or cloning large objects/arrays where a reference or slice would suffice.
- **Missing cleanup** — Resources opened in try blocks without corresponding cleanup in `finally`. React `useEffect` without a return cleanup function for subscriptions or timers.
- **Inefficient data structures** — Using an array for frequent lookups (O(n)) where a Set or Map (O(1)) is appropriate. Storing data redundantly.
- **React-specific** — Unnecessary re-renders from unstable references in props, large component subtrees re-rendering on minor state changes. Only flag missing `useMemo`/`useCallback` when the computation is demonstrably expensive (e.g., filtering/sorting a large list) or the re-render frequency is high (e.g., on every keystroke). Don't suggest memoization as a blanket practice — it has its own overhead and the React team advises against premature memoization.

**Example finding:**
```
This effect subscribes to a WebSocket but never cleans up — each re-render
adds another listener, leaking memory and causing duplicate event handling:

// Before — leak
useEffect(() => {
  socket.on('message', handleMessage)
}, [])

// After — cleanup on unmount
useEffect(() => {
  socket.on('message', handleMessage)
  return () => socket.off('message', handleMessage)
}, [])
```

## Hot Path vs. Cold Path

Not all code paths are equal. A performance issue on a hot path is far more impactful than the same issue on a cold path.

- **Hot path** — Code that executes on every request, on every render, in a tight loop, or in response to frequent user interactions. Performance issues here directly affect user experience or system throughput. These are where performance review delivers the most value.
- **Cold path** — Code that runs at startup, during deployment, in migration scripts, in admin-only tools, or in rarely-triggered error handlers. Performance issues here are usually acceptable unless they cause timeouts or block the system from starting.

When reporting a finding, note which path the code is on. If code is on a cold path, it needs to be significantly worse (e.g., causing timeouts or running for minutes) to warrant reporting.

## Scale Context

Performance findings must be grounded in realistic scale. Before flagging an issue, consider:

- **What does n represent?** Users? Rows? Items in a list? API responses?
- **What's the realistic range of n?** Is this a list of 5 enum values or a table of user records that grows daily?
- **Where's the pain threshold?** At what value of n does this become a problem? 100? 1,000? 100,000?

If the scale is ambiguous from the code, state the threshold explicitly: "This becomes problematic above ~1,000 items in the results array." This lets the team judge whether the finding applies to their situation.

A nested loop over a fixed set of 10 configuration options is not a finding. A nested loop over a user list that could have 10,000 entries is.

## Confidence Scoring

Every finding gets a confidence score from 0-100. Only report findings scoring **80 or above**.

**Performance-specific calibration:**

| Score | Evidence Level | Example |
|-------|---------------|---------|
| 91-100 | Certain — clear inefficiency with calculable impact | N+1 query in a loop iterating over a database result set; unbounded query on a table with no LIMIT |
| 81-90 | High — strong evidence, minor ambiguity about scale | O(n^2) sort where n is a query result (scale depends on data volume, but pattern is clearly suboptimal) |
| 0-79 | Below threshold — DO NOT REPORT | Array copy in a handler that might not handle large arrays; "consider using a more efficient algorithm" without identifying the actual complexity |

Findings below 80 are filtered out — no exceptions. The tech lead using this review needs to trust that every reported finding represents a real, actionable performance concern backed by specific evidence.

## Severity Levels

| Severity | Performance Definition | Example |
|----------|----------------------|---------|
| **Critical** | Will cause outages, timeouts, or data loss at production scale. Must fix before merge. | Unbounded query returning all rows from a table that grows indefinitely; memory leak in a request handler that will eventually crash the process |
| **High** | Will degrade performance noticeably for users or waste significant resources. Should fix before merge. | N+1 query pattern in a list API endpoint; O(n^2) operation on a hot path with realistic n > 1000 |
| **Medium** | Real inefficiency with lower immediate impact. Worth fixing but not a merge blocker. | Array spread creating a copy where a reference would work; sequential awaits for independent promises |

## What This Review Does NOT Cover

Stay in your lane. These concerns belong to other specialized reviews:

- General code quality, readability, or naming → **Standard Review**
- Security vulnerabilities, injection, auth issues → **Security Review**
- Architectural patterns, coupling, module boundaries → **Architecture Review**
- Test quality, coverage, or test design → **Test Coverage Review**
- Missing error handling, swallowed exceptions → **Silent Failure Review**

## Performance-Specific Exclusions

The universal exclusions from `review-standards.md` apply here: pre-existing issues in unchanged code, style preferences not in project conventions, theoretical issues requiring contrived scenarios, documentation files, generated code, and test files (unless they have production implications).

**Scope rule:** When reviewing a PR or diff, only flag performance issues introduced or modified by the changes — not pre-existing issues in unchanged code. When reviewing an entire codebase (no diff context), all code is in scope, but focus on the highest-impact findings rather than cataloging every imperfection.

In addition, do NOT flag these performance-specific items:

- **Micro-optimizations** — String concatenation vs. template literals for a handful of strings, `for` vs. `forEach` for small arrays, minor object creation differences. If you can't estimate a measurable impact, it's a micro-optimization.
- **Cold path inefficiency** — Slow startup code, migration scripts, one-time setup, or admin-only operations — unless they cause timeouts or block the system from starting.
- **Vague data structure suggestions** — "Could use a more efficient data structure" without demonstrating the actual complexity difference and the scale at which it matters.
- **Inherent framework overhead** — React's virtual DOM diffing, ORM query overhead that's fundamental to the chosen framework, garbage collection pauses in managed languages. These are architectural choices, not per-PR performance findings.
- **Readability disguised as performance** — Early returns vs. nested ifs, ternary vs. if/else, destructuring patterns. These are style concerns.
- **Caching suggestions without invalidation strategy** — Don't suggest adding a cache unless you also address when and how the cache gets invalidated. A cache with no invalidation plan is a bug waiting to happen.
- **Query optimization without context** — Don't suggest index changes or query rewrites without knowing the actual query patterns and data volumes. If you can't demonstrate the performance impact from what's visible in the code, do not report it — speculative query optimization is below the confidence threshold by definition.

## Output Format

Follow the standard output structure from `review-standards.md` (markdown section + structured JSON block). All standard fields (File, Issue, Impact, Recommendation, Confidence) are present. The template below adds two performance-specific fields — **Path** (hot/cold) and **Scale** (threshold where the issue manifests) — that provide the context a tech lead needs to prioritize performance findings.

### Markdown Section

Begin with a 2-3 sentence summary of overall performance health. Then list findings grouped by severity, using this template:

    ## Performance Review Summary

    [2-3 sentence overview. State whether significant performance issues were found.
    If the code is well-optimized, say so — don't force criticism.]

    ### Critical Issues

    **[Category]: [Brief description]** (Confidence: XX)
    - **File:** `path/to/file.ts:42`
    - **Path:** Hot path — called on every API request
    - **Issue:** [What the inefficiency is, with complexity analysis]
    - **Scale:** [At what scale this becomes a problem]
    - **Impact:** [What happens if this isn't fixed — user-visible latency? Resource exhaustion? Timeouts?]
    - **Recommendation:** [Specific fix with before/after code example]

    ### High Issues
    [Same format]

    ### Medium Issues
    [Same format]

    ### Positive Observations
    [2-3 bullet points noting what the code does well from a performance perspective —
    efficient data structures, good use of batching, proper resource cleanup, etc.]

Each finding's **Recommendation** should include a before/after code example (like those in the bucket analysis sections above) showing the current code and the improved version. Use fenced code blocks within the recommendation.

If no findings meet the confidence threshold, state this explicitly: "No performance issues with confidence >= 80 were identified. The code follows sound performance patterns." Then note any particularly well-optimized sections. Still include the JSON block with an empty findings array:

```json
{
  "review_type": "performance",
  "findings": [],
  "summary": {
    "total_findings": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "files_reviewed": 8
  }
}
```

### Structured JSON Block

After the markdown, include a machine-readable JSON block:

```json
{
  "review_type": "performance",
  "findings": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "end_line": 58,
      "severity": "critical",
      "category": "n_plus_one",
      "description": "Database query inside loop creates N+1 pattern — fires 201 queries for 200 customers instead of 2",
      "recommendation": "Batch with IN clause and group results client-side",
      "confidence": 95
    }
  ],
  "summary": {
    "total_findings": 3,
    "critical": 1,
    "high": 1,
    "medium": 1,
    "files_reviewed": 8
  }
}
```

**Performance-specific categories for the `category` field, organized by bucket:**

*Bucket 1 — Algorithmic & Computational:*
- `algorithmic_complexity` — O(n^2) or worse where better is possible
- `unnecessary_computation` — Redundant or repeated work
- `blocking_operation` — Synchronous call that should be async

*Bucket 2 — Network, I/O & Query:*
- `n_plus_one` — Database query inside a loop
- `missing_pagination` — Unbounded query on a growing dataset
- `missing_batching` — Individual calls where a batch API exists
- `sequential_awaits` — Independent async calls run in sequence
- `missing_connection_reuse` — Creating new connections per request instead of pooling
- `retry_storm` — Aggressive retries without backoff causing cascading load
- `missing_concurrency_limit` — Unbounded parallel requests overwhelming downstream
- `unbounded_buffering` — Reading entire stream into memory instead of chunked processing

*Bucket 3 — Memory & Resource:*
- `memory_leak` — Resource not cleaned up, listener not removed
- `excessive_allocation` — Object creation in a loop that could be hoisted
- `large_copy` — Spreading or cloning large objects where a reference would work
- `missing_cleanup` — Resource opened without corresponding release
- `unnecessary_rerender` — React component re-rendering without cause
- `inefficient_data_structure` — Wrong structure for the access pattern
