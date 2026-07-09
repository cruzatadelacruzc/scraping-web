import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

export function registerSchedulingPaths(registry: OpenAPIRegistry): void {
  endpoint('get', '/api/admin/stores')
    .tag(TAG.ADMIN_SCHEDULES)
    .summary('List registered stores with job schemas')
    .operationId('adminListStores')
    .security('bearerAuth')
    .response(200, 'List of registered stores', z.object({ stores: z.array(Schemas.StoreInfoDTO) }))
    .errors(401, 403)
    .register(registry);

  endpoint('get', '/api/admin/scraping-schedules')
    .tag(TAG.ADMIN_SCHEDULES)
    .summary('List all scraping schedules')
    .operationId('adminListSchedules')
    .security('bearerAuth')
    .response(200, 'List of all schedules', z.object({ schedules: z.array(Schemas.ScrapingScheduleResponseDTO) }))
    .errors(401, 403)
    .register(registry);

  endpoint('get', '/api/admin/scraping-schedules/{id}')
    .tag(TAG.ADMIN_SCHEDULES)
    .summary('Get a single scraping schedule by ID')
    .operationId('adminGetSchedule')
    .security('bearerAuth')
    .pathParam('id', 'Schedule unique identifier')
    .response(200, 'Schedule detail', z.object({ schedule: Schemas.ScrapingScheduleResponseDTO }))
    .errors(401, 403, 404)
    .register(registry);

  endpoint('post', '/api/admin/scraping-schedules')
    .tag(TAG.ADMIN_SCHEDULES)
    .summary('Create a new scraping schedule')
    .operationId('adminCreateSchedule')
    .security('bearerAuth')
    .requestBody(Schemas.CreateScrapingScheduleDTO, 'Schedule creation data')
    .response(201, 'Schedule created', z.object({ schedule: Schemas.ScrapingScheduleResponseDTO }))
    .errors(400, 401, 403, 409)
    .register(registry);

  endpoint('put', '/api/admin/scraping-schedules/{id}')
    .tag(TAG.ADMIN_SCHEDULES)
    .summary('Update an existing scraping schedule')
    .operationId('adminUpdateSchedule')
    .security('bearerAuth')
    .pathParam('id', 'Schedule unique identifier')
    .requestBody(Schemas.UpdateScrapingScheduleDTO, 'Schedule update data (partial)')
    .response(200, 'Schedule updated', z.object({ schedule: Schemas.ScrapingScheduleResponseDTO }))
    .errors(400, 401, 403, 404)
    .register(registry);

  endpoint('delete', '/api/admin/scraping-schedules/{id}')
    .tag(TAG.ADMIN_SCHEDULES)
    .summary('Delete a scraping schedule')
    .operationId('adminDeleteSchedule')
    .security('bearerAuth')
    .pathParam('id', 'Schedule unique identifier')
    .response204('Schedule deleted')
    .errors(401, 403, 404)
    .register(registry);

  endpoint('patch', '/api/admin/scraping-schedules/{id}/toggle')
    .tag(TAG.ADMIN_SCHEDULES)
    .summary('Toggle schedule enabled/disabled')
    .operationId('adminToggleSchedule')
    .security('bearerAuth')
    .pathParam('id', 'Schedule unique identifier')
    .response(200, 'Schedule toggled', z.object({ schedule: Schemas.ScrapingScheduleResponseDTO }))
    .errors(401, 403, 404)
    .register(registry);
}
