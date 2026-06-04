import { Notification, NotificationType } from '@prisma/client';

export class NotificationDTO {
  public constructor(
    public readonly id: string,
    public readonly alarmId: string | null,
    public readonly type: NotificationType,
    public readonly title: string,
    public readonly message: string,
    public readonly readAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  public static fromModel(model: Notification): NotificationDTO {
    return new NotificationDTO(model.id, model.alarmId, model.type, model.title, model.message, model.readAt, model.createdAt);
  }
}
