import { Schema, model } from 'mongoose';

const mockSchema = new Schema({
  name: { type: String, required: true },
});

const MockModel = model('Mock', mockSchema);

export default MockModel;
