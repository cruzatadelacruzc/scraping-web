import { Schema } from 'mongoose';
import { IProductBase } from '@shared/product-base.interfaces';

export interface IRevolicoProduct extends IProductBase {
  imageURL?: string;
  createdAt?: Date;
}

export const productModel = new Schema<IRevolicoProduct>({
    
  url: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  cost: {
    type: String,
    required: true
  },
  imageURL: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
