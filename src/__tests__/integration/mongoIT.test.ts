import { Schema } from 'mongoose';
import { container } from '@shared/container';
import { DBContext } from '@config/db-config';

describe('MongoDB Integration Tests', () => {
  let _dbContext: DBContext;
  beforeAll(async () => {
    _dbContext = container.get<DBContext>(DBContext);
    await _dbContext.dbConnect();
  });

  it('should save a document to MongoDB', async () => {
    const mockSchema = new Schema({ name: { type: String, required: true } });
    const MockModel = _dbContext.db.model('mock', mockSchema);
    expect(MockModel).toBeDefined();

    const document = new MockModel({ name: 'test' });
    await document.save();

    const foundDocument = await MockModel.findById(document.id);
    expect(foundDocument).not.toBeNull();
    expect(foundDocument?.name).toBe('test');
  }, 30000);
});
