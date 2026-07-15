import { AppError } from '@shared/errors/app.error';
import { IRevolicoProduct } from '../models/product.model';

export class InvalidProductInfoError extends AppError {
  public constructor(
    public invalidProductsInfo: IRevolicoProduct[],
    message: string = 'error:invalid-product-data',
  ) {
    super(message, 422, 'INVALID_PRODUCT_DATA');
    this.invalidProductsInfo = invalidProductsInfo;
  }
}
