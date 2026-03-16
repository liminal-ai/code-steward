# Claude Code Local Plugin Installation

## Summary

There are two distinct methods to use a local plugin with Claude Code, and neither involves a direct "register this directory as a plugin" command. The primary approaches are:

1. **`--plugin-dir` flag** (for development/testing): Load a local plugin directory for the duration of a single session.
2. **Local marketplace** (for persistent installation): Create a `marketplace.json` in your plugin directory, add it as a local marketplace, then install the plugin from that marketplace.

There is no `claude plugin install ./local-path` command. The `plugin install` command only works with marketplace-registered plugins.

## Key Findings

- The `--plugin-dir` flag is the simplest way to load a local plugin. It requires no marketplace setup.
- For persistent installation, you must wrap your plugin in a local marketplace and then install from it.
- Plugin installation scopes are: `user` (default, `~/.claude/settings.json`), `project` (`.claude/settings.json`), and `local` (`.claude/settings.local.json`).
- The `/plugin` slash command inside Claude Code opens an interactive plugin manager with Discover, Installed, Marketplaces, and Errors tabs.
- Requires Claude Code version 1.0.33 or later.

## Detailed Analysis

### Method 1: `--plugin-dir` Flag (Development/Testing)

This is the recommended approach during development. Launch Claude Code with the flag pointing to your plugin directory:

```bash
claude --plugin-dir ./code-steward-reviews
```

This loads the plugin for the current session only. The plugin's skills will be available under the namespace defined by the `name` field in `.claude-plugin/plugin.json`. For example, if your plugin is named `code-steward-reviews`, skills would be accessible as `/code-steward-reviews:skill-name`.

You can load multiple local plugins simultaneously:

```bash
claude --plugin-dir ./code-steward-reviews --plugin-dir ./another-plugin
```

Key behaviors:
- Changes to plugin files can be picked up by running `/reload-plugins` inside the session (except LSP changes, which need a full restart).
- If a `--plugin-dir` plugin has the same name as an installed marketplace plugin, the local copy takes precedence for that session.
- The plugin is NOT persisted between sessions.

### Method 2: Local Marketplace (Persistent Installation)

To have the plugin installed persistently (surviving across sessions), you need to set up a local marketplace. This requires adding a `marketplace.json` file.

**Step 1: Create the marketplace manifest**

Add a file at `.claude-plugin/marketplace.json` inside your plugin directory (or at a parent directory that contains the plugin):

```json
{
  "name": "code-steward-marketplace",
  "description": "Local marketplace for Code Steward plugins",
  "plugins": [
    {
      "name": "code-steward-reviews",
      "description": "Code review skills for Code Steward",
      "version": "1.0.0",
      "source": "./"
    }
  ]
}
```

**Step 2: Add the local marketplace**

From within Claude Code:

```
/plugin marketplace add ./code-steward-reviews
```

Or if you have the marketplace.json at a specific path:

```
/plugin marketplace add ./path/to/marketplace.json
```

**Step 3: Install the plugin from the marketplace**

```
/plugin install code-steward-reviews@code-steward-marketplace
```

To choose a scope:

```bash
# User scope (default) -- available in all projects
claude plugin install code-steward-reviews@code-steward-marketplace

# Project scope -- shared with team via .claude/settings.json
claude plugin install code-steward-reviews@code-steward-marketplace --scope project

# Local scope -- project-specific, gitignored
claude plugin install code-steward-reviews@code-steward-marketplace --scope local
```

### What Gets Written to Settings Files

When you install a plugin, it gets added to `enabledPlugins` in the appropriate settings file based on scope:

| Scope     | Settings File                    | Shared with Team? |
|-----------|----------------------------------|--------------------|
| `user`    | `~/.claude/settings.json`       | No                 |
| `project` | `.claude/settings.json`         | Yes (via VCS)      |
| `local`   | `.claude/settings.local.json`   | No (gitignored)    |

### Plugin Directory Structure Requirements

Your plugin at `./code-steward-reviews/` should have this structure:

```
code-steward-reviews/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest (only file in this dir)
├── commands/                # Slash commands (markdown files)
├── skills/                  # Agent skills (directories with SKILL.md)
├── agents/                  # Subagent definitions
├── hooks/                   # Event handlers (hooks.json)
├── .mcp.json                # MCP server configs (optional)
├── .lsp.json                # LSP server configs (optional)
└── settings.json            # Default settings (optional)
```

Important: Do NOT put commands/, agents/, skills/, or hooks/ inside `.claude-plugin/`. Only `plugin.json` goes there.

### Minimum plugin.json

The only required field is `name`:

```json
{
  "name": "code-steward-reviews"
}
```

A more complete manifest:

```json
{
  "name": "code-steward-reviews",
  "description": "Code review automation for Code Steward",
  "version": "1.0.0",
  "author": {
    "name": "Lee Moore"
  }
}
```

### Team Configuration (Project Scope)

To have the plugin automatically available for your team, add to `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "code-steward-marketplace": {
      "source": {
        "source": "local",
        "path": "./code-steward-reviews"
      }
    }
  }
}
```

Team members will be prompted to install the marketplace and plugins when they trust the repository folder.

### Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `claude --plugin-dir ./path` | Load local plugin for one session |
| `/plugin` | Open interactive plugin manager |
| `/plugin install name@marketplace` | Install a plugin |
| `/plugin uninstall name@marketplace` | Remove a plugin |
| `/plugin enable name` | Enable a disabled plugin |
| `/plugin disable name` | Disable without uninstalling |
| `/plugin marketplace add ./path` | Add a local marketplace |
| `/plugin marketplace list` | List configured marketplaces |
| `/plugin marketplace remove name` | Remove a marketplace |
| `/reload-plugins` | Reload plugins without restart |
| `claude --debug` | Launch with plugin debug logging |

## Sources

- [Create plugins - Claude Code Official Docs](https://code.claude.com/docs/en/plugins) - Official Anthropic documentation, highly authoritative
- [Plugins reference - Claude Code Official Docs](https://code.claude.com/docs/en/plugins-reference) - Complete technical specifications, highly authoritative
- [Discover and install plugins - Claude Code Official Docs](https://code.claude.com/docs/en/discover-plugins) - Installation and marketplace guide, highly authoritative
- [How to Build Claude Code Plugins - DataCamp](https://www.datacamp.com/tutorial/how-to-build-claude-code-plugins) - Tutorial from recognized platform, Feb 2026
- [Claude Code Plugins Guide - Morph](https://www.morphllm.com/claude-code-plugins) - Overview guide, Feb 2026

## Confidence Assessment

- **Overall confidence**: High. The information comes directly from Anthropic's official documentation at code.claude.com.
- **Areas of certainty**: The `--plugin-dir` flag method is thoroughly documented and is the recommended development approach. The marketplace-based installation path is well-documented.
- **Areas of minor uncertainty**: The exact format for `extraKnownMarketplaces` with a local source path -- the docs show GitHub sources explicitly but local path configuration is less thoroughly documented in the team configuration context.
- **Recommendation**: For your use case (a plugin living inside the project repo), **start with `--plugin-dir`** for development, then set up a local marketplace when you want persistent installation or team distribution.
