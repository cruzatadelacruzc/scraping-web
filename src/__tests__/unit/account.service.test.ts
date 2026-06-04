import 'reflect-metadata';
import { AccountService } from '@users/services/account.service';
import { AccountRepository } from '@users/repositories/account.repository';
import { AccountMapper } from '@users/mappers/account.mapper';
import { AccountDTO } from '@users/dto/account.dto';

describe('AccountService', () => {
  let accountService: AccountService;
  let accountRepo: jest.Mocked<AccountRepository>;
  let accountMapper: jest.Mocked<AccountMapper>;
  const loggerMock = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), context: '' } as any;

  const dbAccount = {
    id: 'acc-1',
    name: 'Test Account',
    settings: { theme: 'dark' },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    users: [{ id: 'u1' }],
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    accountRepo = {
      exists: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<AccountRepository>;

    accountMapper = {
      toCreateInput: jest.fn().mockReturnValue({ name: 'Test Account', settings: { theme: 'dark' } }),
      toDTO: jest
        .fn()
        .mockImplementation(model =>
          model ? new AccountDTO('Test Account', 'acc-1', { theme: 'dark' }, new Date('2025-01-01'), new Date('2025-01-02')) : null,
        ),
    } as unknown as jest.Mocked<AccountMapper>;

    accountService = new AccountService(loggerMock, accountRepo, accountMapper);
  });

  describe('register', () => {
    it('should create an account and return DTO', async () => {
      const dto = new AccountDTO('Test Account', undefined, { theme: 'dark' });
      accountRepo.create.mockResolvedValue(dbAccount);

      const result = await accountService.register(dto);

      expect(result.name).toBe('Test Account');
      expect(result.id).toBe('acc-1');
      expect(accountMapper.toCreateInput).toHaveBeenCalledWith(dto);
      expect(accountRepo.create).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return account DTO when found', async () => {
      accountRepo.findById.mockResolvedValue(dbAccount);

      const result = await accountService.getById('acc-1');

      expect(result).toBeDefined();
      expect(result!.name).toBe('Test Account');
    });

    it('should return null when not found', async () => {
      accountRepo.findById.mockResolvedValue(null);

      const result = await accountService.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all accounts as DTOs', async () => {
      accountRepo.findAll.mockResolvedValue([dbAccount]);

      const result = await accountService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Account');
    });
  });

  describe('update', () => {
    it('should update and return DTO', async () => {
      const dto = new AccountDTO('Updated Name');
      accountRepo.update.mockResolvedValue({ ...dbAccount, name: 'Updated Name' });
      accountMapper.toDTO.mockReturnValue(new AccountDTO('Updated Name', 'acc-1'));

      const result = await accountService.update('acc-1', dto);

      expect(result.name).toBe('Updated Name');
      expect(accountRepo.update).toHaveBeenCalledWith('acc-1', { name: 'Updated Name' });
    });
  });

  describe('delete', () => {
    it('should delete account', async () => {
      accountRepo.delete.mockResolvedValue(undefined);

      await accountService.delete('acc-1');

      expect(accountRepo.delete).toHaveBeenCalledWith('acc-1');
    });
  });
});
