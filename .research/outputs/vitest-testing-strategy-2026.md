# Vitest Testing Strategy for TypeScript SDK + CLI

**Research Date**: 2026-03-15
**Scope**: Test framework selection and configuration for a TypeScript SDK package (Node.js, ESM) that uses Claude Agent SDK, shells out to Python, and needs heavy fixture-based testing.

---

## Summary

Vitest is the clear best choice for this project. It is the dominant modern test runner for new TypeScript/Node.js projects in 2026, with native ESM support, first-class TypeScript handling (no compilation step), and a mocking system specifically designed for ESM modules. The latest stable release is **v4.1.0** (released March 12, 2026), running on Vite 6+. It handles all the required patterns: module-level mocking via `vi.mock()`, subprocess mocking, fixture-based testing with custom test contexts, async patterns, and snapshot testing. Coverage is built-in via `@vitest/coverage-v8`.

Jest 30.x (latest: v30.3.0, March 2026) has improved but ESM mocking still requires the `--experimental-vm-modules` flag and is officially documented as incomplete. Node.js built-in `node:test` is production-stable but lacks watch mode, snapshot testing, and the DX polish needed for a project of this complexity. Neither is recommended for a greenfield ESM TypeScript project.

---

## 1. Vitest: Detailed Assessment

### 1.1 Latest Stable Version

- **Current stable**: `vitest@4.1.0` (March 12, 2026)
- **Previous stable**: `vitest@4.0.18` (January 22, 2026)
- **Major release**: Vitest 4.0.0 shipped October 22, 2025
- **NPM weekly downloads**: ~35M (up from ~17M a year ago)
- **Requires**: Vite 6+ or Vite 7+, Node.js 18+

### 1.2 ESM + TypeScript Support

**Quality: Excellent -- this is Vitest's core strength.**

- Vitest is "ESM first" by design. It uses Vite's module transformation pipeline.
- TypeScript is handled natively via Vite's transform -- no `ts-jest`, no `ts-node`, no separate compilation step.
- Supports `top-level await` out of the box.
- Path aliases from `tsconfig.json` are supported through Vite's `resolve.alias` config.
- No `"type": "module"` gymnastics required in `package.json` -- Vitest handles ESM internally regardless of package type.

**One gotcha**: When using `tsconfig.json` path aliases with `vi.mock()`, you must use relative paths (not aliases) in the mock call. This is documented but easy to miss.

### 1.3 Mocking Capabilities

#### `vi.mock()` for Module-Level Mocking

```typescript
import { vi } from 'vitest'

// Basic module mock (hoisted to top of file automatically)
vi.mock('./subprocess-adapter', () => ({
  runPython: vi.fn().mockResolvedValue({ stdout: 'result', exitCode: 0 }),
  runGit: vi.fn().mockResolvedValue('abc1234'),
}))

// Partial mock with importOriginal
vi.mock(import('./claude-adapter'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    streamResponse: vi.fn(),
  }
})

// Spy mode -- keep real implementation, just track calls
vi.mock('./logger', { spy: true })
```

Key mocking features:
- **`vi.mock()`** -- hoisted to top of file, executes before all imports
- **`vi.hoisted()`** -- define variables accessible inside `vi.mock()` factories (since vi.mock is hoisted, normal variables are out of scope)
- **`vi.fn()`** -- create mock functions with tracking (built on Tinyspy)
- **`vi.spyOn()`** -- spy on object methods
- **`vi.stubGlobal()`** -- mock globals like `process.env`
- **`{ spy: true }` option** -- new in Vitest 4, auto-spies all exports without replacing implementation
- **`vi.importActual()`** -- import the real module inside a mock factory
- **`vi.importMock()`** -- import a module with all mocks applied

#### How ESM Module Mocking Works (Internals)

This is important to understand for debugging. Vitest uses two different mechanisms:

1. **In Node/JSDOM/happy-dom environments** (your use case): Vitest runs code through a "module runner" that hooks into module evaluation. It does NOT use native ESM directly -- it creates an ESM-like environment that allows mutation of module exports. This is what makes `vi.spyOn()` work on ES module named exports.

2. **The transformer**: When Vitest sees `vi.mock()` in a file, it transforms all static imports to dynamic imports and moves `vi.mock()` to the top. This ensures mocks are registered before modules load.

#### ESM Mocking Gotchas

1. **`vi.mock()` only works with `import`, not `require()`** -- documented limitation.
2. **Factory scope**: You cannot reference variables declared outside the `vi.mock()` factory. Use `vi.hoisted()` instead:
   ```typescript
   const { mockFn } = vi.hoisted(() => ({
     mockFn: vi.fn()
   }))
   vi.mock('./module', () => ({ fn: mockFn }))
   ```
3. **Same-file method calls cannot be mocked**: If `foo()` calls `bar()` and both are in the same file, mocking `bar` won't affect `foo`'s internal call.
4. **`mockReset: true` in global config** can silently clear factory-defined implementations. If your mock factory defines return values but tests see `undefined`, check this setting.
5. **Virtual modules**: There is a known (now fixed) bug in Vitest 4.0.x where `vi.importActual()` for virtual modules returned empty objects. Fixed in 4.1.0-beta.5+.
6. **TypeScript path aliases**: Use relative paths in `vi.mock()` calls, not aliases.

### 1.4 Async Iterator Testing

Vitest has no special async iterator API, but it works perfectly with standard async patterns:

```typescript
import { test, expect } from 'vitest'

test('async iterator produces expected values', async () => {
  const values: string[] = []
  for await (const chunk of streamResponse('prompt')) {
    values.push(chunk)
  }
  expect(values).toEqual(['Hello', ' world'])
})

// Mocking an async generator
const mockStream = vi.fn(async function* () {
  yield 'Hello'
  yield ' world'
})
```

This pattern works out of the box. No special setup needed.

### 1.5 Subprocess / child_process Mocking

**This requires care.** Vitest can mock `node:child_process` at the module level:

```typescript
import { vi, test, expect } from 'vitest'
import { exec } from 'node:child_process'

vi.mock('node:child_process')

import { runPythonScript } from './subprocess-adapter'

test('calls python with correct args', async () => {
  runPythonScript('analyze.py', ['--input', 'file.txt'])
  expect(exec).toHaveBeenCalledTimes(1)
})
```

**Recommended pattern for your project**: Do NOT mock `child_process` directly. Instead, use an adapter/wrapper pattern:

```typescript
// subprocess-adapter.ts
export async function runPython(script: string, args: string[]): Promise<SubprocessResult> {
  // Real implementation using child_process
}

// In tests:
vi.mock('./subprocess-adapter', () => ({
  runPython: vi.fn().mockResolvedValue({ stdout: 'result', exitCode: 0 }),
}))
```

This is cleaner, more maintainable, and avoids the complexity of mocking Node.js built-in modules. The adapter pattern also means your tests are testing your code's logic, not Node.js internals.

**Important caveat**: Coverage from code executed in child processes is NOT collected by Vitest's coverage provider. This is a known limitation (open issue #7064). If you need coverage from subprocess code, you'd need to set `NODE_V8_COVERAGE` manually and merge reports.

### 1.6 Fixture File Handling

Vitest has a powerful **fixture system** via `test.extend()`:

```typescript
// test/fixtures.ts
import { test as baseTest } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

export const test = baseTest
  .extend('fixtureDir', path.resolve(__dirname, '../fixtures'))
  .extend('tempDir', async ({}, { onCleanup }) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-steward-'))
    onCleanup(async () => {
      await fs.rm(dir, { recursive: true, force: true })
    })
    return dir
  })
  .extend('fixtureRepo', async ({ fixtureDir, tempDir }, { onCleanup }) => {
    // Copy a fixture repo into the temp directory
    const src = path.join(fixtureDir, 'sample-repo')
    const dest = path.join(tempDir, 'repo')
    await fs.cp(src, dest, { recursive: true })
    return dest
  })
```

Usage:

```typescript
import { test } from './fixtures'

test('analyzes repository structure', async ({ fixtureRepo, tempDir }) => {
  const result = await analyzeRepo(fixtureRepo)
  expect(result.files).toContain('package.json')
})
```

Fixture features:
- **Scopes**: `test` (default, fresh per test), `file` (once per file), `worker` (once per worker)
- **Automatic cleanup**: `onCleanup()` callback runs after scope ends
- **Dependency injection**: Fixtures can depend on other fixtures
- **Type inference**: Builder pattern (`.extend()`) provides automatic TypeScript types

### 1.7 Snapshot Testing

Full Jest-compatible snapshot support:

```typescript
test('generates expected output', () => {
  const result = generateDocumentation(fixture)
  expect(result).toMatchSnapshot()           // File-based snapshot
  expect(result).toMatchInlineSnapshot(`...`) // Inline snapshot
})
```

- Snapshot files stored in `__snapshots__/` by default
- Custom snapshot path via `resolveSnapshotPath` config
- Custom serializers via `snapshotSerializers` config
- `snapshotFormat.printBasicPrototype: false` -- cleaner output
- **Vitest 4 breaking change**: Obsolete snapshots now fail tests on CI (previously just warned)

### 1.8 Coverage Support

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',    // Default. Alternative: 'istanbul'
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
    }
  }
})
```

- **V8 provider** (`@vitest/coverage-v8`): Default, faster, uses V8's built-in code coverage. Recommended for Node.js projects.
- **Istanbul provider** (`@vitest/coverage-istanbul`): Alternative, more mature, byte-level instrumentation. Use if V8 coverage has edge cases with your code patterns.
- **Recommendation**: Start with V8. Switch to Istanbul only if you encounter coverage gaps.

### 1.9 Watch Mode

- HMR-based watch mode -- only re-runs tests affected by changed files
- Extremely fast -- sub-second feedback for incremental changes
- `--watch` is the default in development (disabled in CI automatically)
- Supports filtering by test name, file path, etc. in the terminal UI

### 1.10 Configuration for a Node.js Library

Recommended `vitest.config.ts` for your project:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Node.js environment (default, but explicit is good)
    environment: 'node',

    // Don't pollute global scope -- use explicit imports
    globals: false,

    // Setup files for shared mocks/fixtures
    setupFiles: ['./test/setup.ts'],

    // Test file patterns
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/fixtures/**'],

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/types/**',
      ],
    },

    // Mocking
    clearMocks: true,    // Clear mock call history between tests
    restoreMocks: true,  // Restore original implementations between tests

    // Timeouts (generous for subprocess tests)
    testTimeout: 15000,
    hookTimeout: 15000,

    // Snapshots
    snapshotFormat: {
      printBasicPrototype: false,
    },

    // Pool configuration
    pool: 'forks',  // 'forks' is safer for subprocess-heavy tests
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },

    // Reporters
    reporters: ['default'],
  },
})
```

### 1.11 ESM-Only Package Setup

No special setup is needed. Vitest handles ESM internally. Your `package.json` can have `"type": "module"` and everything works. If you're consuming ESM-only dependencies, they work out of the box because Vite's transform pipeline handles them.

If you encounter issues with specific dependencies that use non-standard ESM patterns, use:

```typescript
export default defineConfig({
  test: {
    server: {
      deps: {
        inline: ['problematic-package'],
      },
    },
  },
})
```

---

## 2. Alternatives: Brief Comparison

### 2.1 Jest

- **Latest stable**: `jest@30.3.0` (March 10, 2026)
- **ESM support**: Still requires `--experimental-vm-modules` flag. ESM module mocking is explicitly documented as "not supported yet" in the ts-jest ESM guide. The Jest team has been working on this for years (issue #9430) but it remains incomplete.
- **TypeScript**: Requires `ts-jest` or `babel-jest` with `@babel/preset-typescript`. Extra config overhead.
- **New in Jest 30**: `defineConfig`/`mergeConfig` helpers, `ArrayOf` matcher, removed deprecated aliases, minimum Node 18+, minimum TypeScript 5.4.
- **Downloads**: ~45M/week (still higher than Vitest due to legacy projects)
- **Verdict**: Do NOT choose Jest for a new ESM TypeScript project in 2026. The ESM mocking story is a dealbreaker. Jest is best for legacy CJS projects or React Native.

### 2.2 Node.js Built-in Test Runner (`node:test`)

- **State**: Stable since Node.js 18, improved significantly in Node 22-23
- **TypeScript**: Requires a separate loader (`tsx`, `ts-node`, or `--experimental-strip-types` in Node 23+)
- **Missing features**: No watch mode (or very basic), no snapshot testing, no built-in mocking of modules (only `mock.module()` which is experimental), limited matchers, no coverage UI
- **Strengths**: Zero dependencies, ships with Node, fast startup
- **Verdict**: Good for simple utility libraries. NOT suitable for a project needing fixture-based testing, subprocess mocking, snapshots, and rich DX. You would end up reimplementing half of Vitest.

### 2.3 Recommendation Matrix

| Feature | Vitest 4.x | Jest 30.x | node:test |
|---|---|---|---|
| ESM mocking | Native, excellent | Experimental flag | Experimental |
| TypeScript | Zero config | Needs ts-jest | Needs loader |
| Watch mode | HMR-based, fast | Polling-based | Minimal/none |
| Snapshots | Full support | Full support | None |
| Fixtures | test.extend() | Manual | Manual |
| Coverage | V8 or Istanbul | V8 or Istanbul | V8 (basic) |
| Speed | Very fast | Moderate | Fast startup |
| Ecosystem | Growing rapidly | Largest | Minimal |

---

## 3. Mocking Strategy for Code Steward

### 3.1 Architecture: Adapter Pattern

The key recommendation is to use an **adapter/port pattern** so that each external dependency is behind a thin interface:

```
src/
  adapters/
    subprocess-adapter.ts    # Wraps child_process for Python
    git-adapter.ts           # Wraps git CLI operations
    claude-adapter.ts        # Wraps Claude Agent SDK
    fs-adapter.ts            # Wraps filesystem operations (optional)
```

Then in tests, mock at the adapter level:

```typescript
vi.mock('../src/adapters/subprocess-adapter')
vi.mock('../src/adapters/git-adapter')
vi.mock('../src/adapters/claude-adapter')
```

### 3.2 Subprocess Adapter (Python Invocation)

```typescript
// test/mocks/subprocess.ts
import { vi } from 'vitest'

export function mockSubprocessAdapter() {
  const { mockPython } = vi.hoisted(() => ({
    mockPython: vi.fn()
  }))

  vi.mock('../../src/adapters/subprocess-adapter', () => ({
    runPython: mockPython.mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
    }),
  }))

  return { mockPython }
}
```

### 3.3 Git Adapter

```typescript
const { mockGit } = vi.hoisted(() => ({
  mockGit: {
    log: vi.fn().mockResolvedValue([]),
    diff: vi.fn().mockResolvedValue(''),
    status: vi.fn().mockResolvedValue({ modified: [] }),
    show: vi.fn().mockResolvedValue(''),
  }
}))

vi.mock('../../src/adapters/git-adapter', () => ({
  createGitAdapter: vi.fn(() => mockGit),
}))
```

### 3.4 Claude Agent SDK Adapter

```typescript
// Mock streaming responses with async generators
const { mockClaude } = vi.hoisted(() => ({
  mockClaude: {
    stream: vi.fn(async function* () {
      yield { type: 'text', content: 'Analysis complete.' }
      yield { type: 'tool_use', name: 'write_file', input: { path: 'out.md' } }
    }),
    complete: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Response' }],
    }),
  }
}))

vi.mock('../../src/adapters/claude-adapter', () => ({
  createClaudeAdapter: vi.fn(() => mockClaude),
}))
```

### 3.5 Filesystem Operations

Two options depending on what you're testing:

**Option A: Real filesystem with temp directories (recommended for integration tests)**

```typescript
import { test as baseTest } from 'vitest'

export const test = baseTest
  .extend('tempDir', async ({}, { onCleanup }) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cs-'))
    onCleanup(() => fs.rm(dir, { recursive: true, force: true }))
    return dir
  })
```

**Option B: In-memory filesystem with memfs (for unit tests)**

```typescript
// __mocks__/fs.cjs
const { fs } = require('memfs')
module.exports = fs

// __mocks__/fs/promises.cjs
const { fs } = require('memfs')
module.exports = fs.promises
```

```typescript
// In test file:
import { vol } from 'memfs'
vi.mock('node:fs')
vi.mock('node:fs/promises')

beforeEach(() => vol.reset())

test('reads config file', () => {
  vol.fromJSON({ '/project/.codesteward.json': '{"version": 1}' })
  const config = readConfig('/project')
  expect(config.version).toBe(1)
})
```

---

## 4. Integration Test Support

### 4.1 Running Tests Against Fixture Repos

```
test/
  fixtures/
    simple-repo/          # A minimal repo for basic tests
      package.json
      src/
        index.ts
    complex-repo/         # A repo with multiple packages
      package.json
      packages/
        core/
        cli/
    dirty-repo/           # A repo with uncommitted changes
      ...
```

```typescript
// test/helpers/fixtures.ts
import { test as baseTest } from 'vitest'

export const test = baseTest
  .extend('fixturesDir', path.resolve(import.meta.dirname, '../fixtures'))
  .extend('tempDir', async ({}, { onCleanup }) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cs-test-'))
    onCleanup(() => fs.rm(dir, { recursive: true, force: true }))
    return dir
  })
  .extend('copyFixture', ({ fixturesDir, tempDir }) => {
    return async (name: string) => {
      const src = path.join(fixturesDir, name)
      const dest = path.join(tempDir, name)
      await fs.cp(src, dest, { recursive: true })
      return dest
    }
  })
```

Usage:

```typescript
import { test } from './helpers/fixtures'

test('analyzes simple repo', async ({ copyFixture }) => {
  const repoPath = await copyFixture('simple-repo')
  const result = await analyzeRepository(repoPath)
  expect(result.files).toMatchSnapshot()
})
```

### 4.2 Temp Directory Management

- Use `fs.mkdtemp()` with `os.tmpdir()` -- standard Node.js
- Clean up with `onCleanup()` in Vitest fixtures
- Use `pool: 'forks'` to isolate tests that create temp directories

### 4.3 Cleanup Patterns

```typescript
import { afterEach, beforeEach } from 'vitest'

let tempDirs: string[] = []

beforeEach(() => {
  tempDirs = []
})

afterEach(async () => {
  await Promise.all(
    tempDirs.map(dir => fs.rm(dir, { recursive: true, force: true }))
  )
})

// Or better: use Vitest fixtures with onCleanup (see above)
```

The fixture-based `onCleanup` approach is preferred because:
- Cleanup is colocated with setup
- Cleanup runs even if the test throws
- Fixtures compose cleanly

---

## 5. Recommended devDependencies

### 5.1 Minimal Set

```json
{
  "devDependencies": {
    "vitest": "^4.1.0",
    "@vitest/coverage-v8": "^4.1.0"
  }
}
```

That's it for the basics. Vitest includes:
- Test runner
- Assertion library (Chai + Jest-compatible expect)
- Mocking (Tinyspy-based vi.fn/vi.mock/vi.spyOn)
- Snapshot testing
- Watch mode
- TypeScript support (via Vite)

### 5.2 Optional Additions

```json
{
  "devDependencies": {
    "vitest": "^4.1.0",
    "@vitest/coverage-v8": "^4.1.0",
    "memfs": "^4.x"
  }
}
```

- **`memfs`**: Only if you need in-memory filesystem mocking for unit tests. Skip if you're using real temp directories.
- **`@vitest/ui`**: Adds a browser-based test UI (`vitest --ui`). Nice for development but not required.
- **`@vitest/coverage-istanbul`**: Only if V8 coverage has issues with your code patterns. Start with V8.

### 5.3 What You Do NOT Need

- `ts-jest` -- not needed, Vitest handles TypeScript natively
- `ts-node` -- not needed for test execution
- `@types/jest` -- not needed, Vitest has its own types
- `jest` -- not needed
- `c8` / `nyc` -- not needed, coverage is built into `@vitest/coverage-v8`
- `sinon` -- not needed, Vitest has built-in mocking
- `nock` -- not needed unless you prefer it over `vi.mock()` for HTTP

---

## 6. Complete Setup Example

### package.json scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### vitest.config.ts (production-ready for your use case)

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,

    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'test/fixtures/**'],

    setupFiles: ['./test/setup.ts'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/types/**',
        'src/index.ts',  // re-export barrel
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },

    clearMocks: true,
    restoreMocks: true,

    testTimeout: 15000,
    hookTimeout: 15000,

    pool: 'forks',

    snapshotFormat: {
      printBasicPrototype: false,
    },

    reporters: ['default'],
  },
})
```

### test/setup.ts

```typescript
// Global test setup
// Add any shared setup here (e.g., environment variables for test mode)

process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'silent'
```

---

## Sources

- [Vitest Official Documentation](https://vitest.dev) -- Primary reference, highly authoritative
- [Vitest 4.0 Release Blog Post](https://vitest.dev/blog/vitest-4) -- October 22, 2025
- [Vitest NPM Package](https://www.npmjs.com/package/vitest) -- v4.1.0, 35M weekly downloads
- [Vitest Mocking Modules Guide](https://vitest.dev/guide/mocking/modules) -- Detailed ESM mocking docs
- [Vitest File System Mocking Guide](https://vitest.dev/guide/mocking/file-system) -- memfs integration
- [Vitest Test Context / Fixtures](https://vitest.dev/guide/test-context) -- Fixture system docs
- [Vitest GitHub: child_process coverage issue #7064](https://github.com/vitest-dev/vitest/issues/7064) -- Known limitation
- [Vitest GitHub: virtual module mocking fix #9771](https://github.com/vitest-dev/vitest/issues/9771) -- Fixed in 4.1.0
- [Jest v30.3.0 Release](https://github.com/jestjs/jest/releases/tag/v30.3.0) -- March 10, 2026
- [Jest v30 Migration Guide](https://jestjs.io/docs/next/upgrading-to-jest30) -- ESM still experimental
- [ts-jest ESM Support Guide](https://kulshekhar.github.io/ts-jest/docs/guides/esm-support) -- Documents Jest ESM limitations
- [PkgPulse: node:test vs Vitest vs Jest 2026](https://www.pkgpulse.com/blog/node-test-vs-vitest-vs-jest-native-test-runner-2026) -- Comparison article, March 2026
- [SitePoint: Vitest vs Jest 2026 Benchmarks](https://www.sitepoint.com/vitest-vs-jest-2026-migration-benchmark/) -- February 2026
- [LogRocket: Vitest 4 Adoption Guide](https://blog.logrocket.com/vitest-adoption-guide/) -- December 2025
- [GitHub Gist: Mock child_process.exec in Vitest](https://gist.github.com/joemaller/f9171aa19a187f59f406ef1ffe87d9ac) -- Practical example

---

## Confidence Assessment

- **Overall confidence**: **High** -- Vitest is the clear choice. This assessment is based on official documentation, release notes, and multiple independent comparison articles from early 2026.
- **Areas of certainty**: ESM support, TypeScript handling, mocking API, fixture system, coverage providers, version numbers.
- **Areas of minor uncertainty**: The exact behavior of `vi.mock()` with deeply nested ESM re-exports may have edge cases. The child_process coverage limitation is confirmed but may have workarounds by the time you need it.
- **No conflicting information**: All sources agree Vitest is the recommended choice for new ESM TypeScript projects.
