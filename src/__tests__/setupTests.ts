import 'reflect-metadata';
import mongoose from 'mongoose';

// Global mock — avoids ESM 'jose' import in ALL integration tests
jest.mock('@shared/security/provider-token-verifier');

beforeAll(async () => {
  // put your client connection code here, example with mongoose:
  const dbUri = process.env.DB_URI;

  if (!dbUri) {
    throw new Error('DB_URI is not defined');
  }

  await mongoose.connect(dbUri);
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach((): void => {
  try {
    // Reset ALS mock state (mocked per-file by tests that opt in).
    const tenantMock = jest.requireMock('@shared/tenant-context-als') as any;
    if (typeof tenantMock.resetMockTenantId === 'function') tenantMock.resetMockTenantId();
  } catch (err) {
    // If mocks are not present in the environment, ignore and continue.
    // This keeps setupTests usable in CI or other contexts where mocks may differ.
    if (err instanceof Error) console.log(err.message);
  }

  // clear any jest mocks between tests
  jest.clearAllMocks();
});

afterEach((): void => {
  // ensure a clean slate after each test as well
  try {
    const tenantMock = jest.requireMock('@shared/tenant-context-als') as any;
    if (typeof tenantMock.resetMockTenantId === 'function') tenantMock.resetMockTenantId();
  } catch (err) {
    if (err instanceof Error) console.log(err.message);
  }
  jest.clearAllMocks();
});
