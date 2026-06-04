/* Mock for the tenant AsyncLocalStorage helper used by the prisma extension.
 *  Exposes getters/setters so tests can vary the tenantId per-suite or per-test.
 **/

let _mockTenantId: string | null = 'test-tenant';

/**
 * Returns the simulated request context object.
 */
export function getRequestContext(): { tenantId: string | null } {
  return { tenantId: _mockTenantId };
}

/**
 * Set a mock tenantId for the current test.
 */
export function setMockTenantId(id: string | null): void {
  _mockTenantId = id;
}

/**
 * Reset to default tenant id.
 */
export function resetMockTenantId(): void {
  _mockTenantId = 'test-tenant';
}

/**
 * Helper to read current mock tenant id.
 */
export function getMockTenantId(): string | null {
  return _mockTenantId;
}

export default { getRequestContext, setMockTenantId, resetMockTenantId, getMockTenantId };
