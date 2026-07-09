import 'reflect-metadata';
import { ScheduleService } from '@cron/services/schedule.service';
import { ScheduleRepository } from '@cron/repositories/schedule.repository';
import { CronSchedulerService } from '@cron/services/scheduler.service';
import { CreateScheduleDTO, UpdateScheduleDTO } from '@cron/services/dto';
import { ScheduleNotFoundError } from '@cron/errors';
import { IScheduleResponseDTO } from '@cron/mappers';
import { ScrapingSchedule, Prisma } from '@prisma/client';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let mockRepo: jest.Mocked<Pick<ScheduleRepository, 'findAll' | 'findById' | 'create' | 'update' | 'delete'>>;
  let mockScheduler: jest.Mocked<Pick<CronSchedulerService, 'register' | 'unregister'>>;
  let mockLogger: { info: jest.Mock; debug: jest.Mock; error: jest.Mock; warn: jest.Mock; context: string };

  const now = new Date('2026-07-09T12:00:00Z');

  const mockSchedule: ScrapingSchedule = {
    id: 'sched-1',
    name: 'Test Schedule',
    store: 'revolico',
    cron: '*/5 * * * *',
    enabled: true,
    jobs: [{ url: 'https://revolico.example.com/page/1' }],
    lastRunAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const mockScheduleList: ScrapingSchedule[] = [mockSchedule, { ...mockSchedule, id: 'sched-2', name: 'Second Schedule' }];

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockScheduler = {
      register: jest.fn(),
      unregister: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      context: '',
    };

    service = new ScheduleService(
      mockRepo as unknown as ScheduleRepository,
      mockScheduler as unknown as CronSchedulerService,
      mockLogger as any,
    );
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe('list', () => {
    it('should call repo.findAll and map each result to a response DTO', async () => {
      mockRepo.findAll.mockResolvedValue(mockScheduleList);

      const result = await service.list();

      expect(mockRepo.findAll).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject<Partial<IScheduleResponseDTO>>({
        id: 'sched-1',
        name: 'Test Schedule',
        store: 'revolico',
        enabled: true,
      });
      expect(result[1]).toMatchObject<Partial<IScheduleResponseDTO>>({
        id: 'sched-2',
        name: 'Second Schedule',
      });
      expect(result[0].createdAt).toBe('2026-07-09T12:00:00.000Z');
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('should call repo.findById and return the mapped DTO when found', async () => {
      mockRepo.findById.mockResolvedValue(mockSchedule);

      const result = await service.findOne('sched-1');

      expect(mockRepo.findById).toHaveBeenCalledTimes(1);
      expect(mockRepo.findById).toHaveBeenCalledWith('sched-1');
      expect(result).toMatchObject<Partial<IScheduleResponseDTO>>({
        id: 'sched-1',
        name: 'Test Schedule',
        cron: '*/5 * * * *',
      });
    });

    it('should throw ScheduleNotFoundError when the schedule does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(ScheduleNotFoundError);
      await expect(service.findOne('nonexistent')).rejects.toThrow('Scraping schedule not found for id="nonexistent"');
      expect(mockRepo.findById).toHaveBeenCalledWith('nonexistent');
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should call repo.create and scheduler.register, then return the mapped DTO', async () => {
      const dto = CreateScheduleDTO.from({
        name: 'New Schedule',
        store: 'revolico',
        cron: '0 * * * *',
        enabled: true,
        jobs: [{ url: 'https://revolico.example.com/page/1' }],
      });

      const created = {
        id: 'sched-3',
        name: dto.name,
        store: dto.store,
        cron: dto.cron,
        enabled: dto.enabled,
        jobs: dto.jobs as Prisma.JsonValue,
        lastRunAt: null,
        createdAt: now,
        updatedAt: now,
      } as ScrapingSchedule;
      mockRepo.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'New Schedule',
        store: 'revolico',
        cron: '0 * * * *',
        enabled: true,
        jobs: [{ url: 'https://revolico.example.com/page/1' }],
      });
      expect(mockScheduler.register).toHaveBeenCalledTimes(1);
      expect(mockScheduler.register).toHaveBeenCalledWith(created);
      expect(mockLogger.info).toHaveBeenCalledWith('Scraping schedule created', {
        scheduleId: 'sched-3',
        store: 'revolico',
        cron: '0 * * * *',
        enabled: true,
      });
      expect(result).toMatchObject<Partial<IScheduleResponseDTO>>({
        id: 'sched-3',
        name: 'New Schedule',
        store: 'revolico',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should check existence, call repo.update and scheduler.register, then return the mapped DTO', async () => {
      mockRepo.findById.mockResolvedValue(mockSchedule);

      const dto = UpdateScheduleDTO.from({ name: 'Updated Name', enabled: false });
      const updated: ScrapingSchedule = {
        ...mockSchedule,
        name: 'Updated Name',
        enabled: false,
        updatedAt: new Date(),
      };
      mockRepo.update.mockResolvedValue(updated);

      const result = await service.update('sched-1', dto);

      expect(mockRepo.findById).toHaveBeenCalledWith('sched-1');
      expect(mockRepo.update).toHaveBeenCalledWith('sched-1', {
        name: 'Updated Name',
        enabled: false,
      });
      expect(mockScheduler.register).toHaveBeenCalledWith(updated);
      expect(mockLogger.info).toHaveBeenCalledWith('Scraping schedule updated', {
        scheduleId: 'sched-1',
        changes: ['name', 'enabled'],
      });
      expect(result).toMatchObject<Partial<IScheduleResponseDTO>>({
        id: 'sched-1',
        name: 'Updated Name',
        enabled: false,
      });
    });

    it('should throw ScheduleNotFoundError when the schedule does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const dto = UpdateScheduleDTO.from({ name: 'Updated Name' });

      await expect(service.update('nonexistent', dto)).rejects.toThrow(ScheduleNotFoundError);
      expect(mockRepo.findById).toHaveBeenCalledWith('nonexistent');
      expect(mockRepo.update).not.toHaveBeenCalled();
      expect(mockScheduler.register).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('should check existence, call repo.delete and scheduler.unregister', async () => {
      mockRepo.findById.mockResolvedValue(mockSchedule);
      mockRepo.delete.mockResolvedValue(undefined);

      await service.delete('sched-1');

      expect(mockRepo.findById).toHaveBeenCalledWith('sched-1');
      expect(mockRepo.delete).toHaveBeenCalledWith('sched-1');
      expect(mockScheduler.unregister).toHaveBeenCalledWith('sched-1');
      expect(mockLogger.info).toHaveBeenCalledWith('Scraping schedule deleted', {
        scheduleId: 'sched-1',
      });
    });

    it('should throw ScheduleNotFoundError when the schedule does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(ScheduleNotFoundError);
      expect(mockRepo.findById).toHaveBeenCalledWith('nonexistent');
      expect(mockRepo.delete).not.toHaveBeenCalled();
      expect(mockScheduler.unregister).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // toggle
  // ---------------------------------------------------------------------------
  describe('toggle', () => {
    it('should flip enabled from true to false, call repo.update and scheduler.register', async () => {
      const enabledSchedule: ScrapingSchedule = { ...mockSchedule, enabled: true };
      mockRepo.findById.mockResolvedValue(enabledSchedule);

      const updated: ScrapingSchedule = { ...mockSchedule, enabled: false, updatedAt: new Date() };
      mockRepo.update.mockResolvedValue(updated);

      const result = await service.toggle('sched-1');

      expect(mockRepo.findById).toHaveBeenCalledWith('sched-1');
      expect(mockRepo.update).toHaveBeenCalledWith('sched-1', { enabled: false });
      expect(mockScheduler.register).toHaveBeenCalledWith(updated);
      expect(mockLogger.info).toHaveBeenCalledWith('Scraping schedule toggled', {
        scheduleId: 'sched-1',
        enabled: false,
      });
      expect(result).toMatchObject<Partial<IScheduleResponseDTO>>({
        id: 'sched-1',
        enabled: false,
      });
    });

    it('should flip enabled from false to true, call repo.update and scheduler.register', async () => {
      const disabledSchedule: ScrapingSchedule = { ...mockSchedule, enabled: false };
      mockRepo.findById.mockResolvedValue(disabledSchedule);

      const updated: ScrapingSchedule = { ...mockSchedule, enabled: true, updatedAt: new Date() };
      mockRepo.update.mockResolvedValue(updated);

      const result = await service.toggle('sched-1');

      expect(mockRepo.findById).toHaveBeenCalledWith('sched-1');
      expect(mockRepo.update).toHaveBeenCalledWith('sched-1', { enabled: true });
      expect(mockScheduler.register).toHaveBeenCalledWith(updated);
      expect(result).toMatchObject<Partial<IScheduleResponseDTO>>({
        id: 'sched-1',
        enabled: true,
      });
    });

    it('should throw ScheduleNotFoundError when the schedule does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.toggle('nonexistent')).rejects.toThrow(ScheduleNotFoundError);
      expect(mockRepo.findById).toHaveBeenCalledWith('nonexistent');
      expect(mockRepo.update).not.toHaveBeenCalled();
      expect(mockScheduler.register).not.toHaveBeenCalled();
    });
  });
});
