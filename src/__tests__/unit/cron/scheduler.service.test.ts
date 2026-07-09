import 'reflect-metadata';
import { CronSchedulerService } from '@cron/services/scheduler.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('node-cron', () => {
  const schedule = jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() });
  return {
    __esModule: true,
    default: { schedule },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockNodeCron = require('node-cron');
const mockSchedule = mockNodeCron.default.schedule;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal ScrapingSchedule-shaped object for testing.
 * Override any field by passing an `overrides` map.
 */
function mockScheduleModel(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'sched-1',
    name: 'Test Schedule',
    store: 'revolico',
    cron: '0 */6 * * *',
    enabled: true,
    jobs: [{ category: 'electronics' }],
    lastRunAt: null,
    createdAt: new Date('2025-06-01T00:00:00.000Z'),
    updatedAt: new Date('2025-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------

describe('CronSchedulerService', () => {
  let scheduler: CronSchedulerService;

  let logger: Record<string, any>;
  let repo: Record<string, jest.Mock>;
  let storeRegistry: Record<string, jest.Mock>;
  let qContext: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Restore default return value for mockSchedule after clearAllMocks
    mockSchedule.mockReturnValue({ start: jest.fn(), stop: jest.fn() });

    logger = {
      context: '',
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    };

    repo = {
      findAll: jest.fn().mockResolvedValue([]),
      updateLastRunAt: jest.fn().mockResolvedValue(undefined),
    };

    storeRegistry = {
      get: jest.fn(),
      list: jest.fn(),
    };

    qContext = {
      enqueue: jest.fn().mockResolvedValue('job-id-1'),
    };

    scheduler = new CronSchedulerService(logger as any, repo as any, storeRegistry as any, qContext as any);
  });

  // ===========================================================================
  // initialize
  // ===========================================================================
  describe('initialize', () => {
    it('calls repo.findAll and registers each enabled schedule', async () => {
      const s1 = mockScheduleModel({ id: 's-1', name: 'Alpha', cron: '0 * * * *' });
      const s2 = mockScheduleModel({ id: 's-2', name: 'Beta', cron: '*/5 * * * *' });
      repo.findAll.mockResolvedValue([s1, s2]);

      await scheduler.initialize();

      expect(repo.findAll).toHaveBeenCalledTimes(1);
      expect(mockSchedule).toHaveBeenCalledTimes(2);
      expect(mockSchedule).toHaveBeenCalledWith(s1.cron, expect.any(Function), { scheduled: true });
      expect(mockSchedule).toHaveBeenCalledWith(s2.cron, expect.any(Function), { scheduled: true });
    });

    it('skips disabled schedules and does not register them', async () => {
      const enabled = mockScheduleModel({ id: 's-1', name: 'Active', cron: '0 * * * *' });
      const disabled = mockScheduleModel({ id: 's-2', name: 'Inactive', enabled: false, cron: '0 0 * * *' });
      repo.findAll.mockResolvedValue([enabled, disabled]);

      await scheduler.initialize();

      expect(mockSchedule).toHaveBeenCalledTimes(1);
      expect(mockSchedule).toHaveBeenCalledWith(enabled.cron, expect.any(Function), { scheduled: true });
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Inactive'));
    });
  });

  // ===========================================================================
  // register — enabled schedule
  // ===========================================================================
  describe('register (enabled)', () => {
    it('calls cron.schedule and stores the task', () => {
      const schedule = mockScheduleModel();

      scheduler.register(schedule);

      expect(mockSchedule).toHaveBeenCalledTimes(1);
      expect(mockSchedule).toHaveBeenCalledWith(schedule.cron, expect.any(Function), { scheduled: true });
    });

    it('stops any existing task for the same id before registering', () => {
      const existingTask = { start: jest.fn(), stop: jest.fn() };
      mockSchedule.mockReturnValueOnce(existingTask);
      scheduler.register(mockScheduleModel({ id: 's-1' }));

      const newTask = { start: jest.fn(), stop: jest.fn() };
      mockSchedule.mockReturnValueOnce(newTask);
      scheduler.register(mockScheduleModel({ id: 's-1', cron: '0 0 * * *' }));

      // First task should have been stopped before second registration
      expect(existingTask.stop).toHaveBeenCalledTimes(1);
      // cron.schedule should have been called twice
      expect(mockSchedule).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // register — disabled schedule
  // ===========================================================================
  describe('register (disabled)', () => {
    it('unregisters existing task and does NOT create a new cron task', () => {
      const existingTask = { start: jest.fn(), stop: jest.fn() };
      mockSchedule.mockReturnValueOnce(existingTask);
      // Register initially as enabled
      scheduler.register(mockScheduleModel({ id: 's-1' }));

      // Now register as disabled — should unregister the existing task & skip
      mockSchedule.mockClear();
      scheduler.register(mockScheduleModel({ id: 's-1', enabled: false }));

      expect(existingTask.stop).toHaveBeenCalledTimes(1);
      expect(mockSchedule).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('disabled'));
    });
  });

  // ===========================================================================
  // register — invalid cron expression
  // ===========================================================================
  describe('register (invalid cron)', () => {
    it('catches the error, logs it, and does not throw', () => {
      mockSchedule.mockImplementationOnce(() => {
        throw new Error('Invalid cron expression');
      });

      const schedule = mockScheduleModel({ id: 's-2', name: 'Broken' });
      scheduler.register(schedule);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('invalid cron expression'), expect.any(Error));
    });
  });

  // ===========================================================================
  // unregister
  // ===========================================================================
  describe('unregister', () => {
    it('stops and removes an existing task', () => {
      const task = { start: jest.fn(), stop: jest.fn() };
      mockSchedule.mockReturnValueOnce(task);
      scheduler.register(mockScheduleModel({ id: 's-1' }));

      scheduler.unregister('s-1');

      expect(task.stop).toHaveBeenCalledTimes(1);
      // Calling unregister again should be a no-op (task already removed)
      jest.clearAllMocks();
      task.stop = jest.fn();
      scheduler.unregister('s-1');
      expect(task.stop).not.toHaveBeenCalled();
    });

    it('is a no-op for an unknown id', () => {
      // Should not throw
      expect(() => scheduler.unregister('non-existent')).not.toThrow();
    });
  });

  // ===========================================================================
  // shutdown
  // ===========================================================================
  describe('shutdown', () => {
    it('stops all running tasks and clears the internal map', () => {
      const task1 = { start: jest.fn(), stop: jest.fn() };
      const task2 = { start: jest.fn(), stop: jest.fn() };
      mockSchedule.mockReturnValueOnce(task1).mockReturnValueOnce(task2);

      scheduler.register(mockScheduleModel({ id: 's-1' }));
      scheduler.register(mockScheduleModel({ id: 's-2' }));

      // Re-invoke shutdown twice to prove idempotency
      scheduler.shutdown();
      scheduler.shutdown();

      expect(task1.stop).toHaveBeenCalledTimes(1);
      expect(task2.stop).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // _onTick — happy path
  // ===========================================================================
  describe('_onTick (happy path)', () => {
    it('resolves store, enqueues each job, and updates lastRunAt', async () => {
      const schedule = mockScheduleModel({
        jobs: [{ category: 'electronics' }, { category: 'vehicles' }],
      });

      storeRegistry.get.mockReturnValue({ scrapingQueue: 'revolico-queue' });

      // Register so the cron callback is captured, then invoke it
      scheduler.register(schedule);
      const onTickCb = mockSchedule.mock.calls[0][1];
      await onTickCb();

      expect(storeRegistry.get).toHaveBeenCalledWith('revolico');
      expect(qContext.enqueue).toHaveBeenCalledTimes(2);
      expect(qContext.enqueue).toHaveBeenCalledWith('revolico-queue', { category: 'electronics' }, { attempts: 2, backoff: 5000 });
      expect(qContext.enqueue).toHaveBeenCalledWith('revolico-queue', { category: 'vehicles' }, { attempts: 2, backoff: 5000 });
      expect(repo.updateLastRunAt).toHaveBeenCalledWith(schedule.id);
    });
  });

  // ===========================================================================
  // _onTick — job failure isolation
  // ===========================================================================
  describe('_onTick (error isolation)', () => {
    it('does not block subsequent jobs when one enqueue fails', async () => {
      const schedule = mockScheduleModel({
        jobs: [{ category: 'electronics' }, { category: 'vehicles' }, { category: 'furniture' }],
      });

      storeRegistry.get.mockReturnValue({ scrapingQueue: 'revolico-queue' });
      qContext.enqueue.mockResolvedValueOnce('ok').mockRejectedValueOnce(new Error('Queue full')).mockResolvedValueOnce('ok');

      scheduler.register(schedule);
      const onTickCb = mockSchedule.mock.calls[0][1];
      await onTickCb();

      // 3 enqueue calls were attempted
      expect(qContext.enqueue).toHaveBeenCalledTimes(3);
      // The error was logged
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to enqueue job #1'), expect.any(Error));
      // lastRunAt was still updated (error is isolated to the failing job)
      expect(repo.updateLastRunAt).toHaveBeenCalledWith(schedule.id);
    });
  });

  // ===========================================================================
  // _onTick — unknown store
  // ===========================================================================
  describe('_onTick (unknown store)', () => {
    it('logs an error and returns early without enqueuing', async () => {
      const schedule = mockScheduleModel({ store: 'unknown-store' });

      storeRegistry.get.mockImplementation(() => {
        throw new Error('Unknown store: "unknown-store"');
      });

      scheduler.register(schedule);
      const onTickCb = mockSchedule.mock.calls[0][1];
      await onTickCb();

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('unknown store'), expect.any(Error));
      expect(qContext.enqueue).not.toHaveBeenCalled();
      expect(repo.updateLastRunAt).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // _onTick — updateLastRunAt failure silently swallowed
  // ===========================================================================
  describe('_onTick (updateLastRunAt failure)', () => {
    it('swallows the error and does not affect job enqueuing', async () => {
      const schedule = mockScheduleModel();
      storeRegistry.get.mockReturnValue({ scrapingQueue: 'revolico-queue' });
      repo.updateLastRunAt.mockRejectedValue(new Error('DB timeout'));

      scheduler.register(schedule);
      const onTickCb = mockSchedule.mock.calls[0][1];
      await onTickCb();

      // Jobs were enqueued despite the DB failure
      expect(qContext.enqueue).toHaveBeenCalledTimes(1);
      // The error from updateLastRunAt is silently swallowed (no log.error)
      expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('DB timeout'), expect.anything());
    });
  });
});
