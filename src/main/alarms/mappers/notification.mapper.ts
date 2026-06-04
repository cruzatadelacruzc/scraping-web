import { Notification } from '@prisma/client';
import { NotificationDTO } from '@alarms/dto/notification.dto';
import { injectable } from 'inversify';

@injectable()
export class NotificationMapper {
  public toDTO(model: Notification | null | undefined): NotificationDTO | null {
    if (!model) return null;
    return NotificationDTO.fromModel(model);
  }

  public toDTOs(models: Notification[]): NotificationDTO[] {
    return models.map(m => NotificationDTO.fromModel(m));
  }
}
