import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { AlarmConditionType } from '@prisma/client';

extendZodWithOpenApi(z);

// ── Helpers ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const uuid = (desc: string) => z.string().uuid().openapi({ description: desc, example: '550e8400-e29b-41d4-a716-446655440000' });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const timestamp = (desc: string) => z.date().openapi({ description: desc, example: '2024-01-01T00:00:00.000Z' });

// ── Import DTO schemas ──────────────────────────────────────────────
import { RoleSchema } from '@users/dto/role.dto';
import { UserSchema } from '@users/dto/user.dto';
import { UserLoginSchema } from '@users/dto/user-login.dto';
import { UserRegisterSchema } from '@users/dto/user-register.dto';
import { AccountSchema } from '@users/dto/account.dto';
import { PlanSchema } from '@users/dto/plan.dto';
import { ProviderRegistrationSchema } from '@users/dto/provider-registration.dto';
import { UserProviderRegisterSchema } from '@users/dto/user-provider-register.dto';
import { AccountSubscriptionSchema } from '@users/dto/account-subscriptions.dto';
import { CreateAlarmSchema } from '@alarms/dto/create-alarm.dto';
import { UpdateAlarmSchema } from '@alarms/dto/update-alarm.dto';
import { GenerateLinkCodeSchema } from '@bots/services/dto/generate-link-code.dto';
import { ConfirmLinkSchema } from '@bots/services/dto/confirm-link.dto';
import { LinkHistoryQuerySchema } from '@bots/services/dto/link-history.dto';
// Admin DTOs
import {
  ProductListItemSchema,
  ProductDetailSchema,
  PriceHistoryEntrySchema,
  ProductHistorySchema,
  ProductStatsSchema,
} from '@admin/services/dto/product-response.dto';
import { ProductListQuerySchema } from '@admin/services/dto/product-list-query.dto';
import { DashboardMetricsSchema, HealthResponseSchema } from '@admin/services/dto/dashboard-metrics.dto';
import { QueueStatsSchema, JobDetailSchema } from '@admin/services/dto/queue-stats.dto';
import { CreateRoleSchema, RoleResponseSchema } from '@admin/services/dto/role.dto';

// ── Companion schemas for DTOs without Zod ───────────────────────────
const AlarmResponseSchema = z.object({
  id: uuid('Alarm unique identifier'),
  accountId: uuid('Account (tenant) identifier'),
  productUrl: z.string().openapi({ description: 'URL of the monitored product', example: 'https://www.revolico.com/item/12345' }),
  name: z.string().openapi({ description: 'Human-readable alarm name', example: 'Price alert for iPhone 15' }),
  condition: z
    .nativeEnum(AlarmConditionType)
    .openapi({ description: 'Condition type that triggers the alarm', example: 'PRICE_DROPS_BELOW' }),
  threshold: z.number().openapi({ description: 'Threshold value for the condition', example: 500 }),
  percentage: z.number().nullable().openapi({ description: 'Percentage threshold', example: 10 }),
  params: z.record(z.unknown()).nullable().openapi({ description: 'Condition-specific parameters', example: {} }),
  enabled: z.boolean().openapi({ description: 'Whether the alarm is active', example: true }),
  lastEvaluatedAt: z.date().nullable().openapi({ description: 'Last evaluation timestamp', example: '2024-01-01T00:00:00.000Z' }),
  lastEvaluatedPrice: z.number().nullable().openapi({ description: 'Last evaluated price', example: 450 }),
  lastMatchedAt: z.date().nullable().openapi({ description: 'Last time condition matched', example: '2024-01-01T00:00:00.000Z' }),
  lastNotifiedAt: z.date().nullable().openapi({ description: 'Last notification sent', example: '2024-01-01T00:00:00.000Z' }),
  createdAt: timestamp('Creation timestamp'),
  updatedAt: timestamp('Last update timestamp'),
});

const NotificationSchema = z.object({
  id: uuid('Notification unique identifier'),
  alarmId: z.string().uuid().nullable().openapi({ description: 'Associated alarm identifier' }),
  type: z.string().openapi({ description: 'Notification type', example: 'ALARM_TRIGGERED' }),
  title: z.string().openapi({ description: 'Notification title', example: 'Price dropped!' }),
  message: z.string().openapi({ description: 'Notification message body', example: 'iPhone 15 price dropped to $450' }),
  readAt: z.date().nullable().openapi({ description: 'When the notification was read' }),
  createdAt: timestamp('Creation timestamp'),
});

const ScrapingProductsJobSchema = z.object({
  category: z.string().min(1).openapi({ description: 'Product category to scrape', example: 'celulares' }),
  subcategory: z.string().optional().openapi({ description: 'Optional subcategory filter', example: 'iphone' }),
  pageNumber: z.number().optional().openapi({ description: 'Starting page number', example: 1 }),
  totalPages: z.number().optional().openapi({ description: 'Total pages to scrape', example: 5 }),
});

const ScrapingProductJobSchema = z.object({
  id: z.string().min(1).openapi({ description: 'Product ID to scrape', example: '12345678' }),
});

const ScraperConfigResponseSchema = z.object({
  id: uuid('ScraperConfig unique identifier'),
  storeKey: z.string().openapi({
    description: 'Logical key identifying the scraping target',
    example: 'revolico:listing',
  }),
  expression: z.string().openapi({
    description: 'JSONata expression evaluated against the scraped DOM tree',
    example: '$ ~> | $ | { "products": $ | [*] } |',
  }),
  version: z.number().int().openapi({ description: 'Monotonic version counter', example: 1 }),
  enabled: z.boolean().openapi({ description: 'Whether the worker should use this row', example: true }),
  createdAt: timestamp('Creation timestamp'),
  updatedAt: timestamp('Last update timestamp'),
});

const ScraperConfigCreateSchema = z.object({
  storeKey: z.string().min(1).openapi({
    description: 'Logical key identifying the scraping target (must be unique)',
    example: 'revolico:listing',
  }),
  expression: z.string().min(1).openapi({
    description: 'JSONata expression to persist',
    example: '$ ~> | $ | { "products": $ | [*] } |',
  }),
});

const ScraperConfigUpdateSchema = z.object({
  expression: z.string().min(1).openapi({
    description: 'New JSONata expression',
    example: '$ ~> | $ | { "products": $ | [*] } |',
  }),
});

// ── Bot link schemas ──────────────────────────────────────────────────
const LinkTokenResponseSchema = z.object({
  deepLink: z.string().openapi({ description: 'One-time deep link URL for the bot', example: 'https://t.me/BazaarSentinelBot?start=...' }),
  expiresAt: z.string().openapi({ description: 'ISO timestamp when the link expires', example: '2026-01-01T00:05:00.000Z' }),
});

const GenerateLinkCodeResponseSchema = z.object({
  links: z
    .record(LinkTokenResponseSchema)
    .openapi({ description: 'Provider → link data', example: { telegram: { deepLink: '...', expiresAt: '...' } } }),
  ttlMinutes: z.number().openapi({ description: 'Token time-to-live in minutes', example: 5 }),
});

const LinkStatusResponseSchema = z.object({
  linked: z.boolean().openapi({ description: 'Whether the chat is linked', example: true }),
  provider: z.string().nullable().openapi({ description: 'Provider name', example: 'telegram' }),
  externalId: z.string().optional().openapi({ description: 'Masked chat ID', example: '****5678' }),
  preferredLang: z.string().openapi({ description: 'Preferred language', example: 'es' }),
  lastActivity: z.string().optional().openapi({ description: 'Last activity timestamp' }),
  linkExpiresAt: z.string().nullable().optional().openapi({ description: 'When the link expires' }),
});

const LinkHistoryEntrySchema = z.object({
  id: uuid('Audit entry identifier'),
  action: z.string().openapi({ description: 'Action performed', example: 'LINKED' }),
  provider: z.string().nullable().optional().openapi({ description: 'Provider name', example: 'telegram' }),
  externalId: z.string().nullable().optional().openapi({ description: 'Masked chat ID' }),
  createdAt: z.string().openapi({ description: 'ISO timestamp' }),
});

// ── Exported schema registry (populated by registerAllSchemas) ───────
export const Schemas: Record<string, z.ZodTypeAny> = {};

export function registerAllSchemas(registry: OpenAPIRegistry): void {
  Schemas.RoleDTO = registry.register('RoleDTO', RoleSchema);
  Schemas.UserDTO = registry.register('UserDTO', UserSchema);
  Schemas.UserLoginDTO = registry.register('UserLoginDTO', UserLoginSchema);
  Schemas.UserRegisterDTO = registry.register('UserRegisterDTO', UserRegisterSchema);
  Schemas.AccountDTO = registry.register('AccountDTO', AccountSchema);
  Schemas.PlanDTO = registry.register('PlanDTO', PlanSchema);
  Schemas.ProviderRegistrationDTO = registry.register('ProviderRegistrationDTO', ProviderRegistrationSchema);
  Schemas.UserProviderRegisterDTO = registry.register('UserProviderRegisterDTO', UserProviderRegisterSchema);
  Schemas.SubscriptionDTO = registry.register('SubscriptionDTO', AccountSubscriptionSchema);
  Schemas.CreateAlarmDTO = registry.register('CreateAlarmDTO', CreateAlarmSchema);
  Schemas.UpdateAlarmDTO = registry.register('UpdateAlarmDTO', UpdateAlarmSchema);
  Schemas.AlarmResponseDTO = registry.register('AlarmResponseDTO', AlarmResponseSchema);
  Schemas.NotificationDTO = registry.register('NotificationDTO', NotificationSchema);
  Schemas.ScrapingProductsDTO = registry.register('ScrapingProductsDTO', ScrapingProductsJobSchema);
  Schemas.ScrapingProductDTO = registry.register('ScrapingProductDTO', ScrapingProductJobSchema);
  Schemas.ScraperConfigResponseDTO = registry.register('ScraperConfigResponseDTO', ScraperConfigResponseSchema);
  Schemas.ScraperConfigCreateDTO = registry.register('ScraperConfigCreateDTO', ScraperConfigCreateSchema);
  Schemas.ScraperConfigUpdateDTO = registry.register('ScraperConfigUpdateDTO', ScraperConfigUpdateSchema);
  // Bot DTOs
  Schemas.GenerateLinkCodeDTO = registry.register('GenerateLinkCodeDTO', GenerateLinkCodeSchema);
  Schemas.ConfirmLinkDTO = registry.register('ConfirmLinkDTO', ConfirmLinkSchema);
  Schemas.LinkHistoryQueryDTO = registry.register('LinkHistoryQueryDTO', LinkHistoryQuerySchema);
  // Bot response schemas
  Schemas.GenerateLinkCodeResponseDTO = registry.register('GenerateLinkCodeResponseDTO', GenerateLinkCodeResponseSchema);
  Schemas.LinkStatusResponseDTO = registry.register('LinkStatusResponseDTO', LinkStatusResponseSchema);
  Schemas.LinkHistoryEntryDTO = registry.register('LinkHistoryEntryDTO', LinkHistoryEntrySchema);

  // Admin DTOs
  const ProductPriceHistoryDTO = ProductHistorySchema(PriceHistoryEntrySchema);
  Schemas.PaginatedResponse = registry.register(
    'PaginatedResponse',
    z.object({
      data: z.array(z.object({}).passthrough()).openapi({ description: 'Array of items for the current page' }),
      meta: z.object({
        total: z.number().openapi({ description: 'Total number of items matching the query' }),
        skip: z.number().openapi({ description: 'Number of items skipped' }),
        limit: z.number().openapi({ description: 'Max items per page' }),
        hasMore: z.boolean().openapi({ description: 'Whether additional pages are available' }),
      }),
    }),
  );
  Schemas.ProductListItemDTO = registry.register('ProductListItemDTO', ProductListItemSchema);
  Schemas.ProductDetailDTO = registry.register('ProductDetailDTO', ProductDetailSchema);
  Schemas.ProductPriceHistoryDTO = registry.register('ProductPriceHistoryDTO', ProductPriceHistoryDTO);
  Schemas.ProductListQueryDTO = registry.register('ProductListQueryDTO', ProductListQuerySchema);
  Schemas.ProductStatsDTO = registry.register('ProductStatsDTO', ProductStatsSchema);
  Schemas.DashboardMetricsDTO = registry.register('DashboardMetricsDTO', DashboardMetricsSchema);
  Schemas.HealthResponseDTO = registry.register('HealthResponseDTO', HealthResponseSchema);

  // Inline schema for enrichment metrics — no standalone DTO file.
  const EnrichmentMetricsSchema = z.object({
    startedAt: z.string().openapi({ description: 'ISO-8601 timestamp of when the service started accumulating' }),
    totalEnrichments: z.number().int().openapi({ description: 'Total number of enrichment invocations' }),
    enrichmentHashSkips: z
      .number()
      .int()
      .openapi({ description: 'How many enrichments were skipped because the description hash matched' }),
    enrichmentHashSkipRate: z.number().openapi({ description: 'skips / total (0 if total=0)' }),
    ruleHighConfidence: z.number().int().openapi({ description: 'How many times the rule-based extractor reached confidence ≥ 0.4' }),
    ruleHighConfidenceRate: z.number().openapi({ description: 'ruleHits / (total - skips). Denominator of zero → 0' }),
    cacheHits: z.number().int().openapi({ description: 'KeywordsCache hits (memory or MongoDB)' }),
    cacheMisses: z.number().int().openapi({ description: 'KeywordsCache misses (both layers)' }),
    cacheHitRate: z.number().openapi({ description: 'hits / (hits + misses). Denominator of zero → 0' }),
    llmCalls: z.number().int().openapi({ description: 'Successful LLM calls' }),
    llmFailures: z.number().int().openapi({ description: 'Failed LLM calls (network error, timeout, bad response)' }),
    llmFailureRate: z.number().openapi({ description: 'failures / calls. Denominator of zero → 0' }),
    llmPromptCacheHitTokens: z.number().int().openapi({ description: 'Cumulative prompt tokens served from the LLM provider cache' }),
    llmPromptCacheMissTokens: z.number().int().openapi({ description: 'Cumulative prompt tokens NOT served from cache' }),
    llmCompletionTokens: z.number().int().openapi({ description: 'Cumulative completion tokens generated by the LLM' }),
    llmCacheHitRate: z.number().openapi({ description: 'hitTokens / (hitTokens + missTokens). Denominator of zero → 0' }),
    estimatedSavingsUSD: z
      .number()
      .openapi({ description: 'Estimated USD saved via LLM prompt caching. 0 if LLM_COST_PER_MILLION_TOKENS not set' }),
    costPerMillionTokens: z.number().openapi({ description: 'Price per million tokens used for savings calculation (from env)' }),
  });
  Schemas.EnrichmentMetricsDTO = registry.register('EnrichmentMetricsDTO', EnrichmentMetricsSchema);

  Schemas.QueueStatsDTO = registry.register('QueueStatsDTO', QueueStatsSchema);
  Schemas.JobDetailDTO = registry.register('JobDetailDTO', JobDetailSchema);
  Schemas.CreateRoleDTO = registry.register('CreateRoleDTO', CreateRoleSchema);
  Schemas.RoleResponseDTO = registry.register('RoleResponseDTO', RoleResponseSchema);

  // Rule-based extractor patterns
  const RuleResponse = z.object({
    id: uuid('Rule unique identifier'),
    ruleKey: z.string().openapi({ description: 'Rule category key', example: 'brands' }),
    values: z.array(z.string()).openapi({ description: 'Word-list values', example: ['apple', 'samsung'] }),
    version: z.number().int().openapi({ description: 'Monotonic version counter', example: 1 }),
    enabled: z.boolean().openapi({ description: 'Whether the rule is active', example: true }),
    createdAt: timestamp('Creation timestamp'),
    updatedAt: timestamp('Last update timestamp'),
  });
  Schemas.RuleResponseDTO = registry.register('RuleResponse', RuleResponse);

  Schemas.CreateRuleDTO = registry.register(
    'CreateRule',
    z.object({
      ruleKey: z.string().min(1).openapi({ description: 'Unique rule category key', example: 'brands' }),
      values: z
        .array(z.string().min(1))
        .min(1)
        .openapi({ description: 'Non-empty array of word-list values', example: ['apple', 'samsung', 'nokia'] }),
    }),
  );

  Schemas.UpdateRuleDTO = registry.register(
    'UpdateRule',
    z.object({
      values: z
        .array(z.string().min(1))
        .min(1)
        .openapi({ description: 'Non-empty array of values (replaces existing)', example: ['apple', 'samsung', 'xiaomi'] }),
    }),
  );

  // Scraping schedules
  const ScrapingScheduleResponse = z.object({
    id: uuid('Schedule unique identifier'),
    name: z.string().openapi({ description: 'Human-readable schedule name', example: 'Daily morning scrape' }),
    store: z.string().openapi({ description: 'Store key this schedule targets', example: 'revolico' }),
    cron: z.string().openapi({ description: 'Cron expression', example: '0 6 * * *' }),
    enabled: z.boolean().openapi({ description: 'Whether the schedule is active', example: true }),
    jobs: z.array(z.object({}).passthrough()).openapi({ description: 'Array of store-specific scraping job descriptors' }),
    lastRunAt: z.string().nullable().openapi({ description: 'ISO timestamp of last execution' }),
    createdAt: timestamp('Creation timestamp'),
    updatedAt: timestamp('Last update timestamp'),
  });
  Schemas.ScrapingScheduleResponseDTO = registry.register('ScrapingScheduleResponse', ScrapingScheduleResponse);

  Schemas.CreateScrapingScheduleDTO = registry.register(
    'CreateScrapingSchedule',
    z.object({
      name: z.string().min(1).max(100).openapi({ description: 'Unique schedule name', example: 'Daily morning scrape' }),
      store: z.string().min(1).openapi({ description: 'Store key', example: 'revolico' }),
      cron: z.string().min(1).openapi({ description: 'Cron expression', example: '0 6 * * *' }),
      enabled: z.boolean().optional().openapi({ description: 'Enable on creation (defaults to true)', example: true }),
      jobs: z
        .array(z.object({}).passthrough())
        .min(1)
        .openapi({ description: 'Array of job descriptors', example: [{ category: 'celulares' }] }),
    }),
  );

  Schemas.UpdateScrapingScheduleDTO = registry.register(
    'UpdateScrapingSchedule',
    z.object({
      name: z.string().min(1).max(100).optional(),
      store: z.string().min(1).optional(),
      cron: z.string().min(1).optional(),
      enabled: z.boolean().optional(),
      jobs: z.array(z.object({}).passthrough()).min(1).optional(),
    }),
  );

  const StoreInfoResponse = z.object({
    key: z.string().openapi({ description: 'Store key', example: 'revolico' }),
    displayName: z.string().openapi({ description: 'Human-readable store name', example: 'Revolico' }),
    scrapingQueue: z.string().openapi({ description: 'BullMQ queue name', example: 'PRODUCTS_SCRAPING' }),
    jobSchema: z.object({
      fields: z.array(
        z.object({
          name: z.string(),
          type: z.enum(['string', 'number', 'boolean']),
          required: z.boolean(),
          label: z.string(),
          placeholder: z.string().optional(),
        }),
      ),
    }),
  });
  Schemas.StoreInfoDTO = registry.register('StoreInfo', StoreInfoResponse);
}
