/**
 * Subset of `IRevolicoProduct` that {@link GenericDetailScraperService}
 * writes back to Mongo. Defined here to keep the scraper service decoupled
 * from the Mongoose model file.
 */
export interface IPartialProductUpdate {
  views: number;
  location?: { state: string; municipality?: string };
  seller: IProductSellerSummary;
}

export interface IProductSellerSummary {
  name: string;
  whatsapp: string;
  phone: string;
  email: string;
}
