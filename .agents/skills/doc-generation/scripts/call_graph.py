"""
Call Graph Analyzer

Central orchestrator for multi-language call graph analysis.
Coordinates language-specific analyzers to build comprehensive call graphs
across different programming languages in a repository.
"""

from typing import Dict, List
import logging
import traceback
from pathlib import Path
from models import Node, CallRelationship
from patterns import CODE_EXTENSIONS
from security import safe_open_text

logger = logging.getLogger(__name__)


class CallGraphAnalyzer:
    def __init__(self):
        """Initialize the call graph analyzer."""
        self.functions: Dict[str, Node] = {}
        self.call_relationships: List[CallRelationship] = []
        logger.debug("CallGraphAnalyzer initialized.")

    def analyze_code_files(self, code_files: List[Dict], base_dir: str) -> Dict:
        """
        Complete analysis: Analyze all files to build complete call graph with all nodes.

        This approach:
        1. Analyzes all code files
        2. Extracts all functions and relationships
        3. Builds complete call graph
        4. Returns all nodes and relationships
        """
        logger.debug(f"Starting analysis of {len(code_files)} files")

        self.functions = {}
        self.call_relationships = []

        files_analyzed = 0
        for file_info in code_files:
            logger.debug(f"Analyzing: {file_info['path']}")
            self._analyze_code_file(base_dir, file_info)
            files_analyzed += 1
        logger.debug(
            f"Analysis complete: {files_analyzed} files analyzed, {len(self.functions)} functions, {len(self.call_relationships)} relationships"
        )

        logger.debug("Resolving call relationships")
        self._resolve_call_relationships()
        self._deduplicate_relationships()

        return {
            "call_graph": {
                "total_functions": len(self.functions),
                "total_calls": len(self.call_relationships),
                "languages_found": list(set(f.get("language") for f in code_files)),
                "files_analyzed": files_analyzed,
                "analysis_approach": "complete_unlimited",
            },
            "functions": [func.to_dict() for func in self.functions.values()],
            "relationships": [rel.to_dict() for rel in self.call_relationships],
        }

    def extract_code_files(self, file_tree: Dict) -> List[Dict]:
        """
        Extract code files from file tree structure.

        Filters files based on supported extensions and excludes test/config files.

        Args:
            file_tree: Nested dictionary representing file structure

        Returns:
            List of code file information dictionaries
        """
        code_files = []

        def traverse(tree):
            if tree["type"] == "file":
                ext = tree.get("extension", "").lower()
                if ext in CODE_EXTENSIONS:
                    name = tree["name"].lower()
                    if not any(skip in name for skip in []):
                        code_files.append(
                            {
                                "path": tree["path"],
                                "name": tree["name"],
                                "extension": ext,
                                "language": CODE_EXTENSIONS[ext],
                            }
                        )
            elif tree["type"] == "directory" and tree.get("children"):
                for child in tree["children"]:
                    traverse(child)

        traverse(file_tree)
        return code_files

    def _analyze_code_file(self, repo_dir: str, file_info: Dict):
        """
        Analyze a single code file based on its language.

        Routes to appropriate language-specific analyzer.

        Args:
            repo_dir: Repository directory path
            file_info: File information dictionary
        """

        base = Path(repo_dir)
        file_path = base / file_info["path"]

        try:
            content = safe_open_text(base, file_path)
            language = file_info["language"]
            if language == "python":
                self._analyze_python_file(file_path, content, repo_dir)
            elif language == "javascript":
                self._analyze_javascript_file(file_path, content, repo_dir)
            elif language == "typescript":
                self._analyze_typescript_file(file_path, content, repo_dir)
            elif language == "java":
                self._analyze_java_file(file_path, content, repo_dir)
            elif language == "kotlin":
                self._analyze_kotlin_file(file_path, content, repo_dir)
            elif language == "csharp":
                self._analyze_csharp_file(file_path, content, repo_dir)
            elif language == "c":
                self._analyze_c_file(file_path, content, repo_dir)
            elif language == "cpp":
                self._analyze_cpp_file(file_path, content, repo_dir)
            elif language == "php":
                self._analyze_php_file(file_path, content, repo_dir)
            # else:
            #     logger.warning(
            #         f"Unsupported language for call graph analysis: {language} for file {file_path}"
            #     )

        except Exception as e:
            logger.error(f"Error analyzing {file_path}: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")

    def _analyze_python_file(self, file_path: str, content: str, base_dir: str):
        """
        Analyze Python file using Python AST analyzer.

        Args:
            file_path: Relative path to the Python file
            content: File content string
            base_dir: Repository base directory path
        """
        from lang.python_analyzer import analyze_python_file

        try:
            functions, relationships = analyze_python_file(
                file_path, content, repo_path=base_dir
            )

            for func in functions:
                func_id = func.id if func.id else f"{file_path}:{func.name}"
                self.functions[func_id] = func

            self.call_relationships.extend(relationships)
        except Exception as e:
            logger.error(f"Failed to analyze Python file {file_path}: {e}", exc_info=True)

    def _analyze_javascript_file(self, file_path: str, content: str, repo_dir: str):
        """
        Analyze JavaScript file using tree-sitter based AST analyzer

        Args:
            file_path: Relative path to the JavaScript file
            content: File content string
            repo_dir: Repository base directory
        """
        try:

            from lang.javascript_analyzer import analyze_javascript_file_treesitter

            functions, relationships = analyze_javascript_file_treesitter(
                file_path, content, repo_path=repo_dir
            )

            for func in functions:
                func_id = func.id if func.id else f"{file_path}:{func.name}"
                self.functions[func_id] = func

            self.call_relationships.extend(relationships)

        except Exception as e:
            logger.error(f"Failed to analyze JavaScript file {file_path}: {e}", exc_info=True)

    def _analyze_typescript_file(self, file_path: str, content: str, repo_dir: str):
        """
        Analyze TypeScript file using tree-sitter based AST analyzer

        Args:
            file_path: Relative path to the TypeScript file
            content: File content string
        """
        try:

            from lang.typescript_analyzer import analyze_typescript_file_treesitter

            functions, relationships = analyze_typescript_file_treesitter(
                file_path, content, repo_path=repo_dir
            )

            for func in functions:
                func_id = func.id if func.id else f"{file_path}:{func.name}"
                self.functions[func_id] = func

            self.call_relationships.extend(relationships)

        except Exception as e:
            logger.error(f"Failed to analyze TypeScript file {file_path}: {e}", exc_info=True)



    def _analyze_c_file(self, file_path: str, content: str, repo_dir: str):
        """
        Analyze C file using tree-sitter based analyzer.

        Args:
            file_path: Relative path to the C file
            content: File content string
            repo_dir: Repository base directory
        """
        from lang.c_analyzer import analyze_c_file

        functions, relationships = analyze_c_file(file_path, content, repo_path=repo_dir)

        for func in functions:
            func_id = func.id if func.id else f"{file_path}:{func.name}"
            self.functions[func_id] = func

        self.call_relationships.extend(relationships)

    def _analyze_cpp_file(self, file_path: str, content: str, repo_dir: str):
        """
        Analyze C++ file using tree-sitter based analyzer.

        Args:
            file_path: Relative path to the C++ file
            content: File content string
        """
        from lang.cpp_analyzer import analyze_cpp_file

        functions, relationships = analyze_cpp_file(
            file_path, content, repo_path=repo_dir
        )

        for func in functions:
            func_id = func.id if func.id else f"{file_path}:{func.name}"
            self.functions[func_id] = func

        self.call_relationships.extend(relationships)

    def _analyze_java_file(self, file_path: str, content: str, repo_dir: str):
        """
        Analyze Java file using tree-sitter based analyzer.

        Args:
            file_path: Relative path to the Java file
            content: File content string
            repo_dir: Repository base directory
        """
        from lang.java_analyzer import analyze_java_file

        try:
            functions, relationships = analyze_java_file(file_path, content, repo_path=repo_dir)
            for func in functions:
                func_id = func.id if func.id else f"{file_path}:{func.name}"
                self.functions[func_id] = func

            self.call_relationships.extend(relationships)
        except Exception as e:
            logger.error(f"Failed to analyze Java file {file_path}: {e}", exc_info=True)

    def _analyze_kotlin_file(self, file_path: str, content: str, repo_dir: str):
        """
        Analyze Kotlin file using tree-sitter based analyzer.

        Args:
            file_path: Relative path to the Kotlin file
            content: File content string
            repo_dir: Repository base directory
        """
        from lang.kotlin_analyzer import analyze_kotlin_file

        try:
            functions, relationships = analyze_kotlin_file(file_path, content, repo_path=repo_dir)
            for func in functions:
                func_id = func.id if func.id else f"{file_path}:{func.name}"
                self.functions[func_id] = func

            self.call_relationships.extend(relationships)
        except Exception as e:
            logger.error(f"Failed to analyze Kotlin file {file_path}: {e}", exc_info=True)

    def _analyze_csharp_file(self, file_path: str, content: str, repo_dir: str):
        """
        Analyze C# file using tree-sitter based analyzer.

        Args:
            file_path: Relative path to the C# file
            content: File content string
            repo_dir: Repository base directory
        """
        from lang.csharp_analyzer import analyze_csharp_file

        try:
            functions, relationships = analyze_csharp_file(file_path, content, repo_path=repo_dir)

            for func in functions:
                func_id = func.id if func.id else f"{file_path}:{func.name}"
                self.functions[func_id] = func

            self.call_relationships.extend(relationships)
        except Exception as e:
            logger.error(f"Failed to analyze C# file {file_path}: {e}", exc_info=True)

    def _analyze_php_file(self, file_path: str, content: str, repo_dir: str):
        """
        Analyze PHP file using tree-sitter based analyzer.

        Args:
            file_path: Relative path to the PHP file
            content: File content string
            repo_dir: Repository base directory
        """
        from lang.php_analyzer import analyze_php_file

        try:
            functions, relationships = analyze_php_file(file_path, content, repo_path=repo_dir)

            for func in functions:
                func_id = func.id if func.id else f"{file_path}:{func.name}"
                self.functions[func_id] = func

            self.call_relationships.extend(relationships)
        except Exception as e:
            logger.error(f"Failed to analyze PHP file {file_path}: {e}", exc_info=True)

    def _resolve_call_relationships(self):
        """
        Resolve function call relationships across all languages.

        Attempts to match function calls to actual function definitions,
        handling cross-language calls where possible.
        """
        func_lookup = {}
        for func_id, func_info in self.functions.items():
            func_lookup[func_id] = func_id
            func_lookup[func_info.name] = func_id
            if func_info.component_id:
                func_lookup[func_info.component_id] = func_id
                method_name = func_info.component_id.split(".")[-1]
                if method_name not in func_lookup:
                    func_lookup[method_name] = func_id

        resolved_count = 0
        for relationship in self.call_relationships:
            callee_name = relationship.callee

            if callee_name in func_lookup:
                relationship.callee = func_lookup[callee_name]
                relationship.is_resolved = True
                resolved_count += 1
            elif "." in callee_name:
                if callee_name in func_lookup:
                    relationship.callee = func_lookup[callee_name]
                    relationship.is_resolved = True
                    resolved_count += 1
                else:
                    method_name = callee_name.split(".")[-1]
                    if method_name in func_lookup:
                        relationship.callee = func_lookup[method_name]
                        relationship.is_resolved = True
                        resolved_count += 1

    def _deduplicate_relationships(self):
        """
        Deduplicate call relationships based on caller-callee pairs.

        Removes duplicate relationships while preserving the first occurrence.
        This helps eliminate noise from multiple calls to the same function.
        """
        seen = set()
        unique_relationships = []

        for rel in self.call_relationships:
            key = (rel.caller, rel.callee)
            if key not in seen:
                seen.add(key)
                unique_relationships.append(rel)

        self.call_relationships = unique_relationships
