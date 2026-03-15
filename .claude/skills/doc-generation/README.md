# Doc Generation Skill

Claude Code skill for generating wiki-style documentation from codebases using AST-aware structural analysis.

## How It Works

1. A Python script analyzes the codebase using tree-sitter AST parsing to extract components (functions, classes, methods) and their call relationships
2. Claude clusters the components into logical modules
3. Claude reads the source code and writes documentation for each module with Mermaid diagrams
4. Metadata tracks the commit hash so docs can be incrementally updated when code changes

## Supported Languages

Python, JavaScript, TypeScript, Java, C, C++, C#, Kotlin, PHP

Python analysis uses the stdlib `ast` module (no extra packages needed). All other languages require tree-sitter.

## Dependencies

```bash
pip install -r scripts/requirements.txt
```

Or install only what you need:
```bash
# Always needed for non-Python repos
pip install tree-sitter

# Per-language (install only what your repos use)
pip install tree-sitter-python      # Optional — Python uses stdlib ast
pip install tree-sitter-javascript
pip install tree-sitter-typescript
pip install tree-sitter-java
pip install tree-sitter-c
pip install tree-sitter-cpp
pip install tree-sitter-c-sharp
pip install tree-sitter-kotlin
pip install tree-sitter-php
```

## Usage

This skill is invoked by Claude Code when you ask it to generate documentation for a repository. The SKILL.md contains the full instructions Claude follows.

### Quick Check
```bash
# Verify parser dependencies
python3 scripts/analyze_repo.py --check-deps

# Run structural analysis only
python3 scripts/analyze_repo.py /path/to/repo --output analysis.json

# Scoped analysis
python3 scripts/analyze_repo.py /path/to/repo --include "*.py,*.ts" --exclude "*test*"
```

## Output

Documentation is written to `docs/wiki/` in the target repo (configurable). All files are flat in one directory with markdown cross-references.

## Compatibility

This skill produces its own documentation format. It is not compatible with CodeWiki or DeepWiki output formats.
