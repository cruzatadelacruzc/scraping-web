import 'reflect-metadata';
import { Request, Response } from 'express';
import { ScheduleController, StoreInfoController } from '@cron/controllers/schedule.controller';
import { ScheduleNotFoundError } from '@cron/errors';
import { IScheduleResponseDTO } from '@cron/mappers';

// ===========================================================================
// ScheduleController
// ===========================================================================

describe('ScheduleController', () => {
  let controller: ScheduleController;
  let serviceMock: Record<string, jest.Mock>;

  let loggerMock: Record<string, any>;
  let req: Partial<Request>;
  let res: Partial<Response>;

  /** Stub schedule response DTO shape */
  const sampleSchedule: IScheduleResponseDTO = {
    id: 'sched-1',
    name: 'Daily Revolico Check',
    store: 'revolico',
    cron: '0 8 * * *',
    enabled: true,
    jobs: [{ category: 'electronics' }],
    lastRunAt: null,
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    serviceMock = {
      list: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      toggle: jest.fn(),
    };

    loggerMock = {
      context: '',
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    };

    controller = new ScheduleController(serviceMock as any, loggerMock as any);

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  // =========================================================================
  // list
  // =========================================================================
  describe('list', () => {
    it('returns 200 with schedules array', async () => {
      const schedules = [sampleSchedule];
      serviceMock.list.mockResolvedValue(schedules);

      await controller.list(res as Response);

      expect(serviceMock.list).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { schedules },
        }),
      );
    });

    it('returns 500 when service.list throws', async () => {
      serviceMock.list.mockRejectedValue(new Error('DB error'));

      await controller.list(res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Failed to list scraping schedules',
        }),
      );
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================
  describe('findOne', () => {
    it('returns 200 with schedule when found', async () => {
      req = { params: { id: 'sched-1' } };
      serviceMock.findOne.mockResolvedValue(sampleSchedule);

      await controller.findOne('sched-1', res as Response);

      expect(serviceMock.findOne).toHaveBeenCalledWith('sched-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { schedule: sampleSchedule },
        }),
      );
    });

    it('returns 404 when ScheduleNotFoundError is thrown', async () => {
      req = { params: { id: 'no-such-id' } };
      serviceMock.findOne.mockRejectedValue(new ScheduleNotFoundError('no-such-id'));

      await controller.findOne('no-such-id', res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: expect.stringContaining('no-such-id'),
        }),
      );
    });

    it('returns 500 on unexpected error', async () => {
      req = { params: { id: 'sched-1' } };
      serviceMock.findOne.mockRejectedValue(new Error('Unexpected'));

      await controller.findOne('sched-1', res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // create
  // =========================================================================
  describe('create', () => {
    it('returns 201 with created schedule', async () => {
      req = {
        body: {
          name: 'New Schedule',
          store: 'revolico',
          cron: '0 * * * *',
          enabled: true,
          jobs: [{ category: 'all' }],
        },
      };
      serviceMock.create.mockResolvedValue(sampleSchedule);

      await controller.create(req as Request, res as Response);

      expect(serviceMock.create).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: 'Scraping schedule created',
          data: { schedule: sampleSchedule },
        }),
      );
    });

    it('returns 500 when service.create throws', async () => {
      req = { body: { name: 'Bad' } };
      serviceMock.create.mockRejectedValue(new Error('Validation failed'));

      await controller.create(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // update
  // =========================================================================
  describe('update', () => {
    it('returns 200 with updated schedule', async () => {
      req = {
        params: { id: 'sched-1' },
        body: { cron: '0 */2 * * *' },
      };
      serviceMock.update.mockResolvedValue({ ...sampleSchedule, cron: '0 */2 * * *' });

      await controller.update('sched-1', req as Request, res as Response);

      expect(serviceMock.update).toHaveBeenCalledWith('sched-1', req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { schedule: { ...sampleSchedule, cron: '0 */2 * * *' } },
        }),
      );
    });

    it('returns 404 when ScheduleNotFoundError is thrown', async () => {
      req = { params: { id: 'bad-id' }, body: {} };
      serviceMock.update.mockRejectedValue(new ScheduleNotFoundError('bad-id'));

      await controller.update('bad-id', req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: expect.stringContaining('bad-id'),
        }),
      );
    });

    it('returns 500 on unexpected error', async () => {
      req = { params: { id: 'sched-1' }, body: {} };
      serviceMock.update.mockRejectedValue(new Error('Unexpected'));

      await controller.update('sched-1', req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // delete
  // =========================================================================
  describe('delete', () => {
    it('returns 200 on successful deletion', async () => {
      req = { params: { id: 'sched-1' } };
      serviceMock.delete.mockResolvedValue(undefined);

      await controller.delete('sched-1', res as Response);

      expect(serviceMock.delete).toHaveBeenCalledWith('sched-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: 'http:deleted',
        }),
      );
    });

    it('returns 404 when ScheduleNotFoundError is thrown', async () => {
      req = { params: { id: 'bad-id' } };
      serviceMock.delete.mockRejectedValue(new ScheduleNotFoundError('bad-id'));

      await controller.delete('bad-id', res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: expect.stringContaining('bad-id'),
        }),
      );
    });

    it('returns 500 on unexpected error', async () => {
      req = { params: { id: 'sched-1' } };
      serviceMock.delete.mockRejectedValue(new Error('Unexpected'));

      await controller.delete('sched-1', res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // toggle
  // =========================================================================
  describe('toggle', () => {
    it('returns 200 with toggled schedule', async () => {
      req = { params: { id: 'sched-1' } };
      const toggled = { ...sampleSchedule, enabled: false };
      serviceMock.toggle.mockResolvedValue(toggled);

      await controller.toggle('sched-1', res as Response);

      expect(serviceMock.toggle).toHaveBeenCalledWith('sched-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { schedule: toggled },
        }),
      );
    });

    it('returns 404 when ScheduleNotFoundError is thrown', async () => {
      req = { params: { id: 'bad-id' } };
      serviceMock.toggle.mockRejectedValue(new ScheduleNotFoundError('bad-id'));

      await controller.toggle('bad-id', res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: expect.stringContaining('bad-id'),
        }),
      );
    });

    it('returns 500 on unexpected error', async () => {
      req = { params: { id: 'sched-1' } };
      serviceMock.toggle.mockRejectedValue(new Error('Unexpected'));

      await controller.toggle('sched-1', res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });
});

// ===========================================================================
// StoreInfoController
// ===========================================================================

describe('StoreInfoController', () => {
  let controller: StoreInfoController;
  let storeRegistryMock: Record<string, jest.Mock>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    storeRegistryMock = {
      list: jest.fn(),
      get: jest.fn(),
    };

    controller = new StoreInfoController(storeRegistryMock as any);

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('listStores', () => {
    it('returns 200 with stores list', async () => {
      const stores = [{ key: 'revolico', displayName: 'Revolico', scrapingQueue: 'revolico-queue', jobSchema: { fields: [] } }];
      storeRegistryMock.list.mockReturnValue(stores);

      await controller.listStores(res as Response);

      expect(storeRegistryMock.list).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { stores },
        }),
      );
    });

    it('returns 200 when no stores are registered', async () => {
      storeRegistryMock.list.mockReturnValue([]);

      await controller.listStores(res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { stores: [] },
        }),
      );
    });

    it('returns 500 when list() throws', async () => {
      storeRegistryMock.list.mockImplementation(() => {
        throw new Error('Registry error');
      });

      await controller.listStores(res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Failed to list stores',
        }),
      );
    });
  });
});
