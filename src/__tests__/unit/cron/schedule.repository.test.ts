import 'reflect-metadata';
import { ScheduleRepository, ICreateScheduleInput, IUpdateScheduleInput } from '@cron/repositories/schedule.repository';
import { ScrapingSchedule } from '@prisma/client';

describe('ScheduleRepository', () => {
  let repo: ScheduleRepository;
  let mockFindMany: jest.Mock;
  let mockFindUnique: jest.Mock;
  let mockCreate: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;

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
    mockFindMany = jest.fn();
    mockFindUnique = jest.fn();
    mockCreate = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();

    const mockPrisma = {
      scrapingSchedule: {
        findMany: mockFindMany,
        findUnique: mockFindUnique,
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete,
      },
    };

    repo = new ScheduleRepository(mockPrisma as any);
  });

  describe('findAll', () => {
    it('should call findMany with orderBy createdAt asc and return all schedules', async () => {
      mockFindMany.mockResolvedValue(mockScheduleList);

      const result = await repo.findAll();

      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'asc' } });
      expect(result).toEqual(mockScheduleList);
      expect(result).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should call findUnique with the given id and return the schedule when found', async () => {
      mockFindUnique.mockResolvedValue(mockSchedule);

      const result = await repo.findById('sched-1');

      expect(mockFindUnique).toHaveBeenCalledTimes(1);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'sched-1' } });
      expect(result).toEqual(mockSchedule);
    });

    it('should return null when the schedule is not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await repo.findById('nonexistent');

      expect(mockFindUnique).toHaveBeenCalledTimes(1);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'nonexistent' } });
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should call create with the input data and return the created schedule', async () => {
      const input: ICreateScheduleInput = {
        name: 'New Schedule',
        store: 'revolico',
        cron: '0 * * * *',
        enabled: true,
        jobs: [{ url: 'https://revolico.example.com/page/1' }],
      };
      const created: ScrapingSchedule = {
        id: 'sched-3',
        ...input,
        lastRunAt: null,
        createdAt: now,
        updatedAt: now,
      };
      mockCreate.mockResolvedValue(created);

      const result = await repo.create(input);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith({ data: input });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should call update with the id and data and return the updated schedule', async () => {
      const updateData: IUpdateScheduleInput = { name: 'Updated Name', enabled: false };
      const updated: ScrapingSchedule = {
        ...mockSchedule,
        name: 'Updated Name',
        enabled: false,
        updatedAt: new Date(),
      };
      mockUpdate.mockResolvedValue(updated);

      const result = await repo.update('sched-1', updateData);

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
        data: updateData,
      });
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('should call delete with the id and resolve', async () => {
      mockDelete.mockResolvedValue(undefined);

      await repo.delete('sched-1');

      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'sched-1' } });
    });
  });

  describe('updateLastRunAt', () => {
    it('should call update with the id and a Date for lastRunAt', async () => {
      mockUpdate.mockResolvedValue({
        ...mockSchedule,
        lastRunAt: new Date(),
      });

      await repo.updateLastRunAt('sched-1');

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
        data: { lastRunAt: expect.any(Date) },
      });
    });
  });
});
