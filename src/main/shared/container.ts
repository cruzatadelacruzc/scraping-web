import { Container } from 'inversify';
import { ScrapingController } from '@scrapers/revolico/controllers/scraping.controller';
import { ScraperConfigController } from '@scrapers/revolico/controllers/scraper-config.controller';
import { Logger } from '@shared/logger';
import { RevolicoFetchDataService } from '@scrapers/revolico/services/fetch-data.service';
import { DBContext } from '@config/db-config';
import { QueueContext } from '@shared/queue/queue-context';
import { IFetchProductData } from '@shared/fetch-product-data.interface';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interface';
import { ScrapingProductsService } from '@scrapers/revolico/services/scraping-products.service';
import { ProductService } from '@scrapers/revolico/services/product.service';
import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import { ScrapingProductService } from '@scrapers/revolico/services/scraping-product.service';
import { RevolicoQueues } from '@scrapers/revolico/queues';
import { IQueueModule } from './queue-module.interface';
import { BullMQQueueAdapter } from '@shared/queue/adapters/bullmq';
import { SQSQueueAdapter } from '@shared/queue/adapters/sqs';
import { MockQueueAdapter } from '@shared/queue/adapters/mock';
import { QueueAdapterRegistry } from '@shared/queue/queue-adapter-registry';
import { IQueueAdapter } from '@shared/queue/port/queue-adapter.interfaces';
import { IQueueAdapterRegistry } from '@shared/queue/port/queue-adapter-registry.interfaces';
import { QueueDashboardService } from '@shared/queue-dashboard';
import { UserController } from '@users/controllers/user.controller';
import { UserService } from '@users/services/user.service';
import { UserRepository } from '@users/repositories/user.repository';
import { AuthService } from '@users/services/auth.service';
import { AccountService } from '@users/services/account.service';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { PgDBContext } from '@config/pg-db';
import { PlanController } from '@users/controllers/plan.controller';
import { AccountController } from '@users/controllers/account.controller';
import { AuthController } from '@users/controllers/auth.controller';
import { SubscriptionController } from '@users/controllers/subscription.controller';
import { SubscriptionsService } from '@users/services/account-subscriptions.service';
import { SubscriptionsMapper } from '@users/mappers/account-subscriptions.mapper';
import { UserMapper, AccountMapper } from '@users/mappers';
import { TenantContext } from '@shared/tenant-context-als';
import { PlanRepository } from '@users/repositories/plan.repository';
import { PlanService } from '@users/services/plan.service';
import { PlanMapper } from '@users/mappers/plan.mapper';
import { SubscriptionsRepository } from '@users/repositories';
import prisma from '@users/custom-prisma-client';
import { PasswordHasher } from './security/password-hasher.serice';
import { TokenService } from './security/token.service';
import { UserIdentityRepository } from '@users/repositories/user-identity.repository';
import { ProviderTokenVerifier } from '@shared/security/provider-token-verifier';
import { AccountRepository } from '@users/repositories/account.repository';
import { AdminController } from '@admin/controllers/admin.controller';
import { ProductAdminController } from '@admin/controllers/product-admin.controller';
import { ProductAdminService } from '@admin/services/product-admin.service';
import { QueueAdminController } from '@admin/controllers/queue-admin.controller';
import { QueueAdminService } from '@admin/services/queue-admin.service';
import { DashboardController } from '@admin/controllers/dashboard.controller';
import { DashboardService } from '@admin/services/dashboard.service';
import { AccountAdminService } from '@admin/services/account-admin.service';
import { RoleService } from '@admin/services/role.service';
import { AccountAdminController } from '@admin/controllers/account-admin.controller';
import { RuleController } from '@admin/controllers/rule.controller';
import { RoleController } from '@admin/controllers/role.controller';
import { AlarmController } from '@alarms/controllers/alarm.controller';
import { NotificationController } from '@alarms/controllers/notification.controller';
import { AlarmService } from '@alarms/services/alarm.service';
import { AlarmEngineService } from '@alarms/services/alarm-engine.service';
import { NotificationService } from '@alarms/services/notification.service';
import { AlarmRepository } from '@alarms/repositories/alarm.repository';
import { NotificationRepository } from '@alarms/repositories/notification.repository';
import { AlarmMapper } from '@alarms/mappers/alarm.mapper';
import { NotificationMapper } from '@alarms/mappers/notification.mapper';
import { ProductMapper } from '@admin/mappers/product.mapper';
import { ConditionRegistry } from '@alarms/conditions/condition-registry';
import { PriceDropsBelowCondition } from '@alarms/conditions/price-drops-below.condition';
import { PriceRisesAboveCondition } from '@alarms/conditions/price-rises-above.condition';
import { PriceChangesByPercentCondition } from '@alarms/conditions/price-changes-by-percent.condition';
import { ViewsExceedCondition } from '@alarms/conditions/views-exceed.condition';
import { IsOutstandingCondition } from '@alarms/conditions/outstanding.condition.interface';
import { SellerChangedCondition } from '@alarms/conditions/seller-changed.condition';
import { JsonataRunnerService } from '@scrapers/revolico/services/scraping/jsonata-runner.service';
import { ScraperConfigRepository } from '@scrapers/revolico/services/scraping/repositories/scraper-config.repository';
import { ScraperConfigRegistryService } from '@scrapers/revolico/services/scraping/scraper-config-registry.service';
import { ScraperConfigService } from '@scrapers/revolico/services/scraping/scraper-config.service';
import { GenericListingScraperService } from '@scrapers/revolico/services/scraping/generic-listing-scraper.service';
import { GenericDetailScraperService } from '@scrapers/revolico/services/scraping/generic-detail-scraper.service';
import { AnalyticsService } from '@scrapers/revolico/services/analytics.service';
import { RuleRepository } from '@scrapers/services/attribute-extractor/repositories/rule.repository';
import { RuleRegistryService } from '@scrapers/services/attribute-extractor/rule-registry.service';
import { RuleService } from '@admin/services/rule.service';
import { RuleBasedExtractorService } from '@scrapers/services/attribute-extractor/rule-based-extractor.service';

// Cron module
import { StoreRegistry } from '@cron/store-registry';
import { CronSchedulerService } from '@cron/services/scheduler.service';
import { ScheduleRepository } from '@cron/repositories/schedule.repository';
import { ScheduleService } from '@cron/services/schedule.service';
import { ScheduleController } from '@cron/controllers/schedule.controller';
import { StoreInfoController } from '@cron/controllers/schedule.controller';
import { AttributeExtractorService } from '@scrapers/services/attribute-extractor/attribute-extractor.service';
import { KeywordsCache } from '@scrapers/services/attribute-extractor/keywords-cache';
import { EnrichmentMetricsService } from '@scrapers/services/enrichment-metrics.service';
// Bots (WhatsApp / Telegram)
import { BotService } from '@bots/services/bot.service';
import { BotController } from '@bots/controllers/bot.controller';
import { LinkCodeService } from '@bots/services/link-code.service';
import { LinkCodeRepository } from '@bots/repositories/link-code.repository';
import { LinkAuditRepository } from '@bots/repositories/link-audit.repository';
import { BotRateLimitService } from '@bots/services/rate-limit.service';
import { BotConversationRepository } from '@bots/repositories/bot-conversation.repository';
import { AiHistoryRepository } from '@bots/repositories/ai-history.repository';
import { TenantBotContextService } from '@bots/services/tenant-bot-context.service';
import { MessageRouterService } from '@bots/services/message-router.service';
import { I18nService } from '@bots/services/i18n.service';
import { BotMenuService } from '@bots/services/bot-menu.service';
import { TelegramAdapter } from '@bots/adapters/telegram-adapter.service';
import { WhatsAppAdapter } from '@bots/adapters/whatsapp-adapter.service';
import { BotQueues } from '@bots/queues';

// Account Management module
import { IEmailService } from '@users/services/email/email.service.interface';
import { MockEmailService } from '@users/services/email/mock-email.service';
import { SmtpEmailService } from '@users/services/email/smtp-email.service';
import { EmailQueues } from '@users/queues/email.queues';
import { TokenRepository } from '@users/repositories/token.repository';
import { LoginAttemptRepository } from '@users/repositories/login-attempt.repository';
import { TokenManagementService } from '@users/services/token-management.service';
import { PasswordResetService } from '@users/services/password-reset.service';
import { EmailVerificationService } from '@users/services/email-verification.service';
import { AccountDeactivationService } from '@users/services/account-deactivation.service';
import { LoginRateLimitService } from '@users/services/login-rate-limit.service';
import { AccountManagementController } from '@users/controllers/account-management.controller';
import { PlanEnforcementService } from '@users/services/plan-enforcement.service';
import Redis from 'ioredis';

export const container = new Container();

//shared services
container.bind<ILogger>(TYPES.Logger).to(Logger);
container.bind(DBContext).toSelf().inSingletonScope();
container.bind(QueueContext).toSelf().inSingletonScope();
container.bind<QueueDashboardService>(TYPES.QueueDashboardService).to(QueueDashboardService).inSingletonScope();
container.bind<PgDBContext>(TYPES.TenantDB).to(PgDBContext).inSingletonScope();
container.bind(TYPES.PrismaClient).toConstantValue(prisma);
container.bind<TenantContext>(TYPES.TenantContext).to(TenantContext).inRequestScope();
container.bind<PasswordHasher>(TYPES.PasswordHasher).to(PasswordHasher).inSingletonScope();
container.bind<TokenService>(TYPES.TokenService).to(TokenService).inSingletonScope();
container.bind<ProviderTokenVerifier>(TYPES.ProviderTokenVerifier).to(ProviderTokenVerifier).inSingletonScope();

// Queue adapters (BullMQ/SQS/Mock) and the registry that selects one
container.bind<IQueueAdapter>(TYPES.BullMQAdapter).to(BullMQQueueAdapter).inSingletonScope();
container.bind<IQueueAdapter>(TYPES.SQSAdapter).to(SQSQueueAdapter).inSingletonScope();
container.bind<IQueueAdapter>(TYPES.MockAdapter).to(MockQueueAdapter).inSingletonScope();
container
  .bind<IQueueAdapterRegistry>(TYPES.QueueAdapterRegistry)
  .toDynamicValue(ctx => {
    return new QueueAdapterRegistry(
      ctx.container.get<IQueueAdapter>(TYPES.BullMQAdapter),
      ctx.container.get<IQueueAdapter>(TYPES.SQSAdapter),
      ctx.container.get<IQueueAdapter>(TYPES.MockAdapter),
    );
  })
  .inSingletonScope();

//services
container.bind<IFetchProductData>(TYPES.RevolicoData).to(RevolicoFetchDataService);
container.bind(TYPES.ScrapingManyProduct).to(ScrapingProductsService);
container.bind(TYPES.ScrapingOneProduct).to(ScrapingProductService);
container.bind(TYPES.ProductService).to(ProductService).inSingletonScope();
container.bind<IQueueModule>(TYPES.RevolicoQueues).to(RevolicoQueues).inSingletonScope();
container.bind(TYPES.UserService).to(UserService);
container.bind(TYPES.AuthService).to(AuthService);
container.bind(TYPES.AccountService).to(AccountService);
container.bind(TYPES.SubscriptionsService).to(SubscriptionsService);
container.bind(TYPES.PlanService).to(PlanService);
container.bind(TYPES.AlarmService).to(AlarmService);
container.bind(TYPES.PlanEnforcementService).to(PlanEnforcementService);
container.bind(TYPES.AlarmEngineService).to(AlarmEngineService);
container.bind(TYPES.ConditionRegistry).to(ConditionRegistry).inSingletonScope();
container.bind(TYPES.PriceDropsBelowCondition).to(PriceDropsBelowCondition);
container.bind(TYPES.PriceRisesAboveCondition).to(PriceRisesAboveCondition);
container.bind(TYPES.PriceChangesByPercentCondition).to(PriceChangesByPercentCondition);
container.bind(TYPES.ViewsExceedCondition).to(ViewsExceedCondition);
container.bind(TYPES.IsOutstandingCondition).to(IsOutstandingCondition);
container.bind(TYPES.SellerChangedCondition).to(SellerChangedCondition);
container.bind(TYPES.NotificationService).to(NotificationService);

//mappers
container.bind(TYPES.UserMapper).to(UserMapper);
container.bind(TYPES.AccountMapper).to(AccountMapper);
container.bind(TYPES.SubscriptionsMapper).to(SubscriptionsMapper);
container.bind(TYPES.PlanMapper).to(PlanMapper);
container.bind(TYPES.AlarmMapper).to(AlarmMapper);
container.bind(TYPES.NotificationMapper).to(NotificationMapper);
container.bind(TYPES.ProductMapper).to(ProductMapper);

//services
container.bind<ProductAdminService>(TYPES.ProductAdminService).to(ProductAdminService);
container.bind<QueueAdminService>(TYPES.QueueAdminService).to(QueueAdminService);
container.bind<DashboardService>(TYPES.DashboardService).to(DashboardService);
container.bind<AccountAdminService>(TYPES.AccountAdminService).to(AccountAdminService);
container.bind<RoleService>(TYPES.RoleService).to(RoleService);

//controllers
container.bind<AdminController>(TYPES.AdminController).to(AdminController);
container.bind<ProductAdminController>(TYPES.ProductAdminController).to(ProductAdminController);
container.bind<QueueAdminController>(TYPES.QueueAdminController).to(QueueAdminController);
container.bind<DashboardController>(TYPES.DashboardController).to(DashboardController);
container.bind<AccountAdminController>(TYPES.AccountAdminController).to(AccountAdminController);
container.bind<RuleController>(TYPES.RuleController).to(RuleController);
container.bind<RoleController>(TYPES.RoleController).to(RoleController);
container.bind<ScrapingController>(TYPES.RevolicoScraping).to(ScrapingController);
container.bind<ScraperConfigController>(TYPES.ScraperConfigController).to(ScraperConfigController);
container.bind<UserController>(TYPES.UserController).to(UserController);
container.bind<PlanController>(TYPES.PlanController).to(PlanController);
container.bind<AccountController>(TYPES.AccountController).to(AccountController);
container.bind<SubscriptionController>(TYPES.SubscriptionController).to(SubscriptionController);
container.bind<AlarmController>(TYPES.AlarmController).to(AlarmController);
container.bind<NotificationController>(TYPES.NotificationController).to(NotificationController);
container.bind<AuthController>(TYPES.AuthController).to(AuthController);

// Repositories
container.bind(ProductRepository).toSelf();
container.bind(UserRepository).toSelf();
container.bind(PlanRepository).toSelf();
container.bind(SubscriptionsRepository).toSelf();
container.bind(UserIdentityRepository).toSelf();
container.bind(AccountRepository).toSelf();
container.bind(AlarmRepository).toSelf();
container.bind(NotificationRepository).toSelf();
container.bind(ScraperConfigRepository).toSelf();
container.bind(TYPES.ScraperConfigRepository).to(ScraperConfigRepository);
container.bind<RuleRepository>(TYPES.RuleRepository).to(RuleRepository).inSingletonScope();
container.bind<RuleRegistryService>(TYPES.RuleRegistry).to(RuleRegistryService).inSingletonScope();
container.bind<RuleService>(TYPES.RuleService).to(RuleService).inSingletonScope();

// Cron module — automated scraping scheduler
container.bind<StoreRegistry>(TYPES.StoreRegistry).to(StoreRegistry).inSingletonScope();
container.bind<CronSchedulerService>(TYPES.CronSchedulerService).to(CronSchedulerService).inSingletonScope();
container.bind<ScheduleRepository>(TYPES.ScheduleRepository).to(ScheduleRepository).inSingletonScope();
container.bind<ScheduleService>(TYPES.ScheduleService).to(ScheduleService).inSingletonScope();
container.bind<ScheduleController>(TYPES.ScheduleController).to(ScheduleController);
container.bind<StoreInfoController>(TYPES.StoreInfoController).to(StoreInfoController);

// JSONata-driven scraping
container.bind<JsonataRunnerService>(TYPES.JsonataRunner).to(JsonataRunnerService).inSingletonScope();
container.bind<ScraperConfigRegistryService>(TYPES.ScraperConfigRegistry).to(ScraperConfigRegistryService).inSingletonScope();
container.bind<ScraperConfigService>(TYPES.ScraperConfigService).to(ScraperConfigService).inSingletonScope();
container.bind<GenericListingScraperService>(TYPES.GenericListingScraper).to(GenericListingScraperService).inSingletonScope();
container.bind<GenericDetailScraperService>(TYPES.GenericDetailScraper).to(GenericDetailScraperService).inSingletonScope();
container.bind<AnalyticsService>(TYPES.AnalyticsService).to(AnalyticsService).inSingletonScope();
container.bind<RuleBasedExtractorService>(RuleBasedExtractorService).to(RuleBasedExtractorService).inSingletonScope();
container.bind<KeywordsCache>(KeywordsCache).to(KeywordsCache).inSingletonScope();
container.bind<AttributeExtractorService>(AttributeExtractorService).to(AttributeExtractorService).inSingletonScope();
container.bind<EnrichmentMetricsService>(EnrichmentMetricsService).to(EnrichmentMetricsService).inSingletonScope();

//middlewares
container.bind<AuthMiddleware>(TYPES.AuthMiddleware).to(AuthMiddleware);

// Bot module (WhatsApp / Telegram)
container.bind<BotMenuService>(TYPES.BotMenuService).to(BotMenuService).inSingletonScope();
container.bind<BotService>(TYPES.BotService).to(BotService).inSingletonScope();
container.bind<BotController>(TYPES.BotController).to(BotController);
container.bind<LinkCodeService>(TYPES.LinkCodeService).to(LinkCodeService);
container.bind<LinkCodeRepository>(TYPES.LinkCodeRepository).to(LinkCodeRepository);
container.bind<LinkAuditRepository>(TYPES.LinkAuditRepository).to(LinkAuditRepository);
container.bind<BotRateLimitService>(TYPES.BotRateLimitService).to(BotRateLimitService).inSingletonScope();
container.bind<BotConversationRepository>(TYPES.BotConversationRepository).to(BotConversationRepository);
container.bind<AiHistoryRepository>(TYPES.AiHistoryRepository).to(AiHistoryRepository);
container.bind<TenantBotContextService>(TYPES.TenantBotContextService).to(TenantBotContextService);
container.bind<MessageRouterService>(TYPES.MessageRouterService).to(MessageRouterService);
container.bind<I18nService>(TYPES.I18nService).to(I18nService);
container.bind<IQueueModule>(TYPES.BotQueues).to(BotQueues).inSingletonScope();
container.bind<TelegramAdapter>(TYPES.TelegramAdapter).to(TelegramAdapter).inSingletonScope();
container.bind<WhatsAppAdapter>(TYPES.WhatsAppAdapter).to(WhatsAppAdapter).inSingletonScope();

// Account Management module
// Email service (select impl via EMAIL_PROVIDER env var)
const emailImpl = process.env.EMAIL_PROVIDER ?? 'mock';
if (emailImpl === 'smtp') {
  container.bind<IEmailService>(TYPES.EmailService).to(SmtpEmailService).inSingletonScope();
} else {
  container.bind<IEmailService>(TYPES.EmailService).to(MockEmailService).inSingletonScope();
}

// Email queues
container.bind<IQueueModule>(TYPES.EmailQueues).to(EmailQueues).inSingletonScope();

// Repositories
container.bind(TYPES.TokenRepository).to(TokenRepository).inSingletonScope();
container.bind(TYPES.LoginAttemptRepository).to(LoginAttemptRepository).inSingletonScope();

// Services
container.bind(TYPES.TokenManagementService).to(TokenManagementService).inSingletonScope();
container.bind(TYPES.PasswordResetService).to(PasswordResetService).inSingletonScope();
container.bind(TYPES.EmailVerificationService).to(EmailVerificationService).inSingletonScope();
container.bind(TYPES.AccountDeactivationService).to(AccountDeactivationService).inSingletonScope();
container.bind(TYPES.LoginRateLimitService).to(LoginRateLimitService).inSingletonScope();

// Controller
container.bind(TYPES.AccountManagementController).to(AccountManagementController);

// Redis client (shared by rate limiter and JWT blacklist)
container
  .bind<Redis>(TYPES.RedisClient)
  .toDynamicValue(ctx => {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const log = ctx.container.get<ILogger>(TYPES.Logger);
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: 2000,
      maxLoadingRetryTime: 2000,
      enableOfflineQueue: false,
      retryStrategy(times: number): number | null {
        log.warn('Redis unavailable — JWT blacklist and rate limiting disabled', { attempt: times });
        return null;
      },
    });
    redis.on('error', (err: Error) => {
      log.error('Redis connection error', { error: err.message });
    });
    return redis;
  })
  .inSingletonScope();
