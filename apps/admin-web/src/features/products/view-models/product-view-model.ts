export interface ProductViewModel {
  id: string;
  title: string;
  category: string;
  price: number;
  currency: string;
  locationState: string | undefined;
  views: number | undefined;
  isOutstanding: boolean;
  isPromoted: boolean;
  hasEnrichment: boolean;
  createdAt: Date;
}
