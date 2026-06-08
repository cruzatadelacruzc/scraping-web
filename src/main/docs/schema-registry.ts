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
}
