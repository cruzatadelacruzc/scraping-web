---
description: 'Meta-rules for Claude: when to plan, when to delegate to sub-agents, when to coordinate. Self-contained — does not depend on any user-level plugins.'
applyTo: '**'
---

# Meta-Workflow Rules

These rules describe **how** to work in this repository. They are self-contained — they do not require any user-level plugins or global skills to function. Apply them whenever Claude is working on this repo.

## Planning Mode

- Always ask clarifying questions before assuming tech stack, design, or features.
- Never invent requirements or extrapolate without confirmation.
- Use deep-dive sub-agents to research areas of the codebase you don't know.
- Use deep-dive sub-agents to review different aspects of a plan before presenting it.
- Present the plan as a single coherent proposal with trade-offs, not a list of options.

## Change / Edit Mode

- Never implement features inline when sub-agents can do it. Delegate.
- Identify work that can be parallelized (independent files, independent concerns) and dispatch multiple sub-agents in one message.
- When using sub-agents to implement features, act as a coordinator only — review their output and integrate.
- Match the model to the task: premium models for complex coding and architecture; mid-tier models for documentation and routine edits.
- After completing features (large or small), always run quality gates:
  - `npm run lint`
  - `npm run test`
  - `npm run docs:generate` (if DTOs / controllers / paths changed)
  - `npm run build`

## Verification Before Completion

Before claiming a task is done:

- Re-read the user's original request and confirm every part is addressed.
- Run the relevant tests and lint.
- Confirm no files outside the intended scope were modified.
- If the task added a public API surface, regenerate `swagger.json`.
- If the task added a new dependency, run `npm install` and verify it lands in `package.json`.

## Where to find project-specific guidance

This file covers the workflow. Project-specific knowledge lives in:

- `CLAUDE.md` — project spec, stack, role system
- `src/main/CLAUDE.md` — code patterns (DI, layers, queue, TDD)
- `.claude/rules/folder-structure.md` — canonical module layout
- `.claude/rules/compliance-checklist.md` — pre-merge rules
- `.claude/skills/security/SKILL.md` — auth + tenant context
- `.claude/skills/testing/SKILL.md` — Jest patterns
- `.claude/skills/docker-dev/SKILL.md` — local environment
- `.claude/skills/alarm-condition/SKILL.md` — add alarm condition
- `.claude/skills/typescript-best-practices/SKILL.md` — TS patterns