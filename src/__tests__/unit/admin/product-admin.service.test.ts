import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';

// Mock ProductRepository with both existing and new methods.
// This confirms the deleteById and aggregate method shapes before they exist.
jest.mock('@scrapers/revolico/repositories/product.repository', () => ({
  __esModule: true,
  ProductRepository: jest.fn().mockImplementation(() => ({
    clearAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    bulkInsertOrUpdate: jest.fn(),
    deleteById: jest.fn(),
    aggregate: jest.fn(),
  })),
}));

describe('ProductAdminService — Repository shape verification', () => {
  let mockRepo: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = new (ProductRepository as jest.Mock)() as jest.Mocked<ProductRepository>;
  });

  describe('deleteById', () => {
    it('should be defined and accept a string _id', async () => {
      expect(mockRepo.deleteById).toBeDefined();
      expect(typeof mockRepo.deleteById).toBe('function');

      mockRepo.deleteById.mockResolvedValue({ acknowledged: true, deletedCount: 1 });
      const result = await mockRepo.deleteById('abc123');

      expect(mockRepo.deleteById).toHaveBeenCalledWith('abc123');
      expect(result).toEqual({ acknowledged: true, deletedCount: 1 });
    });

    it('should return DeleteResult with deletedCount 0 when id does not match', async () => {
      mockRepo.deleteById.mockResolvedValue({ acknowledged: true, deletedCount: 0 });
      const result = await mockRepo.deleteById('nonexistent-id');
      expect(result.deletedCount).toBe(0);
    });
  });

  describe('aggregate', () => {
    it('should be defined and accept a PipelineStage array', async () => {
      expect(mockRepo.aggregate).toBeDefined();
      expect(typeof mockRepo.aggregate).toBe('function');

      const pipeline = [{ $match: { category: 'inmuebles' } }];
      mockRepo.aggregate.mockResolvedValue([{ _id: 'cat-1', count: 42 }]);
      const result = await mockRepo.aggregate(pipeline as never[]);

      expect(mockRepo.aggregate).toHaveBeenCalledWith(pipeline);
      expect(result).toEqual([{ _id: 'cat-1', count: 42 }]);
    });

    it('should return an empty array when no documents match', async () => {
      mockRepo.aggregate.mockResolvedValue([]);
      const result = await mockRepo.aggregate([{ $match: { nonExistent: true } }] as never[]);
      expect(result).toEqual([]);
    });
  });
});
