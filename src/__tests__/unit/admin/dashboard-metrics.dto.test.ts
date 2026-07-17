import { DashboardMetricsDTO, HealthResponseDTO } from '@admin/services/dto/dashboard-metrics.dto';

describe('DashboardMetricsDTO', () => {
  describe('structural', () => {
    it('should have a static from method', () => {
      expect(typeof DashboardMetricsDTO.from).toBe('function');
    });
  });

  describe('from', () => {
    it('should parse valid metrics data', () => {
      const dto = DashboardMetricsDTO.from({
        productCount: 150,
        categoriesBreakdown: [
          { category: 'Electronics', count: 50 },
          { category: 'Vehicles', count: 100 },
        ],
        totalAccounts: 12,
        totalUsers: 45,
        activeSubscriptions: 8,
        recentProducts: [{ _id: 'p1', description: 'iPhone 15', price: 500 }],
      });

      expect(dto.productCount).toBe(150);
      expect(dto.categoriesBreakdown).toHaveLength(2);
      expect(dto.categoriesBreakdown[0]).toEqual({ category: 'Electronics', count: 50 });
      expect(dto.totalAccounts).toBe(12);
      expect(dto.totalUsers).toBe(45);
      expect(dto.activeSubscriptions).toBe(8);
      expect(dto.recentProducts).toHaveLength(1);
      expect(dto.recentProducts[0].description).toBe('iPhone 15');
    });

    it('should parse with empty arrays', () => {
      const dto = DashboardMetricsDTO.from({
        productCount: 0,
        categoriesBreakdown: [],
        totalAccounts: 0,
        totalUsers: 0,
        activeSubscriptions: 0,
        recentProducts: [],
      });

      expect(dto.productCount).toBe(0);
      expect(dto.categoriesBreakdown).toEqual([]);
      expect(dto.recentProducts).toEqual([]);
    });

    it('should throw for missing required fields', () => {
      expect(() => DashboardMetricsDTO.from({})).toThrow();
    });

    it('should throw for wrong types', () => {
      expect(() =>
        DashboardMetricsDTO.from({
          productCount: 'not-a-number',
          categoriesBreakdown: [],
          totalAccounts: 0,
          totalUsers: 0,
          activeSubscriptions: 0,
          recentProducts: [],
        }),
      ).toThrow();
    });

    it('should throw for non-object input', () => {
      expect(() => DashboardMetricsDTO.from(null)).toThrow();
      expect(() => DashboardMetricsDTO.from(undefined)).toThrow();
      expect(() => DashboardMetricsDTO.from('string')).toThrow();
    });
  });
});

describe('HealthResponseDTO', () => {
  describe('structural', () => {
    it('should have a static from method', () => {
      expect(typeof HealthResponseDTO.from).toBe('function');
    });
  });

  describe('from', () => {
    it('should parse a valid health response', () => {
      const dto = HealthResponseDTO.from({
        services: [
          { service: 'mongodb', status: 'connected' },
          { service: 'postgres', status: 'connected' },
          { service: 'redis', status: 'error', error: 'ECONNREFUSED' },
        ],
        timestamp: '2025-01-01T00:00:00.000Z',
      });

      expect(dto.services).toHaveLength(3);
      expect(dto.services[0]).toEqual({ service: 'mongodb', status: 'connected' });
      expect(dto.services[2]).toEqual({ service: 'redis', status: 'error', error: 'ECONNREFUSED' });
      expect(dto.timestamp).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should throw for invalid status', () => {
      expect(() =>
        HealthResponseDTO.from({
          services: [{ service: 'test', status: 'unknown' }],
          timestamp: '2025-01-01T00:00:00.000Z',
        }),
      ).toThrow();
    });

    it('should throw for missing services', () => {
      expect(() => HealthResponseDTO.from({ timestamp: '2025-01-01T00:00:00.000Z' })).toThrow();
    });

    it('should throw for non-object input', () => {
      expect(() => HealthResponseDTO.from(null)).toThrow();
      expect(() => HealthResponseDTO.from(undefined)).toThrow();
    });
  });
});
