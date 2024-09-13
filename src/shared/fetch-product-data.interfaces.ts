import { IProductBase } from "@shared/product-base.interfaces";

export interface IFetchProductData {
  /**
   * Builds the URL for the API request.
   *
   * @param category The category name for the request.
   * @param category The subcategory name for the request.
   * @param pageNumber The page number for the request.
   * @returns The built URL.
   */
  buildURL(category: string, subcategory?: string, pageNumber?: number): string;

  /**
   * Fetches product information by category and subcategory.
   *
   * @param category The category to fetch products from.
   * @param subcategory The subcategory to fetch products from.
   * @param pageNumber The page number for the request.
   * @param totalPages The number of pages to scrape.
   * @returns A promise that resolves to an array of products.
   */
  fetchProductInfoByCategory<T extends IProductBase>(
    category: string,
    subcategory?: string,
    pageNumber?: number,
    totalPages?: number,
  ): Promise<T[]>;
}