import { Schema, model } from 'mongoose';
import { IProductBase, IProductDetails } from '@shared/product-base.interface';

export interface IRevolicoProduct extends IProductBase, IProductDetails {
  _id?: string;
  ID?: string;
  imageURL?: string;
  currency: string;
  price: number;
  isOutstanding: boolean;
  isPromoted?: boolean;
  priceHistory?: { value: number; updatedAt: Date }[];
  isOutstandingHistory?: { value: boolean; updatedAt: Date }[];
  isPromotedHistory?: { value: boolean; updatedAt: Date }[];
  locationHistory?: { value: { state: string; municipality: string }; updatedAt: Date }[];
  viewsHistory?: { value: number; updatedAt: Date }[];
  /** App-generated metadata (source, schemaVersion, scrapedAt). */
  metadata?: Record<string, unknown>;
  /** User-managed tags for categorization / filtering. */
  tags?: string[];
  /** Structured attributes extracted from description (Fase 3). */
  attributes?: Record<string, unknown>;
  /** Computed analytics metrics (Fase 2). */
  analytics?: Record<string, unknown>;
  /** MD5 hash of the description used for the last enrichment. Prevents re-sending identical descriptions to the LLM. */
  enrichmentHash?: string;
}

export const productSchema = new Schema<IRevolicoProduct>(
  {
    ID: {
      type: String,
      unique: true,
    },
    category: {
      type: String,
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
    isPromoted: {
      type: Boolean,
      default: false,
    },
    isPromotedHistory: {
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
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    tags: {
      type: [String],
      default: [],
    },
    attributes: {
      type: Schema.Types.Mixed,
      default: {},
    },
    analytics: {
      type: Schema.Types.Mixed,
      default: {},
    },
    enrichmentHash: {
      type: String,
    },
  },
  { timestamps: true },
);

const productModel = model('Product', productSchema);
export default productModel;
