import { QueueStatsDTO, JobDetailDTO } from '@admin/services/dto/queue-stats.dto';

describe('QueueStatsDTO', () => {
  describe('structural', () => {
    it('should have a static from method', () => {
      expect(typeof QueueStatsDTO.from).toBe('function');
    });
  });

  describe('from', () => {
    it('should parse valid queue stats data', () => {
      const dto = QueueStatsDTO.from({
        queueName: 'scraping-queue',
        counts: { waiting: 5, active: 2, completed: 100, failed: 3, delayed: 1 },
      });

      expect(dto.queueName).toBe('scraping-queue');
      expect(dto.counts).toEqual({ waiting: 5, active: 2, completed: 100, failed: 3, delayed: 1 });
    });

    it('should parse empty counts', () => {
      const dto = QueueStatsDTO.from({ queueName: 'test', counts: {} });
      expect(dto.queueName).toBe('test');
      expect(dto.counts).toEqual({});
    });

    it('should throw for missing queueName', () => {
      expect(() => QueueStatsDTO.from({ counts: { waiting: 1 } })).toThrow();
    });

    it('should throw for missing counts', () => {
      expect(() => QueueStatsDTO.from({ queueName: 'test' })).toThrow();
    });

    it('should throw for non-object input', () => {
      expect(() => QueueStatsDTO.from(null)).toThrow();
      expect(() => QueueStatsDTO.from(undefined)).toThrow();
      expect(() => QueueStatsDTO.from('string')).toThrow();
    });

    it('should throw when counts values are not numbers', () => {
      expect(() => QueueStatsDTO.from({ queueName: 'test', counts: { waiting: 'five' } })).toThrow();
    });
  });
});

describe('JobDetailDTO', () => {
  describe('structural', () => {
    it('should have a static from method', () => {
      expect(typeof JobDetailDTO.from).toBe('function');
    });
  });

  describe('from', () => {
    it('should parse a valid job detail', () => {
      const dto = JobDetailDTO.from({
        id: 'job-123',
        name: 'scrape-product',
        data: { url: 'https://example.com' },
        progress: 50,
        attemptsMade: 0,
        timestamp: 1700000000000,
        processedOn: 1700000001000,
        finishedOn: null,
        returnValue: { success: true },
        status: 'completed',
      });

      expect(dto.id).toBe('job-123');
      expect(dto.name).toBe('scrape-product');
      expect(dto.data).toEqual({ url: 'https://example.com' });
      expect(dto.progress).toBe(50);
      expect(dto.attemptsMade).toBe(0);
      expect(dto.timestamp).toBe(1700000000000);
      expect(dto.processedOn).toBe(1700000001000);
      expect(dto.finishedOn).toBeNull();
      expect(dto.returnValue).toEqual({ success: true });
      expect(dto.status).toBe('completed');
    });

    it('should parse a minimal job detail with only required fields', () => {
      const dto = JobDetailDTO.from({ id: 'job-min', name: 'minimal' });
      expect(dto.id).toBe('job-min');
      expect(dto.name).toBe('minimal');
      expect(dto.data).toBeUndefined();
      expect(dto.progress).toBeUndefined();
      expect(dto.attemptsMade).toBeUndefined();
      expect(dto.failedReason).toBeUndefined();
      expect(dto.timestamp).toBeUndefined();
      expect(dto.processedOn).toBeUndefined();
      expect(dto.finishedOn).toBeUndefined();
      expect(dto.returnValue).toBeUndefined();
      expect(dto.status).toBeUndefined();
    });

    it('should parse a failed job with failedReason', () => {
      const dto = JobDetailDTO.from({
        id: 'job-fail',
        name: 'failed-job',
        attemptsMade: 3,
        failedReason: 'Connection timeout',
        status: 'failed',
      });

      expect(dto.id).toBe('job-fail');
      expect(dto.failedReason).toBe('Connection timeout');
      expect(dto.attemptsMade).toBe(3);
      expect(dto.status).toBe('failed');
    });

    it('should parse progress as object', () => {
      const dto = JobDetailDTO.from({
        id: 'job-progress-obj',
        name: 'batch-scrape',
        progress: { current: 10, total: 100 },
      });

      expect(dto.progress).toEqual({ current: 10, total: 100 });
    });

    it('should throw for missing id', () => {
      expect(() => JobDetailDTO.from({ name: 'test' })).toThrow();
    });

    it('should throw for missing name', () => {
      expect(() => JobDetailDTO.from({ id: 'test' })).toThrow();
    });

    it('should throw for non-object input', () => {
      expect(() => JobDetailDTO.from(null)).toThrow();
      expect(() => JobDetailDTO.from(undefined)).toThrow();
      expect(() => JobDetailDTO.from('string')).toThrow();
    });

    it('should throw for wrong type on attemptsMade', () => {
      expect(() => JobDetailDTO.from({ id: 'test', name: 'test', attemptsMade: 'three' })).toThrow();
    });
  });
});
