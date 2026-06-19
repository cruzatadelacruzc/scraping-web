import { Container } from 'inversify';
import { ScrapingController } from '@scrapers/revolico/controllers/scraping.controller';
import { Logger } from '@shared/logger';
import { RevolicoFetchDataService } from '@scrapers/revolico/services/fetch-data.service';
import { DBContext } from '@config/db-config';
import { QueueContext } from '@shared/queue/queue-context';
import { IFetchProductData } from '@shared/fetch-product-data.interfaces';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interfaces';
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
import { AlarmController } from '@alarms/controllers/alarm.controller';
import { NotificationController } from '@alarms/controllers/notification.controller';
import { AlarmService } from '@alarms/services/alarm.service';
import { AlarmEngineService } from '@alarms/services/alarm-engine.service';
import { NotificationService } from '@alarms/services/notification.service';
import { AlarmRepository } from '@alarms/repositories/alarm.repository';
import { NotificationRepository } from '@alarms/repositories/notification.repository';
import { AlarmMapper } from '@alarms/mappers/alarm.mapper';
import { NotificationMapper } from '@alarms/mappers/notification.mapper';
import { ConditionRegistry } from '@alarms/conditions/condition-registry';
import { PriceDropsBelowCondition } from '@alarms/conditions/price-drops-below.condition';
import { PriceRisesAboveCondition } from '@alarms/conditions/price-rises-above.condition';
import { PriceChangesByPercentCondition } from '@alarms/conditions/price-changes-by-percent.condition';
import { ViewsExceedCondition } from '@alarms/conditions/views-exceed.condition';
import { IsOutstandingCondition } from '@alarms/conditions/outstanding.condition.interface';
import { SellerChangedCondition } from '@alarms/conditions/seller-changed.condition';

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
container.bind(TYPES.ProductService).to(ProductService);
container.bind<IQueueModule>(TYPES.RevolicoQueues).to(RevolicoQueues).inSingletonScope();
container.bind(TYPES.UserService).to(UserService);
container.bind(TYPES.AuthService).to(AuthService);
container.bind(TYPES.AccountService).to(AccountService);
container.bind(TYPES.SubscriptionsService).to(SubscriptionsService);
container.bind(TYPES.PlanService).to(PlanService);
container.bind(TYPES.AlarmService).to(AlarmService);
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

//controllers
container.bind<ScrapingController>(TYPES.RevolicoScraping).to(ScrapingController);
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

//middlewares
container.bind<AuthMiddleware>(TYPES.AuthMiddleware).to(AuthMiddleware);
