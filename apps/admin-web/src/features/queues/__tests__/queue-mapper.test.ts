import { describe, expect, it } from 'vitest';

import {
  mapJobDTOToDetail,
  mapJobDTOToListItem,
  mapQueueStatsDTOToViewModel,
} from '../mappers/queue-mapper';

describe('mapQueueStatsDTOToViewModel', () => {
  it('maps counts ordered by severity with semantic variants', () => {
    const vm = mapQueueStatsDTOToViewModel({
      queueName: 'PRODUCTS_SCRAPING',
      counts: { completed: 10, failed: 2, active: 1, waiting: 3 },
    });

    expect(vm.name).toBe('PRODUCTS_SCRAPING');
    expect(vm.counts.map((c) => c.label)).toEqual(['active', 'waiting', 'failed', 'completed']);
    expect(vm.counts.find((c) => c.label === 'failed')?.variant).toBe('danger');
    expect(vm.counts.find((c) => c.label === 'completed')?.variant).toBe('success');
    expect(vm.total).toBe(16);
    expect(vm.failedCount).toBe(2);
    expect(vm.hasFailures).toBe(true);
  });

  it('handles empty counts and unknown statuses', () => {
    const empty = mapQueueStatsDTOToViewModel({ queueName: 'Q', counts: {} });
    expect(empty.counts).toEqual([]);
    expect(empty.total).toBe(0);
    expect(empty.hasFailures).toBe(false);

    const unknown = mapQueueStatsDTOToViewModel({
      queueName: 'Q',
      counts: { 'waiting-children': 4 },
    });
    expect(unknown.counts[0]).toEqual({ label: 'waiting-children', count: 4, variant: 'muted' });
  });
});

describe('mapJobDTOToListItem', () => {
  it('maps timestamps to Dates and computes duration', () => {
    const item = mapJobDTOToListItem({
      id: '101',
      name: 'scrape-category',
      status: 'completed',
      attemptsMade: 1,
      timestamp: 1752700000000,
      processedOn: 1752700001000,
      finishedOn: 1752700009000,
    });

    expect(item.status).toBe('completed');
    expect(item.statusVariant).toBe('success');
    expect(item.createdAt?.getTime()).toBe(1752700000000);
    expect(item.finishedAt?.getTime()).toBe(1752700009000);
    expect(item.durationMs).toBe(8000);
    expect(item.failedReason).toBeNull();
  });

  it('defaults missing fields and unknown status', () => {
    const item = mapJobDTOToListItem({ id: '1', name: 'x' });
    expect(item.status).toBe('unknown');
    expect(item.statusVariant).toBe('muted');
    expect(item.attemptsMade).toBe(0);
    expect(item.createdAt).toBeNull();
    expect(item.finishedAt).toBeNull();
    expect(item.durationMs).toBeNull();
  });
});

describe('mapJobDTOToDetail', () => {
  it('pretty-prints payload and return value', () => {
    const detail = mapJobDTOToDetail({
      id: '1',
      name: 'x',
      data: { url: 'https://revolico.com' },
      returnValue: { stored: 5 },
      progress: 40,
      processedOn: 1752700001000,
    });

    expect(detail.payloadJson).toBe(JSON.stringify({ url: 'https://revolico.com' }, null, 2));
    expect(detail.returnValueJson).toBe(JSON.stringify({ stored: 5 }, null, 2));
    expect(detail.progressPercent).toBe(40);
    expect(detail.processedAt?.getTime()).toBe(1752700001000);
  });

  it('returns null payload when the job has no data and null progress when structured', () => {
    const detail = mapJobDTOToDetail({ id: '1', name: 'x', progress: { step: 'a' } });
    expect(detail.payloadJson).toBeNull();
    expect(detail.returnValueJson).toBeNull();
    expect(detail.progressPercent).toBeNull();
  });
});
