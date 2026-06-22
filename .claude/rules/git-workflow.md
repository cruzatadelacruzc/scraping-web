---
description: 'Branching model, branch naming, PR flow, and CI matrix for this repo. Use when creating branches, opening PRs, or merging to develop/main.'
---

# Git Workflow — BazaarSentinel

The repo follows a lightweight two-branch model: every change lands on a
short-lived feature branch, gets merged into `develop` for integration
testing, and is promoted to `main` only when `develop` is stable.

```
feature/*  ──PR──▶  develop  ──PR──▶  main
   │              (CI runs)        (Deploy runs, gated by DEPLOY_ENABLED)
   └─ short-lived, deleted after merge
```

## Branches

| Branch   | Role                       | Lifetime    | Protected |
|----------|----------------------------|-------------|-----------|
| `main`   | Production                 | Permanent   | Yes       |
| `develop`| Integration / next release | Permanent   | Yes       |
| `feature/*` | Work in progress        | Short-lived | No        |

- **`main`** is what production runs. Every commit is a release.
- **`develop`** accumulates work between releases. The CI workflow runs
  here on every push and PR.
- **`feature/*`** branches hold work in progress. They are deleted after
  the PR merges.

### Naming

Align prefixes with Conventional Commits so the branch name previews the
commit message:

| Prefix       | Use for                                          |
|--------------|--------------------------------------------------|
| `feat/...`   | New user-facing feature                          |
| `fix/...`    | Bug fix                                          |
| `chore/...`  | Tooling, deps, config, no behavior change        |
| `docs/...`   | Docs only                                        |
| `refactor/...` | Code restructure, no feature/bugfix            |
| `test/...`   | Tests only                                       |

Use kebab-case after the prefix. Example: `feat/add-bull-board-auth`.

## Commits

Follow Conventional Commits — present tense, imperative mood, one
logical change per commit. The detailed rules (type/scope selection,
body vs footer, breaking changes, edge cases) are enforced by the
`git-commit` skill, which Claude MUST invoke before writing any commit
message. See `.claude/rules/meta-workflow.md` for the rule.

## Pull requests

- **One PR per logical change.** Multiple commits OK; multiple unrelated
  changes not OK.
- **PR base is `develop`** for normal work.
- **PR base is `main`** only when promoting a stable `develop` (release).
  This is rare; most work stays on `develop`.
- PR title mirrors the commit type: `feat: ...`, `fix: ...`, etc.
- A PR is mergeable only when the CI check `Lint, test, build` is green.

## CI matrix

| Workflow             | Triggers on                                | Notes                                    |
|----------------------|--------------------------------------------|------------------------------------------|
| `Lint, test, build`  | PRs to `develop`, push to `develop`         | Required status check on protected branches. |
| `Deploy Scrapers API`| Push to `main`, `workflow_dispatch`         | Gated by repo variable `DEPLOY_ENABLED`. Skips while MVP. See header comment in `ec2-deploy.yml`. |

## Local pre-flight

Before pushing or opening a PR, run the same checks CI does:

```bash
docker-compose up -d postgres      # integration tests need real Postgres
npm run lint
npm run format && git diff --stat  # prettier is separate from eslint
npm run test                       # full suite, watch for "Jest did not exit"
npm run docs:generate              # only if you touched DTOs / controllers / paths
```

See `.claude/rules/compliance-checklist.md` for the full pre-commit checklist.

## Quick reference

```bash
# Start a feature
git checkout develop && git pull
git checkout -b feat/<short-kebab-name>

# ... commit with Conventional Commits ...

git push -u origin feat/<short-kebab-name>
gh pr create --base develop --head feat/<short-kebab-name>

# After CI is green, merge the PR (UI or gh pr merge --merge).

# Promote develop to main (release)
gh pr create --base main --head develop --title "chore(release): merge develop into main"
```