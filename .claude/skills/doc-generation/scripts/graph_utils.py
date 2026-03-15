"""
Graph utilities for dependency analysis with cycle handling.

This module provides functions for building and analyzing dependency graphs,
including detection and resolution of dependency cycles.
"""

import logging
from typing import Dict, List, Set, Any

from models import Node

logger = logging.getLogger(__name__)


def detect_cycles(graph: Dict[str, Set[str]]) -> List[List[str]]:
    """
    Detect cycles in a dependency graph using Tarjan's algorithm to find
    strongly connected components.

    Args:
        graph: A dependency graph represented as adjacency lists
               (node -> set of dependencies)

    Returns:
        A list of lists, where each inner list contains the nodes in a cycle
    """
    # Implementation of Tarjan's algorithm
    index_counter = [0]
    index = {}  # node -> index
    lowlink = {}  # node -> lowlink value
    onstack = set()  # nodes currently on the stack
    stack = []  # stack of nodes
    result = []  # list of cycles (strongly connected components)

    def strongconnect(node):
        # Set the depth index for node
        index[node] = index_counter[0]
        lowlink[node] = index_counter[0]
        index_counter[0] += 1
        stack.append(node)
        onstack.add(node)

        # Consider successors
        for successor in graph.get(node, set()):
            if successor not in index:
                # Successor has not yet been visited; recurse on it
                strongconnect(successor)
                lowlink[node] = min(lowlink[node], lowlink[successor])
            elif successor in onstack:
                # Successor is on the stack and hence in the current SCC
                lowlink[node] = min(lowlink[node], index[successor])

        # If node is a root node, pop the stack and generate an SCC
        if lowlink[node] == index[node]:
            # Start a new strongly connected component
            scc = []
            while True:
                successor = stack.pop()
                onstack.remove(successor)
                scc.append(successor)
                if successor == node:
                    break

            # Only include SCCs with more than one node (actual cycles)
            if len(scc) > 1:
                result.append(scc)

    # Visit each node
    for node in graph:
        if node not in index:
            strongconnect(node)

    return result

def resolve_cycles(graph: Dict[str, Set[str]]) -> Dict[str, Set[str]]:
    """
    Resolve cycles in a dependency graph by identifying strongly connected
    components and breaking cycles.

    Args:
        graph: A dependency graph represented as adjacency lists
               (node -> set of dependencies)

    Returns:
        A new acyclic graph with the same nodes but with cycles broken
    """
    # Detect cycles (SCCs)
    cycles = detect_cycles(graph)

    if not cycles:
        logger.debug("No cycles detected in the dependency graph")
        return graph

    logger.debug(f"Detected {len(cycles)} cycles in the dependency graph")

    # Create a copy of the graph to modify
    new_graph = {node: deps.copy() for node, deps in graph.items()}

    # Process each cycle
    for i, cycle in enumerate(cycles):
        logger.debug(f"Cycle {i+1}: {' -> '.join(cycle)}")

        # Strategy: Break the cycle by removing the "weakest" dependency
        # Here, we just arbitrarily remove the last edge to make the graph acyclic
        # In a real-world scenario, you might use heuristics to determine which edge to break
        # For example, removing edges between different modules before edges within the same module
        for j in range(len(cycle) - 1):
            current = cycle[j]
            next_node = cycle[j + 1]

            if next_node in new_graph[current]:
                logger.debug(f"Breaking cycle by removing dependency: {current} -> {next_node}")
                new_graph[current].remove(next_node)
                break

    return new_graph

def build_graph_from_components(components: Dict[str, Any]) -> Dict[str, Set[str]]:
    """
    Build a dependency graph from a collection of code components.

    The graph uses the natural dependency direction:
    - If A depends on B, we create an edge A -> B
    - This means an edge from node X to node Y represents "X depends on Y"
    - Root nodes (nodes with no dependencies) are components that don't depend on anything

    Args:
        components: A dictionary of code components, where each component
                   has a 'depends_on' attribute

    Returns:
        A dependency graph with natural dependency direction
    """
    graph = {}

    for comp_id, component in components.items():
        # Initialize the node's adjacency list
        if comp_id not in graph:
            graph[comp_id] = set()

        # Add dependencies
        for dep_id in component.depends_on:
            # Only include dependencies that are actual components in our repository
            if dep_id in components:
                graph[comp_id].add(dep_id)

    return graph


def get_leaf_nodes(graph: Dict[str, Set[str]], components: Dict[str, Node]) -> List[str]:
    """
    Find leaf nodes (nodes that no other nodes depend on) and build dependency trees
    showing the full dependency chain from each leaf back to the ultimate dependencies.

    The graph uses natural dependency direction:
    - If A depends on B, the graph has an edge A -> B
    - Leaf nodes are nodes that appear in no other node's dependency set
    - Each tree shows the dependency chain: leaf -> its dependencies -> their dependencies, etc.

    Args:
        graph: A dependency graph with natural direction (A->B if A depends on B)
        components: Dictionary of Node components keyed by component ID

    Returns:
        A list of leaf nodes
    """
    # First, resolve cycles to ensure we have a DAG
    acyclic_graph = resolve_cycles(graph)

    # Find leaf nodes (nodes that no other nodes depend on)
    leaf_nodes = set(acyclic_graph.keys())



    def concise_node(leaf_nodes: Set[str]) -> Set[str]:
        concise_leaf_nodes = set()
        for node in leaf_nodes:
            if node.endswith("__init__"):
                # replace by class name
                concise_leaf_nodes.add(node.replace(".__init__", ""))
            else:
                concise_leaf_nodes.add(node)

        keep_leaf_nodes = []

        # Determine if we should include functions based on available component types
        # For C-based projects, we need to include functions since they don't have classes
        available_types = set()
        for comp in components.values():
            available_types.add(comp.component_type)

        # Valid types for leaf nodes - include functions for C-based codebases
        valid_types = {"class", "interface", "struct"}
        # If no classes/interfaces/structs are found, include functions
        if not available_types.intersection(valid_types):
            valid_types.add("function")

        for leaf_node in leaf_nodes:
            # Skip any leaf nodes that are clearly error strings or invalid identifiers
            if not isinstance(leaf_node, str) or leaf_node.strip() == "" or any(err_keyword in leaf_node.lower() for err_keyword in ['error', 'exception', 'failed', 'invalid']):
                logger.debug(f"Skipping invalid leaf node identifier: '{leaf_node}'")
                continue

            if leaf_node in components:
                if components[leaf_node].component_type in valid_types:
                    keep_leaf_nodes.append(leaf_node)
                else:
                    # logger.debug(f"Leaf node {leaf_node} is a {components[leaf_node].component_type}, removing it")
                    pass
            else:
                # logger.debug(f"Leaf node {leaf_node} not found in components, removing it")
                pass

        return keep_leaf_nodes

    concise_leaf_nodes = concise_node(leaf_nodes)
    if len(concise_leaf_nodes) >= 400:
        logger.debug(f"Leaf nodes are too many ({len(concise_leaf_nodes)}), removing dependencies of other nodes")
        # Remove nodes that are dependencies of other nodes
        for node, deps in acyclic_graph.items():
            for dep in deps:
                leaf_nodes.discard(dep)

        concise_leaf_nodes = concise_node(leaf_nodes)

    if not leaf_nodes:
        logger.warning("No leaf nodes found in the graph")
        return []

    return concise_leaf_nodes
