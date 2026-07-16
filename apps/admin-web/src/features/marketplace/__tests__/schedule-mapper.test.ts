import { describe, expect, it } from 'vitest';

import { mapScheduleDTOToViewModel } from '../mappers/schedule-mapper';
import type { ScheduleDTO } from '../services/schedules-service';

describe('mapScheduleDTOToViewModel', () => {
  const mockDTO: ScheduleDTO = {
    id: 'schedule-1',
    name: 'Daily Revolico Scrape',
    store: 'revolico',
    cron: '0 0 * * *',
    enabled: true,
    jobs: [{ category: 'https://revolico.com/electronics', maxPages: 5 }],
    lastRunAt: '2024-06-01T12:00:00.000Z',
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-06-01T12:00:00.000Z',
  };

  it('maps all fields correctly', () => {
    const result = mapScheduleDTOToViewModel(mockDTO);

    expect(result.id).toBe('schedule-1');
    expect(result.name).toBe('Daily Revolico Scrape');
    expect(result.store).toBe('revolico');
    expect(result.cron).toBe('0 0 * * *');
    expect(result.enabled).toBe(true);
    expect(result.jobs).toEqual([{ category: 'https://revolico.com/electronics', maxPages: 5 }]);
    expect(result.jobsCount).toBe(1);
  });

  it('parses lastRunAt ISO string to Date', () => {
    const result = mapScheduleDTOToViewModel(mockDTO);
    expect(result.lastRunAt).toBeInstanceOf(Date);
    expect(result.lastRunAt?.toISOString()).toBe('2024-06-01T12:00:00.000Z');
  });

  it('parses createdAt and updatedAt ISO strings to Date', () => {
    const result = mapScheduleDTOToViewModel(mockDTO);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('sets lastRunAt to null when API returns null', () => {
    const dto = { ...mockDTO, lastRunAt: null };
    const result = mapScheduleDTOToViewModel(dto);
    expect(result.lastRunAt).toBeNull();
  });

  it('computes jobsCount as zero for empty jobs array', () => {
    const dto = { ...mockDTO, jobs: [] };
    const result = mapScheduleDTOToViewModel(dto);
    expect(result.jobsCount).toBe(0);
  });

  it('computes jobsCount from jobs array length', () => {
    const dto = {
      ...mockDTO,
      jobs: [{ a: 1 }, { b: 2 }, { c: 3 }],
    };
    const result = mapScheduleDTOToViewModel(dto);
    expect(result.jobsCount).toBe(3);
  });

  it('handles undefined jobs gracefully', () => {
    const dto = { ...mockDTO, jobs: undefined as unknown as Record<string, unknown>[] };
    const result = mapScheduleDTOToViewModel(dto);
    expect(result.jobsCount).toBe(0);
  });

  it('enabled is false when schedule is disabled', () => {
    const dto = { ...mockDTO, enabled: false };
    const result = mapScheduleDTOToViewModel(dto);
    expect(result.enabled).toBe(false);
  });
});
