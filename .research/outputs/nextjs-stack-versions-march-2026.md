# Next.js Stack Versions & Recommendations - March 2026

Research conducted: 2026-03-15

---

## Summary

As of March 2026, **Next.js 16.1.6** is the latest stable release (on npm as `next@latest`). **Tailwind CSS v4.2.1** is the latest stable version. **shadcn/ui** works with both Next.js 16 and Tailwind v4, with all components updated for this stack. The recommended scaffolding command is `npx create-next-app@latest my-app --yes`, which defaults to TypeScript, Tailwind CSS, ESLint, App Router, and Turbopack with no additional flags needed.

Next.js 16 is production-ready and has been stable since October 2025, with 16.1 (Dec 2025) and subsequent patches adding polish. However, there are meaningful breaking changes from Next.js 15, and a few known issues in 16.1.6 worth noting. For a demo/prototype, Next.js 16 is the right choice -- it is the current default and all tooling targets it.

---

## 1. Latest Stable Versions (Concrete Numbers)

| Package | Latest Stable | npm Tag | Notes |
|---------|--------------|---------|-------|
| `next` | **16.1.6** | `latest` | Released ~Jan 27, 2026 |
| `next` (v15 LTS) | **15.5.12** | backport branch | Still receiving bug-fix backports |
| `react` | **19.2.0** | `latest` | Ships with Next.js 16 |
| `tailwindcss` | **4.2.1** | `latest` | Released ~Feb 23, 2026 |
| `tailwindcss` (v3 LTS) | **3.4.19** | `v3-lts` | Maintenance-only |
| `shadcn` (CLI) | **latest** | `latest` | Use `npx shadcn@latest` |
| `next` (canary) | **16.2.0-canary.99** | `canary` | Active development |

---

## 2. Next.js 16 vs 15 vs 14

### Next.js 16 (Current Stable - Released Oct 21, 2025)

**Key new features:**
- **Turbopack is the default bundler** for all apps (dev and build). 2-5x faster builds, up to 10x faster Fast Refresh
- **React 19.2** with View Transitions, `useEffectEvent()`, `<Activity/>` component
- **Cache Components** -- new explicit caching model using `"use cache"` directive and Partial Pre-Rendering (PPR). Caching is now entirely opt-in (no more aggressive implicit caching)
- **`proxy.ts` replaces `middleware.ts`** -- clearer naming for the network boundary. `middleware.ts` still works but is deprecated
- **React Compiler support (stable)** -- automatic memoization, opt-in via `reactCompiler: true` in next.config
- **Enhanced routing** -- layout deduplication (shared layouts downloaded once), incremental prefetching
- **New caching APIs** -- `updateTag()`, `refresh()`, refined `revalidateTag()` with required `cacheLife` profile
- **Next.js DevTools MCP** -- AI-assisted debugging integration
- **`next lint` removed** -- use ESLint or Biome directly; `next build` no longer runs linting

**Breaking changes from Next.js 15:**
- **Node.js 20.9+ required** (Node 18 dropped)
- **TypeScript 5.1+ required**
- **Async params/searchParams** -- `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` all require `await`
- **AMP support fully removed**
- **`serverRuntimeConfig`/`publicRuntimeConfig` removed** -- use `.env` files
- **Parallel routes require explicit `default.js`** -- builds fail without them
- **`next/image` changes** -- local src with query strings requires `images.localPatterns` config; default cache TTL changed to 4 hours; default qualities changed to `[75]`
- **`revalidateTag()` signature changed** -- now requires cacheLife profile as second argument
- **Turbopack config moved** from `experimental.turbopack` to top-level `turbopack`
- **`experimental.dynamicIO` renamed** to `cacheComponents`
- **`experimental.ppr` flag removed** -- replaced by Cache Components model

### Next.js 15 (Previous Major - LTS Backports)

- Latest backport: **15.5.12** (Feb 2026)
- Still receiving security fixes and critical bug fixes
- Uses React 19 (not 19.2)
- Webpack default, Turbopack optional
- `middleware.ts` (not deprecated)
- Implicit caching model

### Next.js 14

- Uses React 18
- Webpack only (Turbopack dev-only beta)
- Synchronous params/cookies/headers
- Legacy at this point -- no longer recommended for new projects

### Recommendation

**Use Next.js 16 for new projects.** It is the current stable release, all tooling (create-next-app, shadcn, etc.) targets it, and the ecosystem has had 5+ months to stabilize. Next.js 15 is only relevant if you have an existing project that cannot absorb the breaking changes yet.

---

## 3. Tailwind CSS v4

### Status: Stable and Production-Ready

Tailwind CSS v4.0 was released in **January 2025** (over a year ago). The current latest is **v4.2.1** (Feb 2026). It is fully stable.

### Key Changes from v3

| Aspect | Tailwind v3 | Tailwind v4 |
|--------|------------|------------|
| Configuration | `tailwind.config.ts` (JavaScript) | `@theme` in CSS (CSS-first) |
| Build tool | PostCSS plugin (`tailwindcss`) | New `@tailwindcss/postcss` package |
| Import syntax | Three `@tailwind` directives | Single `@import "tailwindcss"` |
| Content detection | Manual `content` array in config | Automatic (no config needed) |
| Dark mode | `darkMode: 'class'` in config | `@custom-variant dark` in CSS |
| Performance | Fast | 5x faster (Oxide engine, written in Rust) |
| CSS variables | Optional | Native, first-class |
| Colors | HSL | OKLCH |
| Browser support | Broad | Modern only: Safari 16.4+, Chrome 111+, Firefox 128+ |

### Setup with Next.js 16

No manual setup needed. `create-next-app` with Tailwind selected installs Tailwind v4 automatically with the correct `@tailwindcss/postcss` plugin. The generated `globals.css` will use the new `@import "tailwindcss"` syntax.

**If setting up manually:**
```bash
npm install tailwindcss @tailwindcss/postcss
```

`postcss.config.mjs`:
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

`globals.css`:
```css
@import "tailwindcss";
```

No `tailwind.config.ts` needed. Theme customization goes in CSS:
```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.7 0.15 250);
  --font-sans: "Inter", sans-serif;
}
```

### v4.2 Additions (Feb 2026)

- Official `@tailwindcss/webpack` plugin (useful if you opt out of Turbopack)
- 4 new color palettes: mauve, olive, mist, taupe
- Complete logical properties support (`inset-s-*`, `inset-e-*`, `block-*`, `inline-*`, etc.)
- `font-features-*` utility

---

## 4. shadcn/ui

### Current Status

shadcn/ui has **full support for Tailwind v4 and React 19**. All components have been updated. 105K+ GitHub stars.

### Setup Process (Current Recommended)

**For a new project (simplest path):**
```bash
npx shadcn@latest init -t next
```
This creates a fully configured Next.js app with shadcn/ui, Tailwind v4, TypeScript, and App Router.

**For an existing Next.js project:**
```bash
npx shadcn@latest init
```
The CLI auto-detects your framework and configures accordingly.

**Adding components:**
```bash
npx shadcn@latest add button
npx shadcn@latest add card dialog
```

### What Changed for Tailwind v4 Compatibility

- HSL colors converted to **OKLCH**
- `tailwindcss-animate` replaced with **`tw-animate-css`**
- `default` style deprecated; new projects use **`new-york`** style
- `toast` component deprecated in favor of **`sonner`**
- `forwardRef` removed from all components (React 19 no longer needs it)
- All components have `data-slot` attributes for styling
- Full support for `@theme` directive and `@theme inline`

### Compatibility Notes

- **Non-breaking for existing projects**: If you have Tailwind v3 + React 18, shadcn continues to work. New components install in v3 format until you upgrade.
- **Monorepo gotcha**: There is an open issue (#6878) with Tailwind v4 classes missing when using shadcn components from a monorepo package. Tailwind v4's automatic content detection may not scan packages outside the main app directory. Workaround: add `@source` directives in CSS to point to the monorepo package paths.
- **VS Code IntelliSense**: Some users report Tailwind CSS IntelliSense not working after shadcn init. Fix: Change the file language mode from "CSS" to "Tailwind CSS" in VS Code.

---

## 5. Recommended create-next-app Command

### Simplest (Recommended)

```bash
npx create-next-app@latest my-app --yes
```

The `--yes` flag skips all prompts and uses these defaults:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: **Yes** (v4)
- App Router: **Yes**
- Turbopack: **Yes**
- Import alias: **`@/*`**

### With Interactive Prompts (for customization)

```bash
npx create-next-app@latest my-app
```

You will be asked:
```
Would you like to use the recommended Next.js defaults?
    Yes, use recommended defaults - TypeScript, ESLint, Tailwind CSS, App Router, Turbopack
    No, reuse previous settings
    No, customize settings - Choose your own preferences
```

If you choose "customize settings":
```
Would you like to use TypeScript? No / Yes
Which linter would you like to use? ESLint / Biome / None
Would you like to use React Compiler? No / Yes
Would you like to use Tailwind CSS? No / Yes
Would you like your code inside a `src/` directory? No / Yes
Would you like to use App Router? (recommended) No / Yes
Would you like to customize the import alias (`@/*` by default)? No / Yes
```

### With Individual Flags

```bash
npx create-next-app@latest my-app --ts --tailwind --eslint --app --turbopack
```

### Then Add shadcn/ui

```bash
cd my-app
npx shadcn@latest init
npx shadcn@latest add button card  # add components as needed
```

---

## 6. Known Gotchas and Issues

### Next.js 16.1.6 Specific Issues

1. **Memory leak in standalone mode (CRITICAL)** -- `ArrayBuffer`/`WriteWrap` retention causes OOM under traffic in standalone Docker deployments. Linear memory growth at ~5 MB/s. **Fixed in canary 16.2.0-canary.79** but NOT in any 16.x stable release yet. If deploying in standalone Docker, either use `next@canary` or monitor closely. (GitHub #90898, closed/resolved)

2. **`notFound()` crashes instead of rendering not-found page** -- In some dynamic route configurations with App Router, calling `notFound()` causes an application error instead of rendering the not-found page. Open issue. (GitHub #90837)

3. **Dev server memory overflow on invalid URLs** -- Entering a non-existent URL can cause the dev server to compile indefinitely until OOM. Reported on Next.js 16.0, may still affect 16.1.x. (GitHub #85290)

4. **`/_not-found` build failure** -- Some projects see "Functions cannot be passed directly to Client Components" error during prerendering of `/_not-found` after upgrading to 16. Related to passing function props to client components. (GitHub #85604, 11 thumbs up)

5. **React Compiler `useMemoCache` errors** -- Third-party libraries (e.g., Sanity Studio) that haven't updated for React 19.2 may crash with `Cannot read properties of null (reading 'useMemoCache')`. Not a Next.js bug per se, but triggered by the React version it ships. (GitHub sanity-io/sanity#12346)

### Tailwind v4 Issues

- **Browser support is modern-only**: Safari 16.4+, Chrome 111+, Firefox 128+. If you need older browsers, stay on Tailwind v3.4.x (`v3-lts` tag).
- **`tailwind.config.ts` no longer used**: Existing configs must be migrated to CSS `@theme` directives. The automated tool (`npx @tailwindcss/upgrade`) handles ~90% of cases.
- **Some shadcn utility classes may appear broken** after installation if VS Code language mode is set to "CSS" instead of "Tailwind CSS".

### shadcn/ui Issues

- **Monorepo class detection**: Tailwind v4 may not detect classes in packages outside the main app. Add `@source` directives.
- **Dark mode with `next-themes`**: Some users report `DOMTokenList.add: The token cannot contain whitespace` errors. Usually a configuration issue with the theme attribute.

### Should You Use an Older Version for a Demo/Prototype?

**No.** For a new demo/prototype in March 2026:
- **Use Next.js 16.1.6** (current stable). The issues above are edge cases, mostly affecting standalone Docker deployments or unusual routing configurations.
- **Use Tailwind v4.2.1**. Fully stable for over a year.
- **Use shadcn/ui latest**. Well-tested with this stack.
- The only scenario where Next.js 15 would be preferable is if you depend on a third-party library that hasn't updated for React 19.2 (check your specific dependencies).
- If you need Webpack plugins that don't have Turbopack equivalents, pass `--webpack` to next commands, but this is rare for new projects.

---

## Sources

- [Next.js npm package](https://www.npmjs.com/package/next) -- npm registry, shows 16.1.6 as latest
- [Next.js Docs: Installation](https://nextjs.org/docs/app/getting-started/installation) -- Official docs, version 16.1.6
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) -- Official release announcement, Oct 21 2025
- [Next.js 16.1 Blog Post](https://nextjs.org/blog/next-16-1) -- Dec 18, 2025
- [Next.js Blog Index](https://nextjs.org/blog) -- Shows latest posts through Feb 2026
- [Next.js GitHub Releases](https://github.com/vercel/next.js/releases) -- Canary at 16.2.0-canary.99
- [Tailwind CSS npm](https://www.npmjs.com/package/tailwindcss) -- 4.2.1 latest, 3.4.19 v3-lts
- [Tailwind CSS Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) -- Official v3-to-v4 migration
- [shadcn/ui Tailwind v4 Docs](https://ui.shadcn.com/docs/tailwind-v4) -- Official compatibility page
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) -- Official setup guide
- [Next.js 15 vs 16 Comparison](https://www.descope.com/blog/post/nextjs15-vs-nextjs16) -- Descope blog, Feb 2026
- [Releasebot: Next.js releases](https://releasebot.io/updates/vercel/next-js) -- Shows 15.5.12 backport
- [GitHub Issue #90898](https://github.com/vercel/next.js/issues/90898) -- Memory leak in 16.1.6 standalone
- [GitHub Issue #90837](https://github.com/vercel/next.js/issues/90837) -- notFound() crash
- [GitHub Issue #85604](https://github.com/vercel/next.js/issues/85604) -- /_not-found build failure
- [GitHub Issue #85290](https://github.com/vercel/next.js/issues/85290) -- Dev server OOM on invalid URLs
- [shadcn/ui GitHub Issue #6878](https://github.com/shadcn-ui/ui/issues/6878) -- Monorepo Tailwind v4 class detection

## Confidence Assessment

- **Overall confidence: HIGH** -- Version numbers are confirmed across npm registry, official docs, and GitHub releases. Multiple independent sources corroborate all findings.
- **Areas of certainty**: Version numbers, breaking changes, setup commands, feature lists -- all from official sources.
- **Areas of moderate confidence**: The severity/prevalence of the known issues. The memory leak (#90898) is well-documented and confirmed fixed in canary, but the other issues have fewer reports and may affect limited configurations.
- **Recommendation**: No further research needed for project scaffolding decisions. If specific third-party library compatibility is a concern, check those libraries' GitHub issues for React 19.2 / Next.js 16 compatibility.
