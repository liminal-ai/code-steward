# TypeScript SDK + CLI Utility Libraries: Research Report

**Date:** 2026-03-15
**Objective:** Recommend the smallest stable dependency set for a TypeScript SDK with a thin CLI layer.

---

## Summary

After surveying the current npm ecosystem, the recommendation is a lean stack of **5-6 external dependencies** plus Node.js built-ins. The UnJS ecosystem (citty, consola) is attractive for CLI-focused tools but adds dependencies you may not need for an SDK-first package. For an SDK with a thin CLI wrapper, the priority is: minimal footprint, strong TypeScript support, ESM-native, and avoiding dependencies the Claude Agent SDK already transitively provides (specifically zod).

The recommended stack is: **citty** (CLI), **zod** (schema validation, shared with Agent SDK), **tinyglobby** (glob), and **Node.js built-ins** for everything else (config loading, logging, paths, subprocess, git). This gives you ~3-4 direct production dependencies.

---

## Key Findings

- The Claude Agent SDK currently requires **zod v3** as a peer dependency (issue #38 tracks upgrading to v4; as of v0.1.71+ it supports both v3.24.1+ and v4.0.0+). Using zod in your SDK avoids adding another validation library.
- **Node.js 22+ has native `fs.glob()`** (stable since v22.17.0), which may eliminate the need for a glob library if you target Node 22+.
- **Commander v15** is going ESM-only and requires Node 22.12.0+. If you need CJS support, stick with v14.
- **execa v9** is ESM-only with 12 dependencies. For simple "shell out to python/git" use cases, **tinyexec** or **node:child_process** is sufficient.
- **c12** is powerful but massive overkill for loading a single JSON config file.
- **consola** is elegant but a full logging framework is overkill for a CLI tool's output.

---

## Category-by-Category Analysis

### 1. CLI Parsing

| Library | Version | Weekly Downloads | ESM | Dependencies | Last Publish | Notes |
|---------|---------|-----------------|-----|--------------|-------------|-------|
| **citty** | 0.2.1 | 17.8M | ESM-only (v0.2.0+) | 0 | Feb 2026 | UnJS, TypeScript-first, uses native `util.parseArgs` |
| **commander** | 14.0.3 (stable) / 15.0.0-0 (pre) | ~120M+ | CJS+ESM (v14), ESM-only (v15) | 0 | Jan 2026 (v14) | v15 requires Node 22.12.0+ |
| **cac** | 7.0.0 | 25.9M | CJS+ESM | 0 | Feb 2026 | Used by Vite/Vitest internally |
| **yargs** | 18.0.0 | 149.3M | ESM-first (v18) | 7+ | May 2025 | Heavy; 291 open issues; no commits in 6+ months |

**Recommendation: citty**

Rationale:
- Zero dependencies, TypeScript-first, ESM-native
- `defineCommand` + `runMain` pattern maps perfectly to "thin CLI wrapping SDK methods"
- Built on native `util.parseArgs` -- minimal abstraction
- Lazy/async sub-commands, auto-generated help, clean API
- Used by Nuxt CLI, unbuild, and other UnJS tools in production
- v0.2.0 added enum arg types, `meta.hidden` for internal subcommands, cleanup hooks

Why not the others:
- **commander** is excellent but more imperative; heavier API surface for a thin CLI
- **cac** is good but citty is newer, more actively maintained, and more TypeScript-idiomatic
- **yargs** is too heavy (7+ deps, 149M downloads mostly from legacy); maintenance appears slowing

### 2. Config Loading

| Library | Version | Weekly Downloads | ESM | Dependencies | Notes |
|---------|---------|-----------------|-----|--------------|-------|
| **c12** | 3.2.0 (stable) / 4.0.0-beta.3 | 9.3M | Yes | Many (jiti, defu, rc9, confbox) | .js/.ts/.yaml/.toml/.env support, config watching, HMR |
| **cosmiconfig** | 9.0.0 | ~80M | Yes | 4 (js-yaml, etc.) | Searches directory tree for .rc files, package.json props |

**Recommendation: Use built-in (just read JSON directly)**

Rationale:
For a single `.docengine.json` file, neither c12 nor cosmiconfig is justified.

```typescript
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function loadConfig(cwd: string) {
  const configPath = resolve(cwd, '.docengine.json');
  const raw = await readFile(configPath, 'utf-8');
  return JSON.parse(raw); // validate with zod after
}
```

This is ~5 lines of code. Adding c12 (which pulls in jiti, defu, rc9, confbox, and more) or cosmiconfig (4 deps including js-yaml which recently had a prototype pollution CVE) is unnecessary complexity for a JSON-only config.

If you later want to support `.docengine.ts` or `.docengine.yaml`, you can add c12 or cosmiconfig at that point. Start simple.

**Known issue with cosmiconfig:** Its dependency `js-yaml` had a prototype pollution vulnerability (CVE-2025-64718) requiring upgrade to v4.1.1. Issue #353 was filed Nov 2025.

### 3. Logging

| Library | Version | Weekly Downloads | ESM | Dependencies | Notes |
|---------|---------|-----------------|-----|--------------|-------|
| **consola** | 3.4.2 | 28.6M | CJS+ESM | 0 | UnJS, fancy output, pluggable reporters, prompt support |
| **pino** | 10.3.1 | 17-26M | CJS+ESM | 11 | Structured JSON logging, fastest benchmarks, worker threads |

**Recommendation: Use a thin console wrapper (no library)**

Rationale:
For a CLI/SDK tool, you need: info, warn, error, debug, and maybe a verbose flag. This is 15-20 lines of code:

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const levels = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 } as const;

function createLogger(level: LogLevel = 'info') {
  const threshold = levels[level];
  return {
    debug: (...args: unknown[]) => threshold <= 0 && console.debug('[debug]', ...args),
    info:  (...args: unknown[]) => threshold <= 1 && console.log('[info]', ...args),
    warn:  (...args: unknown[]) => threshold <= 2 && console.warn('[warn]', ...args),
    error: (...args: unknown[]) => threshold <= 3 && console.error('[error]', ...args),
  };
}
```

Why not consola or pino:
- **consola** is nice (fancy output, tag support, throttling) but its value is in interactive CLI apps with complex output. For an SDK that mostly runs headless or via Claude Agent SDK, structured JSON output or simple console messages are sufficient.
- **pino** is for production server logging with transport pipelines. Overkill for a dev tool.

If you later need colored output or progress indicators, consola is the right upgrade path.

### 4. Path Utilities

| Library | Version | Weekly Downloads | ESM | Dependencies | Notes |
|---------|---------|-----------------|-----|--------------|-------|
| **pathe** | 2.0.3 | 59.2M | CJS+ESM | 0 | Drop-in `path` replacement, normalizes to forward slashes |

**Recommendation: Use Node.js built-in `node:path`**

Rationale:
- pathe's main value is cross-platform path normalization (always uses `/` instead of `\` on Windows)
- If your tool runs on macOS/Linux (the primary use case for a doc engine CLI), `node:path` is sufficient
- If Windows support matters later, pathe is a safe zero-dep addition
- 59M weekly downloads proves it's stable, but it's solving a problem you may not have

### 5. Schema Validation

| Library | Version | Weekly Downloads | ESM | Dependencies | Bundle Size | Notes |
|---------|---------|-----------------|-----|--------------|-------------|-------|
| **zod** | 4.3.6 (v4) / 3.24.x (v3) | ~68K dependents | CJS+ESM | 0 | ~2KB core (v4 gzipped) | TypeScript-first, de facto standard |
| **valibot** | 1.2.0 | 6.6M | CJS+ESM | 0 | <700 bytes min | Modular/tree-shakeable, lighter |
| **ajv** | 8.18.0 | ~170M+ | CJS+ESM | 4 | Larger | JSON Schema standard, fastest for JSON Schema |

**Recommendation: zod**

Rationale:
- The Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) lists zod as a peer dependency. As of v0.1.71+, it supports both zod v3.24.1+ and v4.0.0+.
- Using zod means zero additional validation dependencies -- it's already in your dependency tree.
- Zod v4 is now stable (v4.3.6, published Jan 2026) with a 2KB core bundle, built-in JSON Schema conversion, and zero external dependencies.
- You'd use zod to validate `.docengine.json` config, CLI args, and any SDK input/output types.

Why not valibot or ajv:
- **valibot** is lighter (<700 bytes) and modular, but adding it alongside zod (which is already required) means two validation libraries.
- **ajv** is JSON Schema-based (different paradigm from TypeScript-first), and has 4 dependencies.

**Zod v3 vs v4 decision:** If Claude Agent SDK upgrades to v4 (issue #38 is open, assigned), use v4. If it stays on v3, use v3. The `zod` package v4 exports a `zod/v3` compat path so both can coexist. **Recommend: target zod v4 with `zod/v3` fallback if needed.**

### 6. Subprocess Execution

| Library | Version | Weekly Downloads | ESM | Dependencies | Notes |
|---------|---------|-----------------|-----|--------------|-------|
| **execa** | 9.6.1 | 122M | ESM-only | 12 | Full-featured, template strings, piping |
| **tinyexec** | 1.0.4 | 47.5M | ESM-only (v1.0+) | 0 | Minimal, promise-based, from tinylibs |
| **node:child_process** | (built-in) | -- | -- | 0 | execFile, spawn, exec |

**Recommendation: node:child_process (or tinyexec if you want convenience)**

Rationale:
For shelling out to Python scripts and git commands, `node:child_process` is sufficient:

```typescript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Run Python script
const { stdout } = await execFileAsync('python3', ['scripts/analyze.py', '--repo', repoPath]);

// Get git HEAD
const { stdout: hash } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoPath });
```

If you find yourself writing too much boilerplate (error handling, timeout, signal forwarding), **tinyexec** is the right step up:
- Zero dependencies, minimal API (`x('cmd', ['args'])`)
- 47.5M weekly downloads, actively maintained
- Returns `{ stdout, stderr, exitCode }` cleanly

Why not execa:
- 12 dependencies is too many for "run python and git"
- ESM-only (fine for your project, but still adds dependency weight)
- The rich features (piping, streaming, IPC) aren't needed for your use case

### 7. Glob / File Matching

| Library | Version | Weekly Downloads | ESM | Dependencies | Bundle Size | Notes |
|---------|---------|-----------------|-----|--------------|-------------|-------|
| **tinyglobby** | 0.2.15 | 76.3M | CJS+ESM | 2 (fdir, picomatch) | ~15KB | Modern replacement for fast-glob/globby |
| **fast-glob** | 3.3.3 | ~90M | CJS+ESM | 17 subdeps | ~30KB | The standard, widely used |
| **globby** | 16.1.1 | 72.8M | ESM-only | 6 (incl. fast-glob) | Larger | Adds .gitignore, dir expansion on top of fast-glob |
| **picomatch** | 4.x | ~60M | CJS+ESM | 0 | ~85KB unpacked | Glob-to-regex only (no file system traversal) |
| **minimatch** | 10.2.4 | ~40M | CJS+ESM | 0 (v10) | ~535KB unpacked | Pattern matching only, npm's internal matcher |
| **Node.js `fs.glob()`** | (built-in, v22.17+) | -- | -- | 0 | -- | Stable since v22.17.0, basic but functional |

**Recommendation: tinyglobby (or Node.js built-in if targeting Node 22.17+)**

Rationale:
- **tinyglobby** is the modern replacement recommended by the fast-glob author himself
- Only 2 subdependencies (fdir + picomatch) vs fast-glob's 17 and globby's 23
- Same API surface as globby/fast-glob: `glob(['**/*.ts', '!**/*.d.ts'], { cwd })`
- 76M weekly downloads, used by tsup and other major tools
- Install size: 179KB vs fast-glob's 513KB vs globby's 1.6MB

If you target **Node.js 22.17+** exclusively, the built-in `fs.glob()` covers basic cases:
```typescript
import { glob } from 'node:fs/promises';
const files = await Array.fromAsync(glob('**/*.ts'));
```
However, tinyglobby adds negation patterns (`!**/*.test.ts`), better performance, and a more ergonomic API. Worth the small dep.

**picomatch** and **minimatch** are pattern-matching-only (no filesystem traversal). They're useful if you're implementing your own file walker, but not as standalone glob solutions.

### 8. Git Interaction

| Library | Version | Weekly Downloads | ESM | Dependencies | Notes |
|---------|---------|-----------------|-----|--------------|-------|
| **simple-git** | 3.33.0 | 12.7M | CJS+ESM | 3 | Full git API wrapper, promise-based |

**Recommendation: Shell out to git via node:child_process**

Rationale:
For the documented use cases (HEAD hash, diff output), direct git commands are simpler and have zero dependency cost:

```typescript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);

async function getHeadHash(cwd: string): Promise<string> {
  const { stdout } = await exec('git', ['rev-parse', 'HEAD'], { cwd });
  return stdout.trim();
}

async function getDiff(cwd: string, base: string): Promise<string> {
  const { stdout } = await exec('git', ['diff', base, '--name-status'], { cwd });
  return stdout;
}

async function getChangedFiles(cwd: string, base: string): Promise<string[]> {
  const { stdout } = await exec('git', ['diff', '--name-only', base], { cwd });
  return stdout.trim().split('\n').filter(Boolean);
}
```

simple-git is a well-maintained package (3.33.0, published March 2026, 12.7M downloads) but wraps every git operation with a fluent API you don't need. It adds 3 dependencies and ~965KB. For a few git commands, direct shell-out is the right call.

### 9. Markdown Parsing

| Library | Version | Weekly Downloads | ESM | Dependencies | Notes |
|---------|---------|-----------------|-----|--------------|-------|
| **remark** (unified) | 15.0.1 | 3.4M | ESM-only | unified ecosystem | Full AST, plugin system, ecosystem |
| **markdown-it** | 14.1.1 | 20M | CJS+ESM | 6 | Fast, pluggable, CommonMark compliant |

**Recommendation: Likely not needed; if needed, use remark**

Rationale:
The question is whether you need a markdown parser at all. Common doc-engine tasks:
- **Link validation in markdown**: Regex is fragile. If you're checking `[text](url)` links, a real parser avoids false positives inside code blocks and other edge cases.
- **Frontmatter extraction**: A simple regex or `gray-matter` (1.3M downloads) handles YAML frontmatter without a full parser.
- **Structural analysis** (headings, sections): This is where remark shines -- full AST access.

If you need markdown parsing, **remark** is the better choice:
- Part of the unified ecosystem (remark-parse + remark-stringify)
- Full MDAST (Markdown Abstract Syntax Tree) access
- Plugin ecosystem for GFM, frontmatter, TOC, etc.
- ESM-only, actively maintained

If you only need link extraction, you can start with regex and upgrade to remark when edge cases bite:
```typescript
// Simple link extraction (handles 95% of cases)
const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
```

---

## Final Recommended Dependency Set

### Production Dependencies (3-4 packages)

| Package | Version | Purpose | Weekly Downloads |
|---------|---------|---------|-----------------|
| `citty` | ^0.2.1 | CLI parsing | 17.8M |
| `zod` | ^4.3.6 (or ^3.24.x) | Schema validation | 68K dependents |
| `tinyglobby` | ^0.2.15 | File globbing | 76.3M |

### Use Node.js Built-ins For

| Need | Built-in | Notes |
|------|----------|-------|
| Config loading | `node:fs/promises` + `JSON.parse` | For `.docengine.json` |
| Logging | `console.*` with thin wrapper | ~15 lines of code |
| Path utilities | `node:path` | Sufficient for macOS/Linux |
| Subprocess (Python, git) | `node:child_process` | `execFile` + promisify |
| Git operations | `node:child_process` | Direct git commands |

### Optional / Add Later If Needed

| Package | Version | When to Add |
|---------|---------|-------------|
| `consola` | ^3.4.2 | If you need colored/fancy CLI output |
| `pathe` | ^2.0.3 | If Windows path normalization is needed |
| `tinyexec` | ^1.0.4 | If child_process boilerplate becomes painful |
| `remark` + `remark-parse` | ^15.0.1 | If you need markdown AST analysis |
| `c12` | ^3.2.0 | If you want `.ts`/`.yaml` config file support |

### Total Dependency Footprint

With the recommended set (citty + zod + tinyglobby):
- **citty**: 0 dependencies
- **zod**: 0 dependencies (already a peer dep of Claude Agent SDK)
- **tinyglobby**: 2 dependencies (fdir + picomatch)

**Total: 3 direct + 2 transitive = 5 packages added to your tree** (excluding zod which is already present via Claude Agent SDK).

---

## Sources

| Source | URL | Credibility |
|--------|-----|-------------|
| citty npm | https://www.npmjs.com/package/citty | Official registry, v0.2.1 |
| commander npm | https://www.npmjs.com/package/commander | Official registry, v14.0.3 |
| commander v15 pre-release | https://github.com/tj/commander.js/releases | Official repo |
| cac npm | https://www.npmjs.com/package/cac | Official registry, v7.0.0 |
| yargs npm | https://www.npmjs.com/package/yargs | Official registry, v18.0.0 |
| c12 npm | https://www.npmjs.com/package/c12 | Official registry, v4.0.0-beta.3 / v3.2.0 stable |
| cosmiconfig npm | https://www.npmjs.com/package/cosmiconfig | Official registry, v9.0.0 |
| cosmiconfig js-yaml CVE | https://github.com/cosmiconfig/cosmiconfig/issues/353 | GitHub issue |
| consola npm | https://www.npmjs.com/package/consola | Official registry, v3.4.2 |
| pino npm | https://www.npmjs.com/package/pino | Official registry, v10.3.1 |
| pathe npm | https://www.npmjs.com/package/pathe | Official registry, v2.0.3 |
| zod npm | https://www.npmjs.com/package/zod | Official registry, v4.3.6 |
| zod v3->v4 Agent SDK issue | https://github.com/anthropics/claude-agent-sdk-typescript/issues/38 | GitHub issue, open |
| valibot npm | https://www.npmjs.com/package/valibot | Official registry, v1.2.0 |
| ajv npm | https://www.npmjs.com/package/ajv | Official registry, v8.18.0 |
| execa npm | https://www.npmjs.com/package/execa | Official registry, v9.6.1 |
| tinyexec npm | https://www.npmjs.com/package/tinyexec | Official registry, v1.0.4 |
| tinyglobby npm | https://www.npmjs.com/package/tinyglobby | Official registry, v0.2.15 |
| tinyglobby e18e blog | https://e18e.dev/blog/tinyglobby-migration/ | Developer blog, Nov 2025 |
| fast-glob npm | https://www.npmjs.com/package/fast-glob | Official registry, v3.3.3 |
| globby npm | https://www.npmjs.com/package/globby | Official registry, v16.1.1 |
| minimatch versions | https://deps.dev/npm/minimatch | Open Source Insights, v10.2.4 |
| picomatch comparison | https://www.pkgpulse.com/blog/picomatch-vs-micromatch-vs-minimatch-glob-pattern-matching-nodejs-2026 | PkgPulse, Mar 2026 |
| simple-git npm | https://www.npmjs.com/package/simple-git | Official registry, v3.33.0 |
| remark npm | https://www.npmjs.com/package/remark | Official registry, v15.0.1 |
| markdown-it npm | https://www.npmjs.com/package/markdown-it | Official registry, v14.1.1 |
| Node.js fs.glob | https://www.stefanjudis.com/today-i-learned/node-js-includes-a-native-glob-utility/ | Dev blog, Oct 2025 |
| Claude Agent SDK repo | https://github.com/anthropics/claude-agent-sdk-typescript | Official repo |

---

## Confidence Assessment

- **Overall confidence: High** -- version numbers and download counts verified against npm registry data from Feb/Mar 2026.
- **Area of uncertainty:** The Claude Agent SDK's exact current zod version requirement. Issue #38 is open for v3->v4 migration, and v0.1.71+ reportedly supports both. Confirm by checking `package.json` of the installed SDK version.
- **Area of uncertainty:** Node.js `fs.glob()` feature completeness vs tinyglobby for advanced patterns (negation, brace expansion). The built-in covers basic `**/*.ts` patterns but may lack features you need.
- **Recommendation stability:** These recommendations are conservative. The "add later" packages are all well-maintained and can be introduced incrementally as needs emerge.
