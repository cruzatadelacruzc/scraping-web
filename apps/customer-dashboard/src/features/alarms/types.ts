export const ALL_CONDITIONS = [
  'PRICE_DROPS_BELOW',
  'PRICE_RISES_ABOVE',
  'PRICE_CHANGES_BY_PERCENT',
  'VIEWS_EXCEED',
  'IS_OUTSTANDING',
  'SELLER_CHANGED',
] as const;

export type AlarmCondition = (typeof ALL_CONDITIONS)[number];

/** Backend AlarmResponseDTO (dates as ISO strings over the wire). */
export interface AlarmDTO {
  id: string;
  accountId: string;
  productUrl: string;
  name: string;
  condition: AlarmCondition;
  threshold: number;
  percentage: number | null;
  params: Record<string, unknown> | null;
  enabled: boolean;
  lastEvaluatedAt: string | null;
  lastEvaluatedPrice: number | null;
  lastMatchedAt: string | null;
  lastNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** UI model: dates parsed. */
export interface AlarmViewModel
  extends Omit<
    AlarmDTO,
    'lastEvaluatedAt' | 'lastMatchedAt' | 'lastNotifiedAt' | 'createdAt' | 'updatedAt'
  > {
  lastEvaluatedAt: Date | null;
  lastMatchedAt: Date | null;
  lastNotifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAlarmInput {
  productUrl: string;
  name: string;
  condition: AlarmCondition;
  threshold: number;
  percentage?: number;
  enabled?: boolean;
}

export type UpdateAlarmInput = Partial<Omit<CreateAlarmInput, 'productUrl'>>;

export interface ProductCatalogItem {
  id: string;
  url: string;
  description?: string;
  price: number;
  currency: string;
  imageURL?: string;
  isOutstanding: boolean;
  views?: number;
  location?: { state?: string; municipality?: string };
  seller?: { name?: string };
  category: string;
  subcategory?: string;
  updatedAt: string;
}

/**
 * Normalized product page produced by productsService.search().
 * NOT the wire shape: the API returns `{ data, meta: { total, skip, limit, hasMore } }`
 * and the service flattens it into this view-friendly form.
 */
export interface ProductPage {
  items: ProductCatalogItem[];
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
}

export interface ProductCategoryGroup {
  category: string;
  subcategories: string[];
}

export interface ProductSearchParams {
  search?: string;
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  skip: number;
  limit: number;
}

export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

export interface SubscriptionDTO {
  id?: string;
  accountId: string;
  planId: string;
  status: SubscriptionStatus;
  periodStart?: string;
  periodEnd?: string;
}

export interface PlanDTO {
  id?: string;
  name: string;
  type: string;
  price?: number;
  features: Record<string, unknown>;
}

export interface NotificationDTO {
  id: string;
  alarmId: string | null;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}
