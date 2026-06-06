---
description: 'Pre-merge compliance checklist for the Price Monitoring SaaS'
applyTo: '**'
---

# Compliance Checklist

Before completing any task, verify these requirements:

## Code Standards

- [ ] **TypeScript**: Strict mode, no `any` types, proper generics
- [ ] **File Naming**: Matches conventions (`*.service.ts`, `*.controller.ts`, `*.repository.ts`)
- [ ] **Imports**: Organized (types → interfaces → implementations) using barrel files

## Architecture & Patterns

- [ ] **Inversify**: Classes use `@injectable()` and `@inject()` decorators
- [ ] **Dependency Injection**: All external dependencies injected, no direct instantiation
- [ ] **Layers**: Proper separation (Controller → Service → Repository)
- [ ] **DTOs**: Zod schemas with type inference (`z.infer<typeof>`)

## Multi-Tenancy & Security

- [ ] **Tenant Context**: Request passes `tenantInitMiddleware`
- [ ] **Data Isolation**: All DB queries filter by `accountId` or tenant
- [ ] **No Tenant Leakage**: Module scope doesn't store tenant-specific data
- [ ] **AsyncLocalStorage**: Used for tenant context (ALS), not globals

## Logging & Monitoring

- [ ] **Context**: Logger has `this._log.context = ClassName`
- [ ] **Request Context**: Logs include `tenantId`, `requestId`, operation details
- [ ] **Error Handling**: Errors logged with context before throwing/responding
- [ ] **Progress Tracking**: Long-running operations report `job.progress()`

## Testing

- [ ] **Unit Tests**: Mirror source structure in `src/__tests__/unit/`
- [ ] **Mocking**: Dependencies mocked, tenant context isolated
- [ ] **Edge Cases**: Tests include empty, malformed, boundary conditions
- [ ] **Integration Tests**: Use `runWithRequestContext` for tenant isolation

## Queue & Background Jobs

- [ ] **Job Handlers**: Implement `process(job: Job<T>): Promise<void>`
- [ ] **Error Handling**: Errors logged, job retries configured
- [ ] **Progress**: Job reports progress via `job.progress(percentage)`
- [ ] **Registration**: Queues registered in `IQueueModule` implementation

## Documentation

- [ ] **Examples**: Complex patterns have JSDoc examples
- [ ] **Type Clarity**: Generic types named clearly (not `T`, use `TData`, `TResponse`)
- [ ] **API Docs**: Swagger/OpenAPI updated for new endpoints
