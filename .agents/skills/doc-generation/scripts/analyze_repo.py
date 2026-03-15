#!/usr/bin/env python3
"""
Repository structural analysis script.

Analyzes a codebase using AST parsing and call graph analysis to produce
a JSON report of components, relationships, and structure.

Usage:
    python3 analyze_repo.py /path/to/repo [--output output.json] [--max-files 500]

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


def analyze(repo_path: str, max_files: int = 0) -> dict:
    """
    Run full structural analysis on a repository.

    Args:
        repo_path: Absolute path to the repository root
        max_files: Maximum number of code files to analyze (0 = unlimited)

    Returns:
        Analysis result as a dictionary ready for JSON serialization
    """
    repo_path = str(Path(repo_path).resolve())
    repo_name = get_repo_name(repo_path)
    commit_hash = get_git_commit_hash(repo_path)

    # Step 1: Build file tree
    analyzer = RepoAnalyzer()
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

    # Collect unique languages
    languages = sorted(
        set(f.get("language", "unknown") for f in code_files if f.get("language"))
    )

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
    parser.add_argument("repo_path", help="Path to the repository to analyze")
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

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    repo_path = Path(args.repo_path)
    if not repo_path.is_dir():
        print(f"Error: {args.repo_path} is not a directory", file=sys.stderr)
        sys.exit(1)

    result = analyze(str(repo_path), max_files=args.max_files)

    output_json = json.dumps(result, indent=2, default=str)

    if args.output:
        Path(args.output).write_text(output_json)
        print(f"Analysis written to {args.output}", file=sys.stderr)
    else:
        print(output_json)


if __name__ == "__main__":
    main()
