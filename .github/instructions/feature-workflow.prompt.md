---
mode: 'agent'
description: 'Scaffold a backend feature following project conventions using TDD (tests first).'
tools: ['codebase', 'usages', 'problems', 'changes', 'testFailure', 'fetch', 'findTestFiles', 'searchResults', 'githubRepo', 'runTests', 'editFiles', 'search', 'new', 'runCommands', 'runTasks']
---

Task
Scaffold a complete backend feature (controller, DTOs with Zod, service, repository, mappers, DI bindings, and minimal tests) according to this project's conventions. Return only the files (path + content). Do not include external explanation.

High-level rules (mandatory)

- TDD cycle must be followed: **Red → Green → Refactor**.
- Always produce tests before implementation `src/__tests__/unit` or `src/__tests__/integration`. Tests must be realistic, deterministic, and isolated where applicable.
- All generated code must follow the project's architecture: Controller → DTO (Zod) → Service → Repository → Mappers.
- Controllers must **not** contain business logic.
- DTOs must be Zod schemas. Controllers must `safeParse` and return structured 400 on validation errors.
- Repositories encapsulate Data Base/queue clients and enforce tenant-scoping.
- Mappers are pure and side-effect free.
- Provide DI binding snippet for `/src/main/shared/container.ts` for the new feature.

Agent workflow (required sequence)
1. **Input parsing**: Read prompt inputs: `{featureName}`, `{endpoints}`, `{dtoSchema}`, `{persistence}`. Confirm any missing details with the user before proceeding.
2. **Create test skeletons (Red)**:
   - Generate unit tests for Service and Repository with clear expectations and mocked dependencies.
   - Generate a minimal integration test that uses `runWithRequestContext({ tenantId, userId }, async () => { ... })` to verify tenant scoping and at least one end-to-end path.
   - Place tests under `test/{feature}/`.
   - Do **not** implement production code yet.
3. **Run tests (expect failure)**:
   - Run the test runner for the new tests only (e.g., `npx jest test/{feature} --runInBand`).
   - Capture failing test output and include it in the TDD execution log.
4. **Implement minimal code (Green)**:
   - Implement the smallest amount of production code to make the tests pass: DTOs, mappers, repository stubs, service logic, controller scaffolding.
   - Use dependency injection (Inversify) and ensure tenantContext is consumed by services/repository.
5. **Run tests & linters**:
   - Re-run the tests. If any test fails, capture output and iterate (return to implement minimal changes).
   - Run `npm run lint` and `npm run format`. Fix lint/type errors as needed.
6. **Refactor**:
   - Improve code quality: remove duplication, add JSDoc for public methods, refine types, and ensure mappers are pure.
   - Re-run tests and linters; confirm green.
7. **Integration tests & final verification**:
   - Execute the integration test(s) and confirm tenant isolation behavior.
   - Run a subset of the full test suite if requested.
8. **Prepare commit/PR**:
   - Produce a concise commit message and PR description listing: feature summary, TDD steps performed (including failing outputs), tests added, and any TODOs for future work.
   - Ask the user for explicit approval before creating the commit/PR.

Output format (what the agent returns)
- Files to create/modify: return each with path and fenced code block content.
- TDD execution log: an ordered list detailing commands run, test failures (captured stderr), fixes applied, and final status.
- Proposed commit message and PR description.
- If you wants to run tests or create commits, it must ask for explicit confirmation.

Coding constraints
- Public methods require JSDoc and explicit access modifiers.
- Avoid `any` unless justified with a one-line comment.
- Use `ILogger` injection and set `this._log.context = ClassName`.
- No `console.log` (except in bootstrap where logger is absent).
- Add TODO comments for product-owner decisions (pricing rules, feature flags, etc.).

Safety & privacy
- Never fetch or store secrets.
- `fetch` may be used only for public docs or library references; obtain permission first.