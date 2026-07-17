import { injectable, inject } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import { IQueueAdapterRegistry } from '@shared/queue/port/queue-adapter-registry.interfaces';
import { DashboardMetricsDTO } from '@admin/services/dto/dashboard-metrics.dto';
import { HealthResponseDTO } from '@admin/services/dto/dashboard-metrics.dto';
import { toProductListItemDTOs } from '@admin/mappers/product.mapper';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';

/**
 * Service for the SUPER_ADMIN dashboard. Aggregates metrics across all
 * data sources (MongoDB product data, PostgreSQL tenant/users/subscriptions,
 * and Redis/BullMQ queue health).
 */
@injectable()
export class DashboardService {
  public constructor(
    @inject(ProductRepository) private readonly _productRepo: ProductRepository,
    @inject(TYPES.PrismaClient) private readonly _prisma: PrismaClient,
    @inject(TYPES.QueueAdapterRegistry) private readonly _registry: IQueueAdapterRegistry,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = DashboardService.name;
  }

  /**
   * Aggregates platform-wide metrics from all data sources.
   * @returns A DashboardMetricsDTO with counts, breakdowns, and recent products.
   */
  public async getMetrics(): Promise<DashboardMetricsDTO> {
    const [productCount, categoriesRaw, recentProductsRaw, totalAccounts, totalUsers, activeSubscriptions] = await Promise.all([
      this._productRepo.count(),
      this._productRepo.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      this._productRepo.find(0, 5, { field: 'createdAt', order: 'desc' }),
      this._prisma.account.count(),
      this._prisma.user.count(),
      this._prisma.accountSubscription.count({ where: { status: 'ACTIVE' } }),
    ]);

    const categoriesBreakdown = (categoriesRaw as Array<{ _id: string; count: number }>)
      .filter(c => c._id)
      .map(c => ({ category: c._id, count: c.count }));

    const recentProducts = toProductListItemDTOs(recentProductsRaw as IRevolicoProduct[]);

    return DashboardMetricsDTO.from({
      productCount,
      categoriesBreakdown,
      totalAccounts,
      totalUsers,
      activeSubscriptions,
      recentProducts,
    });
  }

  /**
   * Checks health of all backend services: MongoDB, PostgreSQL, and Redis (via BullMQ).
   * Each service returns either 'connected' or 'error' with an optional error message.
   * @returns A HealthResponseDTO with per-service status and timestamp.
   */
  public async getHealth(): Promise<HealthResponseDTO> {
    const services = await Promise.all([this.checkMongo(), this.checkPostgres(), this.checkRedis()]);

    return HealthResponseDTO.from({
      services,
      timestamp: new Date().toISOString(),
    });
  }

  // ---------------------------------------------------------------------------
  // Private health check helpers
  // ---------------------------------------------------------------------------

  /**
   * Checks MongoDB connectivity by calling ProductRepository.count().
   * @returns Health status.
   */
  private async checkMongo(): Promise<{ service: string; status: 'connected' | 'error'; error?: string }> {
    try {
      await this._productRepo.count();
      return { service: 'mongodb', status: 'connected' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this._log.error('MongoDB health check failed', { error: message });
      return { service: 'mongodb', status: 'error', error: message };
    }
  }

  /**
   * Checks PostgreSQL connectivity using a raw query.
   * @returns Health status.
   */
  private async checkPostgres(): Promise<{ service: string; status: 'connected' | 'error'; error?: string }> {
    try {
      await this._prisma.$queryRaw`SELECT 1`;
      return { service: 'postgres', status: 'connected' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this._log.error('PostgreSQL health check failed', { error: message });
      return { service: 'postgres', status: 'error', error: message };
    }
  }

  /**
   * Checks Redis/BullMQ connectivity by accessing dashboard queues.
   * @returns Health status.
   */
  private async checkRedis(): Promise<{ service: string; status: 'connected' | 'error'; error?: string }> {
    try {
      this._registry.getCurrent().getDashboardQueues();
      return { service: 'redis', status: 'connected' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this._log.error('Redis health check failed', { error: message });
      return { service: 'redis', status: 'error', error: message };
    }
  }
}
