---
name: doc-generation
description: Generate and update wiki-style documentation for codebases using AST-aware structural analysis. Use when the user wants to generate documentation, update stale documentation, create a documentation wiki, or assess documentation coverage for a repository.
---

# Documentation Generation

Generate comprehensive wiki-style documentation for any codebase using AST-aware structural analysis and Codex's reasoning.

**Supported languages:** Python, JavaScript, TypeScript, Java, C, C++, C#, Kotlin, PHP

**Output:** Flat directory of markdown files with Mermaid diagrams, cross-references, and a repository overview. Default output path: `docs/wiki/` relative to repo root.

**Warning:** Full-codebase documentation generation is token-intensive. Repos with >200 components will use significant tokens. Repos with >500 components should be documented in phases (core modules first).

---

## Pre-flight Checks

Before starting, verify:

1. **Python 3.11+** is available: `python3 --version`
2. **tree-sitter packages** are installed. If not:
   ```bash
   pip install tree-sitter tree-sitter-python tree-sitter-javascript tree-sitter-typescript tree-sitter-java tree-sitter-c tree-sitter-cpp tree-sitter-c-sharp tree-sitter-kotlin tree-sitter-php
   ```
3. **Determine fresh vs update:** Check if `docs/wiki/.doc-meta.json` exists in the target repo.
   - If it does NOT exist → follow **Fresh Generation** below
   - If it exists → follow **Update Existing Documentation** below

---

## Fresh Generation

### Phase 1 — Structural Analysis

Run the analysis script to extract the codebase structure:

```bash
python3 {SKILL_DIR}/scripts/analyze_repo.py /path/to/repo --output /tmp/repo-analysis.json
```

Read the output JSON. Report to the user:
- Number of files analyzed
- Number of components found
- Number of relationships discovered
- Languages detected

If >200 components, warn: "This repo has {N} components. Documentation generation will be token-intensive. Proceed?"

If >500 components, suggest phased approach: "Consider documenting core modules first, then expanding. Which directories or modules are most important?"

### Phase 2 — Module Clustering

Using the analysis JSON, group components into logical modules. This is your reasoning — no external tool needed.

**Clustering heuristics (apply in order):**

1. **File path proximity:** Components in the same directory or subdirectory likely belong together. Group by the first 2-3 path segments (e.g., `src/auth/*` → "Authentication" module).

2. **Dependency relationships:** Components that call each other frequently belong together. Use the `relationships` array from the analysis to identify tightly coupled groups.

3. **Naming conventions:** Components with common prefixes or domain terms (auth, db, api, payment, user) form natural modules.

4. **For small repos (<30 components):** Skip clustering entirely. Document everything in a single comprehensive overview.

5. **For large repos (>100 components):** Create hierarchical sub-modules. A top-level module like "API Layer" might have sub-modules "Routes", "Middleware", "Validators".

**Output a module tree structure like:**

```json
{
  "Authentication": {
    "components": ["src.auth.service.AuthService", "src.auth.models.User"],
    "description": "User authentication and session management"
  },
  "Database": {
    "components": ["src.db.pool.ConnectionPool", "src.db.models.BaseModel"],
    "description": "Database connection and ORM layer"
  }
}
```

### Phase 3 — Module Documentation

Process modules leaf-first (modules with no sub-modules first, then parent modules).

For each module, use the **Read** tool to read the actual source files of its components, then write a markdown documentation file.

**Each module doc (`{module_name}.md`) should include:**

1. **Module Overview** — 2-3 sentences describing purpose and responsibility
2. **Architecture Diagram** — Mermaid diagram showing components and their relationships within the module:
   ```mermaid
   graph TD
     A[ComponentA] --> B[ComponentB]
     B --> C[ComponentC]
   ```
3. **Component Descriptions** — For each key component:
   - What it does
   - Key methods/functions and their purpose
   - Important parameters and return types
4. **Dependencies** — Mermaid diagram showing what other modules this module depends on:
   ```mermaid
   graph LR
     ThisModule --> DatabaseModule
     ThisModule --> ConfigModule
   ```
5. **Key APIs** — The most important public interfaces with brief usage notes
6. **Cross-references** — Links to related module docs: `[Database Module](database.md)`

**Important rules:**
- All .md files go in the same flat directory (the output path, default `docs/wiki/`)
- Cross-reference format: `[Module Name](module_name.md)` — all files are siblings
- Use lowercase-with-hyphens for filenames: `authentication.md`, `database-layer.md`
- Include source code snippets for key interfaces — short, focused excerpts
- Mermaid diagrams should be clear and not overly complex — 5-15 nodes max per diagram

### Phase 4 — Repository Overview

After all module docs are written, generate `overview.md`:

1. **Repository Purpose** — What this codebase does, in 2-3 sentences
2. **Architecture Overview** — Top-level Mermaid diagram showing all modules and their relationships:
   ```mermaid
   graph TD
     API[API Layer] --> Auth[Authentication]
     API --> DB[Database]
     Auth --> DB
     API --> Cache[Cache Layer]
   ```
3. **Module Index** — Table of contents linking to all module documentation files
4. **Technology Stack** — Languages, key frameworks, and tools detected
5. **Getting Started** — Brief orientation for a developer new to the codebase

### Phase 5 — Metadata

Write `.doc-meta.json` to the output directory:

```json
{
  "generated_at": "2026-03-14T10:30:00Z",
  "commit_hash": "abc123def456",
  "module_tree": {
    "Authentication": {
      "components": ["src.auth.service.AuthService"],
      "doc_file": "authentication.md"
    }
  },
  "files_generated": ["overview.md", "authentication.md", "database.md"],
  "component_count": 142,
  "repo_name": "my-service",
  "output_path": "docs/wiki"
}
```

Report completion: "Documentation generated: {N} module docs + overview. Output: {output_path}/"

---

## Update Existing Documentation

Use this flow when `.doc-meta.json` already exists.

### Step 1 — Detect Staleness

```bash
# Get stored commit hash
cat docs/wiki/.doc-meta.json | python3 -c "import sys,json; print(json.load(sys.stdin)['commit_hash'])"

# Get current commit hash
git rev-parse HEAD
```

If they match, docs are current. Tell the user: "Documentation is up to date (generated at commit {hash})."

If they differ, proceed.

### Step 2 — Compute Changes

```bash
git diff --name-only {stored_hash} HEAD
```

This gives you the list of files that changed since docs were last generated.

### Step 3 — Re-run Analysis

Run the analysis script again:

```bash
python3 {SKILL_DIR}/scripts/analyze_repo.py /path/to/repo --output /tmp/repo-analysis-new.json
```

### Step 4 — Identify Affected Modules

Read the new analysis JSON and the stored `.doc-meta.json` module tree. Compare:

1. **Changed components:** Any component whose `file_path` (relative) appears in the git diff file list
2. **New components:** Components in the new analysis that don't exist in the stored module tree
3. **Removed components:** Components in the stored module tree that don't appear in the new analysis
4. **Changed relationships:** New or removed dependency edges

A module is **affected** if any of its components were changed, added, or removed.

### Step 5 — Re-cluster if Needed

- If only content changed within existing files (no new files, no deleted files): **keep existing module tree**
- If new files were added or files were deleted: **re-evaluate clustering** for affected areas. New components may belong to existing modules or may warrant a new module.

### Step 6 — Regenerate Affected Docs

For each affected module:
1. Re-read the current source code of its components
2. Rewrite that module's markdown file with updated content
3. Update Mermaid diagrams to reflect any structural changes

For unaffected modules: leave their docs untouched.

### Step 7 — Update Overview and Metadata

If any module was affected:
1. Regenerate `overview.md` to ensure it reflects current state
2. Update `.doc-meta.json` with new commit hash, timestamp, and module tree

Report: "Updated documentation for {N} modules. {M} modules unchanged."

---

## Output Directory Structure

```
docs/wiki/
├── .doc-meta.json          # Generation metadata (commit hash, module tree)
├── overview.md             # Repository overview with architecture diagram
├── authentication.md       # Module documentation
├── database-layer.md       # Module documentation
├── api-routes.md           # Module documentation
└── ...                     # Additional module docs
```

---

## Documentation Quality Guidelines

**Good documentation answers:** What does this do? Why does it exist? How does it connect to the rest of the system? How would I use or modify it?

**Mermaid diagram types to use:**
- `graph TD` or `graph LR` — Architecture and dependency diagrams
- `sequenceDiagram` — For request/response flows or multi-step processes
- `classDiagram` — For class hierarchies (use sparingly)
- `flowchart` — For decision trees or process flows

**What to include:**
- Purpose and responsibility of each module
- How modules connect to each other
- Key interfaces and their contracts
- Source code snippets for important APIs (brief, focused)
- Mermaid diagrams for visual understanding

**What NOT to include:**
- Line-by-line code commentary
- Implementation details that are obvious from reading the code
- Test file documentation
- Configuration file documentation (unless critical to understanding architecture)
- Speculative or aspirational content — document what IS, not what could be
