import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { AccountDTO } from '@users/dto';
import { AccountMapper } from '@users/mappers/account.mapper';
import { AccountRepository } from '@users/repositories/account.repository';
import { inject, injectable } from 'inversify';

@injectable()
export class AccountService {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(AccountRepository) private readonly _repository: AccountRepository,
    @inject(TYPES.AccountMapper) private readonly _mapper: AccountMapper,
  ) {
    this._log.context = AccountService.name;
  }

  public async register(dto: AccountDTO): Promise<AccountDTO> {
    this._log.debug('Request to create account', dto);
    const input = this._mapper.toCreateInput(dto);
    const created = await this._repository.create(input);
    return this._mapper.toDTO(created)!;
  }

  public async getById(id: string): Promise<AccountDTO | null> {
    this._log.debug('Request to get account by id', { id });
    const account = await this._repository.findById(id);
    return this._mapper.toDTO(account);
  }

  public async getAll(): Promise<AccountDTO[]> {
    this._log.debug('Request to list all accounts');
    const accounts = await this._repository.findAll();
    return accounts.map(a => this._mapper.toDTO(a)).filter((d): d is AccountDTO => d !== null);
  }

  public async update(id: string, dto: AccountDTO): Promise<AccountDTO> {
    this._log.debug('Request to update account', { id, dto });
    const updateInput: Record<string, any> = {};
    if (dto.name !== undefined) updateInput.name = dto.name;
    if (dto.settings !== undefined) updateInput.settings = dto.settings;
    const updated = await this._repository.update(id, updateInput);
    return this._mapper.toDTO(updated)!;
  }

  public async delete(id: string): Promise<void> {
    this._log.debug('Request to delete account', { id });
    await this._repository.delete(id);
  }
}
