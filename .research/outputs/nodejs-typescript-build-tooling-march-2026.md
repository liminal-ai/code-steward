# Node.js Versions, TypeScript, and Build Tooling for a Production TypeScript SDK

**Research Date:** March 15, 2026
**Confidence:** High (based on official sources, npm registry, and Node.js/TypeScript release blogs)

---

## Summary

As of March 2026, the production-grade Node.js target is **Node.js 22 LTS** (maintenance until April 2027) with **Node.js 24 LTS** (active support until October 2026, maintenance until April 2028) as the primary recommended version. TypeScript's latest stable release is **5.9.3**, with **6.0 GA expected March 17, 2026** (RC released March 6). For build tooling, **tsup v8.5.1** remains the most widely used TypeScript library bundler but is now in maintenance mode -- its successor **tsdown** (Rolldown-based, v0.20+) is rapidly gaining adoption. ESM-only packages with `"type": "module"` are now the recommended approach for new packages, enabled by `require(esm)` being stable across all active Node.js LTS versions.

---

## 1. Node.js Version Status

### Current Release Lines (as of March 2026)

| Version | Status | Released | LTS Start | Active End | Maintenance End | Latest |
|---------|--------|----------|-----------|------------|-----------------|--------|
| **25.x** | Current | Oct 15, 2025 | N/A (odd) | Apr 1, 2026 | Jun 1, 2026 | 25.8.1 (Mar 11, 2026) |
| **24.x** | **LTS "Krypton"** | May 6, 2025 | Oct 2025 | Oct 20, 2026 | **Apr 30, 2028** | 24.14.0 (Feb 24, 2026) |
| **22.x** | LTS (Maintenance) | Apr 24, 2024 | Oct 2024 | Oct 21, 2025 (ended) | **Apr 30, 2027** | 22.22.1 (Mar 5, 2026) |
| **23.x** | EOL | Oct 16, 2024 | N/A (odd) | Apr 1, 2025 (ended) | Jun 1, 2025 (ended) | 23.11.1 |
| **20.x** | LTS (Maintenance) | Apr 18, 2023 | Oct 2023 | Oct 22, 2024 (ended) | **Apr 30, 2026** | 20.20.1 (Mar 5, 2026) |

### Q&A: Node.js Versions

**Q: What is the current Node.js LTS version?**
Node.js 24 LTS "Krypton" is the current active LTS (since October 2025). Node.js 22 LTS is in maintenance mode. Node.js 20 LTS is also in maintenance and reaches EOL on April 30, 2026.

**Q: Node 22 LTS status?**
Node 22 entered LTS on October 29, 2024. It is now in **maintenance mode** (active support ended October 21, 2025). Maintenance continues until April 30, 2027. Still receiving security patches and critical bug fixes.

**Q: Status of Node 23?**
Node 23 was a **Current (odd-numbered)** release. It was released October 16, 2024. Active support ended April 1, 2025. Security support ended June 1, 2025. It is now **EOL** and should not be used.

**Q: Status of Node 24?**
Node 24 was released May 6, 2025, entered LTS in October 2025 as "Krypton". It is the **recommended LTS for production** with active support until October 2026 and maintenance until April 2028. Latest version: 24.14.0.

**Q: Which Node version for a production package today?**
- **Target minimum:** Node.js 22 (engines: `">=22"`)
- **Rationale:** Node 22 is still in maintenance until April 2027, has `require(esm)` enabled by default (since v22.12.0), and has broad ecosystem adoption. Node 20 reaches EOL in 6 weeks (April 30, 2026) so should not be targeted for new packages.
- **Develop on:** Node.js 24 LTS (active support, latest features)
- **Test matrix:** Node 22 + Node 24

**Q: Key ESM improvements in recent Node versions?**
- **Node 22.12.0** (Dec 2024): `require(esm)` enabled by default (no flag needed), though still experimental at that point
- **Node 24**: Continued ESM improvements, stable `require(esm)`
- **Node 25.4.0** (Jan 2026): `require(esm)` officially marked **stable** (removed experimental status)
- The `require(esm)` feature was backported to Node 20 as well, meaning all active LTS versions support it
- This means ESM-only packages can now be consumed by CJS code without errors across all maintained Node versions

### Upcoming: New Release Schedule (Starting Node 27)
Node.js is moving from two major releases per year to one, starting with Node 27. Every release will become LTS (no more odd-number skip). Version numbers will align to the calendar year. Announcement date: April 2, 2026.

---

## 2. TypeScript Version Status

### Release Timeline

| Version | Released | Key Features |
|---------|----------|-------------|
| **5.7** | Nov 22, 2024 | Never-initialized variable checks, `--rewriteRelativeImportExtensions`, JSON import validation under `--module nodenext` |
| **5.8** | Feb 28, 2025 | Granular checks for branches in return expressions, checked returns for conditional types, `require()` ESM support improvements |
| **5.9** | Aug 1, 2025 | `import defer` (TC39 Stage 3), `--module node20`, minimal `tsc --init`, expandable hovers (preview), configurable hover length |
| **6.0 RC** | Mar 6, 2026 | Last JS-based codebase release. GA expected **Mar 17, 2026** |
| **7.0** | TBD (2026?) | Complete rewrite in **Go** for 10x performance (announced by Anders Hejlsberg) |

### Latest Stable Version: **TypeScript 5.9.3**
- npm: `npm install -D typescript` installs 5.9.3 as of March 2026
- TypeScript 6.0 RC is available via `npm install -D typescript@rc`

### TypeScript 6.0 Key Features
- **Last JavaScript-based release** before the Go rewrite (TypeScript 7)
- Less context-sensitive function inference
- Subpath imports with `#/` prefix
- ES2025 features: `RegExp.escape()`, Map/WeakMap upsert methods, Temporal API types
- DOM library consolidation (`dom.iterable` included by default)
- **Breaking changes:**
  - `--target es5` deprecated (minimum ES2015)
  - `--moduleResolution node` deprecated (use `nodenext` or `bundler`)
  - Module formats `amd`, `umd`, `systemjs` removed
  - `--outFile` removed
  - `esModuleInterop: false` no longer allowed
  - `strict: true` defaults to enabled

### Recommended tsconfig.json for Node.js ESM Package

```jsonc
{
  "compilerOptions": {
    // Emit settings
    "target": "ES2022",           // Node 22+ supports ES2022 fully
    "module": "NodeNext",         // or "ES2022" -- NodeNext is safest for Node packages
    "moduleResolution": "NodeNext", // Correct resolution for Node.js ESM

    // Strictness
    "strict": true,
    "verbatimModuleSyntax": true, // Enforces explicit `type` for type-only imports
    "isolatedDeclarations": true, // Enables faster .d.ts generation by external tools

    // Output
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // Module behavior
    "resolveJsonModule": true,
    "esModuleInterop": true,      // Required in TS 6.0+

    // Skip emit if using a bundler
    // "noEmit": true
  },
  "include": ["src"]
}
```

**Notes:**
- `"module": "NodeNext"` is preferred over `"ESNext"` for Node.js packages because it enforces Node.js module resolution rules (file extensions required, etc.)
- `"target": "ES2022"` covers Node 22+ features (top-level await, private class fields, etc.). Use `"ES2025"` if targeting Node 24+ only.
- `"moduleResolution": "bundler"` is an alternative if you use a bundler like tsup/tsdown (less strict about extensions)
- `"isolatedDeclarations": true` is recommended when using tsup/tsdown for .d.ts generation (enables parallel type generation)

---

## 3. Build Tools

### tsup

| Property | Value |
|----------|-------|
| **Current Version** | 8.5.1 (released Nov 12, 2025) |
| **Weekly Downloads** | ~4-6M |
| **Engine** | esbuild |
| **Status** | **Maintenance mode -- not actively maintained** |
| **Successor** | tsdown |

**ESM Support:**
- Excellent. Generates ESM + CJS + `.d.ts` in one command
- `tsup src/index.ts --format esm,cjs --dts`
- Handles `"type": "module"` packages correctly

**Multiple Entry Points (SDK + CLI):**
- Yes, supports multiple entry points: `tsup src/index.ts src/cli.ts`
- Can configure different formats per entry point via `tsup.config.ts`

**Bundle Size / Tree-shaking:**
- esbuild provides fast transpilation with basic tree-shaking
- Tree-shaking is less thorough than Rollup-based tools (unbuild, tsdown)

**Known Issues:**
- **No longer actively maintained** -- the README now has a deprecation warning recommending tsdown
- 392 open issues on GitHub
- `.d.ts` generation can be slow for large projects (uses rollup-plugin-dts under the hood)
- Some edge cases with complex TypeScript generics in declaration generation

**Verdict:** Still works perfectly fine for production. Massive adoption, well-tested. But no new features or active development. Consider tsdown for new projects.

### tsdown (successor to tsup)

| Property | Value |
|----------|-------|
| **Current Version** | 0.20.0-beta.4 (published ~Mar 11, 2026); latest non-beta referenced is ~0.21.0 |
| **Weekly Downloads** | ~620K |
| **Engine** | Rolldown (Rust-based, from Vite ecosystem) |
| **GitHub** | github.com/rolldown/tsdown (3,558 stars) |
| **Status** | **Active development, pre-1.0** |

**Key Features:**
- 3-5x faster than tsup (Rust-based Rolldown engine)
- tsup-compatible API and migration path (`npx tsdown migrate`)
- ESM + CJS + `.d.ts` generation (powered by Oxc for declarations)
- Supports Rollup, Rolldown, unplugin plugins, and some Vite plugins
- Code splitting and tree-shaking
- Multiple entry points supported

**Maturity Concerns:**
- Still in v0.x (pre-1.0), meaning API may have breaking changes
- Smaller community than tsup (620K vs 4-6M weekly downloads)
- Some users report rough edges in edge cases

**Migration from tsup:**
```bash
npx tsdown migrate  # Auto-converts tsup.config.ts
```

**Verdict:** Promising successor. Already used by Cloudflare (cloudflare/agents). For a new project in March 2026, it is a reasonable choice if you are comfortable with pre-1.0 software. The migration path from tsup is smooth, so starting with tsup and migrating later is also viable.

### tsc (Plain TypeScript Compiler)

**Is plain tsc still viable?**
Yes, absolutely. Dr. Axel Rauschmayer (2ality.com) uses plain `tsc` for his ESM packages and recommends it for simplicity.

**Pros:**
- Zero additional dependencies
- Guaranteed correct TypeScript output and `.d.ts` files
- Works perfectly for ESM-only packages: `"build": "tsc"`
- Type-checking + emit in one step (or separate with `--noEmit`)
- Stable, well-documented, no configuration drift

**Cons:**
- No bundling (outputs file-per-file, not a single bundle)
- No tree-shaking
- 45x slower than esbuild for transpilation
- No CJS/ESM dual output from a single command
- Larger `dist/` directory (mirrors source structure)

**When to use tsc alone:**
- ESM-only packages where you don't need bundling
- When you want the simplest possible build with zero bundler configuration
- When declaration generation from tsup/tsdown is causing issues

**Common pattern (tsc + bundler):**
- `tsc --noEmit` for type-checking only
- tsup/tsdown for transpilation + bundling
- This is the recommended "correct pattern" per PkgPulse's 2026 analysis

### tsx (TypeScript Execute)

| Property | Value |
|----------|-------|
| **Current Version** | 4.21.0 (released Nov 30, 2025) |
| **Weekly Downloads** | ~27-32M |
| **Engine** | esbuild |
| **Author** | Hiroki Osame |

**What it does:**
- **Development-time execution only** -- NOT a build tool
- Runs TypeScript files directly without a build step: `tsx ./script.ts`
- Enhanced Node.js with esbuild for on-the-fly transpilation
- Supports both CJS and ESM
- Compatible with all maintained Node.js versions

**Role in a production stack:**
- `devDependency` only
- Use in `package.json` scripts for development: `"dev": "tsx watch src/index.ts"`
- Use for running scripts, seeds, migrations: `tsx scripts/setup.ts`
- **Never used in production builds** -- the built output should be plain JS

**Verdict:** Essential development tool. Install as devDependency alongside your build tool. ~32M weekly downloads makes it the most popular TypeScript runner.

### unbuild

| Property | Value |
|----------|-------|
| **Current Version** | 3.6.1 |
| **Weekly Downloads** | ~170K (npm) / ~3M (per PkgPulse, possibly including CDN) |
| **Engine** | Rollup |
| **Ecosystem** | UnJS (Nuxt, Nitro, H3) |

**Key Features:**
- Automated config from `package.json`
- Stub mode (`unbuild --stub`) -- serves source files directly during development, no rebuild needed
- Generates CJS + ESM + `.d.ts`
- Security checks for missing/unused dependencies
- Bundleless mode (file-to-file transpilation via mkdist)

**How it compares to tsup:**
- Slower builds (Rollup-based vs esbuild)
- Better tree-shaking (Rollup advantage)
- Stub mode is unmatched for monorepo DX
- Primarily used within UnJS/Nuxt ecosystem

**Note:** unbuild team is experimenting with **obuild** (next-gen successor based on Rolldown).

**Verdict:** Best for UnJS/Nuxt ecosystem projects or monorepos where stub mode matters. For a standalone SDK + CLI package, tsup or tsdown is a better fit.

---

## 4. ESM Strategy

### Should you go ESM-only?

**Yes, for new packages in March 2026.** Here is why:

1. **`require(esm)` is now stable** -- marked stable in Node.js 25.4.0 (Jan 2026), available by default in Node 22.12.0+, Node 24, and Node 20 (backported). CJS consumers can `require()` your ESM package without errors.

2. **No dual CJS/ESM needed** -- The main reason for dual publishing was that CJS code could not `require()` ESM modules. This barrier is gone across all maintained LTS versions.

3. **Simpler configuration** -- One output format, one set of entry points, no conditional exports complexity.

### Recommended package.json for ESM-only package

```jsonc
{
  "name": "your-sdk",
  "version": "1.0.0",
  "type": "module",                    // YES, use this
  "engines": {
    "node": ">=22"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",    // Types first for TS resolution
      "import": "./dist/index.js"      // ESM entry
    },
    "./cli": {
      "types": "./dist/cli.d.ts",
      "import": "./dist/cli.js"
    }
  },
  "main": "./dist/index.js",           // Fallback for older tools
  "types": "./dist/index.d.ts",
  "bin": {
    "your-cli": "./dist/cli.js"
  },
  "files": ["dist"]
}
```

### File Extensions in Imports

**Use `.js` extensions in TypeScript source files** when using `"module": "NodeNext"`:

```typescript
// src/utils.ts
export function helper() { /* ... */ }

// src/index.ts
import { helper } from './utils.js';  // YES, .js even though source is .ts
```

This is required by Node.js ESM resolution and enforced by `"moduleResolution": "NodeNext"`. TypeScript resolves `.js` imports to the corresponding `.ts` file during compilation.

**Alternative:** If using `"moduleResolution": "bundler"` (with tsup/tsdown), you can omit extensions. The bundler handles resolution. But `NodeNext` is stricter and more correct for Node.js packages.

### Should you use `"type": "module"`?

**Yes.** This makes `.js` files default to ESM interpretation. Without it, you would need `.mjs` extensions for all files, which is less conventional.

### ESM-only or Dual CJS/ESM?

**ESM-only is now the recommended approach for new packages**, given:
- `require(esm)` is stable across all active Node LTS versions
- Major packages are shipping ESM-only (trend accelerating in 2025-2026)
- Dual publishing adds complexity (conditional exports, potential dual-package hazard)
- Dr. Axel Rauschmayer's 2ality guide (Feb 2025) explicitly recommends ESM-only for packages that "can afford to ignore backward compatibility"

**When you might still need dual CJS/ESM:**
- If you need to support Node.js < 20 (which you shouldn't for new packages)
- If your consumers are using very old bundlers that don't understand ESM
- Enterprise environments locked to ancient toolchains

---

## 5. Recommended Stack for a TypeScript SDK + CLI

### Build
```
tsup (or tsdown if comfortable with pre-1.0)
  - Entry: src/index.ts (SDK) + src/cli.ts (CLI)
  - Format: ESM only
  - DTS: --dts for declaration generation
  - Type check: tsc --noEmit (separate step)
```

### Development
```
tsx         - Run TypeScript directly during development
vitest      - Testing (if needed)
tsc --noEmit - Type checking in CI and pre-commit
```

### tsup.config.ts example
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
  splitting: false,  // Typically false for Node.js libraries
});
```

---

## Sources

### Node.js
- [Node.js Release Schedule](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule) - Official blog, March 10, 2026
- [Node.js End of Life Dates](https://endoflife.date/nodejs) - Community tracker, updated March 12, 2026
- [Node.js 24 Becomes LTS](https://nodesource.com/blog/nodejs-24-becomes-lts/) - NodeSource, October 2025
- [Node.js v22 to v24 Migration Guide](https://nodejs.org/en/blog/migrations/v22-to-v24) - Official, October 2025
- [Node.js 25.4.0 Ships with Stable require(esm)](https://socket.dev/blog/node-js-25-4-0-ships-with-stable-require-esm) - Socket.dev, January 2026
- [Node.js 22 Release Announcement](https://nodejs.org/en/blog/announcements/v22-release-announce) - Official, April 2024

### TypeScript
- [Announcing TypeScript 5.7](https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/) - Microsoft, November 22, 2024
- [Announcing TypeScript 5.8](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8-rc/) - Microsoft, February 28, 2025
- [Announcing TypeScript 5.9](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/) - Microsoft, August 1, 2025
- [Announcing TypeScript 6.0 RC](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0-rc/) - Microsoft, March 6, 2026
- [TypeScript on npm](https://www.npmjs.com/package/typescript) - npm registry (shows 5.9.3 as latest stable)

### Build Tools
- [tsup on npm](https://www.npmjs.com/package/tsup) - v8.5.1, ~4-6M weekly downloads, maintenance mode
- [tsup on GitHub](https://github.com/egoist/tsup) - 11.2K stars, 392 open issues
- [tsdown on npm](https://www.npmjs.com/package/tsdown) - v0.20.0-beta.4, ~620K weekly downloads
- [tsx on npm](https://www.npmjs.com/package/tsx) - v4.21.0, ~27-32M weekly downloads
- [unbuild on npm](https://www.npmjs.com/package/unbuild) - v3.6.1, ~170K weekly downloads
- [tsup vs tsdown vs unbuild (2026)](https://www.pkgpulse.com/blog/tsup-vs-tsdown-vs-unbuild-typescript-library-bundling-2026) - PkgPulse, March 2026
- [Best TypeScript-First Build Tools 2026](https://www.pkgpulse.com/blog/best-typescript-build-tools-2026) - PkgPulse, March 2026

### ESM Strategy
- [Tutorial: publishing ESM-based npm packages with TypeScript](https://2ality.com/2025/02/typescript-esm-packages.html) - Dr. Axel Rauschmayer, February 2025
- [TypeScript in 2025 with ESM and CJS npm publishing](https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing) - Liran Tal, January 2025
- [CJS/ESM Interop and Dual Packages](https://www.thenodebook.com/modules/cjs-esm-interop) - TheNodeBook, February 2026

---

## Confidence Assessment

- **Node.js version data:** HIGH -- sourced from official nodejs.org blog, endoflife.date (community standard), and npm release tags
- **TypeScript version data:** HIGH -- sourced from official Microsoft DevBlogs and npm registry
- **Build tool versions:** HIGH -- sourced directly from npm registry pages
- **ESM strategy recommendations:** HIGH -- strong consensus across multiple authoritative sources (2ality, Node.js core contributors, Socket.dev)
- **tsdown maturity assessment:** MEDIUM -- still pre-1.0 and evolving rapidly; version numbers may shift quickly. The recommendation to use tsup as the safe default is well-supported, but the tsdown trajectory is clear.

### Areas of Uncertainty
- TypeScript 6.0 GA date of March 17, 2026 was stated in InfoWorld but could slip
- tsdown version numbering is volatile (0.20-beta.4 on npm, references to 0.21.0 in dependent packages)
- The unbuild download numbers vary significantly between sources (170K on npm vs 3M claimed by PkgPulse -- possibly different measurement methodologies)
