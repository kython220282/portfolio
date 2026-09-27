---
title: "Set Up Claude Code Guardrails"
description: "A hands-on project into securing Claude code using a three-layer defense-in-depth framework—combining advisory policies, scoped permissions, and deterministic pre-execution hooks."
keywords: ["Agentic Guardrails", "Claude Code Guardrails", "AI Security", "DevSecOps", "Policy-as-Code", "Autonomous Coding Agents"]
tags: ["AI Security", "DevSecOps", "Claude Code", "Agentic AI", "AI Architecture", "Software Engineering"]
weight: 1

dateString: August 2026
draft: false
meta_title: "Architecting Secure Agentic Workflows: Claude Code Guardrails"
meta_description: "Learn how to secure Claude Code using defense-in-depth: advisory CLAUDE.md policies, .claude/settings.json permissions deny rules, and deterministic exit 2 safety hooks."
meta_author: "Karan Raj Sharma"
meta_date: 2026-08-29
---
**Author:** Karan Raj Sharma

**Blog:** [CLaude Code Guardrail: Architecting Defense-in-Depth for Agentic Coding ](https://kython220282.github.io/portfolio/blog/claude-code-guardrails/)

---


## Project Introduction!

In this project, I have build three layers of Claude Code security: Permission deny rules, Hooks and a CLAUDE.md policy. This helped me build a defense-in-depth security configuration for Claude Code

![Image](https://nextwork.ai/energetic_rose_shy_paprika/uploads/claude-code-safety-guardrails_m7r4k9w2)

### Key tools and concepts

The key tools I used include Hook scripts, settings.json, CLAUDE.md security layer. Key concepts I learnt include Dfence-in-depth, Permissions, Hook and Red teamining.

### Challenges and wins

I did this project to learn how to put Guardrails on Claude Code. Other skills I want to learn are the ones that will prepare me on how to Architect for using Claude to code for an application.

## Setting Up the Security Testing Environment

In this step, I set up Claude Code, install jq file and create a sample project with sensitive files. These files will act as "test dummies" for the security rules i will build later.

![Image](https://nextwork.ai/energetic_rose_shy_paprika/uploads/claude-code-safety-guardrails_h9c1y7b3)

### Understanding jq

Jq is a lightweight command-line tool for working with JSON data. I used it to parse and validate Claude Code configuration files, specifically .claude/settings.json where i defined permission deny rules and hook scripts.

### Creating sensitive test files

I created fake credential files to do testing of the claude code defence-in-depth setup.

## Configuring Permission Deny Rules

In this step, I configured claude code to create permission deny rules in .claude/settings.json. Test the deny rules by asking Claude to access blocked resources and discover a critical gap in permission-based security.

![Image](https://nextwork.ai/energetic_rose_shy_paprika/uploads/claude-code-safety-guardrails_w3n8t5q1)

### How deny rules protect your project

- The first deny rule I'll explain is Read(**/.env) It blocks Claude's Read tool from opening any file named .env, in any directory. 
- The second rule is Read(**/.env.*) It blocks files like .env.local or .env.production.
- The third rule Read(**/secrets/**) blocks anything inside a secrets folder. 
- The fourth rule Bash(curl *) and Bash(wget *) prevent Claude from making network requests. 
- The last rule Bash(rm -rf *) prevents Claude from running destructive delete commands.


## Discovering the Permission Gap

When I asked Claude to list all files, it checked what all files are there in the directory, checks the permission setting and identified the file on which the permission is denied / restricticted. It only showed the content of a setting.json file. This tells me that deny rules only block specific tool patterns, and Bash subprocesses can slip through.

![Image](https://nextwork.ai/energetic_rose_shy_paprika/uploads/claude-code-safety-guardrails_d9f2a7c3)

## Writing the Safety Hook Scripts

In this step, I wrote a file protector hook. Hooks were needed because Permissions setup is limited to blocking Claude's built-in tools, the bash commands like cat .env go through the bash tool, not the Read tool. Read deny rule does not apply to them.

![Image](https://nextwork.ai/energetic_rose_shy_paprika/uploads/claude-code-safety-guardrails_w3n8v5j1)

### Protecting sensitive files

This hook protects sentivite files like .env and secrets. These files like .env, package-lock.json, and anything containing keys or secrets should never be modified by an AI agent without explicit human review outside of Claude. avoiding the risk of lekage of senstivie details of the project

![Image](https://nextwork.ai/energetic_rose_shy_paprika/uploads/claude-code-safety-guardrails_m7r4k9w2)

### Blocking dangerous commands

This script intercepts every Bash command Claude tries to run. It checks for four categories of dangerous commands:

- Destructive deletions: rm -rf / or rm -rf * that could wipe your filesystem.
- Pipe-to-shell: Commands piped into sh, bash, or zsh, where untrusted content runs as code.
- SQL injection: Patterns like DROP TABLE or DELETE FROM that could destroy database data.
- Bash writes to .env: Redirects like echo >> .env that bypass your file protector hook. Without this check, Claude can skip the Write tool entirely and use Bash to modify your .env file.

## Testing the Hooks in Action

Permissions are advisory. They control whether Claude asks for approval, but a distracted developer can still click "allow." Hooks are deterministic. When a hook exits with code 2, the action is blocked no matter what. There is no override, no prompt, no accidental approval. This is your second layer of defense-in-depth.

![Image](https://nextwork.ai/energetic_rose_shy_paprika/uploads/claude-code-safety-guardrails_t4h7c2y8)

## Adding a CLAUDE.md Security Policy

In this project extension, I am going to write a claude.md security policy with coding rules; Red team each defense layer to test what it blocks. Compare all three layers and document findings

![Image](https://nextwork.ai/energetic_rose_shy_paprika/uploads/claude-code-safety-guardrails_w4n8x1q6)

### Advisory vs enforced guardrails

CLAUDE.md differs from the other layers because It shapes how Claude writes code, but Claude can still choose to ignore it. Think of it as a style guide rather than a lock on the door.

## Red-Teaming the Defense Layers

The easiest layer to bypass was CLAUDE.md. This taught me that a multi layers of security controls to protect information and systems is important. if one layer fails, another is there to catch it, making it harder for attackers to succeed

![Image](https://nextwork.ai/energetic_rose_shy_paprika/uploads/claude-code-safety-guardrails_b9c4d2a7)

### Project reflection

This project took me approximately 2 hours. I learnt some critical skills which are generally missed by developers and are core responsibility of an architect

---
<img src="https://cdn.prod.website-files.com/677c400686e724409a5a7409/6790ad949cf622dc8dcd9fe4_nextwork-logo-leather.svg" alt="NextWork" width="300" />

*Built with [NextWork](https://nextwork.ai) - [View this project](https://nextwork.ai/projects/f961f28a-8128-510c-9a81-29f5c578b4c9)*
