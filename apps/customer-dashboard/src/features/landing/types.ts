export interface TeaserItem {
  productId: string;
  name: string;
  store: string;
  category: string;
  oldPrice: number;
  newPrice: number;
  dropPct: number;
  spark: number[];
}

export type TeaserSlideType = 'price-drops' | 'best-sellers' | 'watched';

export interface TeaserSlide {
  type: TeaserSlideType;
  title: string;
  updatedAt: string;
  items: TeaserItem[];
}

export interface HighlightsResponse {
  slides: TeaserSlide[];
}
