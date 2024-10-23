export interface IProductBase {
  url: string;
  cost: string;
  category: string;
  subcategory?: string;
  description?: string;
}

export interface IProductDetails {
  location?: { state: string; municipality?: string };
  views?: number;
  seller?: { name?: string; phone?: string; email?: string; whatsapp?: string };
}
