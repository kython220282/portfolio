---
title: "Claude Code Guardrail: Architecting Defense-in-Depth for Agentic Coding"
description: "A deep dive into securing autonomous CLI coding agents using a three-layer defense-in-depth framework—combining advisory policies, scoped permissions, and deterministic pre-execution hooks."
keywords: ["Agentic Guardrails", "Claude Code Guardrails", "AI Security", "DevSecOps", "Policy-as-Code", "Autonomous Coding Agents"]
tags: ["AI Security", "DevSecOps", "Claude Code", "Agentic AI", "AI Architecture", "Software Engineering"]
weight: 2
cover:
  image: "blog/claude-code-guardrails/defense-in-depth.png"

dateString: August 2026
draft: false
meta_title: "Architecting Secure Agentic Workflows: Claude Code Guardrails"
meta_description: "Learn how to secure Claude Code using defense-in-depth: advisory CLAUDE.md policies, .claude/settings.json permissions deny rules, and deterministic exit 2 safety hooks."
meta_author: "Karan Raj Sharma"
meta_date: 2026-08-29
---

The progression of AI-assisted software engineering has moved through two distinct phases. Phase one was autocomplete: the LLM lived inside an editor window, observed surrounding tokens, and suggested completions. Phase two is agentic: tools like Claude Code act as autonomous loops that navigate a directory tree, read files, edit codebases, run test suites, and execute arbitrary shell commands directly on your local system.

When you transition from an assistant generating text to an agent running shell sub-processes, your threat model changes entirely.

The core question is no longer just how to prompt the model to write cleaner functions. The architectural question is: What invariants protect your system when an autonomous agent tries to read, edit or delete something it shouldn't?  

An LLM is a probabilistic token predictor, not a hardened security kernel. If you grant an agent shell access, relying on natural language prompts or human vigilance to catch every dangerous operation is a recipe for catastrophic failures—from wiped disks `rm -rf /` to leaked `.env` secrets.

To run autonomous agents safely, you need a deterministic **Defense-in-Depth** architecture.  

---

## 1. The Mental Model: Soft vs. Hard Boundaries

When securing agentic CLI workflows, controls fall into two fundamental categories:

1. **Soft (Advisory) Controls**: Probabilistic guidance that influences the model's generation (e.g., system prompts, instructions).
2. **Hard (Deterministic) Controls**: Code-level gates that execute outside the model's context window and physically block execution via the OS kernel (e.g., process interceptors, exit codes).

A common failure in AI engineering is confusing advisory instruction with deterministic enforcement. A robust setup structures safety across three distinct layers:

```plaintext
+-------------------------------------------------------------+
| Layer 1: Advisory Context (CLAUDE.md)                       |
| -> Soft / Probabilistic: Guides coding style & intent       |
+-------------------------------------------------------------+
                              │
                              ▼
+-------------------------------------------------------------+
| Layer 2: Tool Permissions (.claude/settings.json)           |
| -> Declarative / Interactive: Restricts native tool calls   |
+-------------------------------------------------------------+
                              │
                              ▼
+-------------------------------------------------------------+
| Layer 3: Deterministic Pre-Execution Hooks (exit 2)         |
| -> Hard / Programmatic: Intercepts raw payloads on stdin    |
+-------------------------------------------------------------+
```

### Layer 1 Advisory Policy (`CLAUDE.md`)

The entry point for steering Claude Code is the repository-level `CLAUDE.md` file. It injects domain context, coding guidelines, and baseline operational boundaries directly into the prompt context.

Define Security policy in `CLAUDE.md` file.

```plaintext
# Security Policy

- Never hardcode secrets or API keys; retrieve them strictly via `os.environ` or `os.getenv`.
- Never generate dynamic execution primitives (`eval()`, `exec()`).
- Never make unvetted outbound network calls.
- Confine file deletions strictly to build target directories.

```
**The Failure Mode** - `CLAUDE.md` is **advisory**. 

It acts like a software style guide rather than an operating system sandbox. Under complex multi-step reasoning, context compression, or subtle prompt injections, an LLM can drift away from prompt-level instructions. Red-team testing consistently reveals that `CLAUDE.md` is the easiest boundary to bypass.

### Layer 2: Tool Permission Denials (`.claude/settings.json`)
To limit the agent's built-in tool abilities, Claude Code allows you to declare permission deny rules in `.claude/settings.json`.

```plaintext
JSON
{
  "permissions": {
    "deny": [
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Read(**/secrets/**)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Bash(rm -rf *)"
    ]
  }
}
```
These rules explicitly block Claude’s built-in `Read` tool from opening `.env` files or recursing into `/secrets/` directories, while disallowing risky network calls (`curl`, `wget`) and destructive commands (`rm -rf *`).

**The Failure Mode** - **The Interface vs. Capability Gap**

Permission deny rules introduce a subtle architectural vulnerability: they restrict the tool interface, not the underlying system capability. if you block `Read(**/.env)`, the agent's built-in `Read` tool cannot open `.env`. But if the agent has access to a generic terminal execution tool (`Bash`), it can simply execute `cat .env` to bypasses the `Read` tool boundary entirely and routes through the sub-process shell.

```plaintext
[Agent Goal: Inspect .env]
       │
       ├──► Built-in Read Tool ──► Blocked by settings.json
       │
       └──► Shell Subprocess (Bash: "cat .env") ──► Bypasses settings.json
```
Furthermore, standard tool permissions rely on user confirmations in the CLI. In real-world workflows, developers suffer from **approval fatigue**—after approving 20 safe commands, they will eventually press "Allow" on a catastrophic one without reading the full command string.

### Layer 3: Deterministic Pre-Execution Hooks
To guarantee execution invariants, you must step outside the LLM context loop and execute deterministic code.

Hooks act as pre-execution gates. Before Claude Code runs an action, the tool payload is piped to a hook script via standard input (`stdin`). The script parses the payload, evaluates it against hard security rules, and—if a violation occurs—writes to `stderr` and exits with `exit 2`.

An `exit 2` return code immediately aborts the tool call with a hard stop. It does not display a confirmation prompt and cannot be overridden by an inattentive developer.  

```plaintext
Agent Action Intent ──► Hook Intercepts Payload (stdin) ──► Regex & Path Inspection
                                                                   │
                         ┌─────────────────────────────────────────┴───────────────┐
                         ▼                                                         ▼
                 [ Pattern Matches ]                                      [ Safe Operation ]
                         │                                                         │
             stderr: "Blocked..." ──► exit 2                              Allow Action (exit 0)
         (Hard Abort / Zero User Override)

```
#### 1. The File Protection Hook
Intercepts file access to protect secret stores, environment files, lockfiles, and git state from read or write operations:
```plaintext
PowerShell

# Read JSON payload from stdin
$inputJson = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($inputJson)) { exit 0 }

try {
    $data = $inputJson | ConvertFrom-Json
} catch {
    exit 0
}

# Extract file path safely
$filePath = $data.tool_input.file_path
if (-not $filePath) { exit 0 }

# Define protected patterns (case-insensitive substring match)
$protectedPatterns = @("*.env*", "*package-lock.json*", "*key*", "*.git/*", "*.git", "*secrets/*", "*secrets*")
foreach ($pattern in $protectedPatterns) {
    if ($filePath -like $pattern) {
        [Console]::Error.WriteLine("Blocked: $filePath matches protected pattern $pattern")
        exit 2
    }
}
exit 0
```

#### 2. The Dangerous Shell Interceptor Hook
Inspects raw CLI commands across Bash, cmd, and PowerShell to catch destructive deletions, pipe-to-shell patterns, SQL table drops, and subshell `.env` writes:
```plaintext
Powershell

# Read JSON payload from stdin
$inputJson = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($inputJson)) { exit 0 }

try {
    $data = $inputJson | ConvertFrom-Json
} catch {
    exit 0
}

$command = $data.tool_input.command
if (-not $command) { exit 0 }

# 1. Block destructive recursive deletions
if ($command -match 'rm\s+-rf\s+(/|\*)' -or 
    $command -match 'Remove-Item.*-Recurse' -or 
    $command -match 'rd\s+/s\s+/q\s+([A-Za-z]:\\|\*)') {
    [Console]::Error.WriteLine("Blocked: dangerous recursive deletion detected")
    exit 2
}

# 2. Block pipe-to-shell patterns (untrusted code execution)
if ($command -match '\|\s*(sh|bash|zsh|pwsh|powershell|iex|Invoke-Expression)') {
    [Console]::Error.WriteLine("Blocked: pipe-to-shell pattern detected")
    exit 2
}

# 3. Block destructive database patterns
if ($command -match '(?i)(DROP\s+TABLE|DELETE\s+FROM)') {
    [Console]::Error.WriteLine("Blocked: destructive SQL pattern detected")
    exit 2
}

# 4. Block subshell writes to .env files (redirection bypasses)
if ($command -match '(>|>>|Out-File|Set-Content).*\.env') {
    [Console]::Error.WriteLine("Blocked: write to .env file detected")
    exit 2
}

exit 0
```
------
## 2. Red-Teaming: Testing Capabilities, Not Rules
A security control is only as good as its failure analysis. When configuring guardrails, you shouldn't just verify that the happy path is blocked; you must actively red-team the capability across multiple interfaces:

| Attack <br />Vector | Layer 1:<br />`CLAUDE.md` | Layer 2: Permissions <br />`settings.json` | Layer 3: Safety <br />Hooks | Downstream Result |
| -------- | ------- | ------- | ------- | ------- |
| Direct `.env` Read | Advisory only | Blocked <br />(`Read(**/.env)`) | Blocked (Path filter) | Blocked at Layer 2 & 3 |
| Subprocess Read <br />(`cat .env`) | Advisory only | Bypassed <br />(Routes via `Bash`) | Blocked <br />(Command/Path filter) | Blocked at Layer 3 |
| Recursive Deletion <br />(`rm -rf /`) | Advisory only | Blocked <br />(`Bash(rm -rf *)`) | Blocked <br />(Regex pattern check) | Blocked at Layer 2 & 3 |
| Pipe-to-Shell <br />(`curl bash`) | Advisory only | Blocked <br />(`Bash(curl *)`) | Blocked <br />(Pipe regex pattern) | Blocked at Layer 2 & 3 |
| Destructive SQL <br />(`DROP TABLE`) | Advisory only | Bypassed <br />(No SQL deny rule) | Blocked <br />(SQL regex pattern) | Blocked at Layer 3 |
| Subshell Write <br />(`echo >> .env`) | Advisory only | Bypassed <br />(Routes via `Bash`) | Blocked <br />(Redirection regex) | Blocked at Layer 3 |

Testing these attack paths demonstrates the core philosophy: Defense-in-depth is about failure containment.
```plaintext
                        Unsafe Action
                               │
                               ▼
                      ┌─────────────────┐
                      │  CLAUDE.md      │
                      │  Policy Layer   │
                      └────────┬────────┘
                               │
                        Bypassed / Drift[cite: 4]
                               │
                               ▼
                      ┌─────────────────┐
                      │  settings.json  │
                      │  Deny Rules     │
                      └────────┬────────┘
                               │
                        Alternate Path[cite: 4]
                               │
                               ▼
                      ┌─────────────────┐
                      │  Safety Hooks   │
                      │  Deterministic  │
                      └────────┬────────┘
                               │
                             BLOCK (exit 2)
```


If the agent misunderstands or ignores a **prompt directive**, the **permission layer** catches it. If the agent routes around a tool permission using a shell sub-process, the **deterministic hook** halts the process cold.

-----
## First-Principles Takeaways

- **Model Capabilities, Not Tools**: Never ask "Did I block the Read tool?" Ask "Can any available tool or subshell invocation read this file?"  
- **Never Rely on Stochastic Firewalls**: System prompts provide context, not security boundaries. Hard enforcement must live in deterministic software outside the model.  
- **Remove the Human from High-Risk Gating**: Humans are vulnerable to approval fatigue. Dangerous operations must be blocked programmatically with zero-override exit codes[cite: 2, 3, 4].  
- **Test the Alternate Route**: If a front door is locked, assume an autonomous agent will explore the window. Always red-team configuration bypasses with synthetic credentials before trusting the system with real code[cite: 2, 3, 4].  

The goal of agentic security is not to create a system that requires a perfectly aligned LLM. The goal is to build an execution harness so resilient that even when the LLM makes an adversarial mistake, your system state and credentials remain untouched[cite: 2, 3, 4].  

## Architecture Design - Printable
![Defense in Depth](/portfolio/blog/claude-code-guardrails/defense-in-depth-2.png)