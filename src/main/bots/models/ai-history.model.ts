import mongoose, { Document, Schema } from 'mongoose';

export interface IAiHistory extends Document {
  sessionId: string;
  messages: unknown[];
  createdAt: Date;
}

const AiHistorySchema = new Schema<IAiHistory>(
  {
    sessionId: { type: String, required: true, index: true },
    messages: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AiHistoryModel = mongoose.model<IAiHistory>('AiHistory', AiHistorySchema, 'bot_ai_history');
