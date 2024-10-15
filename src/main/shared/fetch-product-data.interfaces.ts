import { ScrapingProductsType, ScrapingProductType } from "@scrapers/revolico/services/dto";
import { IProductBase, IProductDetails } from "@shared/product-base.interfaces";
import { Job } from "bull";

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
   * Fetches products information by category and subcategory.
   *
   * @param category The category to fetch products from.
   * @param subcategory The subcategory to fetch products from.
   * @param pageNumber The page number for the request.
   * @param totalPages The number of pages to scrape.
   * @param job The Job in progress
   * @returns {Promise<T[]>} A promise that resolves to an array of products.
   */
  fetchProductInfoByCategory<T extends IProductBase>(
    category: string,
    subcategory?: string,
    pageNumber?: number,
    totalPages?: number,
    job?: Job<ScrapingProductsType>,
  ): Promise<T[]>;

  /**
   * Fetch product information
   *
   * @param url The URL to fetch product from.
   * @param job The Job in progress
   * @returns {Promise<IProductDetails>} A promise that resolves the product details.
   */
  fetchProductDetails(url: string, job: Job<{ url: string }[]>): Promise<IProductDetails>;
}