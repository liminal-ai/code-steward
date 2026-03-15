# Built-in Tools

## Tool Reference

| Tool | Category | Description |
|------|----------|-------------|
| **Read** | File I/O | Read any file (supports images, PDFs, Jupyter notebooks) |
| **Write** | File I/O | Create new files or overwrite existing ones |
| **Edit** | File I/O | Make precise string-replacement edits to files |
| **Bash** | Execution | Run terminal commands, scripts, git operations |
| **Glob** | Search | Find files by glob pattern (e.g., `**/*.ts`) |
| **Grep** | Search | Search file contents with regex (built on ripgrep) |
| **WebSearch** | Web | Search the web |
| **WebFetch** | Web | Fetch and parse web page content |
| **AskUserQuestion** | Interaction | Ask users clarifying questions with multiple choice |
| **Agent** | Orchestration | Spawn subagents for isolated tasks |
| **Skill** | Orchestration | Invoke Skills defined in `.claude/skills/` |
| **TodoWrite** | Tracking | Track task status and progress |
| **NotebookEdit** | File I/O | Modify Jupyter notebook cells |
| **BashOutput** | Execution | Get output from background bash processes |
| **KillBash** | Execution | Kill background bash processes |
| **ListMcpResources** | MCP | List available MCP server resources |
| **ReadMcpResource** | MCP | Read content from MCP server resources |
| **ToolSearch** | Discovery | Dynamically find and load deferred tools on-demand |

---

## Tool Approval Patterns

### Allow Specific Tools
```python
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Glob", "Grep"],  # Only these auto-approved
)
```

### Allow MCP Tools by Wildcard
```python
options = ClaudeAgentOptions(
    allowed_tools=[
        "Read", "Edit",
        "mcp__github__*",           # All tools from github server
        "mcp__my-tools__get_data",  # Specific MCP tool
    ],
)
```

### Deny Specific Tools
```python
options = ClaudeAgentOptions(
    disallowed_tools=["Bash", "Write"],  # Always blocked
    allowed_tools=["Read", "Edit", "Glob", "Grep"],
)
```

---

## Tool Input Schemas (Key Tools)

### Read
```json
{
  "file_path": "/absolute/path/to/file",
  "offset": 0,       // optional: start line
  "limit": 2000      // optional: max lines
}
```

### Write
```json
{
  "file_path": "/absolute/path/to/file",
  "content": "file content here"
}
```

### Edit
```json
{
  "file_path": "/absolute/path/to/file",
  "old_string": "text to find",
  "new_string": "replacement text",
  "replace_all": false
}
```

### Bash
```json
{
  "command": "ls -la",
  "description": "List files in current directory",
  "timeout": 120000,
  "run_in_background": false
}
```

### Glob
```json
{
  "pattern": "**/*.ts",
  "path": "/optional/search/root"
}
```

### Grep
```json
{
  "pattern": "function\\s+\\w+",
  "path": "/search/root",
  "glob": "*.ts",
  "output_mode": "content"
}
```

### Agent
```json
{
  "prompt": "Task for the subagent",
  "description": "Short description",
  "subagent_type": "general-purpose",
  "run_in_background": false
}
```
