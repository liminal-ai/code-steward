# Skills & Plugins

## Skills

Skills are specialized capabilities defined as `SKILL.md` files. They provide reusable instructions that the agent can invoke when relevant.

### Directory Structure
```
.claude/
  skills/
    deploy/
      SKILL.md          # Deployment instructions
    code-review/
      SKILL.md          # Code review guidelines
    testing/
      SKILL.md          # Testing standards
```

### SKILL.md Format
```markdown
---
name: deploy
description: Deploy the application to staging or production
---

## Instructions

1. Run the test suite first: `npm test`
2. Build the application: `npm run build`
3. Deploy to the target environment...

## Rules
- Always deploy to staging before production
- Never deploy on Fridays
```

### Enabling Skills

```python
options = ClaudeAgentOptions(
    allowed_tools=["Skill", "Read", "Bash"],  # Skill tool required
    setting_sources=["user", "project"],       # Load from filesystem
)
```

### How Skills Work
1. Agent discovers available skills from `.claude/skills/` directories
2. When a task matches a skill's description, Claude invokes it via the `Skill` tool
3. The skill's instructions are injected into the conversation context
4. Agent follows the skill's instructions to complete the task

---

## Plugins

Plugins extend the agent with custom commands, agents, skills, hooks, and MCP servers. They package multiple capabilities into a single distributable unit.

### Plugin Configuration

```python
options = ClaudeAgentOptions(
    plugins=[
        {"type": "local", "path": "./my-plugin"},
        {"type": "local", "path": "/absolute/path/to/plugin"},
    ],
)
```

### Plugin Directory Structure
```
my-plugin/
  .claude-plugin/
    plugin.json         # Required manifest
  skills/
    my-skill/
      SKILL.md          # Plugin-provided skills
  agents/
    my-agent.md         # Custom agent definitions
  hooks/
    pre-tool-use.js     # Event handlers
  .mcp.json             # MCP server definitions
```

### plugin.json Manifest
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "A plugin that adds custom capabilities",
  "skills": ["skills/"],
  "agents": ["agents/"],
  "hooks": {
    "PreToolUse": ["hooks/pre-tool-use.js"]
  }
}
```

### Plugin Namespacing

Plugin resources are namespaced to avoid conflicts:
- Skills: `my-plugin:skill-name`
- Agents: `my-plugin:agent-name`
- MCP tools: `mcp__my-plugin__tool-name`

### Plugin Use Cases
- **Team standards** - Package code review rules, testing requirements, deployment procedures
- **Tool bundles** - Group related MCP servers and custom tools
- **Domain expertise** - Package domain-specific knowledge and workflows
- **Shared configurations** - Distribute common hooks and permission patterns
