/** View model for a single numeric history entry (price / views) */
export interface HistoryEntryViewModel {
  value: number;
  updatedAt: string;
  timestamp: Date;
}

/** View model for location history */
export interface LocationHistoryEntryViewModel {
  location: { state: string; municipality?: string };
  updatedAt: string;
}

/** View model for boolean status history (outstanding / promoted) */
export interface StatusHistoryEntryViewModel {
  value: 0 | 1;
  updatedAt: string;
  timestamp: Date;
}

/** View model for the product detail header */
export interface ProductDetailViewModel {
  id: string;
  title: string;
  category: string;
  price: number;
  currency: string;
  locationState?: string;
  views?: number;
  isOutstanding: boolean;
  isPromoted: boolean;
  createdAt: Date;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  description?: string;
  imageURL?: string;
  url?: string;
}

/** Overall product detail + all histories */
export interface ProductDetailData {
  product: ProductDetailViewModel;
  priceHistory: HistoryEntryViewModel[];
  viewsHistory: HistoryEntryViewModel[];
  locationHistory: LocationHistoryEntryViewModel[];
  outstandingHistory: StatusHistoryEntryViewModel[];
  promotedHistory: StatusHistoryEntryViewModel[];
}

/** Aggregated history entry with count (used by mapper) */
export interface AggregatedHistoryEntry {
  value: number;
  updatedAt: string;
  count: number;
}
