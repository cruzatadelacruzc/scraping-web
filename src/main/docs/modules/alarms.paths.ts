import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

export function registerAlarmsPaths(registry: OpenAPIRegistry): void {
  endpoint('post', '/api/alarms')
    .tag(TAG.ALARMS)
    .summary('Create a new alarm')
    .operationId('createAlarm')
    .security('bearerAuth')
    .requestBody(Schemas.CreateAlarmDTO)
    .response(201, 'Alarm created', z.object({ alarm: Schemas.AlarmResponseDTO }))
    .errors(400, 401, 403)
    .register(registry);

  endpoint('get', '/api/alarms')
    .tag(TAG.ALARMS)
    .summary('List all alarms in the current tenant')
    .operationId('listAlarms')
    .security('bearerAuth')
    .response(200, 'List of alarms', z.object({ alarms: z.array(Schemas.AlarmResponseDTO) }))
    .errors(401, 403)
    .register(registry);

  endpoint('get', '/api/alarms/{id}')
    .tag(TAG.ALARMS)
    .summary('Get alarm by ID')
    .operationId('getAlarm')
    .security('bearerAuth')
    .pathParam('id', 'Alarm ID')
    .response(200, 'Alarm found', z.object({ alarm: Schemas.AlarmResponseDTO }))
    .errors(401, 404)
    .register(registry);

  endpoint('put', '/api/alarms/{id}')
    .tag(TAG.ALARMS)
    .summary('Update an alarm')
    .operationId('updateAlarm')
    .security('bearerAuth')
    .pathParam('id', 'Alarm ID')
    .requestBody(Schemas.UpdateAlarmDTO)
    .response(200, 'Alarm updated', z.object({ alarm: Schemas.AlarmResponseDTO }))
    .errors(400, 401, 403, 404)
    .register(registry);

  endpoint('delete', '/api/alarms/{id}')
    .tag(TAG.ALARMS)
    .summary('Delete an alarm')
    .operationId('deleteAlarm')
    .security('bearerAuth')
    .pathParam('id', 'Alarm ID')
    .response204('Alarm deleted')
    .errors(401, 403, 404)
    .register(registry);
}
