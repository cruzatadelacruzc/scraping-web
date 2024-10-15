import { IRevolicoProduct } from "../models/product.model";

export class InvalidProductInfoError extends Error {
  constructor(
    public invalidProductsInfo: IRevolicoProduct[],
    message: string = 'error:invalid-product-data',
  ) {
    super(message);
    Object.setPrototypeOf(this, InvalidProductInfoError.prototype);
    this.invalidProductsInfo = invalidProductsInfo;
  }
}