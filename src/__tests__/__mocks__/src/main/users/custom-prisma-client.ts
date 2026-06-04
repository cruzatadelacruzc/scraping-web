/* Central Prisma client mock for tests.
 *  Exports a default "prisma-like" mock and a reset helper.
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
  create: jest.fn() as MockFn,
};

const mPrisma: any = {
  user: mUser,
  userIdentity: mUserIdentity,

  // $transaction executes the provided callback with a tx object when a function is provided.
  $transaction: jest.fn().mockImplementation(async (cb: any): Promise<any> => {
    if (typeof cb === 'function') {
      const tx = { user: mUser, userIdentity: mUserIdentity };
      return await cb(tx);
    }
    return Promise.resolve(cb);
  }) as MockFn,

  // No-op middleware registration (safe if production code calls $use)
  $use: jest.fn() as MockFn,

  // $extends should return something prismal-like; return the same mock for idempotence
  $extends: jest.fn().mockImplementation(() => mPrisma) as MockFn,
};

/**
 * Reset all mocks to initial state. Call this in beforeEach of your test suites.
 */
function resetPrismaMocks(): void {
  // reset model method mocks
  Object.values(mUser).forEach((fn: MockFn) => fn.mockReset());
  Object.values(mUserIdentity).forEach((fn: MockFn) => fn.mockReset());

  // reset transaction and helpers
  (mPrisma.$transaction as MockFn).mockReset();
  (mPrisma.$transaction as MockFn).mockImplementation(async (cb: any): Promise<any> => {
    if (typeof cb === 'function') {
      const tx = { user: mUser, userIdentity: mUserIdentity };
      return await cb(tx);
    }
    return Promise.resolve(cb);
  });
  (mPrisma.$use as MockFn).mockReset();
  (mPrisma.$extends as MockFn).mockReset();
  (mPrisma.$extends as MockFn).mockImplementation(() => mPrisma);
}

export default mPrisma;
export { resetPrismaMocks, mUser as prismaUserMock, mUserIdentity as prismaUserIdentityMock };
