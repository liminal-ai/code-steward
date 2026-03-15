"""
Data models for code analysis.

Adapted from CodeWiki (MIT License) - converted from Pydantic to dataclasses.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Set


@dataclass
class Node:
    id: str
    name: str
    component_type: str
    file_path: str
    relative_path: str
    depends_on: Set[str] = field(default_factory=set)
    source_code: Optional[str] = None
    start_line: int = 0
    end_line: int = 0
    has_docstring: bool = False
    docstring: str = ""
    parameters: Optional[List[str]] = None
    node_type: Optional[str] = None
    base_classes: Optional[List[str]] = None
    class_name: Optional[str] = None
    display_name: Optional[str] = None
    component_id: Optional[str] = None

    def get_display_name(self) -> str:
        return self.display_name or self.name

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "component_type": self.component_type,
            "file_path": self.file_path,
            "relative_path": self.relative_path,
            "depends_on": sorted(list(self.depends_on)),
            "source_code": self.source_code,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "has_docstring": self.has_docstring,
            "docstring": self.docstring,
            "parameters": self.parameters,
            "node_type": self.node_type,
            "base_classes": self.base_classes,
            "class_name": self.class_name,
            "display_name": self.display_name,
            "component_id": self.component_id,
        }


@dataclass
class CallRelationship:
    caller: str
    callee: str
    call_line: Optional[int] = None
    is_resolved: bool = False

    def to_dict(self) -> dict:
        return {
            "caller": self.caller,
            "callee": self.callee,
            "call_line": self.call_line,
            "is_resolved": self.is_resolved,
        }
