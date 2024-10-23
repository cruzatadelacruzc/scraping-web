import { Schema, model } from 'mongoose';
import { IProductBase, IProductDetails } from '@shared/product-base.interfaces';

export interface IRevolicoProduct extends IProductBase, IProductDetails {
  _id?: string;
  ID?: string;
  imageURL?: string;
  currency: string;
  price: number;
  isOutstanding: boolean;
  priceHistory?: { value: number; updatedAt: Date }[];
  isOutstandingHistory?: { value: boolean; updatedAt: Date }[];
  locationHistory?: { value: { state: string; municipality: string }; updatedAt: Date }[];
  viewsHistory?: { value: number; updatedAt: Date }[];
}

export const productSchema = new Schema<IRevolicoProduct>(
  {
    ID: {
      type: String,
      unique: true,
    },
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
      unique: true,
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
    priceHistory: {
      type: [{ value: { type: Number }, updatedAt: { type: Date, default: Date.now } }],
      default: (): Array<any> => [],
      _id: false,
    },
    imageURL: {
      type: String,
    },
    isOutstanding: {
      type: Boolean,
      default: false,
    },
    isOutstandingHistory: {
      type: [{ value: { type: Boolean }, updatedAt: { type: Date, default: Date.now } }],
      default: (): Array<any> => [],
      _id: false,
    },
    location: {
      state: { type: String },
      municipality: { type: String },
    },
    locationHistory: {
      type: [
        {
          location: {
            state: { type: String },
            municipality: { type: String },
          },
          updatedAt: { type: Date, default: Date.now },
        },
      ],
      default: (): Array<any> => [],
      _id: false,
    },
    views: { type: Number, default: 0 },
    viewsHistory: {
      type: [{ value: { type: Number }, updatedAt: { type: Date, default: Date.now } }],
      default: (): Array<any> => [],
      _id: false,
    },
    seller: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
      whatsapp: { type: String },
    },
  },
  { timestamps: true },
);

const productModel = model('Product', productSchema);
export default productModel;
