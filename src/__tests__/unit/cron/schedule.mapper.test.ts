import { toScheduleResponseDTO } from '@cron/mappers/schedule.mapper';
import { ScrapingSchedule } from '@prisma/client';

function mockSchedule(overrides: Partial<ScrapingSchedule> = {}): ScrapingSchedule {
  return {
    id: '123',
    name: 'test',
    store: 'revolico',
    cron: '0 * * * *',
    enabled: true,
    jobs: [{ category: 'test' }],
    lastRunAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  };
}

describe('toScheduleResponseDTO', () => {
  it('should map a full model to DTO with ISO date strings', () => {
    const model = mockSchedule();
    const dto = toScheduleResponseDTO(model);

    expect(dto.id).toBe('123');
    expect(dto.name).toBe('test');
    expect(dto.store).toBe('revolico');
    expect(dto.cron).toBe('0 * * * *');
    expect(dto.enabled).toBe(true);
    expect(dto.jobs).toEqual([{ category: 'test' }]);
    expect(dto.lastRunAt).toBe('2026-01-01T00:00:00.000Z');
    expect(dto.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(dto.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('should map lastRunAt as null when model has no last run', () => {
    const model = mockSchedule({ lastRunAt: null });
    const dto = toScheduleResponseDTO(model);

    expect(dto.lastRunAt).toBeNull();
  });

  it('should pass through jobs array as-is', () => {
    const jobs = [{ category: 'electronics', subcategory: 'laptops', page: 1 }, { category: 'vehicles' }];
    const model = mockSchedule({ jobs: jobs as unknown as ScrapingSchedule['jobs'] });
    const dto = toScheduleResponseDTO(model);

    expect(dto.jobs).toEqual(jobs);
  });

  it('should map enabled as true', () => {
    const model = mockSchedule({ enabled: true });
    const dto = toScheduleResponseDTO(model);

    expect(dto.enabled).toBe(true);
  });

  it('should map enabled as false', () => {
    const model = mockSchedule({ enabled: false });
    const dto = toScheduleResponseDTO(model);

    expect(dto.enabled).toBe(false);
  });
});
