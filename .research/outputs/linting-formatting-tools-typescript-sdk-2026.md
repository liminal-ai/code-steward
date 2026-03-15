# Linting & Formatting Tools for a TypeScript SDK Package (March 2026)

## Summary

The TypeScript linting/formatting landscape has shifted significantly. **Biome v2.x** has matured into a production-ready, all-in-one tool that replaces both ESLint and Prettier with a single zero-dependency Rust binary. Meanwhile, **ESLint v10** just shipped (February 2026) with flat config as the only option, and **oxlint** reached 1.0 stable with a JS plugins alpha. For a new TypeScript SDK package prioritizing minimal configuration, speed, and low dependency count, **Biome is the recommended choice**, with oxlint as an emerging alternative to watch.

---

## 1. Biome

### Current Version
- **@biomejs/biome v2.4.7** (March 5, 2026)
- npm: https://www.npmjs.com/package/@biomejs/biome
- Weekly downloads: ~5.5M (growing rapidly)
- GitHub: https://github.com/biomejs/biome (24K+ stars)
- License: MIT OR Apache-2.0

### TypeScript Support Quality
- **First-class TypeScript support.** Biome parses TS, TSX, JSX, JS natively with its own Rust-based parser.
- Handles all modern TypeScript syntax including decorators, satisfies, const type parameters, and template literal types.
- Since Biome v2, includes its own **type inference engine** (sponsored by Vercel) that powers type-aware lint rules *without* requiring `tsc` or a running TypeScript compiler. This is a significant differentiator.
- Type-aware rules include `noFloatingPromises`, `noUnresolvedImports`, and others.

### Does It Fully Replace ESLint + Prettier?
- **Formatter**: 97%+ Prettier-compatible. Covers JS, TS, JSX, TSX, JSON, JSONC, CSS, GraphQL. For a TypeScript SDK, this is complete coverage.
- **Linter**: 459 rules across 8 categories (Accessibility, Complexity, Correctness, Nursery, Performance, Security, Style, Suspicious). Many rules map 1:1 to ESLint and typescript-eslint equivalents.
- **For an SDK/library project**, Biome covers the vast majority of what you'd configure in ESLint + Prettier. The main gap is if you need highly specialized ESLint plugins (e.g., framework-specific rules for React, Angular, etc.), which is irrelevant for a Node.js SDK.

### Missing Features vs ESLint
- **Plugin ecosystem is smaller.** Biome has GritQL-based plugins (stable since v2) for custom pattern-matching rules, and a WASM plugin system is in active development (PR open March 2026). However, it does not match ESLint's 4000+ community plugins.
- **No YAML/TOML formatting** (not relevant for a TS SDK).
- **Some niche typescript-eslint rules** may not have Biome equivalents yet, though coverage is extensive and growing with every release.
- For an SDK project, none of these gaps are likely to matter.

### Plugin Support / Custom Rules
- **GritQL plugins** (stable): Write pattern-matching rules in `.grit` files. Good for simple custom rules.
- **WASM Component Model plugins** (in development, behind feature flag): Write custom rules in Rust compiled to WASM. Near-native speed, full AST access. PR opened March 8, 2026.
- **JS plugins**: Not available in Biome (this is an oxlint feature).
- For most SDK projects, GritQL plugins are sufficient for any custom rules you'd need.

### Configuration Format
- Single **`biome.json`** (or `biome.jsonc`) file.
- Zero-config works out of the box with sensible defaults.
- Minimal config example for a TypeScript SDK:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.7/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "semicolons": "always",
      "quoteStyle": "single"
    }
  }
}
```

### Import Sorting
- **Full import sorting/organizing support** since Biome v2.
- Supports custom import groups, import merging, bare import sorting, and export organizing.
- Configured via `organizeImports` in `biome.json` or the newer `assist.actions.source.organizeImports` in v2.4+.
- Supports custom group ordering (e.g., node builtins first, then npm packages, then local imports with blank line separators).

### Speed
- **56x faster than ESLint** for linting 10K files (~0.8s vs ~45s).
- **20-100x faster than Prettier** for formatting.
- Single-pass architecture: parses once, runs both linting and formatting.

### Editor Integration
- **VS Code**: Official extension `biomejs.biome` on VS Marketplace and Open VSX. Supports format-on-save, lint diagnostics, quick fixes.
- **JetBrains IDEs**: Built-in Biome support since 2024.
- **Neovim**: LSP support via Biome's built-in language server.
- **Zed**: Built-in support.
- The editor experience is mature and reliable.

### Known Issues / Limitations for SDK Projects
- 97% Prettier compatibility means ~3% of edge cases may format differently. In practice, this is rarely noticeable and the Biome team actively closes gaps.
- If you later need a highly specialized ESLint plugin that has no Biome equivalent, you'd need to either write a GritQL plugin or run ESLint alongside Biome for just that rule.
- Biome's type inference is not a full TypeScript compiler - it covers common patterns needed for lint rules but is not a substitute for `tsc` type checking.

---

## 2. ESLint + Prettier

### ESLint Current Version
- **ESLint v10.0.3** (March 6, 2026)
- npm: https://www.npmjs.com/package/eslint
- ESLint v10.0.0 released February 6, 2026. It is stable.
- **Flat config only** - legacy `.eslintrc` support completely removed in v10.
- Requires Node.js ^20.19.0 || ^22.13.0 || >=24.
- v9.x still receives maintenance patches (v9.39.4) for those not ready to upgrade.

### Prettier Current Version
- **Prettier v3.8.1** (January 2026)
- npm: https://www.npmjs.com/package/prettier
- Weekly downloads: ~77M
- v4.0 is in alpha (v4.0.0-alpha.13, November 2025) - not production-ready.

### typescript-eslint Current Version
- **typescript-eslint v8.57.0** (March 9, 2026)
- npm: https://www.npmjs.com/package/typescript-eslint
- **Supports ESLint ^8.57.0 || ^9.0.0 || ^10.0.0** - full ESLint 10 compatibility confirmed.
- TypeScript support: versions less than 2 years old.

### eslint-config-prettier — Still Needed?
- **Yes, still needed** when combining ESLint + Prettier.
- Latest: v10.1.8 (July 2025).
- npm: https://www.npmjs.com/package/eslint-config-prettier
- It disables ESLint rules that conflict with Prettier formatting. Without it, you get formatting ping-pong between the two tools.

### Configuration Complexity
For a new TypeScript SDK project, the ESLint + Prettier stack requires:

**Packages to install (minimum 5-6):**
```
eslint
@eslint/js
typescript-eslint (or @typescript-eslint/parser + @typescript-eslint/eslint-plugin)
prettier
eslint-config-prettier
```

**Config files needed (minimum 2):**
1. `eslint.config.mjs` (flat config)
2. `.prettierrc` (or equivalent)

**Minimal eslint.config.mjs for TypeScript SDK:**
```js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    ignores: ["dist/", "node_modules/"],
  }
);
```

### Simplified Setups
- The `typescript-eslint` package now provides a `tseslint.config()` helper that simplifies flat config setup.
- ESLint v10's file-based config lookup is better for monorepos.
- But you still need multiple packages and config files. There is no "single package" solution in the ESLint world.

---

## 3. Other Options

### oxlint (Oxc Linter)
- **oxlint v1.0 stable** released June 10, 2025. Current version ~v1.50.0.
- npm: https://www.npmjs.com/package/oxlint
- Part of the Oxc project (VoidZero team, same people behind Vite).
- **650+ built-in lint rules** implemented in Rust.
- **JS Plugins Alpha** (March 10, 2026): ESLint-compatible plugin API. Can run existing ESLint plugins within oxlint. The team claims 80% of ESLint users can now switch.
- **50-100x faster than ESLint**, ~2x faster than Biome for linting.
- Used by Shopify, Airbnb, Mercedes-Benz in production.
- **No built-in formatter** - needs to be paired with oxfmt (or Prettier/Biome formatter).
- Config via `.oxlintrc.json`.

### oxfmt (Oxc Formatter)
- **oxfmt beta** released February 24, 2026.
- 30x faster than Prettier, 3x faster than Biome formatter.
- Prettier-compatible output.
- Supports import sorting (added in beta).
- Tailwind CSS class sorting support.
- **Still in beta** - not yet recommended for production unless you're comfortable with potential breaking changes.

### oxlint + oxfmt Together
- This is the emerging "Oxc stack": two tools instead of one, but both are Rust-native and extremely fast.
- Combined, they replace ESLint + Prettier.
- The JS plugins alpha means you can run custom ESLint plugins, which is a significant advantage over Biome's plugin story.
- **Status: usable but still maturing.** oxlint is stable; oxfmt is beta. Adoption is growing fast (MakerKit, Vue.js core, Vercel Turborepo have migrated).

### dprint
- **dprint v0.52.0** (February 25, 2026).
- **@dprint/typescript v0.95.15** (February 2, 2026).
- npm: https://www.npmjs.com/package/dprint
- Weekly downloads: ~150K (dprint), ~47K (@dprint/typescript).
- Rust-based, plugin-oriented formatter. Used heavily by the Deno project.
- **Formatter only** - no linting. Would still need ESLint or another linter.
- Less widely adopted than Biome or Prettier. Smaller community.
- Not recommended as a primary choice for a new project unless you have specific formatting needs that Biome/Prettier don't cover.

---

## 4. Comparison Matrix

| Criteria | Biome | ESLint+Prettier | oxlint+oxfmt | dprint |
|---|---|---|---|---|
| **Latest Version** | 2.4.7 | ESLint 10.0.3 + Prettier 3.8.1 | oxlint ~1.50 + oxfmt beta | 0.52.0 |
| **devDependencies** | 1 | 5-6 minimum | 2 | 2+ (still need linter) |
| **Config Files** | 1 (biome.json) | 2-3 | 1-2 | 1+ (still need linter config) |
| **TypeScript-first** | Yes (native parser + type inference) | Via typescript-eslint | Yes (native parser) | Formatter only |
| **Linting** | 459 rules | 300+ core + thousands via plugins | 650+ built-in | None |
| **Formatting** | Built-in (97% Prettier compat) | Prettier (separate tool) | oxfmt beta (Prettier compat) | Yes (plugin-based) |
| **Import Sorting** | Built-in (advanced) | Needs plugin | oxfmt beta has it | Via plugin |
| **Speed (lint 10K files)** | ~0.8s | ~45s | ~0.3-1.3s | N/A |
| **Speed (format)** | ~20-100x Prettier | Baseline | ~30x Prettier | Fast |
| **Plugin Ecosystem** | GritQL + WASM (developing) | 4000+ community plugins | ESLint-compatible (alpha) | Wasm plugins |
| **ESM Support** | Native | Yes (flat config is ESM) | Yes | Yes |
| **VS Code Extension** | Official, mature | Official, mature | Official, maturing | Community |
| **Stability** | Stable (v2, actively developed) | Battle-tested | Stable (linter) / Beta (formatter) | Stable |
| **npm Weekly DLs** | 5.5M | 79M (ESLint) + 77M (Prettier) | Growing rapidly | 150K |

---

## 5. Recommendation

### For a New TypeScript SDK Package: **Biome**

**Primary recommendation: Biome v2.x**

Rationale against each criteria:

1. **Minimal configuration**: Single `biome.json` file. Works with zero config. One `npm install` command.
2. **TypeScript-first**: Native TypeScript parser and type inference engine. No separate parser package needed.
3. **Fast**: 56x faster than ESLint for linting. 20-100x faster than Prettier for formatting. This matters especially with AI-assisted development (Claude Code, Cursor) where lint/format cycles happen constantly.
4. **Works well with ESM**: Native ESM support. No configuration gymnastics needed.
5. **Good editor integration**: Mature VS Code extension, JetBrains support, Neovim LSP.
6. **Minimal devDependencies**: Exactly 1 package (`@biomejs/biome`). Zero transitive dependencies. Compare with ESLint + Prettier which pulls in 127+ packages.

**Additional advantages for an SDK project:**
- Import sorting built-in (no extra plugin needed).
- `noImportCycle` rule for catching circular dependencies (important for libraries).
- The `domains` feature auto-detects your project type from `package.json`.
- Single binary means CI is fast and reproducible.

### Setup for Your SDK

```bash
npm install --save-dev @biomejs/biome
npx @biomejs/biome init
```

That's it. One command to install, one to generate config.

**Recommended package.json scripts:**
```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "ci": "biome ci ."
  }
}
```

### When NOT to Choose Biome

Choose ESLint + Prettier instead if:
- You need a specific ESLint plugin that has no Biome equivalent and cannot be replicated via GritQL.
- Your organization has standardized on ESLint configurations shared across many projects.
- You need the absolute widest community support and Stack Overflow answers for troubleshooting.

### Honorable Mention: Watch oxlint + oxfmt

The Oxc toolchain (oxlint + oxfmt) is worth monitoring. It is even faster than Biome, and the JS plugins alpha means ESLint plugin compatibility. However:
- oxfmt is still in beta.
- The combined solution requires two tools, not one.
- The ecosystem is newer and less documented.

For a project starting today, Biome is the safer and more ergonomic choice. If you revisit this decision in 6 months, oxlint + oxfmt may have closed the gap.

---

## Sources

- [@biomejs/biome on npm](https://www.npmjs.com/package/@biomejs/biome) - v2.4.7, official package
- [Biome Roadmap 2026](https://biomejs.dev/blog/roadmap-2026/) - Official blog, Jan 2026
- [Biome Linter Documentation](https://biomejs.dev/linter/) - 459 rules, official docs
- [ESLint v10.0.0 Release Notes](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/) - Official blog, Feb 2026
- [ESLint v10.0.3 Release Notes](https://eslint.org/blog/2026/03/eslint-v10.0.3-released/) - Official blog, Mar 2026
- [typescript-eslint Dependency Versions](https://typescript-eslint.io/users/dependency-versions) - ESLint 10 support confirmed
- [typescript-eslint v8.57.0 Release](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.57.0) - GitHub, Mar 2026
- [Prettier v3.8.1 on npm](https://www.npmjs.com/package/prettier) - Official package
- [eslint-config-prettier on GitHub](https://github.com/prettier/eslint-config-prettier) - v10.1.8, still maintained
- [Oxlint v1.0 Stable](https://oxc.rs/blog/2025-06-10-oxlint-stable) - Official blog, Jun 2025
- [Oxlint JS Plugins Alpha](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha) - Official blog, Mar 2026
- [Oxfmt Beta](https://oxc.rs/blog/2026-02-24-oxfmt-beta) - Official blog, Feb 2026
- [dprint on npm](https://www.npmjs.com/package/dprint) - v0.52.0, official package
- [ESLint vs Biome in 2026 (PkgPulse)](https://www.pkgpulse.com/blog/eslint-vs-biome-2026) - Independent comparison, Feb 2026
- [OXC vs ESLint vs Biome (PkgPulse)](https://www.pkgpulse.com/blog/oxc-vs-eslint-vs-biome-javascript-linting-2026) - Independent comparison, Mar 2026
- [Biome WASM Plugin System PR](https://github.com/biomejs/biome/pull/9399) - GitHub, Mar 2026

## Confidence Assessment

- **Overall confidence: High.** Version numbers, feature sets, and ecosystem status are well-documented from official sources.
- **Area of uncertainty**: Biome's exact rule-for-rule coverage compared to typescript-eslint. The Biome team maintains a rules source mapping page, but new typescript-eslint rules may take time to get Biome equivalents.
- **Area of uncertainty**: oxlint JS plugins alpha stability. The "80% of ESLint users can switch" claim is from the oxlint team and has not been independently verified at scale.
- **No further research needed** for the decision at hand. The data clearly supports Biome for a new TypeScript SDK package.
