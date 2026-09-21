
---
title: "Agentic Architecture Terms: A Practical Glossary"
description: "A practical glossary of terms used by agentic architects daily. I came across these terms while preparing for Claude Associate Foundation Certification."
keywords: ["agentic architecture", "agentic AI", "AI agents", "task decomposition", "orchestration", "agent handoffs", "AI governance"]
tags: ["Agentic AI", "AI Architecture", "AI Agents", "AI Governance", "Autonomous Systems"]
weight: 1

dateString: September 2026
draft: false
meta_title: "Agentic Architecture Terms: A Practical Glossary"
meta_description: "Learn the essential concepts behind agentic architectures, from task decomposition and orchestration to handoffs, execution patterns, evaluation, and governance."
meta_author: "Karan Raj Sharma"
meta_date: 2026-09-06
---
### Section 1: Foundation

1. **The Augmented LLM Buiding Blocks**

- **Augmented LLM**: A base language model enhanced with retrieval, tools, and memory. It's the foundational building block every agentic system is composed from.

- **Retrieval and Tools**: The model generates its own search queries and selects the tools it needs, rather than waiting for a fixed script to hand it results.

- **Memory**: The model decides what information to retain across steps, so context carries forward instead of resetting on every call.



### Section 2:  Task Decomposition and Planning

**1. Task Decomposition**: Breaking a high-level goal into smaller subtasks that can be assigned to agents, tools, or workflow steps.

**2. Handoff Point**: The boundary between subtasks where one step's output becomes the next steps's inputs. Required an explicit schema. *Common failure point in Agentic system*

**3. Orchestrator**: The controlling agent that decomposes goals, assigns subtasks, manages execution order, and synthesizes results.

**4. Monolithic Task**: One agent Handles everything. Simple to assign initially, but hard to debug, fails completely on any error, and is difficult to parallelize or retry selectively.

**5. Decomposed Task**: Goal split into well-defined subtasks. Each piece is independently retryeable, delegate, and testable. Upfront design cost is offset by long-term resilience.

**6. Three Decomposition Patterns**
- **Hierarchical Decomposition**: Goals split into subgoals across multiple levels, forming a tree: Orchestrators delegate down; results flow back up.
- **Sequential Execution**: Tasks performed in order, where each step may depend on the previous step's output before proceeding. Easy to debug, harder to speed up.
    - *Prompt Chaining*: One LLM call's output becomes the next call's input. Each step has a single, narrow job.
    - *Dependency Graph*: A map of which steps depend on which others. Reveals required ordering and steps that could run in parallel.
- **Parallel Execution**: Multiple independent tasks run concurrently, reducing wall-clok time. Requires a synchronization point to collect outputs and handle partial failures.
    - *Fan-Out*: The step where a single task splits into multiple concurrent subtasks dispatched simultaneously.
    - *Fan-In*: The synchronization step that collects, order and aggregates results from parallel branches. Also, Handles partial failures

**7. Decomposition Anti patters** consistent causes of *WHY AGENTIC SYSTEMS FAILS IN PRODUCTION ENVIRONMENT*
- **Over-decomposition**: Too many steps that coordination costs exceed execution costs
- **Under-decomposition**: Tasks too large to retry or delegate reliably
- **False parallelism**: Treating dependent steps as independent, causing data hazards


**8. Comparison between Parallel vs. Sequential Execution**

| Feature | Parallel Execution | Sequential Execution |
| --- | --- | --- |
| **Execution Flow** | Multiple independent tasks run concurrently at the same time. | Tasks run one at a time in strict, linear order. |
| **Wall-Clock Latency** | Significantly reduced; bounded primarily by the slowest branch. | Equal to the sum of all individual step latencies. |
| **Token & Resource Cost** | Higher token and compute spend per unit time (bursty resource usage). | Cheaper and more predictable token spend per run over time. |
| **Synchronization** | Requires an explicit fan-in/aggregation step to consolidate results. | No synchronization needed; output flows naturally into the next step. |
| **Failure Modes** | Introduces partial-failure scenarios and risks data hazards if dependencies exist. | Fails linearly; easier to halt early without orphaned branch states. |
| **Debugging Complexity** | Harder to debug due to concurrent states and non-deterministic completion order. | Easy to trace, log, inspect, and debug step-by-step. |
| **Ideal Use Cases** | Multi-source research, fan-out subagents, and high-throughput batch tasks. | Strict prompt chaining, dependent transformations, and structured document pipelines. |

**9. Adaptive Planning**: Types of planning 

- **Static Planning**: A fixed sequence of steps authored before execution begins. Every action is known at design tie; the agent follows the script without deviation. Planning done at the design time.

- **Dynamic Planning**: The model generates or revises its plan at runtime based on intermediate results, new information, or unexpected states. Planning done at the run-time.

- **Replanning**: Revising the current plan in response to a failed  step, unexpected tool output, or changed environmental state.
    - **Maximum Iterations**: A hard cap on the number of replanning cycles the agent is allowed. Prevents infinite loops when every new plan hits the same obstacle.
    - **Goal Constraint Check**: A validation step that confirms the revised plan still satisfies the original task requirements before execution continues. if validation outcome is negative this would be a **Goal drift** *MOST DANGEROUS FAILURE MODE*
    - **Loop Termination**: The condition that halts replanning: either the iteration limit is reached or the new plan clears all goal constraints.

**10. Three Ambiguity Concepts**

- **Ambiguous Goal**: A task specification that does not fully define the expected outcome, leaving multiple valid interpretations open to the agent at execution time
- **Clarify-First Strategy**: Pausing execution to request more information from a human before proceeding, used when the cost of a wrong assumption is high
- **Assume-and-Proceed**: Making a reasonable inference and continuing without human input, used when the action is low-stakes, reversible, or time-sensitive

**11. Evaluator-Optimizer Pattern**

- **Generator Agent**: Produces the initial or revised output. Receives structured feedback from the evaluator and applies it on the following pass.
- **Evaluator Agent**: Assesses the generator’s output against a rubric. Returns structured critique, not just a pass or fall signal.
- **Convergence Criteria**: The threshold or condition that stops the loop: either a quality bar is met or an Iteration cap hit

