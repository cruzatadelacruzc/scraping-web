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
- After completing features (large or small), run quality gates — see @compliance-checklist.md for the full checklist.

## Verification Before Completion

Before claiming a task is done:

- Re-read the user's original request and confirm every part is addressed.
- Run the relevant tests and lint.
- Confirm no files outside the intended scope were modified.
- If the task added a public API surface, regenerate `swagger.json`.
- If the task added a new dependency, run `npm install` and verify it lands in `package.json`.
- If the task changed public API, env vars, architecture, or patterns: update or create the relevant `README.md` / `CLAUDE.md`. Notify the user which docs you plan to change before doing so. See `compliance-checklist.md#readme--project-docs` for the full rule.

## Commit messages

Before writing **any** commit message — whether via `git commit`, `gh pr merge`, or any other command that creates a commit — ALWAYS invoke the `git-commit` skill via the Skill tool first.

The skill lives in user-global scope (`~/.claude/skills/git-commit/`) and Claude Code auto-loads it whenever the conversation mentions `git commit` or `/commit`. Even so:

1. Invoke it explicitly with `Skill(skill="git-commit")` BEFORE writing the message — don't rely on the heuristic match, especially for `gh pr merge --merge` flows that don't surface the literal phrase "git commit".
2. Let the skill analyze the diff and propose the message. Use its output verbatim, or apply user-requested edits on top of it — do NOT rewrite from scratch.
3. The skill enforces: Conventional Commits format, present tense, imperative mood, <72-char subject, one logical change per commit. Don't bypass these to "be more descriptive" — the rationale belongs in the body, not the subject.

## Test environment prerequisites

Integration tests require real services running locally. **Before `npm run test`:**

```bash
docker-compose up -d          # at minimum Postgres; full stack is fine
pg_isready                    # or: psql "${TENANT_DB_URL}" -c 'select 1'
```

MongoDB and BullMQ/Redis are mocked in tests (MongoMemoryServer + `QUEUE_BACKEND=mock`), so the only docker-compose dependency is Postgres. **After the test run:**

```bash
docker-compose down           # optional — keeps volumes
# docker-compose down -v      # FULL reset (irreversible)
```

A test run is considered clean only when the final lines show `Ran all test suites.` with **no** `Jest did not exit one second after the test run has completed.` warning. If you see that warning, see `.claude/skills/testing/SKILL.md` (open handles + `openHandlesTimeout`) and `.claude/skills/docker-dev/SKILL.md` (integration test environment).

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

## Authoring instruction files

`@path` imports resolve **relative to the file containing the import**, not the repo root (max depth: 4 hops). From `AGENTS.md` use `@.claude/...`; from `.claude/skills/security/SKILL.md` use `@../testing/SKILL.md` to reach a sibling.
