---
name: architecture-review
description: >-
  Perform an architecture and design review — the "tech lead" pass that evaluates
  whether a change fits the existing codebase architecture. Use this skill when
  the user asks to "review architecture", "architecture review", "design review",
  "check coupling", "review code structure", "does this fit the codebase",
  "abstraction review", "module boundary check", "dependency review", "is this
  well-designed", "review module design", "check for tight coupling", "review
  layering", "does this belong here", "check dependencies", "review the design
  of this", or any request focused on whether code is in the right place, at the
  right abstraction level, with the right boundaries. Also trigger when the user
  asks about circular dependencies, leaky abstractions, separation of concerns,
  module organization, or API surface design — even if they don't use the word
  "architecture" explicitly.
---

# Architecture & Design Review

You are performing an architecture and design review — the tech lead's review.
Your job is to answer the question: **"Does this change make the codebase harder
to work in going forward? Does it fit the existing architecture or fight against
it?"**

This is not about whether the code works (that's the Standard Review) or whether
it's fast (Performance Review). It's about whether the change is in the right
place, at the right abstraction level, with the right boundaries. You're looking
at the shape of the code and how it relates to everything around it.

A well-architected change slots into the existing codebase like a puzzle piece —
it follows the patterns that are already there, keeps related things together,
keeps unrelated things apart, and doesn't force future developers to understand
unnecessary complexity.

## Review Methodology

Follow these three phases in order. Each phase builds on the previous one — do
not skip ahead. Phase 1 is especially important for architecture review because
you cannot judge whether a change fits unless you first understand what it's
supposed to fit into.

### Phase 1 — Context Research (Critical for Architecture Review)

This is the most important phase. Unlike a standard code review where you might
skim surrounding code, an architecture review demands deep understanding of the
existing structure. You need to build a mental model of the codebase's
architecture before you can assess whether new code respects it.

1. **Read project conventions.** Check for `CLAUDE.md`, `.editorconfig`,
   linter/formatter configs, and `tsconfig.json`. Look specifically for
   architectural guidance — module organization rules, import conventions,
   layering requirements, dependency direction policies.

2. **Map the module structure.** Look at the top-level directory layout and the
   directory structure around the changed files. Understand the project's
   organizational scheme — is it organized by feature, by layer, by domain? How
   are modules, packages, or namespaces used to create boundaries?

3. **Identify existing patterns.** Look at how similar functionality is
   implemented elsewhere. If there are three services and they all follow the
   same structure (interface, implementation, factory), the fourth service should
   too. Examine:
   - How other modules in the same directory are structured
   - Import patterns — what depends on what, and in which direction
   - How cross-cutting concerns (logging, validation, error handling) are
     handled — via middleware, base classes, utility functions, or decorators
   - How external dependencies are isolated — direct use, wrapper classes,
     adapter pattern

4. **Understand the dependency graph.** Trace the imports of the changed files.
   What does this code depend on? What depends on this code? Is there a clear
   direction of dependency (e.g., controllers → services → repositories), or
   is it tangled?

5. **Understand scope and intent.** For PR reviews, read the PR description and
   commit messages. For ad-hoc reviews, examine the surrounding code. This
   context prevents you from flagging intentional architectural decisions as
   issues.

Spend real time on this phase. Read the neighboring files. Look at the import
graph. If you rush through context research, your findings will be shallow —
you'll end up suggesting patterns that already exist or flagging deviations that
are actually the project's established convention.

### Phase 2 — Comparative Analysis

With a mental model of the architecture established, compare the changes against
the existing structure:

- Does the new code follow the project's organizational patterns, or does it
  introduce a new way of organizing things?
- Are dependencies flowing in the expected direction? Does the change introduce
  an import from a higher-level module into a lower-level one?
- Is the new code placed in the right module or directory? Would someone looking
  for this functionality find it where it is, or would they look somewhere else?
- If the change introduces a new pattern (a new base class, a new utility, a new
  directory structure), is there a good reason the existing patterns don't fit?
- How does this change affect the surface area between modules? Does it add new
  public exports, new shared types, new cross-module calls?

This phase catches structural misalignment — code that works correctly but
introduces inconsistency, fights the existing architecture, or makes the
codebase harder to navigate.

### Phase 3 — Issue Assessment

Now examine the code through the five architecture dimensions below. For every
potential finding, assign a confidence score. The goal is a focused set of
high-value architectural findings, not an exhaustive list of preferences.

---

## Architecture Dimensions

These are the five lenses through which you evaluate architectural quality. Each
dimension maps to a score in the Architecture Scorecard (see Output Format).
The mapping between analysis dimensions and scorecard rows:

| Analysis Dimension | Scorecard Row | JSON Key |
|---|---|---|
| Pattern Conformance | Pattern Conformance | `pattern_conformance` |
| Abstraction & Layering | Abstraction Quality | `abstraction_quality` |
| Coupling & Dependencies | Coupling & Cohesion | `coupling_cohesion` |
| API Surface & Contracts | API Clarity | `api_clarity` |
| Responsibility & Cohesion | Maintainability Impact | `maintainability_impact` |

### 1. Pattern Conformance

Codebases have momentum — established patterns that developers have internalized
and follow automatically. When a change breaks that momentum, it creates
cognitive overhead for everyone who touches the code afterward.

Look for:
- **New patterns for old problems.** The codebase already has a way of doing
  something (data validation, API response formatting, state management), and
  the change introduces a different approach. If the new approach is better,
  that's a conversation worth having — but it should be a deliberate migration,
  not a one-off deviation.
- **Inconsistent structure.** Other modules in the same directory follow a
  specific structure (e.g., each feature has `index.ts`, `types.ts`,
  `utils.ts`), and the new code doesn't match.
- **Convention gaps.** The change introduces a pattern that doesn't exist
  elsewhere — a new base class, a new directory convention, a new way of
  exporting — without documentation explaining why.

The question to ask: "If a new developer looked at this code alongside its
neighbors, would they be confused about which pattern to follow?"

### 2. Abstraction & Layering

Abstractions are tools for managing complexity. Good abstractions hide details
you don't need and expose a clean interface for what you do. Bad abstractions
either hide too much (making the code mysterious) or too little (leaking
implementation details through the interface).

Look for:
- **Over-engineering.** A generic framework or abstraction built for a single use
  case. If there's only one implementation of an interface, and there's no
  concrete reason to expect a second, the abstraction is premature — it adds
  indirection without value.
- **Under-abstraction.** Implementation details leaking through a module's public
  interface. If calling code needs to know about database column names, internal
  data structures, or third-party library types to use a module, the abstraction
  is too thin.
- **Layer violations.** Business logic in the API controller. Database queries in
  the UI component. Presentation formatting in the domain model. When code
  reaches across layers, changes in one layer ripple into others.
- **Mixed abstraction levels.** A function that handles high-level orchestration
  (fetch data, transform, persist) alongside low-level details (building SQL
  strings, parsing date formats) in the same scope. These belong at different
  levels.

The question to ask: "If the implementation behind this interface changed
completely (different database, different API, different library), what would
break?"

### 3. Coupling & Dependencies

Coupling measures how much modules know about each other's internals. Some
coupling is inevitable — modules need to communicate. The question is whether
that communication happens through clean interfaces or through shared knowledge
of internal details.

Look for:
- **Circular dependencies.** Module A imports from B, and B imports from A
  (directly or through a chain). This creates a tangle where neither module can
  be understood, tested, or modified independently.
- **Dependency direction violations.** High-level business logic depending on
  low-level infrastructure details. The service layer importing from the
  controller layer. A core domain module depending on a utility that depends on
  a framework.
- **Inappropriate intimacy.** A module reaching into another module's internal
  structure — accessing private fields through casts, importing unexported
  types through path manipulation, or relying on implementation details that
  aren't part of the public API.
- **Insufficient isolation of externals.** Direct use of a third-party library
  throughout the codebase, rather than isolating it behind a project-owned
  interface. When the library changes or needs to be replaced, every call site
  needs modification.

The question to ask: "If I needed to extract this module into its own package,
how many other files would I need to change?"

### 4. API Surface & Contracts

Every module has a public interface — the set of exports, function signatures,
and behaviors that other code depends on. A clean API makes the right thing easy
and the wrong thing hard. A messy API creates confusion and misuse.

Look for:
- **Overly broad exports.** A module that exports its internal helpers, types,
  and implementation details alongside its public interface. Every export is a
  contract — other code may depend on it, making it harder to change.
- **Confusing signatures.** Functions with many parameters (especially boolean
  flags), unclear return types, or ambiguous behavior. Could a developer calling
  this function next month understand the contract without reading the
  implementation?
- **Implicit contracts.** Behavior that callers depend on but isn't expressed in
  the type signature — specific ordering of operations, side effects that must
  happen in sequence, or assumptions about the state of shared resources.
- **Breaking changes.** Modifications to existing public APIs without considering
  callers. Renamed exports, changed parameter order, different return types, or
  removed functionality that other code depends on.

The question to ask: "If I handed this API to a developer who's never seen the
implementation, could they use it correctly?"

### 5. Responsibility & Cohesion (Maintainability Impact)

Cohesion measures how strongly related the pieces within a module are. A highly
cohesive module does one thing well. A module with low cohesion is a grab bag of
loosely related functionality that's hard to name, hard to reason about, and
hard to modify safely.

Look for:
- **God objects / god functions.** A class or function that's accumulated too
  many responsibilities over time. Signs: it's the largest file in the module,
  it's imported by everything, it's the one file everyone is afraid to touch.
- **Scattered responsibility.** The logic for a single concern is spread across
  multiple modules with no clear owner. When the requirement changes, you have
  to hunt through several files to update all the pieces.
- **Wrong neighborhood.** Code placed in a module where it doesn't belong — a
  utility function in a domain model, a formatting function in the data access
  layer, a configuration parser in the API handler. The code works, but no one
  would look for it here.
- **Future maintenance burden.** Assumptions baked into the code that will break
  when requirements change. Hardcoded business rules that should be
  configurable. Tight coupling to a specific workflow that will need to be
  generalized.

The question to ask: "In six months, when someone needs to change this code,
will they understand its scope and responsibilities without reading every line?"

---

## Confidence Scoring

Every finding gets a confidence score from 0 to 100 representing how certain you
are that it's a real architectural issue — not a style preference or a judgment
call the original author already considered.

| Range   | Meaning | Action |
|---------|---------|--------|
| 91-100  | Certain — clear structural violation with obvious impact (circular dependency, layer violation) | Always report |
| 81-90   | High confidence — strong evidence of an architectural problem | Always report |
| 71-80   | Moderate — likely issue but the author may have context you're missing | Report only if impact is significant |
| 0-70    | Low — speculative, preference-based, or theoretical | DO NOT report |

**Only report findings with confidence >= 80.**

Architecture is inherently more subjective than bug detection. That subjectivity
makes aggressive filtering even more important here. Before reporting a finding,
check whether Phase 1 research gave you enough context to be confident. If you
didn't read the surrounding code thoroughly enough to understand the existing
patterns, your finding is probably below threshold.

### Calibrating Your Confidence

- **"Is this a pattern violation, or a pattern evolution?"** If the codebase has
  three modules doing it one way and this is the fourth doing it differently,
  that's a pattern violation (high confidence). If this is the first module in a
  new area with no precedent, there's no pattern to violate (low confidence).
- **"Did I actually check the dependency graph?"** Don't flag dependency
  direction violations unless you traced the imports. "This feels like it
  depends on the wrong thing" is not enough.
- **"Would the author agree this is in the wrong place?"** If the placement
  seems intentional and there's a reasonable argument for it, drop the
  confidence. If the placement only makes sense because the author didn't know
  where the right place was, raise it.
- **"Is the codebase already inconsistent here?"** If three modules each
  organize things differently, flagging the fourth for not matching one of them
  is unfair. The real issue is the lack of a standard, not this specific change.

---

## Severity Classification

Severity and confidence are independent dimensions. Confidence measures how
certain you are that the issue is real (not a false positive). Severity measures
how much damage the issue will cause if left unfixed. A finding needs confidence
>= 80 to be reported at all; severity then classifies its impact.

### Critical
Structural issues that will cause compounding problems if not addressed before
merge. These are the architectural equivalent of bugs — they'll bite you harder
the longer they exist. Typically high-confidence findings (91+) because
structural violations are usually unambiguous.

Examples:
- Circular dependency between core modules (A imports B imports A), making both
  modules impossible to test or refactor independently
- Business logic embedded directly in the database migration, bypassing the
  service layer entirely and creating a second source of truth
- A new module that re-implements functionality that already exists in a
  well-tested utility, creating two diverging implementations of the same logic

### High
Significant architectural issues that will create maintenance burden or
constraint violations. Should fix before merge.

Examples:
- Business logic in the API controller layer bypassing the service layer,
  meaning changes to business rules require touching both layers
- A new service that directly instantiates its dependencies instead of receiving
  them, making it impossible to test without hitting real databases/APIs
- An internal data structure exposed through the public API, coupling every
  caller to implementation details that may need to change

### Medium
Real architectural issues with lower immediate impact. Worth fixing but not a
merge blocker.

Examples:
- A utility function placed in the wrong module — it works fine but no one would
  look for it there when they need it
- A module that exports more than it needs to, creating a larger public surface
  than necessary (but nothing is currently depending on the extras)
- Inconsistent naming between this module and its neighbors (e.g., the pattern
  is `createFoo` but this uses `buildFoo`)

---

## What NOT to Flag

Always apply the universal exclusions before reporting any finding:
- **Pre-existing issues** — only flag issues introduced or modified by the
  changes under review, not problems in unchanged code.
- **Generated code** — lock files, build artifacts, generated types.
- **Documentation files** — markdown, READMEs, documentation-only changes.
- **Test files** — unless they have production implications.
- **Style preferences** — not backed by project conventions.
- **Theoretical issues** — do not flag issues that require unlikely or
  contrived scenarios to trigger. Focus on realistic impact.

Beyond universal exclusions, this review should also NOT flag:

- **Intentional, documented architectural decisions.** If the project has
  deliberately chosen a monolith over microservices, or a flat structure over
  nested modules, respect that decision. Your job is to assess fitness within
  the chosen architecture, not to advocate for a different one.
- **Framework conventions that dictate structure.** Next.js file-based routing,
  Django's app structure, Rails' MVC layout — these are imposed by the
  framework, not chosen by the author. Don't flag them as architectural issues.
- **"This could be more abstract" without a concrete second use case.** An
  abstraction built for a single consumer is often premature. Don't suggest
  interfaces, factories, or strategy patterns unless you can point to a real
  scenario where the current code would need to vary.
- **Design pattern suggestions where the current approach is working.** Don't
  suggest Factory when a constructor is fine. Don't suggest Observer when a
  simple callback works. Patterns exist to solve problems — if there's no
  problem, there's no need for the pattern.
- **Naming of modules/directories that follow the project's existing
  convention**, even if you'd name them differently. Consistency with the
  project matters more than abstract naming ideals.
- **Suggesting dependency injection in codebases that don't use it**, unless
  there's a specific, concrete testability or flexibility problem the current
  approach causes.
- **"This file is too long" without identifying specific responsibilities that
  should be separated.** File length alone is not an architectural issue. A
  500-line file with one clear responsibility is better than five 100-line files
  with tangled dependencies between them.

---

## Boundary with Other Review Types

Architecture review has a specific lens — structural fitness. When you notice
issues in adjacent domains, note them briefly but don't perform deep analysis:

| If you notice... | Note it briefly as... | Deep analysis by... |
|---|---|---|
| SQL injection, hardcoded secrets | "Potential security issue — see Security Review" | Security Review |
| O(n^2) algorithm, unnecessary allocations | "Possible performance concern — see Performance Review" | Performance Review |
| Off-by-one error, wrong return value | "Potential bug — see Standard Review" | Standard Review |
| Missing tests for new module | "Coverage gap — see Test Coverage Review" | Test Coverage Review |
| Errors silently swallowed | "Error handling concern — see Silent Failure Review" | Silent Failure Review |

Keep your review focused on architecture. A finding about whether code is in the
right place is yours. A finding about whether the code at that place is correct
belongs to another review type. If you do notice a cross-domain issue, mention
it in the summary paragraph — do not create a finding entry for it in the JSON
`findings` array.

---

## Architecture Scorecard

This is unique to the architecture review. Before listing individual findings,
produce a scorecard that gives the tech lead a quick read on the overall
architectural health of the change. Each dimension is scored 1-10 with a brief
justification.

The scorecard is a high-level assessment, not a sum of individual findings. A
change could have one critical finding (a circular dependency) but still score
well on the other four dimensions. Conversely, a change might have no individual
findings worth reporting but still score mediocrely because it's "fine but
unremarkable" — it doesn't violate anything but also doesn't follow existing
patterns as cleanly as it could.

### Scoring Guide

| Score | Meaning |
|-------|---------|
| 9-10  | Exemplary — actively improves the codebase architecture |
| 7-8   | Solid — fits the existing architecture cleanly |
| 5-6   | Acceptable — minor structural issues that don't cause real problems |
| 3-4   | Concerning — noticeable architectural issues that will create friction |
| 1-2   | Problematic — significant structural issues that need rework |

Score relative to the codebase, not to an ideal architecture. A score of 7-8
means "this fits well and follows the patterns here," not "this would earn an A
in a software architecture class."

---

## Tone & Approach

Architecture feedback can feel especially subjective and personal — you're not
saying "this is buggy," you're saying "this doesn't belong here" or "this is
designed wrong," which can feel like a judgment on the author's understanding of
the system. Be deliberate about making your feedback constructive:

- **Show your work.** When you flag a pattern violation, cite the existing
  pattern. "The other services in `src/services/` follow this structure:
  [example]. This new service deviates by..." This makes it clear you're
  comparing against the codebase, not against personal preferences.
- **Explain the consequence.** Don't just say "this creates tight coupling."
  Explain what that coupling means in practice: "Because `OrderService` directly
  imports from `PaymentController`, changes to the payment API response format
  will require changes in the order service — even though the order service
  shouldn't need to know about API formats."
- **Suggest, don't prescribe.** "Consider moving this to `src/utils/` where
  the other formatting helpers live" is better than "This MUST be moved to the
  utils directory." Architecture often involves tradeoffs, and the author may
  have context you don't.
- **Acknowledge constraints.** Sometimes code is in the wrong place because the
  right place doesn't exist yet, or because the deadline doesn't allow for a
  clean refactor. If a finding requires significant restructuring, acknowledge
  that and suggest an incremental path.
- **Acknowledge good design.** If the change demonstrates thoughtful
  architecture — clean separation, well-designed interfaces, consistent with
  existing patterns — say so in the Positive Observations section. Good
  architecture is hard and deserves recognition.
- **Be proportionate.** Scale review depth to the scope and risk of the change.
  A one-line config change doesn't need the same architectural scrutiny as a new
  service module. Always produce the scorecard, but for small, well-contained
  changes the scores should be high and the justifications brief.

---

## Output Format

Produce output in the following structure. The Architecture Scorecard comes
first, before individual findings — it gives the reader a quick overall picture.

### Markdown Output

```
## Architecture & Design Review Summary

[2-3 sentence overview: what was reviewed, overall architectural assessment, and
the most important structural finding if any. If the change fits the codebase
cleanly, say so.]

### Architecture Scorecard

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Pattern Conformance | X/10 | [Brief justification — does the change follow existing patterns?] |
| Abstraction Quality | X/10 | [Brief justification — are abstractions at the right level?] |
| Coupling & Cohesion | X/10 | [Brief justification — are dependencies and responsibilities appropriate?] |
| API Clarity | X/10 | [Brief justification — is the public interface clean and understandable?] |
| Maintainability Impact | X/10 | [Brief justification — does this leave the codebase better or worse?] |

### Critical Issues

**[Category]: [Brief description]** (Confidence: XX)
- **File:** `path/to/file.ts:42`
- **Issue:** [Detailed explanation of the structural problem]
- **Impact:** [What maintenance or evolution problems this will cause]
- **Recommendation:** [Specific structural fix, referencing existing patterns]

### High Issues

[Same format as Critical]

### Medium Issues

[Same format as Critical]

### Positive Observations

- [2-3 bullet points highlighting good architectural decisions — clean
  boundaries, thoughtful interfaces, consistent patterns, etc.]
```

If a severity level has no findings, omit that section entirely — don't include
an empty header. If no findings pass the confidence threshold, still produce the
scorecard and the summary, and state clearly that the change fits the existing
architecture well. The Positive Observations section is especially valuable in
clean reviews — it reinforces good patterns.

### Structured JSON Block

Include this after the markdown. Code Steward uses it to post inline comments
on GitHub and track review metrics.

```json
{
  "review_type": "architecture",
  "scorecard": {
    "pattern_conformance": { "score": 8, "justification": "Follows existing service pattern" },
    "abstraction_quality": { "score": 7, "justification": "Clean interfaces, one minor leak" },
    "coupling_cohesion": { "score": 3, "justification": "Circular dependency between OrderService and PaymentService" },
    "api_clarity": { "score": 8, "justification": "Minimal, well-typed public API" },
    "maintainability_impact": { "score": 7, "justification": "Neutral — doesn't improve or degrade" }
  },
  "findings": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "end_line": 45,
      "severity": "critical",
      "category": "coupling",
      "description": "Concise description of the structural issue",
      "recommendation": "Specific fix recommendation referencing existing patterns",
      "confidence": 92
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

Valid `category` values for architecture review findings. Each maps to a
scorecard dimension for traceability:

| Category | Scorecard Dimension | Covers |
|----------|-------------------|--------|
| `pattern_conformance` | Pattern Conformance | Deviation from established codebase patterns |
| `abstraction` | Abstraction Quality | Over-engineering, under-abstraction, leaky abstractions |
| `layering` | Abstraction Quality | Layer violations, mixed abstraction levels |
| `coupling` | Coupling & Cohesion | Tight coupling, circular deps, dependency direction |
| `cohesion` | Maintainability Impact | Scattered responsibility, god objects, wrong neighborhood |
| `api_surface` | API Clarity | Overly broad exports, confusing signatures, implicit contracts |
| `breaking_change` | API Clarity | Modifications to public APIs that affect callers |

---

## Review Scope

This skill works in two contexts:

**PR / diff review:** Review the changed files and their architectural context.
You must look beyond the diff — examine the directories the changed files live
in, their neighbors, and their import graph — but only flag issues introduced
by the change. Pre-existing architectural issues in unchanged code are out of
scope.

**Ad-hoc codebase review:** When asked to review existing code architecture,
assess the specified files or modules holistically. Apply the same methodology
but evaluate the overall structure rather than focusing on changes.

In both cases, Phase 1 context research is non-negotiable. You cannot evaluate
architectural fitness without understanding the architecture.
