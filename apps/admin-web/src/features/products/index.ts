export { EnrichmentMeter } from './components/enrichment-meter';
export { EventTimeline } from './components/event-timeline';
export { HistoryChart } from './components/history-chart';
export { ProductDetailPage } from './components/product-detail-page';
export { ProductsStatsBarChart } from './components/products-stats-bar-chart';
export { ProductsStatsPage } from './components/products-stats-page';
export { ProductsTable } from './components/products-table';
export { StepChart } from './components/step-chart';
export { TimeRangeSelector } from './components/time-range-selector';
export { useGetProduct } from './hooks/product-detail-hooks';
export {
  useGetLocationHistory,
  useGetOutstandingHistory,
  useGetPriceHistory,
  useGetPromotedHistory,
  useGetViewsHistory,
} from './hooks/product-history-hooks';
export { productKeys } from './hooks/query-keys';
export { useGetProducts } from './hooks/useGetProducts';
export { useGetProductStats } from './hooks/useGetProductStats';
export {
  aggregateByDay,
  aggregateByWeek,
  aggregateNumericEntries,
  filterByTimeRange,
  mapNumericHistoryWithAggregation,
  mapProductDetailDTOToViewModel,
} from './mappers/product-history-mapper';
export { mapProductDTOToViewModel } from './mappers/product-mapper';
export { mapProductStatsDTOToViewModel } from './mappers/product-stats-mapper';
export type {
  ProductDTO,
  ProductListParams,
  ProductListResponse,
} from './services/products-service';
export { productsService } from './services/products-service';
export type { ProductStatsDTO } from './services/products-stats-service';
export { productsStatsService } from './services/products-stats-service';
export type {
  AggregatedHistoryEntry,
  HistoryEntryViewModel,
  LocationHistoryEntryViewModel,
  ProductDetailViewModel,
  StatusHistoryEntryViewModel,
} from './view-models/product-history-view-model';
export type { ProductStatsViewModel } from './view-models/product-stats-view-model';
export type { ProductViewModel } from './view-models/product-view-model';
