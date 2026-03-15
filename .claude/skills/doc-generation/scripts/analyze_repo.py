#!/usr/bin/env python3
"""
Repository structural analysis script.

Analyzes a codebase using AST parsing and call graph analysis to produce
a JSON report of components, relationships, and structure.

Usage:
    python3 analyze_repo.py /path/to/repo [--output output.json] [--max-files 500]
    python3 analyze_repo.py --check-deps

Adapted from CodeWiki (MIT License) — extracts structural analysis only,
no LLM calls. Claude handles clustering and documentation directly.
"""

import argparse
import json
import logging
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure the scripts directory is on the path
sys.path.insert(0, str(Path(__file__).parent))

from repo_analyzer import RepoAnalyzer
from call_graph import CallGraphAnalyzer
from graph_utils import build_graph_from_components, get_leaf_nodes

logging.basicConfig(
    level=logging.WARNING,
    format="%(levelname)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)


def get_git_commit_hash(repo_path: str) -> str:
    """Get the current git commit hash for the repo."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return "unknown"


def get_repo_name(repo_path: str) -> str:
    """Extract repo name from path."""
    return Path(repo_path).resolve().name


def check_dependencies():
    """Check which tree-sitter parsers are available."""
    parsers = {
        "python": "tree_sitter_python",
        "javascript": "tree_sitter_javascript",
        "typescript": "tree_sitter_typescript",
        "java": "tree_sitter_java",
        "c": "tree_sitter_c",
        "cpp": "tree_sitter_cpp",
        "csharp": "tree_sitter_c_sharp",
        "kotlin": "tree_sitter_kotlin",
        "php": "tree_sitter_php",
    }

    # Also check base tree_sitter
    results = {}
    try:
        import tree_sitter
        results["tree_sitter_core"] = True
    except ImportError:
        results["tree_sitter_core"] = False

    for lang, module_name in parsers.items():
        try:
            __import__(module_name)
            results[lang] = True
        except ImportError:
            results[lang] = False

    # Python analyzer uses stdlib ast, always available
    results["python"] = True

    print(json.dumps({"parsers": results}, indent=2))

    missing = [k for k, v in results.items() if not v]
    if missing:
        print(f"\nMissing: {', '.join(missing)}", file=sys.stderr)
        pip_packages = []
        for k in missing:
            if k == "tree_sitter_core":
                pip_packages.append("tree-sitter")
            elif k == "csharp":
                pip_packages.append("tree-sitter-c-sharp")
            elif k == "cpp":
                pip_packages.append("tree-sitter-cpp")
            else:
                pip_packages.append(f"tree-sitter-{k}")
        print("Install with: pip install " + " ".join(pip_packages), file=sys.stderr)
        sys.exit(1)
    else:
        print("\nAll parsers available.", file=sys.stderr)
        sys.exit(0)


def analyze(
    repo_path: str,
    max_files: int = 0,
    include_patterns=None,
    exclude_patterns=None,
) -> dict:
    """
    Run full structural analysis on a repository.

    Args:
        repo_path: Absolute path to the repository root
        max_files: Maximum number of code files to analyze (0 = unlimited)
        include_patterns: Optional list of file glob patterns to include
        exclude_patterns: Optional list of file glob patterns to exclude

    Returns:
        Analysis result as a dictionary ready for JSON serialization
    """
    repo_path = str(Path(repo_path).resolve())
    repo_name = get_repo_name(repo_path)
    commit_hash = get_git_commit_hash(repo_path)

    # Step 1: Build file tree
    analyzer = RepoAnalyzer(
        include_patterns=include_patterns,
        exclude_patterns=exclude_patterns,
    )
    structure = analyzer.analyze_repository_structure(repo_path)
    file_tree = structure["file_tree"]

    if file_tree is None:
        print(json.dumps({"error": "Could not build file tree. Is this a valid directory?"}))
        sys.exit(1)

    # Step 2: Extract code files and analyze call graph
    cg_analyzer = CallGraphAnalyzer()
    code_files = cg_analyzer.extract_code_files(file_tree)

    if max_files > 0 and len(code_files) > max_files:
        logger.warning(
            f"Limiting analysis to {max_files} files (found {len(code_files)})"
        )
        code_files = code_files[:max_files]

    if not code_files:
        return {
            "repo_name": repo_name,
            "repo_path": repo_path,
            "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
            "commit_hash": commit_hash,
            "summary": {
                "total_files_analyzed": 0,
                "total_components": 0,
                "total_relationships": 0,
                "languages_found": [],
                "languages_skipped": [],
                "parsers_available": [],
            },
            "components": {},
            "relationships": [],
            "leaf_nodes": [],
            "file_tree": file_tree,
        }

    result = cg_analyzer.analyze_code_files(code_files, repo_path)

    # Step 3: Build component dict and identify leaf nodes
    components = {}
    for func_dict in result["functions"]:
        comp_id = func_dict.get("component_id") or func_dict.get("id", "")
        if comp_id:
            components[comp_id] = func_dict

    # Build graph and find leaf nodes
    # build_graph_from_components and get_leaf_nodes both expect Dict[str, Node]
    functions_dict = cg_analyzer.functions  # already a dict keyed by component ID
    if functions_dict:
        graph = build_graph_from_components(functions_dict)
        leaf_nodes = get_leaf_nodes(graph, functions_dict)
    else:
        leaf_nodes = []

    # Collect unique languages from code files
    languages = sorted(
        set(f.get("language", "unknown") for f in code_files if f.get("language"))
    )

    # Determine which languages produced components and which were skipped
    # Build a set of languages that have at least one component
    languages_with_components = set()
    for func_dict in result["functions"]:
        lang = func_dict.get("language")
        if lang:
            languages_with_components.add(lang)

    # Also check by file path: if a component's file matches a code_file, inherit its language
    component_paths = set()
    for func_dict in result["functions"]:
        rel_path = func_dict.get("relative_path") or func_dict.get("file_path", "")
        if rel_path:
            component_paths.add(str(rel_path))

    for cf in code_files:
        cf_path = cf.get("path", "")
        cf_lang = cf.get("language", "")
        if cf_lang and cf_path in component_paths:
            languages_with_components.add(cf_lang)

    # If component dicts don't have language, fall back to checking if any
    # component's file path matches files of that language
    if not languages_with_components and components:
        # Components exist but none have a language field — derive from code_files
        for cf in code_files:
            cf_path = cf.get("path", "")
            for comp in components.values():
                comp_path = comp.get("relative_path") or comp.get("file_path", "")
                if cf_path and str(comp_path).endswith(cf_path):
                    languages_with_components.add(cf.get("language", ""))

    # Languages with files in code_files
    languages_with_files = set(
        f.get("language") for f in code_files if f.get("language")
    )

    # A language is "skipped" if it had files but produced 0 components
    parsers_available = sorted(languages_with_components)
    languages_skipped = sorted(languages_with_files - languages_with_components)

    # Fail-fast: code files found but 0 components extracted
    if code_files and result["call_graph"]["total_functions"] == 0:
        print(json.dumps({
            "error": "Analysis found code files but extracted 0 components. Required parsers may be missing.",
            "hint": "Run with --check-deps to see which parsers are available.",
            "files_found": len(code_files),
            "languages_detected": languages,
        }), file=sys.stderr)
        sys.exit(1)

    return {
        "repo_name": repo_name,
        "repo_path": repo_path,
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        "commit_hash": commit_hash,
        "summary": {
            "total_files_analyzed": result["call_graph"]["files_analyzed"],
            "total_components": result["call_graph"]["total_functions"],
            "total_relationships": result["call_graph"]["total_calls"],
            "languages_found": languages,
            "languages_skipped": languages_skipped,
            "parsers_available": parsers_available,
        },
        "components": components,
        "relationships": result["relationships"],
        "leaf_nodes": leaf_nodes,
        "file_tree": file_tree,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Analyze repository structure for documentation generation"
    )
    parser.add_argument(
        "repo_path", nargs="?", help="Path to the repository to analyze"
    )
    parser.add_argument(
        "--output", "-o", help="Output file path (default: stdout)"
    )
    parser.add_argument(
        "--max-files",
        type=int,
        default=0,
        help="Maximum number of code files to analyze (0 = unlimited)",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Enable verbose logging"
    )
    parser.add_argument(
        "--include", "-i",
        help="Comma-separated file patterns to include (e.g. '*.py,*.ts')",
    )
    parser.add_argument(
        "--exclude", "-e",
        help="Comma-separated file patterns to exclude (e.g. '*test*,*spec*')",
    )
    parser.add_argument(
        "--check-deps", action="store_true",
        help="Check parser dependencies and exit",
    )

    args = parser.parse_args()

    if args.check_deps:
        check_dependencies()
        return

    if not args.repo_path:
        parser.error("repo_path is required unless --check-deps is used")

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    repo_path = Path(args.repo_path)
    if not repo_path.is_dir():
        print(f"Error: {args.repo_path} is not a directory", file=sys.stderr)
        sys.exit(1)

    include = args.include.split(",") if args.include else None
    exclude = args.exclude.split(",") if args.exclude else None

    result = analyze(
        str(repo_path),
        max_files=args.max_files,
        include_patterns=include,
        exclude_patterns=exclude,
    )

    output_json = json.dumps(result, indent=2, default=str)

    if args.output:
        Path(args.output).write_text(output_json)
        print(f"Analysis written to {args.output}", file=sys.stderr)
    else:
        print(output_json)


if __name__ == "__main__":
    main()
