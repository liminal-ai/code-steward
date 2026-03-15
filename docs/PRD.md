# Code Steward — Product Requirements Document

A forkable, locally-running web application for tech leads and senior developers
to centralize management, review, and documentation of the code repositories
they are responsible for. Code Steward is a review workstation — not where you
write code, but where you oversee it.

---

## User Profile

**Primary User:** Tech lead or senior developer responsible for multiple repositories
**Context:** Managing code quality, PR reviews, documentation, and codebase health across a portfolio of repos — typically 5-20 repositories
**Mental Model:** "I have a set of repos I'm responsible for. I need a single place to see what needs my attention, do thorough reviews, and keep documentation current — without mixing review work with my development environment."
**Key Constraint:** Runs locally. Must work with enterprise GitHub (not just public GitHub). All agent operations run through Claude Agent SDK. User already has repos cloned or the app clones them into its own managed directory.

---

## Feature Overview

Code Steward gives tech leads a unified local workstation to manage their
repositories. Today, code review means juggling GitHub's web UI, local terminal
sessions, and scattered notes. Documentation generation is manual or
nonexistent. There is no single view across repos showing what needs attention.

After Code Steward ships, a tech lead opens one app and sees: which repos have
open PRs, which are out of date, which need documentation refreshed. They run
AI-augmented code reviews that produce structured, publishable feedback. They
generate and maintain wiki-quality documentation from the codebase. They track
review history and repo health over time.

---

## Scope

### In Scope

- Local web application (localhost) with repo management dashboard
- GitHub CLI integration for PR data, comments, issues, and repo operations
- AI-augmented PR code review with multiple review types dispatched in parallel
- Review synthesis and interactive refinement via embedded Claude Code terminal
- Publishing review feedback to GitHub (summary comments and inline file comments)
- Ad-hoc codebase scans (security, tech debt, code quality, documentation quality, performance)
- Documentation generation using AST-aware analysis (CodeWiki approach) + Claude
- Documentation update detection and incremental refresh
- Rendered markdown and Mermaid diagram viewing in the browser
- SQLite persistence for all structured data

### Out of Scope

- Cloud deployment or multi-user access (this is a local, single-user app)
- Real-time collaboration or shared state between users
- Git write operations beyond documentation commits (no code editing, no merge operations)
- Custom chat UI replacing Claude Code (we embed Claude Code, not rebuild it)
- GitHub OAuth flow (user authenticates via `gh auth login` in their terminal)
- CI/CD integration or build pipeline management
- Jira, Linear, or other project management tool integration (Phase 1)

### Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A1 | GitHub CLI (`gh`) is available and the user can authenticate | Unvalidated | App checks at boot, provides instructions if missing |
| A2 | Claude Agent SDK supports 1M token context without beta flags (GA as of 2026-03-13) | Unvalidated | Verify during implementation; fall back to beta header if needed |
| A3 | Enterprise GitHub supports the same `gh` CLI commands as public GitHub | Unvalidated | PR operations and issue reads likely supported; GitHub Pages API may not be |
| A4 | CodeWiki's Python AST parsing scripts (MIT licensed) can be extracted and run standalone | Unvalidated | Verify during documentation skill development |
| A5 | `node-pty` + xterm.js provides a reliable terminal embedding in Next.js | Unvalidated | Verify during foundation work; fallback is launching Claude Code in external terminal |
| A6 | Tree-sitter supports the primary languages used in target repos | Unvalidated | CodeWiki supports 9 languages: Python, Java, JS, TS, C, C++, C#, Kotlin, PHP |

---

## Technical Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | Next.js (App Router, `use client`, no SSR) | Single deployment unit, React frontend + Node API routes, one `npm start` |
| Persistence | SQLite via `better-sqlite3` | Single file, local, handles all CRUD from web UI, no config file ambiguity |
| AI - Structured | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) | Agent dispatch for reviews, scans, documentation generation |
| AI - Interactive | Claude Code via xterm.js + `node-pty` | Embedded terminal for open-ended refinement, no custom chat UI to build |
| GitHub Integration | GitHub CLI (`gh`) | PR data, comments, issues, repo operations, authentication |
| AST Analysis | CodeWiki Python scripts (Tree-sitter) | Structural codebase analysis for documentation generation |
| Markdown Rendering | `react-markdown` + `rehype` + `remark-gfm` + `react-syntax-highlighter` | Battle-tested React ecosystem for rendering review output and documentation |
| Diagrams | Mermaid (via `mermaid` JS library) | Architecture and flow diagrams in generated documentation |

---

## Epic Structure

Four epics, designed for parallel execution after Epic 1 completes:

```
Epic 1: Foundation & Repo Management (all developers together)
    │
    ├── Epic 2: PR Code Review (2 developers)
    ├── Epic 3: Documentation Generation (1 developer)
    └── Epic 4: Repo Insights & Notes (1 developer)
```

Epic 1 establishes all shared infrastructure: Next.js skeleton, SQLite schema,
repo management, the tab structure, shared components, and route conventions.
Epics 2-4 build tab content against established patterns in isolation.

**Route isolation per tab:**

| Tab | Frontend Route | API Route |
|-----|---------------|-----------|
| Pull Requests | `/repo/[id]/pulls` | `/api/repos/[id]/pulls` |
| Code Review | `/repo/[id]/review` | `/api/repos/[id]/review` |
| Documentation | `/repo/[id]/docs` | `/api/repos/[id]/docs` |
| Issues | `/repo/[id]/issues` | `/api/repos/[id]/issues` |
| Insights | `/repo/[id]/insights` | `/api/repos/[id]/insights` |

Each developer owns their tab's routes top to bottom — API route, frontend
page, SQLite tables for their domain.

---

## Epic 1: Foundation & Repo Management

### User Profile

**Primary User:** Tech lead setting up Code Steward for the first time and managing their repo portfolio.

### Feature Overview

This epic delivers the application shell, boot sequence, dashboard, and repo
management. After this epic, a user can start the app, add repos, see their
status, and navigate into any repo's tabbed detail view. No tab content beyond
the structure is implemented — that's Epics 2-4.

### Flows & Requirements

#### 1. Application Boot

The app validates prerequisites before rendering the dashboard. Two checks run
on server start: GitHub CLI installed and GitHub CLI authenticated. If either
fails, the app renders a blocking screen with instructions — install
instructions for missing CLI, `gh auth login` instructions for authentication.
Both must pass before the dashboard loads.

**Acceptance criteria areas:**
- App detects `gh` CLI presence via `gh --version`
- App detects authentication status via `gh auth status`
- Missing CLI shows install instructions page (not the dashboard)
- Unauthenticated CLI shows auth instructions page
- Successful checks render the dashboard
- Boot checks run on every server start, not just first launch

#### 2. Dashboard & Repo Cards

The dashboard shows all registered repos as cards. Cards render instantly from
SQLite with last-known data. Background parallel checks refresh dynamic fields.

On page load:
1. Cards render from SQLite (name, org, last review date — instant)
2. `Promise.allSettled` fires per repo: sync status check + `gh pr list` for open PR count
3. Dynamic fields (PR count, sync status) shimmer until their check resolves
4. Failed checks show "refresh failed" with retry on that card

Nothing blocks — cards are clickable immediately while background refreshes run.

**Card fields:**

| Field | Source | Behavior |
|-------|--------|----------|
| Repo name | SQLite | Instant |
| Org | SQLite | Instant |
| Last review date | SQLite | Instant |
| Open PR count | `gh pr list` | Shimmer → resolved |
| Sync status | `git remote` check | Shimmer → "Up to date" or "Updates available" |

Sync status uses a lightweight check (e.g., `git rev-list HEAD..origin/main --count`)
without downloading anything.

**Dashboard-level actions:**
- "Add Repo" button → Add Repo flow
- "Refresh All Repos" button → runs `git fetch --all` on every registered repo
- Per-card "Pull Latest" button when status shows "Updates available"
- Auto-refresh on load setting (stored in SQLite, default off)

**Acceptance criteria areas:**
- Cards render instantly from SQLite before background checks complete
- Background checks run in parallel, do not block each other
- Individual card shimmer resolves independently as each check completes
- Failed checks display error state with retry per card
- "Refresh All" triggers `git fetch --all` across all repos
- Per-card pull button runs `git fetch --all` for that repo and updates sync status
- Auto-refresh setting persists across sessions
- Dashboard is responsive and usable with 0, 1, 5, and 20+ repos

#### 3. Add Repo

User provides a GitHub repo identifier (URL or org/repo format). The app clones
the repo into its own managed `repos/` directory — separate from the user's
development working copies. This is a review workstation; local clones here
don't interfere with development work.

On add:
1. User clicks "Add Repo," provides repo identifier
2. App validates the identifier via `gh repo view`
3. App clones into `repos/` directory (full clone, all branches)
4. App reads git metadata (remote URL, default branch, org)
5. App fetches open PRs via `gh pr list`
6. Repo registered in SQLite, appears on dashboard with live data

**Acceptance criteria areas:**
- Supports GitHub URL and org/repo shorthand formats
- Validates repo exists and user has access before cloning
- Clone goes into app-managed `repos/` directory
- Clone failure (network, permissions) shows clear error
- Duplicate repo detection (don't clone the same repo twice)
- After clone completes, repo card shows on dashboard with all fields populated
- Remove repo option (deletes from SQLite and optionally removes local clone)

#### 4. Repo Detail Page — Tab Structure

Clicking a repo card navigates to the repo detail page. This page has five
tabs. Epic 1 builds the tab shell and navigation; Epics 2-4 fill in tab content.

**Tabs:**

| Tab | Epic | Status after Epic 1 |
|-----|------|---------------------|
| Pull Requests | Epic 2 | Placeholder with "coming soon" or empty state |
| Code Review | Epic 2 | Placeholder |
| Documentation | Epic 3 | Placeholder |
| Issues | Future | Placeholder |
| Insights | Epic 4 | Placeholder |

**Navigation:**
- Click repo card → repo detail page, defaults to Pull Requests tab
- Click open PR count badge on card → repo detail page, Pull Requests tab
- Tab switching does not reload the page
- Browser back button returns to dashboard
- URL reflects current tab (`/repo/[id]/pulls`, `/repo/[id]/review`, etc.)

**Acceptance criteria areas:**
- Five tabs render with correct labels
- Tab selection persists in URL
- Active tab is visually indicated
- Each tab loads its own route without full page reload
- Placeholder content renders for tabs not yet implemented
- Navigation back to dashboard preserves dashboard state (scroll position, loaded data)

#### 5. Settings

Global app settings accessible from the dashboard (gear icon or similar).

**Settings include:**
- Auto-refresh on load (boolean, default off)
- Default model for reviews (haiku/sonnet/opus, per review type — deferred to Epic 2 if complex)
- Default documentation output path (default `docs/wiki/`)
- Default synthesis prompt for PR reviews (deferred to Epic 2)

Settings stored in SQLite. Minimal UI — a simple form.

**Acceptance criteria areas:**
- Settings persist across app restarts
- Settings have sensible defaults on first launch
- Settings page is accessible from dashboard

### Data Contracts

#### Repo (SQLite)

```typescript
interface Repo {
  id: string;                   // UUID
  name: string;                 // Repository name
  org: string;                  // Organization or owner
  remoteUrl: string;            // GitHub remote URL
  localPath: string;            // Absolute path to local clone
  defaultBranch: string;        // e.g., "main"
  lastReviewDate: string | null;// ISO 8601 UTC
  lastRefreshedAt: string | null;// ISO 8601 UTC
  lastDocGeneratedAt: string | null;// ISO 8601 UTC
  lastDocCommitHash: string | null; // Commit hash when docs were last generated
  docOutputPath: string;        // Relative to repo root, default "docs/wiki"
  createdAt: string;            // ISO 8601 UTC
}
```

#### App Settings (SQLite)

```typescript
interface AppSettings {
  autoRefreshOnLoad: boolean;
  defaultDocOutputPath: string;
  // Additional settings added by Epics 2-4 as needed
}
```

### Non-Functional Requirements

- App starts in under 3 seconds (excluding boot checks which depend on network)
- Dashboard renders cards from SQLite in under 500ms
- Supports up to 50 registered repos without performance degradation
- SQLite database file lives in the app's root directory, excluded from git

### Tech Design Questions

1. SQLite schema versioning strategy — do we use a migration library or manual versioning?
2. How to handle `repos/` directory in `.gitignore` for the forkable template?
3. Should the app use a process manager (like `pm2`) for production-like local running, or is `npm start` sufficient?
4. Next.js App Router file structure conventions for the tab routes — layout.tsx with nested routes or separate pages?

### Recommended Story Breakdown

**Story 0: Foundation**
Types, SQLite setup, project skeleton, shared layout, route structure, package.json scripts.

**Story 1: Boot Sequence**
`gh` CLI detection, authentication check, blocking instruction screens.

**Story 2: Dashboard & Repo Cards**
Card grid, SQLite reads, background refresh with shimmer, error states, refresh all.

**Story 3: Add Repo**
Add repo form, validation, clone operation, SQLite registration, remove repo.

**Story 4: Repo Detail Page & Tab Shell**
Tab navigation, URL routing, placeholder content for all five tabs, navigation between dashboard and detail.

**Story 5: Settings**
Settings page, SQLite persistence, defaults.

---

## Epic 2: PR Code Review

### User Profile

**Primary User:** Tech lead reviewing pull requests across their repo portfolio.

### Feature Overview

This epic delivers the core value of Code Steward: AI-augmented PR code review.
A tech lead selects a PR, runs one or more specialized review passes in
parallel, synthesizes the results, and publishes feedback to GitHub — all
without leaving the app. It also includes ad-hoc codebase scans not tied to any
specific PR.

This is the largest epic and is designed for two developers working together.

### Flows & Requirements

#### 1. PR List

The Pull Requests tab shows all open PRs for the repo. Data is pulled from
GitHub via `gh pr list` when the tab loads. PR comments are NOT pulled at this
level — that happens when you drill into a specific PR.

Each PR row shows: title, author, created date, Code Steward review status (not
reviewed / review in progress / review complete), GitHub review status
(approved / changes requested / pending).

Code Steward review status is tracked in SQLite based on whether reviews have
been run for this PR in the app.

A "new comments since last review" indicator shows when GitHub comment count
exceeds what was last seen. This is a lightweight count comparison, not full
comment retrieval.

**Acceptance criteria areas:**
- PR list loads from `gh pr list` on tab open
- PR rows display all specified fields
- Code Steward review status reflects local review history from SQLite
- New comments indicator shows when GitHub comment count has changed since last viewed
- PR list supports repos with 0, 1, 10, and 50+ open PRs
- Loading and error states for PR list fetch

#### 2. PR Detail — Context & Comments

Clicking a PR from the list opens the PR detail view within the tab. On open,
the app pulls full PR data: description, diff stats (files changed with
+/- line counts), file list, and all comments (general comments, review
comments, and inline file comments) via `gh pr view` and `gh api`.

Comments display in chronological order with author, timestamp, and for inline
comments, the file and line reference. This is the existing conversation
context the reviewer reads before deciding whether to run reviews.

A "last refreshed" timestamp and refresh button let the user pull new comments
without leaving the page.

**Acceptance criteria areas:**
- PR description, diff stats, and file list display on PR detail open
- All comment types (general, review, inline) pull and display chronologically
- Inline comments show file path and line number
- Comments refresh on demand with timestamp indicator
- Previous review results (from SQLite) display if this PR has been reviewed before
- "View on GitHub" link opens the PR in the browser
- Back navigation returns to PR list

#### 3. PR Detail — Review Dispatch

Below the PR context, the review controls allow the tech lead to configure and
launch AI code reviews.

4-5 review types available (standard code review, security, performance, and
others determined during tech design). Each review type has a pre-built prompt
that focuses the agent on that specific concern. User selects one or more via
checkboxes.

Model selection per review type (haiku/sonnet/opus) may be configured here or
deferred to global settings — implementation decision for tech design.

"Run Reviews" dispatches all selected review types in parallel. Each review is
an independent Claude Agent SDK `query()` call with the PR diff, file contents,
existing comments, and the review-type-specific prompt as context.

The app checks out the PR branch and the target branch locally (using the
already-fetched repo clone from Epic 1) so agents can read actual files, not
just diffs.

**Acceptance criteria areas:**
- 4-5 review type checkboxes displayed
- At least one must be selected to enable "Run Reviews"
- Reviews dispatch in parallel via Claude Agent SDK
- Each review receives: PR diff, relevant file contents, existing PR comments, review-type prompt
- Agent calls use appropriate model (configurable or default)
- Session IDs and cost tracked in SQLite per review
- User cannot dispatch new reviews while current ones are running (or clear decision on how overlapping reviews work)

#### 4. PR Detail — Review Results

Each dispatched review gets its own lane in the results area. While running,
lanes show a shimmer/progress indicator. As each completes independently, its
lane resolves to rendered markdown output.

Each review produces two things:
1. **Markdown summary** — the human-readable review
2. **Structured file annotations** — file path, line number, comment text, severity (critical/major/minor/info)

The structured annotations are captured so they can be posted as inline GitHub
comments later. This may require structured output via the Agent SDK's
`outputFormat` option or post-processing of the markdown output.

Review results are persisted in SQLite so they survive page refreshes and are
available for historical comparison on future reviews of the same PR.

**Acceptance criteria areas:**
- Each review lane shows shimmer while running, resolves independently
- Completed reviews render as formatted markdown with syntax highlighting
- Structured file annotations captured alongside markdown summary
- Results persist in SQLite
- All lanes completing triggers readiness for synthesis step
- Individual review results are expandable/collapsible
- Cost per review displayed

#### 5. PR Detail — Synthesis

Once all reviews complete, a synthesis section appears. A pre-filled prompt
(configurable in settings) instructs Claude to consolidate all review results
into a unified, coherent report. The user can edit this prompt before running.

Synthesis defaults to Opus model. Receives all review outputs as context. Produces
a single unified report that resolves contradictions, eliminates redundancy,
and prioritizes findings.

**Acceptance criteria areas:**
- Synthesis section appears when all reviews complete
- Default prompt pre-filled and editable
- Synthesis runs on Opus by default
- Synthesized report renders as formatted markdown
- Report includes consolidated file annotations with severity
- Report persisted in SQLite
- User can re-run synthesis with a modified prompt

#### 6. PR Detail — Refinement & Publishing (Embedded Terminal)

After synthesis, the user may want to refine the report, ask questions about
specific findings, or publish feedback to GitHub. This is open-ended
interaction — too varied to capture in structured UI.

An "Open Agent Session" button expands an embedded Claude Code terminal
(xterm.js + node-pty) in the lower portion of the page. Full width,
vertically compact (~40-50% viewport height). The synthesis report and review
results remain visible above for reference.

The terminal session is pre-seeded with context: all review results, the
synthesis report, existing PR comments, file annotations, and instructions
about available actions (post summary comment to GitHub via `gh`, post inline
file comments, re-review specific files, refine the report).

On Claude Code exit (detected via PTY `exit` event), the terminal panel closes
and a "Launch New Session" option appears.

**Acceptance criteria areas:**
- Embedded terminal renders via xterm.js + node-pty
- Terminal is full width, vertically compact
- Claude Code session pre-seeded with full review context
- Terminal PTY exit detected, panel closes cleanly
- Review results and synthesis visible above terminal for reference
- Session context includes instructions for GitHub publishing actions
- WebSocket connection between xterm.js frontend and node-pty backend

#### 7. PR Detail — Quick Actions

In addition to the embedded terminal, common publishing actions are available
as structured UI buttons. These do not require Claude — they execute
deterministic operations via `gh` CLI.

- **Post Summary Comment** — posts the synthesis report as a PR comment
- **Approve PR** — runs `gh pr review --approve`
- **Request Changes** — runs `gh pr review --request-changes` with the synthesis as the body
- **View on GitHub** — opens the PR in the browser

These are always available once a synthesis exists. They complement the
terminal for cases where the user knows exactly what they want to do.

**Acceptance criteria areas:**
- Quick action buttons appear after synthesis completes
- Each action calls the appropriate `gh` CLI command
- Success/failure feedback displayed after each action
- Actions are idempotent where possible (posting the same comment twice should be handled)

#### 8. Code Review Tab — Ad-hoc Scans

The Code Review tab (separate from Pull Requests) provides codebase-wide scans
not tied to any PR. This is for assessing overall codebase health.

Default scan types: Security, Technical Debt, Documentation Quality, Code
Quality, Performance. Users can add custom scan types by providing a prompt
file.

One scan at a time. Select a scan type, hit "Run Scan," get a report. Reports
render as markdown and can be saved to a default reports location.

Warning displayed about token cost for full-codebase scans.

**Acceptance criteria areas:**
- Default scan types listed with descriptions
- Custom scan type support (user-provided prompt files)
- One scan runs at a time
- Token cost warning displayed before scan launch
- Progress indicator during scan
- Report renders as formatted markdown
- Report can be saved (file system location configurable)
- Scan history tracked in SQLite (scan type, date, cost)

### Data Contracts

#### PR Review (SQLite)

```typescript
interface PRReview {
  id: string;
  repoId: string;
  prNumber: number;
  prTitle: string;
  reviewType: string;           // "standard" | "security" | "performance" | etc.
  model: string;                // Model used for this review
  markdownOutput: string;       // Full review markdown
  annotations: FileAnnotation[];// Structured inline comments (stored as JSON)
  costUsd: number;
  sessionId: string;            // Agent SDK session ID
  createdAt: string;            // ISO 8601 UTC
}

interface FileAnnotation {
  filePath: string;
  lineNumber: number;
  comment: string;
  severity: "critical" | "major" | "minor" | "info";
}

interface PRSynthesis {
  id: string;
  repoId: string;
  prNumber: number;
  reviewIds: string[];          // Reviews that were synthesized
  prompt: string;               // The synthesis prompt used
  markdownOutput: string;
  consolidatedAnnotations: FileAnnotation[];
  costUsd: number;
  createdAt: string;
}

interface CodeScan {
  id: string;
  repoId: string;
  scanType: string;
  customPromptPath: string | null;
  markdownOutput: string;
  model: string;
  costUsd: number;
  createdAt: string;
}
```

### Non-Functional Requirements

- PR review dispatch should start within 2 seconds of clicking "Run Reviews"
- Individual review results should render within 1 second of agent completion
- Synthesis prompt is editable with no lag
- Terminal embedding should connect within 3 seconds of clicking "Open Agent Session"
- All agent costs tracked and displayed to the user

### Tech Design Questions

1. How to check out PR branch and target branch for agent file access without disrupting the repo's current state — use `git worktree` for isolated checkouts?
2. Agent SDK structured output vs post-processing for extracting file annotations from review markdown — which is more reliable?
3. How to handle PR reviews for very large PRs (hundreds of files changed) — do we chunk the diff or let the 1M context handle it?
4. Review type prompts — where do they live? Skill files, config files, or database?
5. How does the `gh pr review` command interact with enterprise GitHub permissions and required review policies?

### Recommended Story Breakdown

**Story 0: Foundation**
PR-specific SQLite tables, API route stubs, page skeleton for PR list and PR detail.

**Story 1: PR List**
Fetch and display open PRs, Code Steward review status, new comment indicators.

**Story 2: PR Detail — Context & Comments**
PR description, diff stats, file list, comment retrieval and display, refresh.

**Story 3: Review Dispatch**
Review type selection UI, parallel Agent SDK dispatch, progress tracking.

**Story 4: Review Results**
Shimmer lanes, rendered markdown output, structured annotation capture, persistence.

**Story 5: Synthesis**
Synthesis prompt UI, Opus dispatch, report rendering, re-run capability.

**Story 6: Embedded Terminal**
xterm.js + node-pty integration, context pre-seeding, PTY exit detection.

**Story 7: Quick Actions & Publishing**
Summary comment, approve, request changes buttons via `gh` CLI.

**Story 8: Code Review Tab — Ad-hoc Scans**
Scan type selection, single scan dispatch, report rendering, save, scan history.

---

## Epic 3: Documentation Generation

### User Profile

**Primary User:** Tech lead who needs to generate and maintain documentation for repositories they oversee.

### Feature Overview

This epic delivers the Documentation tab: generating wiki-quality documentation
from a codebase using AST-aware structural analysis (adapted from CodeWiki) and
Claude, updating documentation incrementally when code changes, and viewing
rendered documentation in the browser.

The developer assigned this epic receives a pre-built Claude Code skill that
handles the documentation generation and update logic. Their job is building
the tab UI, the staleness detection, and the publish workflow around that skill.

**Before building UI, have a conversation with Claude about the documentation
generation skill. Understand what it does, how the AST analysis works, what the
inputs and outputs are. Then build the tab around it.**

### Flows & Requirements

#### 1. Documentation Tab — Initial State

First visit to the Documentation tab for a repo with no generated docs shows an
empty state with a "Generate Documentation" button and a brief explanation of
what will happen.

A warning indicates that documentation generation for large repos is a
high-token-cost operation.

**Acceptance criteria areas:**
- Empty state with generate button when no docs exist
- Token cost warning displayed
- Explanation of what generation does (AST analysis + Claude documentation)

#### 2. Generate Documentation

User clicks "Generate Documentation." The app launches the documentation
generation skill which:

1. Runs CodeWiki's Python AST parser (Tree-sitter) on the repo to extract
   component structure and dependency graph
2. Claude clusters components into logical modules based on the dependency graph
3. Claude generates documentation for each module with dependency context
4. Output assembled into a wiki structure: markdown files with Mermaid diagrams,
   table of contents, cross-references

Output is written to the configured path (default `docs/wiki/` relative to repo
root). The commit hash at time of generation is recorded in SQLite.

Progress indication during generation. This may take several minutes for large
repos.

**Acceptance criteria areas:**
- Generation launches the documentation skill via Claude Agent SDK
- AST analysis runs as a first step (Python script via Bash tool)
- Progress indication during generation (may be coarse-grained: "analyzing structure," "generating docs," "assembling wiki")
- Output written to configured path
- Commit hash and timestamp recorded in SQLite
- Generation failure shows clear error with option to retry
- Tree-sitter language support noted (Python, Java, JS, TS, C, C++, C#, Kotlin, PHP)

#### 3. View Documentation

After generation, the Documentation tab renders the wiki in the browser.
Markdown rendered with syntax highlighting. Mermaid diagrams rendered inline.
Navigation tree or sidebar for multi-page wikis.

This is a primary motivation for having a web frontend — rendered markdown and
Mermaid diagrams look better in a browser than in an IDE preview.

**Acceptance criteria areas:**
- Wiki renders as formatted markdown with syntax highlighting
- Mermaid diagrams render inline
- Navigation sidebar or tree for multi-page wikis
- Individual pages linkable/bookmarkable
- Code blocks have copy buttons

#### 4. Staleness Detection & Update

The app tracks the commit hash when docs were last generated. When current HEAD
differs from that hash, the Documentation tab shows a staleness indicator:
"Documentation generated at commit `abc123`, current HEAD is `def456` — X
commits behind."

"Update Documentation" button launches the update flow:

1. App computes the diff between the last-generated commit and current HEAD
2. AST analysis reruns (fast, no LLM cost) to detect structural changes
3. Claude receives the diff, the existing documentation, the current file state,
   and the old vs new AST structure
4. Claude updates only affected sections, preserving unchanged documentation
5. New commit hash recorded in SQLite

**Acceptance criteria areas:**
- Staleness detected by comparing stored commit hash to current HEAD
- Staleness indicator shows commit distance
- Update launches the documentation skill in update mode
- AST re-analysis detects structural changes (new modules, moved files, changed dependencies)
- Incremental update: only affected sections regenerated
- Updated commit hash and timestamp persisted
- Token cost warning for updates (generally lower than full generation)

#### 5. Publish Documentation

After generation or update, the user can publish documentation back to the repo.

**Publish flow:**
1. Create a branch (e.g., `docs/wiki-update-{timestamp}`)
2. Commit generated/updated docs
3. Push branch
4. Open PR via `gh pr create`

The user reviews the docs PR like any other PR.

**GitHub Pages setup** (desired feature, may not be supported on enterprise GitHub):
Configure GitHub Pages to serve from the docs output directory. Uses `gh api`
to call the Pages API. Caveated — enterprise GitHub may not support this
endpoint.

**Acceptance criteria areas:**
- Publish creates branch, commits docs, pushes, opens PR
- PR title and description auto-generated
- GitHub Pages setup offered as optional action
- GitHub Pages caveated for enterprise compatibility
- Publish failure (permissions, network) shows clear error

#### 6. Configuration

Per-repo documentation settings:
- Output path (default `docs/wiki/`, relative to repo root)
- Configured during first generation or via repo settings

**Acceptance criteria areas:**
- Output path configurable per repo
- Default path is `docs/wiki/`
- Path stored in SQLite on Repo record

### Data Contracts

```typescript
// Extends Repo from Epic 1
interface RepoDocState {
  lastDocGeneratedAt: string | null;  // ISO 8601 UTC
  lastDocCommitHash: string | null;
  docOutputPath: string;              // Default "docs/wiki"
}

interface DocGeneration {
  id: string;
  repoId: string;
  commitHash: string;
  mode: "full" | "update";
  costUsd: number;
  durationSeconds: number;
  createdAt: string;
}
```

### Non-Functional Requirements

- Documentation viewer renders pages in under 2 seconds
- Mermaid diagrams render without blocking page load
- Staleness check is instant (SQLite commit hash comparison vs `git rev-parse HEAD`)

### Tech Design Questions

1. How to structure the documentation generation skill — single SKILL.md with everything, plus Python scripts in the skill directory?
2. For repos with languages not supported by Tree-sitter (9 languages supported), fall back to text-based analysis without AST?
3. Wiki output structure — flat directory of markdown files or nested directories mirroring module hierarchy?
4. How to preserve manual edits the user makes to generated docs during an update cycle?

### Recommended Story Breakdown

**Story 0: Foundation**
Documentation-specific SQLite columns, API route stubs, tab page skeleton.

**Story 1: Empty State & Generate**
Empty state UI, generate button, skill dispatch, progress indication, output persistence.

**Story 2: Documentation Viewer**
Markdown rendering, Mermaid diagrams, navigation sidebar, code highlighting.

**Story 3: Staleness Detection & Update**
Commit hash comparison, staleness indicator, update dispatch, incremental update flow.

**Story 4: Publish**
Branch creation, commit, push, PR creation via `gh`. GitHub Pages setup (caveated).

---

## Epic 4: Repo Insights & Notes

### User Profile

**Primary User:** Tech lead tracking the health and history of repositories they oversee.

### Feature Overview

This epic delivers the Insights tab: a dashboard showing review history, scan
history, and repo-level notes/tasks. This is the passive intelligence layer —
where data accumulates over time to give the tech lead visibility into trends
and outstanding items.

Issues tab remains a placeholder in this epic. It is noted as a future
capability: pull GitHub issues, discuss with Claude, draft new issues.

### Flows & Requirements

#### 1. Insights Tab — Review History

A chronological list of all code reviews and scans performed on this repo
through Code Steward. Each entry shows: date, type (PR review / ad-hoc scan),
review types run, cost, and a link to view the full results.

This is automatically populated from SQLite data created by Epic 2. No manual
entry needed.

**Acceptance criteria areas:**
- Review history list populated from SQLite
- Entries show date, type, review types, cost
- Click entry to view full results (rendered markdown)
- Filter by type (PR review vs scan)
- Sort by date (default: most recent first)

#### 2. Insights Tab — Repo Statistics

Summary statistics derived from review history and repo metadata:
- Total reviews performed
- Total cost spent on this repo
- Average review frequency
- Last review date
- Documentation status (current / stale / not generated)
- Open PR count (current)

Simple cards or summary section at the top of the Insights tab.

**Acceptance criteria areas:**
- Statistics computed from SQLite data
- Statistics update when the tab is opened
- Handles repos with no review history gracefully (zero state)

#### 3. Insights Tab — Notes & Tasks

A simple note-taking and task-tracking area for the tech lead's personal
observations about the repo. This is not a project management tool — it's a
scratch pad.

Examples: "Need to refactor the payment module," "Auth middleware flagged by
security scan — follow up after Q2 freeze," "Talk to Sarah about the caching
approach."

Notes are markdown-formatted, stored in SQLite. Tasks have a simple
checkbox (done/not done) and text.

**Acceptance criteria areas:**
- Add/edit/delete notes (markdown formatted)
- Add/edit/delete/toggle tasks
- Notes and tasks persist in SQLite
- Notes render with markdown formatting
- Task list sortable or reorderable
- Notes display with creation date

#### 4. Issues Tab — Placeholder

The Issues tab shows a placeholder indicating future functionality: pull GitHub
issues, discuss with Claude, draft new issues. No implementation beyond the
placeholder message and a "View Issues on GitHub" link that opens the repo's
issues page.

**Acceptance criteria areas:**
- Placeholder message with description of planned functionality
- "View Issues on GitHub" link opens `gh browse` or constructs GitHub URL

### Data Contracts

```typescript
interface RepoNote {
  id: string;
  repoId: string;
  content: string;              // Markdown
  createdAt: string;
  updatedAt: string;
}

interface RepoTask {
  id: string;
  repoId: string;
  text: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Review history and scan history use PRReview and CodeScan
// from Epic 2's data contracts — queried from SQLite
```

### Non-Functional Requirements

- Insights tab loads in under 1 second (all data from local SQLite)
- Notes and tasks save immediately on change (no explicit save button)

### Tech Design Questions

1. Should notes support tagging or categorization, or keep it simple with just a flat list?
2. Should review history aggregate across repos for a "global insights" dashboard on the main dashboard page?
3. What charts/visualizations, if any, for review frequency and cost trends? Or keep it tabular for v1?

### Recommended Story Breakdown

**Story 0: Foundation**
Notes and tasks SQLite tables, API route stubs, tab page skeleton.

**Story 1: Review History**
Query and display review/scan history from SQLite, filters, link to results.

**Story 2: Repo Statistics**
Computed summary stats, card layout, zero state.

**Story 3: Notes & Tasks**
CRUD for notes and tasks, markdown rendering, checkbox toggling, persistence.

**Story 4: Issues Placeholder**
Placeholder content, GitHub link.

---

## Dependencies

### Technical Dependencies

- GitHub CLI (`gh`) installed and authenticated
- Node.js 18+ (Next.js requirement)
- Python 3.11+ (for CodeWiki AST parsing scripts — Epic 3 only)
- Tree-sitter (installed via CodeWiki scripts — Epic 3 only)
- Claude API key with access to Opus, Sonnet, and Haiku models
- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)

### Process Dependencies

- Epic 1 must complete before Epics 2-4 begin (shared infrastructure)
- Documentation generation skill must be built and tested before Epic 3 UI work begins
- Review type prompts should be drafted before Epic 2 Story 3 (review dispatch)

---

## Validation Checklist

- [x] User Profile has all four fields + Feature Overview
- [x] Flows cover primary paths per epic
- [x] Acceptance criteria areas identified for each flow (to be expanded into full ACs during epic creation)
- [x] Data contracts typed
- [x] Scope boundaries explicit (in/out/assumptions)
- [x] Story breakdown covers all flows
- [x] Stories sequence logically per epic
- [x] Epics designed for parallel execution after Epic 1
- [x] Route isolation defined per tab for parallel development
- [ ] Full ACs with test conditions — deferred to individual epic creation
- [ ] Tech architecture document — separate document
- [ ] Documentation generation skill — separate deliverable
