import { Schema, model } from 'mongoose';
import { IProductBase, IProductDetails } from '@shared/product-base.interfaces';

export interface IRevolicoProduct extends IProductBase , IProductDetails {
  _id?: string;
  imageURL?: string;
  currency: string;
  price: number;
  isOutstanding: boolean;  
}

export const productSchema = new Schema<IRevolicoProduct>(
  {
    category: {
      type: String,
      required: true,
    },
    subcategory: {
      type: String,
    },
    url: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    cost: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    imageURL: {
      type: String,
    },
    isOutstanding: {
      type: Boolean,
      default: false,
    },
    location: {
      state: { type: String },
      municipality: { type: String },
    },
    views: { type: Number, default: 0 },
    seller: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
      whatsapp: { type: String },
    },
  },
  { timestamps: true },
);

const productModel = model("products", productSchema);
export default productModel;
