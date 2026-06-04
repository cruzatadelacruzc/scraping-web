---
description: "TypeScript and JSDoc conventions"
applyTo: "**/*.ts,**/*.tsx"
---

TypeScript & JSDoc rules (applies to all TS/TSX files)

- Explicit access modifiers are required for class methods (`public`/`private`/`protected`).
- Every `public` method must include a JSDoc block with:
  - A 1–2 line description.
  - `@param {type} name` for each parameter.
  - `@returns {type}`.
  - `@throws {Error}` when the method can throw.
- DTO definitions must be Zod schemas and export typed helpers (`parse`/`safeParse`).
- Prefer precise types over `any`. If `any` is used, include a one-line justification and `eslint-disable-line` for the single case.
- Include concise inline TODOs for domain-specific validation that requires product-owner input.
- Run `npm run lint` and `npm run format` locally before committing.
- Ensure all code passes the project's ESLint and Prettier configuration before committing.