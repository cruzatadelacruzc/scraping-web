import { z } from 'zod';

// ---------------------------------------------------------------------------
// DashboardMetricsDTO — aggregated dashboard overview
// ---------------------------------------------------------------------------

export const CategoryBreakdownSchema = z.object({
  category: z.string(),
  count: z.number(),
});

export const DashboardMetricsSchema = z.object({
  productCount: z.number(),
  categoriesBreakdown: z.array(CategoryBreakdownSchema),
  totalAccounts: z.number(),
  totalUsers: z.number(),
  activeSubscriptions: z.number(),
  recentProducts: z.array(z.object({}).passthrough()),
});

export type DashboardMetricsType = z.infer<typeof DashboardMetricsSchema>;

export class DashboardMetricsDTO {
  public readonly productCount: number;
  public readonly categoriesBreakdown: { category: string; count: number }[];
  public readonly totalAccounts: number;
  public readonly totalUsers: number;
  public readonly activeSubscriptions: number;
  public readonly recentProducts: Record<string, unknown>[];

  public constructor(data: DashboardMetricsType) {
    this.productCount = data.productCount;
    this.categoriesBreakdown = data.categoriesBreakdown;
    this.totalAccounts = data.totalAccounts;
    this.totalUsers = data.totalUsers;
    this.activeSubscriptions = data.activeSubscriptions;
    this.recentProducts = data.recentProducts;
  }

  /**
   * Creates a DashboardMetricsDTO from raw data, validating with Zod.
   * @param data - Raw metrics object.
   * @returns A validated DashboardMetricsDTO instance.
   */
  public static from(data: unknown): DashboardMetricsDTO {
    const parsed = DashboardMetricsSchema.parse(data);
    return new DashboardMetricsDTO(parsed);
  }
}

// ---------------------------------------------------------------------------
// HealthStatus — individual service health check
// ---------------------------------------------------------------------------

export const HealthStatusSchema = z.object({
  service: z.string(),
  status: z.enum(['connected', 'error']),
  error: z.string().optional(),
});

export const HealthResponseSchema = z.object({
  services: z.array(HealthStatusSchema),
  timestamp: z.string(),
});

export type HealthResponseType = z.infer<typeof HealthResponseSchema>;

export class HealthResponseDTO {
  public readonly services: { service: string; status: 'connected' | 'error'; error?: string }[];
  public readonly timestamp: string;

  public constructor(data: HealthResponseType) {
    this.services = data.services;
    this.timestamp = data.timestamp;
  }

  /**
   * Creates a HealthResponseDTO from raw data, validating with Zod.
   * @param data - Raw health check response.
   * @returns A validated HealthResponseDTO instance.
   */
  public static from(data: unknown): HealthResponseDTO {
    const parsed = HealthResponseSchema.parse(data);
    return new HealthResponseDTO(parsed);
  }
}
