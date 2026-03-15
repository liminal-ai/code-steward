# Python Tree-Sitter Packages for Structural Code Analysis

**Research Date:** 2026-03-15
**Purpose:** Evaluate tree-sitter Python packages for a documentation engine analyzing TypeScript/JavaScript codebases

---

## Summary

The Python tree-sitter ecosystem is in a stable but transitional state. The current **py-tree-sitter 0.25.2** (released September 2025) is the latest stable release on PyPI, with a **0.26** version in development that tracks tree-sitter core 0.26.x (which is already at 0.26.6). The 0.25.x series introduced ABI version 15 and the new `QueryCursor` class, which was a significant breaking change from 0.24.x. For language grammars, `tree-sitter-typescript` is at **0.23.2** and `tree-sitter-javascript` is at **0.25.0** -- both are compatible with py-tree-sitter 0.25.2 since it supports ABI versions 13-15.

The recommended Python version for this tool is **Python 3.12.x** (currently 3.12.13). Python 3.13 is stable and works with the official tree-sitter packages, but 3.12 offers the best compatibility across the ecosystem with the fewest surprises. Python 3.11 is also a safe choice. Avoid the older `tree-sitter-languages` bundle package -- it is unmaintained and does not support Python 3.13; use the individual grammar packages instead.

---

## 1. Python Version Analysis

### Current Stable Versions (as of March 2026)

| Version | Latest Release | Status | Notes |
|---------|---------------|--------|-------|
| Python 3.14.3 | Feb 3, 2026 | **Current stable** (newest) | New features: template strings, deferred annotations, subinterpreters |
| Python 3.13.12 | Feb 3, 2026 | **Stable, maintenance** | Free-threading (experimental), JIT (experimental), removed dead batteries |
| Python 3.12.13 | Mar 3, 2026 | **Stable, security-only** | Mature, widely compatible |
| Python 3.11.15 | Mar 3, 2026 | **Stable, security-only** | Mature, widely compatible |
| Python 3.10.20 | Mar 3, 2026 | **Stable, security-only** | End-of-life approaching |

### Is Python 3.13 Safe for Production?

**Yes, with caveats.** Python 3.13 has been out since October 2024 and is now at patch 3.13.12. It is production-ready for most use cases. However:

- **Removed modules:** 19 deprecated "dead battery" modules were removed (cgi, aifc, etc.) -- unlikely to affect tree-sitter usage
- **SSL changes:** Stricter certificate validation can break corporate proxy environments
- **Free-threading:** The experimental `--disable-gil` build can cause segfaults with C extensions; do NOT use the free-threaded build for production
- **C extension compatibility:** Some C extensions needed updates for 3.13's internal API changes; tree-sitter's pre-compiled wheels handle this
- **75% of top 360 PyPI packages** now explicitly support Python 3.13

### Recommendation for a Node.js-Shelled Tool

**Python 3.12.x** is the safest choice for a tool that shells out from Node.js:

1. **Maximum ecosystem compatibility** -- virtually all packages support 3.12
2. **Mature and stable** -- 3.12.13 is a security-only release, meaning no more feature changes
3. **Pre-compiled wheels available** for all tree-sitter packages
4. **No removed modules** that could surprise dependencies
5. **Widely available** -- ships with most OS distributions and package managers

Python 3.11 is equally safe. Python 3.13 works but offers no benefit for this use case (the JIT and free-threading are irrelevant when shelling out for one-shot analysis).

Python 3.14 is too new -- it was released October 2025 and ecosystem support is still catching up.

### Tree-Sitter Compatibility with Python Versions

- **py-tree-sitter 0.25.2** requires `Python >= 3.10` and provides pre-compiled wheels
- All language grammar packages provide pre-compiled binary wheels for Python 3.10-3.13
- No known compatibility issues with tree-sitter on Python 3.11, 3.12, or 3.13
- The `tree-sitter-languages` bundle package (by grantjenks) does NOT support Python 3.13 and is unmaintained -- do NOT use it

---

## 2. tree-sitter (Core Python Bindings)

### Current Version: 0.25.2

| Property | Value |
|----------|-------|
| **PyPI** | https://pypi.org/project/tree-sitter/ |
| **GitHub** | https://github.com/tree-sitter/py-tree-sitter |
| **Documentation** | https://tree-sitter.github.io/py-tree-sitter/ |
| **Latest Version** | 0.25.2 (September 25, 2025) |
| **Python Requires** | >= 3.10 |
| **License** | MIT |
| **ABI Version** | 15 (supports 13-15) |
| **Monthly Downloads** | ~69 million |

### Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| 0.22.0 | May 2024 | Major rewrite, new API style |
| 0.23.0 | Aug 2024 | Incremental improvements |
| 0.24.0 | Jan 2025 | Added Language.copy(), Parser.logger, LogType enum |
| **0.25.0** | **Jul 2025** | **Breaking: ABI 15, QueryCursor class, Language getters** |
| 0.25.1 | Aug 2025 | Bug fixes, disabled free-threaded PyPI builds |
| 0.25.2 | Sep 2025 | Memory leak fix, MSVC improvements |

### Major Version Transition History

The tree-sitter Python bindings have gone through several breaking transitions:

1. **0.20.x -> 0.21.x** (2023-2024): Methods became properties (`current_field_name()` -> `current_field_name`), breaking change
2. **0.21.x -> 0.22.x** (May 2024): `Language.build_library()` was **removed**. The old API for building shared objects from grammar C files was eliminated. Languages must now be installed as separate pip packages.
3. **0.22.x -> 0.23.x** (Aug 2024): Incremental improvements
4. **0.24.x -> 0.25.x** (Jul 2025): **Major breaking change** -- ABI bumped to 15, `QueryCursor` split into its own class, `Query.match_limit`/`Query.timeout_micros` moved to `QueryCursor`

### Current API Style

The modern API (0.25.x) uses **pre-compiled binary wheels** for language grammars. No more building shared objects or compiling C code.

```python
# Install: pip install tree-sitter tree-sitter-typescript

import tree_sitter_typescript as tstypescript
from tree_sitter import Language, Parser

# Load language from pre-compiled binary
TS_LANGUAGE = Language(tstypescript.language_typescript())
TSX_LANGUAGE = Language(tstypescript.language_tsx())

# Create parser
parser = Parser(TS_LANGUAGE)

# Parse code
tree = parser.parse(b"const x: number = 42;")
root = tree.root_node

# Query
from tree_sitter import Query, QueryCursor

query = Query(TS_LANGUAGE, """
(function_declaration
  name: (identifier) @func_name)
""")
cursor = QueryCursor(query)
captures = cursor.captures(root)
```

### Breaking Changes to Watch For

1. **`Language.build_library()` removed** in 0.22+ -- no more compiling grammars at runtime
2. **`Query.captures()` and `Query.matches()` removed** in 0.25+ -- use `QueryCursor` instead
3. **`Language(ptr: int)` deprecated** in 0.24+ -- use `Language(language_func())` pattern
4. **ABI version mismatch** -- language grammars built with ABI > 15 won't work with py-tree-sitter 0.25.x

### Upcoming: py-tree-sitter 0.26

A PR for tree-sitter 0.26 support exists (PR #431) but was **cancelled** as of December 2025. The tree-sitter core is at 0.26.6, but py-tree-sitter has not yet released a 0.26.x version. This means:

- py-tree-sitter 0.25.2 is the current stable release
- Language grammars at ABI 15 or below are compatible
- Language grammars built for tree-sitter 0.26 (ABI 16) will NOT work with py-tree-sitter 0.25.x

---

## 3. tree-sitter-typescript

### Current Version: 0.23.2

| Property | Value |
|----------|-------|
| **PyPI** | https://pypi.org/project/tree-sitter-typescript/ |
| **GitHub** | https://github.com/tree-sitter/tree-sitter-typescript |
| **Latest Version** | 0.23.2 (November 11, 2024) |
| **Python Requires** | >= 3.9 |
| **License** | MIT |
| **Monthly Downloads** | ~2.9 million |

### Compatibility

- **Compatible with py-tree-sitter 0.25.2** -- ABI version is within the 13-15 range
- Pre-compiled binary wheels available for all major platforms

### Includes Both TypeScript and TSX Grammars

Yes. The package provides two separate grammars:

```python
import tree_sitter_typescript as tstypescript

# TypeScript grammar
ts_language = tstypescript.language_typescript()

# TSX grammar
tsx_language = tstypescript.language_tsx()
```

These are separate dialects and require separate `Language` and `Parser` instances. For files with Flow type annotations, the TSX parser can be used.

### Version History

| Version | Date |
|---------|------|
| 0.21.0 | May 2024 |
| 0.21.1 | May 2024 |
| 0.21.2 | Jul 2024 |
| 0.23.0 | Sep 2024 |
| 0.23.2 | Nov 2024 |

Note: The version numbers do NOT need to match py-tree-sitter's version. What matters is ABI compatibility.

---

## 4. tree-sitter-javascript

### Current Version: 0.25.0

| Property | Value |
|----------|-------|
| **PyPI** | https://pypi.org/project/tree-sitter-javascript/ |
| **GitHub** | https://github.com/tree-sitter/tree-sitter-javascript |
| **Latest Version** | 0.25.0 (September 1, 2025) |
| **Python Requires** | >= 3.10 |
| **License** | MIT |
| **Keywords** | incremental, parsing, tree-sitter, javascript |

### Compatibility

- **Compatible with py-tree-sitter 0.25.2** -- ABI version is within the 13-15 range
- Pre-compiled binary wheels available

### JSX Support

**Yes.** The package description explicitly states: "JavaScript and JSX grammar for tree-sitter." The grammar supports JSX syntax as an extension to the ECMAScript specification. Unlike TypeScript, JavaScript and JSX are handled by a single grammar (not split into two).

```python
import tree_sitter_javascript as tsjavascript
from tree_sitter import Language

JS_LANGUAGE = Language(tsjavascript.language())
```

---

## 5. Additional Grammar Packages

### Recommended for a TypeScript-First Documentation Engine

| Package | Version | PyPI | Recommended? | Rationale |
|---------|---------|------|-------------|-----------|
| **tree-sitter-json** | 0.24.8 | https://pypi.org/project/tree-sitter-json/ | **Yes** | Parse package.json, tsconfig.json, .eslintrc.json |
| **tree-sitter-markdown** | 0.5.1 | https://pypi.org/project/tree-sitter-markdown/ | **Maybe** | Parse README.md for documentation extraction |
| **tree-sitter-css** | 0.25.0 | https://pypi.org/project/tree-sitter-css/ | **Low priority** | Only if analyzing CSS-in-JS or CSS modules |
| **tree-sitter-html** | 0.23.2 | https://pypi.org/project/tree-sitter-html/ | **Low priority** | Only if analyzing HTML templates |

### Details

**tree-sitter-json (0.24.8)**
- Released: November 11, 2024
- GitHub: https://github.com/tree-sitter/tree-sitter-json
- Very useful for parsing `package.json` (dependencies, scripts, exports), `tsconfig.json` (compiler options, paths), and other config files
- 79 dependents on PyPI

**tree-sitter-markdown (0.5.1)**
- Released: September 16, 2025
- Follows the CommonMark spec
- Note: Different versioning scheme (0.5.x not 0.2x.x) -- maintained by a different author (MDeiml)
- Python >= 3.9
- Useful if extracting documentation from README files or markdown comments

**tree-sitter-css (0.25.0)**
- Released: Latest version tracks closely with tree-sitter core
- Python >= 3.10
- Low priority unless analyzing CSS modules, styled-components, etc.

**tree-sitter-html (0.23.2)**
- Released: November 11, 2024
- Python >= 3.9
- Low priority unless analyzing HTML templates (e.g., Angular templates)

---

## 6. Compatibility Matrix

### Core Compatibility (CURRENT -- March 2026)

| Component | Version | ABI | Python 3.11 | Python 3.12 | Python 3.13 |
|-----------|---------|-----|-------------|-------------|-------------|
| py-tree-sitter | 0.25.2 | 15 (supports 13-15) | Yes (wheels) | Yes (wheels) | Yes (wheels) |
| tree-sitter-typescript | 0.23.2 | Within 13-15 | Yes | Yes | Yes |
| tree-sitter-javascript | 0.25.0 | Within 13-15 | Yes | Yes | Yes |
| tree-sitter-json | 0.24.8 | Within 13-15 | Yes | Yes | Yes |
| tree-sitter-markdown | 0.5.1 | Within 13-15 | Yes | Yes | Yes |
| tree-sitter-css | 0.25.0 | Within 13-15 | Yes | Yes | Yes |
| tree-sitter-html | 0.23.2 | Within 13-15 | Yes | Yes | Yes |

### Key Compatibility Rules

1. **ABI backward compatibility**: py-tree-sitter 0.25.2 supports language ABI versions 13 through 15. All current language grammar packages on PyPI use ABI versions within this range.

2. **ABI forward incompatibility**: py-tree-sitter is NOT forward-compatible. A grammar built with ABI 16 (tree-sitter CLI 0.26+) will NOT work with py-tree-sitter 0.25.x.

3. **Version numbers are NOT a compatibility indicator**: `tree-sitter-typescript` 0.23.2 works fine with `tree-sitter` 0.25.2. The version numbers are independent. What matters is the ABI version embedded in the grammar.

4. **Pre-compiled wheels eliminate build issues**: All packages provide pre-compiled wheels, so there are no C compiler requirements and no platform-specific build failures.

### Historical Compatibility Issues (Resolved)

- **tree-sitter 0.24.0 + tree-sitter-bash 0.25.0**: Incompatible because tree-sitter-bash 0.25.0 used ABI 15 while py-tree-sitter 0.24.0 only supported up to ABI 14. Fixed by py-tree-sitter 0.25.0.
- **tree-sitter-languages on Python 3.13**: The third-party bundle package `tree-sitter-languages` (by grantjenks) never added Python 3.13 support and appears unmaintained. This is NOT the same as the official individual grammar packages.
- **Language.build_library() removal**: Broke many tutorials and existing code when removed in 0.22. The new approach uses pip-installable grammar packages.

### Potential Future Issue

When py-tree-sitter 0.26 is released, it will likely bump to ABI 16. This may require updating all language grammar packages to matching versions. Pin your versions to avoid surprises.

---

## 7. Recommended Package Versions (Pin These)

For a documentation engine analyzing TypeScript/JavaScript codebases:

```
# requirements.txt
tree-sitter==0.25.2
tree-sitter-typescript==0.23.2
tree-sitter-javascript==0.25.0
tree-sitter-json==0.24.8

# Optional
# tree-sitter-markdown==0.5.1
# tree-sitter-css==0.25.0
# tree-sitter-html==0.23.2
```

Python version constraint:
```
python_requires = ">=3.11,<3.14"
```

Recommended Python for development/deployment: **3.12.x**

---

## 8. Usage Pattern for Documentation Engine

```python
"""
Minimal example: parsing TypeScript with tree-sitter in Python 3.12
"""
import tree_sitter_typescript as tstypescript
import tree_sitter_javascript as tsjavascript
from tree_sitter import Language, Parser, Query, QueryCursor

# Load languages
TS_LANGUAGE = Language(tstypescript.language_typescript())
TSX_LANGUAGE = Language(tstypescript.language_tsx())
JS_LANGUAGE = Language(tsjavascript.language())

def parse_file(filepath: str, source: bytes) -> "tree_sitter.Tree":
    """Parse a file, auto-detecting language from extension."""
    ext = filepath.rsplit(".", 1)[-1].lower()
    lang_map = {
        "ts": TS_LANGUAGE,
        "tsx": TSX_LANGUAGE,
        "js": JS_LANGUAGE,
        "jsx": JS_LANGUAGE,   # JSX is handled by the JS grammar
        "mjs": JS_LANGUAGE,
        "cjs": JS_LANGUAGE,
    }
    language = lang_map.get(ext)
    if language is None:
        raise ValueError(f"Unsupported file extension: .{ext}")

    parser = Parser(language)
    return parser.parse(source)

def extract_exports(tree, language) -> list[dict]:
    """Extract exported declarations from a parsed tree."""
    query = Query(language, """
        (export_statement
            declaration: (_) @exported_decl)
        (export_statement
            value: (_) @exported_value)
    """)
    cursor = QueryCursor(query)
    captures = cursor.captures(tree.root_node)
    # captures is a dict of {capture_name: [(node, match_index), ...]}
    return captures
```

---

## Sources

- [py-tree-sitter PyPI](https://pypi.org/project/tree-sitter/) -- Official package page, v0.25.2
- [py-tree-sitter Documentation](https://tree-sitter.github.io/py-tree-sitter/) -- Official API docs
- [py-tree-sitter GitHub](https://github.com/tree-sitter/py-tree-sitter) -- Source repo with README and examples
- [tree-sitter-typescript PyPI](https://pypi.org/project/tree-sitter-typescript/) -- v0.23.2
- [tree-sitter-typescript GitHub](https://github.com/tree-sitter/tree-sitter-typescript) -- Source repo
- [tree-sitter-javascript PyPI](https://pypi.org/project/tree-sitter-javascript/) -- v0.25.0
- [tree-sitter-javascript GitHub](https://github.com/tree-sitter/tree-sitter-javascript) -- Source repo
- [tree-sitter-json PyPI deps.dev](https://deps.dev/pypi/tree-sitter-json) -- v0.24.8
- [tree-sitter-markdown PyPI](https://pypi.org/project/tree-sitter-markdown) -- v0.5.1
- [tree-sitter-css PyPI](https://pypi.org/project/tree-sitter-css/) -- v0.25.0
- [tree-sitter-html PyPI](https://pypi.org/project/tree-sitter-html/) -- v0.23.2
- [py-tree-sitter PR #333: ABI 15 & QueryCursor](https://github.com/tree-sitter/py-tree-sitter/pull/333) -- Breaking changes in 0.25
- [py-tree-sitter Issue #358: ABI incompatibility](https://github.com/tree-sitter/py-tree-sitter/issues/358) -- 0.24 vs 0.25 grammar compat
- [py-tree-sitter Issue #327: build_library removal](https://github.com/tree-sitter/py-tree-sitter/issues/327) -- Confirmed old API removed
- [Python.org Source Releases](https://www.python.org/downloads/source/) -- Python version status
- [Python 3.13 Readiness](https://pyreadiness.org/3.13/) -- 75% of top 360 packages support 3.13
- [tree-sitter-languages Issue #75](https://github.com/grantjenks/py-tree-sitter-languages/issues/75) -- No Python 3.13 support

## Confidence Assessment

- **Overall confidence: HIGH** -- All version numbers and API details are confirmed from PyPI, GitHub, and official documentation
- **ABI compatibility claims: HIGH** -- Confirmed from py-tree-sitter docs that ABI 13-15 is supported, and all grammar packages are within range
- **Python version recommendations: HIGH** -- Based on official Python release pages and tree-sitter's stated `python_requires`
- **Upcoming 0.26 status: MEDIUM** -- The 0.26 PR for py-tree-sitter was cancelled/in progress as of Dec 2025; timing uncertain
- **Area of uncertainty**: Exact ABI version numbers embedded in each grammar package are not directly exposed on PyPI; confirmed via compatibility testing evidence (working combinations) rather than direct inspection
