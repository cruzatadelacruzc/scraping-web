/* Central Prisma client mock for tests.
 *  Exports a default "prisma-like" mock and a reset helper.
 *
 *  Wired via moduleNameMapper in jest.config.js (`^@users/custom-prisma-client$`)
 *  so the import resolves to this file before Jest tries to load the real one
 *  (which would attempt a Postgres connection).
 *
 *  Tests that need REAL Prisma (integration tests using `pgDb.query(...)` for
 *  raw SQL setup) must call `jest.unmock('@users/custom-prisma-client')` at
 *  the top of the file.
 **/

type MockFn = jest.Mock<any, any>;

const mUser = {
  findFirst: jest.fn() as MockFn,
  findUnique: jest.fn() as MockFn,
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
  delete: jest.fn() as MockFn,
};

const mUserIdentity = {
  findUnique: jest.fn() as MockFn,
  findFirst: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
};

const mAccount = {
  count: jest.fn() as MockFn,
  findUnique: jest.fn() as MockFn,
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
  delete: jest.fn() as MockFn,
};

const mAccountSubscription = {
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
};

const mAlarm = {
  findUnique: jest.fn() as MockFn,
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
  delete: jest.fn() as MockFn,
};

const mAlarmHistory = {
  findFirst: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
};

const mNotification = {
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
};

const mPlan = {
  findUnique: jest.fn() as MockFn,
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
  delete: jest.fn() as MockFn,
};

const mRole = {
  findFirst: jest.fn() as MockFn,
};

const txModels = {
  user: mUser,
  userIdentity: mUserIdentity,
  account: mAccount,
  accountSubscription: mAccountSubscription,
  alarm: mAlarm,
  alarmHistory: mAlarmHistory,
  notification: mNotification,
  plan: mPlan,
  role: mRole,
};

const mPrisma: any = {
  user: mUser,
  userIdentity: mUserIdentity,
  account: mAccount,
  accountSubscription: mAccountSubscription,
  alarm: mAlarm,
  alarmHistory: mAlarmHistory,
  notification: mNotification,
  plan: mPlan,
  role: mRole,

  // $transaction executes the provided callback with a tx object when a function is provided.
  $transaction: jest.fn().mockImplementation(async (cb: any): Promise<any> => {
    if (typeof cb === 'function') {
      return await cb(txModels);
    }
    return Promise.resolve(cb);
  }) as MockFn,

  // No-op middleware registration (safe if production code calls $use)
  $use: jest.fn() as MockFn,

  // $extends returns the same mock so callers can chain extensions without error.
  $extends: jest.fn().mockImplementation(() => mPrisma) as MockFn,

  // $connect / $disconnect are no-ops in tests (no real connection).
  $connect: jest.fn().mockResolvedValue(undefined) as MockFn,
  $disconnect: jest.fn().mockResolvedValue(undefined) as MockFn,
};

/**
 * Reset all mocks to initial state. Call this in beforeEach of your test suites.
 */
function resetPrismaMocks(): void {
  Object.values(txModels).forEach(model => {
    Object.values(model).forEach((fn: MockFn) => fn.mockReset());
  });
  (mPrisma.$transaction as MockFn).mockReset();
  (mPrisma.$transaction as MockFn).mockImplementation(async (cb: any): Promise<any> => {
    if (typeof cb === 'function') return await cb(txModels);
    return Promise.resolve(cb);
  });
  (mPrisma.$use as MockFn).mockReset();
  (mPrisma.$extends as MockFn).mockReset();
  (mPrisma.$extends as MockFn).mockImplementation(() => mPrisma);
  (mPrisma.$connect as MockFn).mockReset();
  (mPrisma.$connect as MockFn).mockResolvedValue(undefined);
  (mPrisma.$disconnect as MockFn).mockReset();
  (mPrisma.$disconnect as MockFn).mockResolvedValue(undefined);
}

export default mPrisma;
export {
  resetPrismaMocks,
  mUser as prismaUserMock,
  mUserIdentity as prismaUserIdentityMock,
  mAccount as prismaAccountMock,
  mAlarm as prismaAlarmMock,
};
