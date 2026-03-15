# Migration Guide: Claude Code SDK → Claude Agent SDK

The SDK was renamed from "Claude Code SDK" to "Claude Agent SDK" in early 2026.

## Package Changes

| Aspect | Old (Claude Code SDK) | New (Claude Agent SDK) |
|--------|----------------------|----------------------|
| TS Package | `@anthropic-ai/claude-code` | `@anthropic-ai/claude-agent-sdk` |
| Python Package | `claude-code-sdk` | `claude-agent-sdk` |
| Python Import | `from claude_code_sdk import ...` | `from claude_agent_sdk import ...` |
| Python Options | `ClaudeCodeOptions` | `ClaudeAgentOptions` |

---

## Breaking Changes

### 1. System Prompt No Longer Default

**Before (Claude Code SDK):**
```python
# Automatically included Claude Code's system prompt
options = ClaudeCodeOptions(allowed_tools=["Read"])
```

**After (Claude Agent SDK):**
```python
# No system prompt by default - agent has no predefined persona
options = ClaudeAgentOptions(allowed_tools=["Read"])

# To get Claude Code's system prompt explicitly:
options = ClaudeAgentOptions(
    system_prompt={"type": "preset", "preset": "claude_code"},
    allowed_tools=["Read"],
)
```

### 2. Settings Sources No Longer Loaded

**Before:**
```python
# Automatically loaded CLAUDE.md, .claude/ settings
options = ClaudeCodeOptions(allowed_tools=["Read"])
```

**After:**
```python
# Must explicitly opt in to loading filesystem settings
options = ClaudeAgentOptions(
    setting_sources=["user", "project", "local"],
    allowed_tools=["Read"],
)
```

### 3. ClaudeCodeOptions Renamed

**Before:**
```python
from claude_code_sdk import ClaudeCodeOptions
```

**After:**
```python
from claude_agent_sdk import ClaudeAgentOptions
```

---

## Migration Steps

### Python

```bash
# 1. Update package
pip uninstall claude-code-sdk
pip install claude-agent-sdk

# 2. Update imports (find and replace)
# from claude_code_sdk → from claude_agent_sdk
# ClaudeCodeOptions → ClaudeAgentOptions
```

```python
# 3. Add system prompt if you need Claude Code behavior
options = ClaudeAgentOptions(
    system_prompt={"type": "preset", "preset": "claude_code"},
    setting_sources=["user", "project", "local"],
    # ... rest of your options
)
```

### TypeScript

```bash
# 1. Update package
npm uninstall @anthropic-ai/claude-code
npm install @anthropic-ai/claude-agent-sdk

# 2. Update imports
# "@anthropic-ai/claude-code" → "@anthropic-ai/claude-agent-sdk"
```

```typescript
// 3. Add system prompt if needed
const options = {
  systemPrompt: { type: "preset", preset: "claude_code" },
  settingSources: ["user", "project", "local"],
  // ... rest
};
```

---

## Compatibility Period

Both packages may coexist during migration. The old packages (`claude-code-sdk`, `@anthropic-ai/claude-code`) may continue to receive critical fixes for a limited time, but all new features are only in the Agent SDK.
