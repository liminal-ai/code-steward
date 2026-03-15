# Claude Agent SDK - Overview and Quickstart (Raw Research)

## Source: https://platform.claude.com/docs/en/agent-sdk/overview

The Claude Code SDK has been renamed to the Claude Agent SDK.

### Installation
- TypeScript: `npm install @anthropic-ai/claude-agent-sdk`
- Python: `pip install claude-agent-sdk`

### API Key Setup
- `export ANTHROPIC_API_KEY=your-api-key`
- Amazon Bedrock: `CLAUDE_CODE_USE_BEDROCK=1`
- Google Vertex AI: `CLAUDE_CODE_USE_VERTEX=1`
- Microsoft Azure: `CLAUDE_CODE_USE_FOUNDRY=1`

### Built-in Tools
| Tool | What it does |
|------|--------------|
| Read | Read any file in the working directory |
| Write | Create new files |
| Edit | Make precise edits to existing files |
| Bash | Run terminal commands, scripts, git operations |
| Glob | Find files by pattern |
| Grep | Search file contents with regex |
| WebSearch | Search the web |
| WebFetch | Fetch and parse web page content |
| AskUserQuestion | Ask clarifying questions |

### Capabilities
- Hooks: PreToolUse, PostToolUse, Stop, SessionStart, SessionEnd, UserPromptSubmit
- Subagents: Spawn specialized agents
- MCP: Model Context Protocol integration
- Permissions: Control tool access
- Sessions: Maintain context across exchanges

### Claude Code Features (via setting_sources)
- Skills: `.claude/skills/SKILL.md`
- Slash commands: `.claude/commands/*.md`
- Memory: `CLAUDE.md` or `.claude/CLAUDE.md`
- Plugins: Programmatic via plugins option

### Repositories
- TypeScript: https://github.com/anthropics/claude-agent-sdk-typescript (v0.2.76, 958 stars)
- Python: https://github.com/anthropics/claude-agent-sdk-python (v0.1.48, 5416 stars)
- Demos: https://github.com/anthropics/claude-agent-sdk-demos

### License
- Anthropic's Commercial Terms of Service
- Python SDK: MIT License
