import 'reflect-metadata';
import mongoose from 'mongoose';

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
    jest.mock('src/main/users/custom-prisma-client');
    jest.mock('src/main/shared/tenant-context-als');

    const prismaMock = jest.requireMock('src/main/users/prismaClient') as any;
    const tenantMock = jest.requireMock('src/main/shared/tenant-context-als') as any;

    if (typeof prismaMock.resetPrismaMocks === 'function') prismaMock.resetPrismaMocks();
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
    jest.mock('src/main/shared/tenant-context-als');
    const tenantMock = jest.requireMock('src/main/shared/tenant-context-als') as any;
    if (typeof tenantMock.resetMockTenantId === 'function') tenantMock.resetMockTenantId();
  } catch (err) {
    if (err instanceof Error) console.log(err.message);
  }
  jest.resetAllMocks();
});
