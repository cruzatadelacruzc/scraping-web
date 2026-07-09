import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { registerAuthPaths } from './modules/auth.paths';
import { registerAccountsPaths } from './modules/accounts.paths';
import { registerUsersPaths } from './modules/users.paths';
import { registerPlansPaths } from './modules/plans.paths';
import { registerSubscriptionsPaths } from './modules/subscriptions.paths';
import { registerAlarmsPaths } from './modules/alarms.paths';
import { registerNotificationsPaths } from './modules/notifications.paths';
import { registerScrapingPaths } from './modules/scraping.paths';
import { registerAdminPaths } from './modules/admin.paths';
import { registerScraperConfigsPaths } from './modules/scraper-configs.paths';
import { registerBotsPaths } from './modules/bots.paths';
import { registerSchedulingPaths } from './modules/scheduling.paths';

export function registerAllPaths(registry: OpenAPIRegistry): void {
  registerAuthPaths(registry);
  registerAccountsPaths(registry);
  registerUsersPaths(registry);
  registerPlansPaths(registry);
  registerSubscriptionsPaths(registry);
  registerAlarmsPaths(registry);
  registerNotificationsPaths(registry);
  registerScrapingPaths(registry);
  registerAdminPaths(registry);
  registerScraperConfigsPaths(registry);
  registerBotsPaths(registry);
  registerSchedulingPaths(registry);
}
