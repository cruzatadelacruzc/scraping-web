import 'reflect-metadata';
import mongoose from 'mongoose';

// Global mock — avoids ESM 'jose' import in ALL integration tests
jest.mock('@shared/security/provider-token-verifier');

// Global mock — @builderbot/provider-baileys transitively imports
// baileys (ESM) which Jest cannot parse. All tests use mocked providers.
jest.mock('@builderbot/provider-baileys', () => ({ BaileysProvider: jest.fn() }));
// Global mock — @builderbot-plugins/telegram transitively imports
// telegraf (ESM) which Jest cannot parse. All tests use mocked providers.
jest.mock('@builderbot-plugins/telegram', () => ({ TelegramProvider: jest.fn() }));
jest.mock('@builderbot/bot', () => ({
  createBot: jest.fn(),
  createFlow: jest.fn(f => f),
  createProvider: jest.fn(),
  addKeyword: jest.fn(() => ({ addAction: jest.fn().mockReturnThis(), addAnswer: jest.fn().mockReturnThis() })),
  EVENTS: { WELCOME: 'WELCOME' },
  MemoryDB: jest.fn(),
  ProviderClass: null,
}));

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
