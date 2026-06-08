import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

export function registerNotificationsPaths(registry: OpenAPIRegistry): void {
  endpoint('get', '/api/notifications')
    .tag(TAG.NOTIFICATIONS)
    .summary('List all notifications in the current tenant')
    .operationId('listNotifications')
    .security('bearerAuth')
    .response(200, 'List of notifications', z.object({ notifications: z.array(Schemas.NotificationDTO) }))
    .errors(401, 403)
    .register(registry);

  endpoint('put', '/api/notifications/{id}/read')
    .tag(TAG.NOTIFICATIONS)
    .summary('Mark a notification as read')
    .operationId('markNotificationRead')
    .security('bearerAuth')
    .pathParam('id', 'Notification ID')
    .response(200, 'Notification marked as read')
    .errors(401, 403, 404)
    .register(registry);
}
