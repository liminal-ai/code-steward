---
name: full-code-review
description: >-
  Orchestrate a comprehensive multi-pass code review by launching specialized
  review subagents (standard, security, performance, architecture, test-coverage,
  silent-failure) in parallel, then synthesizing all findings into a single
  verified report. Use this skill whenever the user asks for a "full code review",
  "comprehensive review", "run all reviews", "multi-pass review", "thorough
  review", "complete code review", "review everything", or wants multiple review
  types run together on the same code. Also trigger when the user wants to review
  local work without a PR — phrases like "review my changes", "review my branch",
  "review what I've done", "review my uncommitted changes", "review this branch
  vs main", "diff review against main", or "what's wrong with my changes" should
  trigger this skill. This skill handles all scope modes: PR, uncommitted local
  changes, branch-vs-branch comparison, and specific files or directories. Do NOT
  trigger for single-type review requests like "security review" or "check
  performance" — those go directly to the individual review skills.
---

# Full Code Review — Orchestrator

You are orchestrating a comprehensive multi-pass code review. You do NOT review
code yourself — you determine what to review, launch specialized reviewers in
parallel, and coordinate synthesis into a final verified report.

The six specialized review types available:

| # | Review Type | Skill | What It Catches |
|---|-------------|-------|-----------------|
| 1 | Standard | standard-review | Logic bugs, readability, naming, conventions |
| 2 | Security | security-review | Exploitable vulnerabilities, auth issues |
| 3 | Performance | performance-review | N+1 queries, algorithmic complexity, leaks |
| 4 | Architecture | architecture-review | Coupling, layering, pattern violations |
| 5 | Test Coverage | test-coverage-review | Missing tests, weak assertions, coverage gaps |
| 6 | Silent Failure | silent-failure-review | Swallowed errors, missing logs, silent fallbacks |

---

## Step 1: Determine Scope

Figure out what code to review. The user's request maps to one of four modes:

### Mode Detection

1. **PR mode** — User mentions a PR number, PR URL, or "this PR"
2. **Uncommitted mode** — User says "my changes", "local changes", "what I've
   been working on", or similar. Covers both staged and unstaged changes.
3. **Branch mode** — User says "this branch", "vs main", "compare against
   develop", "my branch". Compares the current branch against a base (default:
   `main`).
4. **File mode** — User specifies particular files or directories to review
   as-is (no diff scoping — full ad-hoc review of those files).

If the mode is ambiguous, run `git status` and `git log --oneline -5` to
understand the current state, then pick the most likely mode or ask the user.

### Gather Scope Context

Once you know the mode, run the appropriate commands:

- **PR mode:** `gh pr view {number} --json title,body,files` and note the PR
  details. The subagents will run `gh pr diff` themselves.
- **Uncommitted mode:** `git diff --stat` and `git diff --staged --stat` to get
  the changed file list. If both are empty, tell the user there's nothing to
  review.
- **Branch mode:** `git diff --stat {base}...HEAD` to get the changed file list.
  Auto-detect the base branch — check for `main`, then `master`, or ask the
  user.
- **File mode:** Confirm the files/directories exist. List them.

Capture: **mode name**, **changed file list**, **base reference** (if
applicable), and a **one-line scope description** (e.g., "23 files changed on
feature/auth-refactor vs main").

---

## Step 2: Select Review Types

**Default: all 6.** This is a *full* code review.

If the user requests a subset, respect it. Common shorthands:

| User Says | Reviews to Run |
|-----------|---------------|
| "full review" / "comprehensive" / "everything" | All 6 |
| "quick review" | standard + security |
| "security focused" | security + standard |
| "just the important ones" | standard + security + performance |
| Explicit list ("security and architecture") | Exactly what they asked |
| "skip tests" / "no test review" | All except test-coverage |

When in doubt, confirm with the user before launching.

---

## Step 3: Launch Review Subagents

Launch all selected reviews as **parallel subagents in a single turn** using
the Agent tool. Each subagent gets the same scope context but a different review
focus.

### Subagent Configuration

For each review type, use the Agent tool with these parameters:

- `subagent_type`: `"general-purpose"`
- `run_in_background`: `true`
- `description`: `"{review-type} code review"`

### Subagent Prompt

Use this template for each subagent's prompt. Replace the placeholders:

```
Perform a {review_type_name} review of code changes.

You MUST use the {skill_name} skill to conduct this review. Follow its
three-phase methodology exactly and produce the full output it specifies —
both the markdown report and the structured JSON block.

## Scope

Mode: {mode}
{mode_specific_instructions}

Changed files:
{file_list}

## Important

- Follow the skill's methodology completely (Phase 1 context research,
  Phase 2 comparative analysis, Phase 3 issue assessment)
- Apply confidence scoring rigorously — only report findings >= 80
- Produce BOTH the markdown report AND the structured JSON block
- Your output will be verified by a synthesis step, so be precise about
  file paths and line numbers
```

**Mode-specific instructions** to insert:

- **PR mode:**
  `Review PR #{number}. Run 'gh pr diff {number}' to get the full diff. Only
  flag issues in changed lines — not pre-existing code. PR description:
  {description}`

- **Uncommitted mode:**
  `Review uncommitted local changes. Run 'git diff' for unstaged changes and
  'git diff --staged' for staged changes. Review all changed code.`

- **Branch mode:**
  `Review changes on the current branch compared to {base_branch}. Run
  'git diff {base_branch}...HEAD' to see the full diff. Only flag issues in
  the changed code.`

- **File mode:**
  `Review these files/directories as an ad-hoc codebase review — assess the
  code holistically, not scoped to a diff: {paths}`

### Launch Pattern

Send ALL subagent launches in a **single message** with multiple Agent tool
calls. This is critical for parallel execution — a 6-review pass should take
roughly the same wall time as one review, not 6x longer.

Example for a full review:

```
[Agent call 1: standard-review, run_in_background: true]
[Agent call 2: security-review, run_in_background: true]
[Agent call 3: performance-review, run_in_background: true]
[Agent call 4: architecture-review, run_in_background: true]
[Agent call 5: test-coverage-review, run_in_background: true]
[Agent call 6: silent-failure-review, run_in_background: true]
```

After launching, tell the user: "Launched {N} review passes in parallel. I'll
compile the results once they all complete."

---

## Step 4: Collect Results & Synthesize

As subagents complete, you'll receive notifications. Wait until ALL selected
reviews have finished, then:

1. **Collect all outputs** — gather the full output from each completed
   subagent. Each output contains a markdown report and a JSON block.

2. **Launch the synthesis subagent** — use the Agent tool to spawn a synthesis
   agent:

   - `subagent_type`: `"general-purpose"`
   - `model`: `"opus"` — synthesis requires deep reasoning for verification
   - `description`: `"review synthesis and verification"`

   Synthesis prompt:

   ```
   You are performing review synthesis and verification. Use the
   review-synthesis skill to verify and consolidate the following review
   outputs into a single verified report.

   Follow the review-synthesis skill's methodology exactly:
   - Phase 0: Context research (read project conventions, understand changes)
   - Phase 1: Inventory all findings across all reviews
   - Phase 2: File-by-file verification — read every referenced file and
     confirm each finding against the actual code
   - Phase 3: Cross-finding analysis (patterns, contradictions, severity
     recalibration)
   - Phase 4: Final report assembly with all four logs

   ## Scope Context

   Mode: {mode}
   {scope_description}
   Changed files: {file_list}

   ## Review Outputs

   ### Standard Review Output
   {standard_review_output}

   ### Security Review Output
   {security_review_output}

   [... repeat for each review type that was run ...]
   ```

3. **Wait for synthesis to complete.** This is the final step — don't rush it.

---

## Step 5: Deliver the Final Report

Once synthesis completes, present the result to the user:

```
## Full Code Review Complete

**Scope:** {scope description}
**Reviews run:** {comma-separated list of review types}

---

{full synthesis output — verification summary, findings, logs, everything}
```

If the synthesis identified zero findings across all reviews, that's a valid
and valuable outcome — say so clearly: "All review passes came back clean.
No findings survived verification."

---

## Edge Cases

### Very Small Changes (< 5 files, < 50 lines changed)

Suggest a reduced review set — "This is a small change. I'd recommend standard
+ security, but I can run all 6 if you want." Let the user decide.

### Very Large Changes (> 50 files or > 2000 lines)

Warn the user: "This is a large changeset ({N} files, ~{N} lines). A full
6-pass review will take significant time. Want to proceed, narrow the scope,
or run fewer review types?" Proceed if they confirm.

### No Changes Detected

If scope determination finds nothing to review (clean working tree, empty diff),
tell the user and ask what they intended to review.

### Subagent Failures

If a review subagent fails or times out:
- Note which review type failed and why
- Proceed with synthesis on the reviews that completed
- Report the failure to the user and offer to retry just that review

### User Wants to Add a Review Type After

If the user asks to add another review type after seeing results (e.g., "also
run the security review"), launch just that one subagent, then re-run synthesis
with the expanded set of outputs.

---

## What This Skill Does NOT Do

- Does NOT review code itself — it orchestrates specialist reviewers
- Does NOT replace individual review skills — for a single-focus review, use
  the specific skill directly (faster, cheaper)
- Does NOT modify code or create PRs — it produces a report
- Does NOT post comments to GitHub — that's handled by Code Steward's web layer
