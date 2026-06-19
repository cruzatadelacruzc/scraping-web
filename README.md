# BazaarSentinel

Multi-tenant SaaS platform for **marketplace listing monitoring**. Customers register accounts, define alarms on products from online bazaars (e.g., Revolico), and the system periodically scrapes listings, evaluates multi-condition alarms (price, views, seller, outstanding status), and notifies users when any condition matches.

See [AGENTS.md](AGENTS.md) for the full project specification, architecture, and coding standards.

## Stack

TypeScript (strict), Express + `inversify-express-utils`, Inversify DI, BullMQ (with `@bull-board` dashboard, swappable via `QUEUE_BACKEND`), Prisma + PostgreSQL, Mongoose + MongoDB, Puppeteer, JWT (`jsonwebtoken`) + provider tokens (`jose`).

## Quick start

```bash
docker-compose up -d            # MongoDB, Redis, Postgres
cp .env.example .env            # then edit secrets
npm install
npm run migrate:dev             # Prisma migrations
npm run seed                    # default roles + SUPER_ADMIN
npm run dev                     # hot-reload server
```

## Documentation for AI agents

The repository ships project-specific guidance for Claude Code (and other AI assistants):

| Topic                          | Location                                                       |
|--------------------------------|----------------------------------------------------------------|
| Project spec, stack, roles     | [AGENTS.md](AGENTS.md)                                         |
| Code patterns (DI, layers)     | [src/main/CLAUDE.md](src/main/CLAUDE.md)                       |
| Folder structure (canonical)   | [.claude/rules/folder-structure.md](.claude/rules/folder-structure.md) |
| Pre-merge checklist            | [.claude/rules/compliance-checklist.md](.claude/rules/compliance-checklist.md) |
| Meta-workflow (planning mode)  | [.claude/rules/meta-workflow.md](.claude/rules/meta-workflow.md) |
| Auth, JWT, tenant context      | [.claude/skills/security/SKILL.md](.claude/skills/security/SKILL.md) |
| Docker dev environment         | [.claude/skills/docker-dev/SKILL.md](.claude/skills/docker-dev/SKILL.md) |
| Testing patterns (Jest + ALS)  | [.claude/skills/testing/SKILL.md](.claude/skills/testing/SKILL.md) |
| Add an alarm condition         | [.claude/skills/alarm-condition/SKILL.md](.claude/skills/alarm-condition/SKILL.md) |
| TypeScript patterns            | [.claude/skills/typescript-best-practices/SKILL.md](.claude/skills/typescript-best-practices/SKILL.md) |

## Recommended Claude Code plugin: superpowers

For team members using Claude Code as their AI assistant, we recommend installing the **[superpowers](https://claude.com/plugins/superpowers)** plugin. It is a curated collection of skills that complements the project-specific guidance above with general-purpose workflows.

Superpowers is **not required** to work on this repo — the `.claude/` directory already contains everything Claude Code needs for this specific project. The plugin adds:

- **Brainstorming** — structured approach to requirements before coding
- **Writing plans** — coherent proposals with trade-offs instead of lists of options
- **Test-driven development** — Red → Green → Refactor discipline enforced
- **Subagent-driven development** — coordinate parallel work via sub-agents
- **Verification before completion** — explicit gate before claiming a task done

Installation is per-developer (user-level, not project-level). Each team member installs it once in their own Claude Code environment — no changes to this repository are required.

## License

Private — internal use only.
