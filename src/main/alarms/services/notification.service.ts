import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { inject, injectable } from 'inversify';
import { NotificationDTO } from '@alarms/dto/notification.dto';
import { NotificationRepository } from '@alarms/repositories/notification.repository';
import { NotificationMapper } from '@alarms/mappers/notification.mapper';
import { getRequestContext } from '@shared/tenant-context-als';

@injectable()
export class NotificationService {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(NotificationRepository) private readonly _repository: NotificationRepository,
    @inject(TYPES.NotificationMapper) private readonly _mapper: NotificationMapper,
  ) {
    this._log.context = NotificationService.name;
  }

  public async list(): Promise<NotificationDTO[]> {
    const tenantId = this.getTenantId();
    this._log.debug('Request to list notifications', { tenantId });
    const notifications = await this._repository.findByAccountId(tenantId);
    return this._mapper.toDTOs(notifications);
  }

  public async markAsRead(id: string): Promise<void> {
    this._log.debug('Request to mark notification as read', { id });
    await this._repository.markAsRead(id);
  }

  private getTenantId(): string {
    const ctx = getRequestContext();
    if (!ctx?.tenantId) throw new Error('Tenant context not available');
    return ctx.tenantId;
  }
}
