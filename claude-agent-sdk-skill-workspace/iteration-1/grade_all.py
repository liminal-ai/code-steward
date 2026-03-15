#!/usr/bin/env python3
"""Grade all eval outputs against assertions programmatically."""
import json
import re
import os

BASE = "/Users/leemoore/code/code-steward/claude-agent-sdk-skill-workspace/iteration-1"

def read_file(path):
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        return ""

def check(code, pattern, flags=0):
    return bool(re.search(pattern, code, flags))

def grade_eval1(code):
    """PR Reviewer Agent - TypeScript"""
    return [
        {"text": "Uses correct import from @anthropic-ai/claude-agent-sdk",
         "passed": check(code, r'from\s+["\']@anthropic-ai/claude-agent-sdk["\']'),
         "evidence": "Found correct import" if check(code, r'from\s+["\']@anthropic-ai/claude-agent-sdk["\']') else "Missing or wrong import"},
        {"text": "Uses the query() function or TS V2 session API",
         "passed": check(code, r'\bquery\s*\(') or check(code, r'createSession'),
         "evidence": "Found query() usage" if check(code, r'\bquery\s*\(') else "No query() found"},
        {"text": "Defines custom MCP tools using createSdkMcpServer() and tool()",
         "passed": check(code, r'createSdkMcpServer') and check(code, r'\btool\s*\('),
         "evidence": f"createSdkMcpServer: {check(code, r'createSdkMcpServer')}, tool(): {check(code, r'tool\(')}"},
        {"text": "Uses Zod for tool input schemas",
         "passed": check(code, r'z\.\w+') and check(code, r'from\s+["\']zod["\']'),
         "evidence": "Found Zod import and usage" if check(code, r'z\.\w+') else "No Zod usage"},
        {"text": "Uses correct MCP tool naming convention mcp__<server>__<tool>",
         "passed": check(code, r'mcp__\w+__'),
         "evidence": "Found mcp__ naming pattern" if check(code, r'mcp__\w+__') else "No mcp__ pattern"},
        {"text": "Configures allowedTools with MCP tool references",
         "passed": check(code, r'allowedTools.*mcp__', re.DOTALL) or check(code, r'allowedTools.*\[.*mcp', re.DOTALL),
         "evidence": "Found allowedTools with MCP refs" if check(code, r'allowedTools.*mcp__', re.DOTALL) else "No MCP in allowedTools"},
        {"text": "Handles result messages",
         "passed": check(code, r'result') and (check(code, r'message\.type\s*===\s*["\']result["\']') or check(code, r'\.subtype') or check(code, r'ResultMessage')),
         "evidence": "Found result handling"},
        {"text": "Implementation includes PR-specific logic",
         "passed": check(code, r'(pull|pr|review|diff|comment)', re.IGNORECASE),
         "evidence": "Found PR-related logic"},
    ]

def grade_eval2(code):
    """Python Multi-Agent System"""
    return [
        {"text": "Uses correct import from claude_agent_sdk (not claude_code_sdk)",
         "passed": check(code, r'from\s+claude_agent_sdk') and not check(code, r'from\s+claude_code_sdk'),
         "evidence": "claude_agent_sdk" if check(code, r'from\s+claude_agent_sdk') else ("claude_code_sdk (wrong)" if check(code, r'from\s+claude_code_sdk') else "Neither found")},
        {"text": "Uses ClaudeAgentOptions (not ClaudeCodeOptions)",
         "passed": check(code, r'ClaudeAgentOptions') and not check(code, r'ClaudeCodeOptions'),
         "evidence": "ClaudeAgentOptions" if check(code, r'ClaudeAgentOptions') else ("ClaudeCodeOptions (wrong)" if check(code, r'ClaudeCodeOptions') else "Neither found")},
        {"text": "Uses AgentDefinition for subagent definitions",
         "passed": check(code, r'AgentDefinition'),
         "evidence": "Found AgentDefinition" if check(code, r'AgentDefinition') else "No AgentDefinition"},
        {"text": "Uses snake_case for option names",
         "passed": check(code, r'allowed_tools') or check(code, r'max_turns') or check(code, r'permission_mode'),
         "evidence": "Found snake_case options" if check(code, r'allowed_tools') else "No snake_case options"},
        {"text": "Includes 'Agent' in allowed_tools for the coordinator",
         "passed": check(code, r'["\']Agent["\']') and check(code, r'allowed_tools'),
         "evidence": "Found Agent in allowed_tools context" if check(code, r'["\']Agent["\']') else "No Agent tool reference"},
        {"text": "Defines at least 2 subagents (researcher and writer)",
         "passed": check(code, r'research', re.IGNORECASE) and check(code, r'writ', re.IGNORECASE) and (check(code, r'AgentDefinition') or check(code, r'agents\s*=')),
         "evidence": "Found researcher and writer definitions"},
        {"text": "Uses async for pattern with query() or ClaudeSDKClient",
         "passed": check(code, r'async\s+for') and (check(code, r'\bquery\s*\(') or check(code, r'ClaudeSDKClient')),
         "evidence": "Found async for with query/client" if check(code, r'async\s+for') else "No async for pattern"},
        {"text": "Includes asyncio.run() or proper async entry point",
         "passed": check(code, r'asyncio\.run') or check(code, r'async\s+def\s+main'),
         "evidence": "Found asyncio.run" if check(code, r'asyncio\.run') else ("Found async def main" if check(code, r'async\s+def\s+main') else "No async entry point")},
    ]

def grade_eval3(code):
    """Security Hooks - TypeScript"""
    return [
        {"text": "Uses correct import from @anthropic-ai/claude-agent-sdk",
         "passed": check(code, r'from\s+["\']@anthropic-ai/claude-agent-sdk["\']'),
         "evidence": "Found correct import" if check(code, r'from\s+["\']@anthropic-ai/claude-agent-sdk["\']') else "Missing or wrong import"},
        {"text": "Implements PreToolUse hook(s)",
         "passed": check(code, r'PreToolUse'),
         "evidence": "Found PreToolUse" if check(code, r'PreToolUse') else "No PreToolUse"},
        {"text": "Uses matcher pattern to target specific tools",
         "passed": check(code, r'matcher') and (check(code, r'Write|Edit') or check(code, r'Write\|Edit')),
         "evidence": "Found matcher with tool patterns" if check(code, r'matcher') else "No matcher"},
        {"text": "Returns proper deny structure with hookSpecificOutput/permissionDecision/deny",
         "passed": check(code, r'hookSpecificOutput') and check(code, r'permissionDecision') and check(code, r'deny'),
         "evidence": "Found correct deny structure" if check(code, r'hookSpecificOutput') else "Wrong deny structure"},
        {"text": "Checks file paths for sensitive patterns (.env, credentials, secrets, etc.)",
         "passed": check(code, r'\.env') and (check(code, r'credential') or check(code, r'secret') or check(code, r'key')),
         "evidence": "Found sensitive file checks"},
        {"text": "Implements audit/logging hook that records tool usage",
         "passed": check(code, r'(audit|log)', re.IGNORECASE) and (check(code, r'tool_name') or check(code, r'toolName')),
         "evidence": "Found audit logging" if check(code, r'audit', re.IGNORECASE) else "No audit logging"},
        {"text": "Uses async_: true for non-blocking audit hooks",
         "passed": check(code, r'async_:\s*true') or check(code, r'async_\s*=\s*True'),
         "evidence": "Found async_: true" if check(code, r'async_') else "No async_ usage"},
        {"text": "Shows how to integrate hooks into the agent options object",
         "passed": check(code, r'hooks\s*:') or check(code, r'hooks\s*='),
         "evidence": "Found hooks in options" if check(code, r'hooks\s*:') else "No hooks integration"},
    ]

# Grade all 6 runs
results = {}
evals = [
    ("eval-1-pr-reviewer-agent", "pr-reviewer-agent.ts", grade_eval1),
    ("eval-2-python-multi-agent", "multi_agent_system.py", grade_eval2),
    ("eval-3-security-hooks", "security-hooks.ts", grade_eval3),
]

for eval_dir, filename, grader in evals:
    for variant in ["with_skill", "without_skill"]:
        code_path = os.path.join(BASE, eval_dir, variant, "outputs", filename)
        code = read_file(code_path)

        if not code:
            print(f"WARNING: No code found at {code_path}")
            grades = [{"text": a["text"], "passed": False, "evidence": "File not found"} for a in grader("")]
        else:
            grades = grader(code)

        passed = sum(1 for g in grades if g["passed"])
        total = len(grades)

        grading = {
            "eval_name": eval_dir,
            "variant": variant,
            "pass_rate": passed / total if total > 0 else 0,
            "passed": passed,
            "total": total,
            "expectations": grades,
        }

        out_path = os.path.join(BASE, eval_dir, variant, "grading.json")
        with open(out_path, "w") as f:
            json.dump(grading, f, indent=2)

        results[f"{eval_dir}/{variant}"] = grading
        print(f"{eval_dir}/{variant}: {passed}/{total} ({passed/total*100:.0f}%)")

# Summary
print("\n=== SUMMARY ===")
for key, g in results.items():
    print(f"  {key}: {g['passed']}/{g['total']} ({g['pass_rate']*100:.0f}%)")

# Write summary
with open(os.path.join(BASE, "grading_summary.json"), "w") as f:
    json.dump(results, f, indent=2)
