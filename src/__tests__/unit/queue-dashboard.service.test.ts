import 'reflect-metadata';
import { Queue } from 'bullmq';
import { QueueDashboardService } from '@shared/queue-dashboard/queue-dashboard.service';
import { IQueueAdapter } from '@shared/queue/port/queue-adapter.interfaces';
import { IQueueAdapterRegistry } from '@shared/queue/port/queue-adapter-registry.interfaces';
import { ILogger } from '@shared/logger.interfaces';

jest.mock('@bull-board/api', () => ({
  createBullBoard: jest.fn(),
}));
jest.mock('@bull-board/api/bullMQAdapter', () => ({
  BullMQAdapter: jest.fn(),
}));
jest.mock('@bull-board/express', () => ({
  ExpressAdapter: jest.fn(),
}));

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

type CreateBullBoardReturn = ReturnType<typeof createBullBoard>;

const BullMQAdapterMock = BullMQAdapter as unknown as jest.Mock;

const ExpressAdapterMock = ExpressAdapter as unknown as jest.Mock;
const createBullBoardMock = createBullBoard as jest.MockedFunction<typeof createBullBoard>;

describe('QueueDashboardService', () => {
  let logger: jest.Mocked<ILogger>;
  let serverAdapterInstance: { getRouter: jest.Mock; setBasePath: jest.Mock };
  let bullBoardInstance: CreateBullBoardReturn;

  function makeAdapter(
    backend: 'bullmq' | 'sqs' | 'mock',
    dashboardQueues: ReadonlyArray<{ name: string; queue: unknown }>,
  ): jest.Mocked<IQueueAdapter> {
    return {
      backend,
      enqueue: jest.fn(),
      registerWorker: jest.fn(),
      onCompleted: jest.fn(),
      onFailed: jest.fn(),
      onProgress: jest.fn(),
      describe: jest.fn().mockReturnValue([]),
      getDashboardQueues: jest.fn().mockReturnValue(dashboardQueues),
      shutdown: jest.fn(),
    } as unknown as jest.Mocked<IQueueAdapter>;
  }

  function makeRegistry(adapter: IQueueAdapter): jest.Mocked<IQueueAdapterRegistry> {
    return {
      getCurrent: jest.fn().mockReturnValue(adapter),
      get: jest.fn().mockReturnValue(adapter),
    } as unknown as jest.Mocked<IQueueAdapterRegistry>;
  }

  beforeEach(() => {
    logger = {
      context: undefined,
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    serverAdapterInstance = {
      getRouter: jest.fn().mockReturnValue({ kind: 'express-router' }),
      setBasePath: jest.fn().mockReturnThis(),
    };

    bullBoardInstance = {
      setQueues: jest.fn(),
      replaceQueues: jest.fn(),
      addQueue: jest.fn(),
      removeQueue: jest.fn(),
    };

    ExpressAdapterMock.mockImplementation(() => serverAdapterInstance);
    BullMQAdapterMock.mockImplementation((q: Queue) => ({ wrapped: q }));
    createBullBoardMock.mockReturnValue(bullBoardInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('configures the ExpressAdapter with the dashboard base path and returns its router', () => {
    const adapter = makeAdapter('bullmq', []);
    const registry = makeRegistry(adapter);

    const service = new QueueDashboardService(logger, registry, '/arena');
    const router = service.getRouter();

    expect(ExpressAdapterMock).toHaveBeenCalledTimes(1);
    expect(serverAdapterInstance.setBasePath).toHaveBeenCalledWith('/arena');
    expect(serverAdapterInstance.getRouter).toHaveBeenCalledTimes(1);
    expect(router).toEqual({ kind: 'express-router' });
  });

  it('registers a BullMQAdapter for each dashboard queue when the active backend is bullmq', () => {
    const q1 = { name: 'q1' } as unknown as Queue;
    const q2 = { name: 'q2' } as unknown as Queue;
    const adapter = makeAdapter('bullmq', [
      { name: 'PRODUCTS_SCRAPING', queue: q1 },
      { name: 'PRODUCT_STORAGE', queue: q2 },
    ]);
    const registry = makeRegistry(adapter);

    const service = new QueueDashboardService(logger, registry, '/arena');
    service.setup();

    expect(BullMQAdapterMock).toHaveBeenCalledTimes(2);
    expect(BullMQAdapterMock).toHaveBeenNthCalledWith(1, q1);
    expect(BullMQAdapterMock).toHaveBeenNthCalledWith(2, q2);
    expect(createBullBoardMock).toHaveBeenCalledTimes(1);

    const callArg = createBullBoardMock.mock.calls[0][0];
    expect(callArg.queues).toHaveLength(2);
    expect(callArg.serverAdapter).toBe(serverAdapterInstance);

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('bullmq'));
  });

  it('creates an empty board when the active backend has no dashboard queues (mock)', () => {
    const adapter = makeAdapter('mock', []);
    const registry = makeRegistry(adapter);

    const service = new QueueDashboardService(logger, registry, '/arena');
    service.setup();

    expect(BullMQAdapterMock).not.toHaveBeenCalled();
    expect(createBullBoardMock).toHaveBeenCalledTimes(1);
    expect(createBullBoardMock.mock.calls[0][0].queues).toEqual([]);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('mock'));
  });

  it('throws when setup is called more than once', () => {
    const adapter = makeAdapter('mock', []);
    const registry = makeRegistry(adapter);

    const service = new QueueDashboardService(logger, registry, '/arena');
    service.setup();

    expect(() => service.setup()).toThrow(/already (been )?setup|already initialized/);
  });

  it('exposes the configured base path', () => {
    const adapter = makeAdapter('mock', []);
    const registry = makeRegistry(adapter);

    const service = new QueueDashboardService(logger, registry, '/custom/queue-dashboard');

    expect(service.basePath).toBe('/custom/queue-dashboard');
  });
});
