import { injectable, inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interface';
import { RuleRepository } from '@scrapers/services/attribute-extractor/repositories/rule.repository';
import { RuleRegistryService } from '@scrapers/services/attribute-extractor/rule-registry.service';
import { RuleNotFoundError } from '@scrapers/revolico/errors/rule-not-found.error';
import { RuleAlreadyExistsError } from '@scrapers/revolico/errors/rule-already-exists.error';
import { toRuleResponseDTO, IRuleResponseDTO } from '@admin/mappers/rule.mapper';

/**
 * Business logic for rule-based extractor pattern management.
 *
 * All write operations invalidate the RuleRegistryService cache so the
 * extraction hot-path picks up changes immediately.
 */
@injectable()
export class RuleService {
  public constructor(
    @inject(TYPES.RuleRepository) private readonly _repo: RuleRepository,
    @inject(TYPES.RuleRegistry) private readonly _registry: RuleRegistryService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = RuleService.name;
  }

  /**
   * Returns all rules (enabled and disabled), ordered by ruleKey.
   * @returns {Promise<IRuleResponseDTO[]>} Mapped rule list.
   */
  public async list(): Promise<IRuleResponseDTO[]> {
    const rows = await this._repo.findAll();
    return rows.map(toRuleResponseDTO);
  }

  /**
   * Returns a single rule by its key.
   * @param {string} ruleKey - The unique rule key.
   * @returns {Promise<IRuleResponseDTO>} The mapped rule.
   * @throws {RuleNotFoundError} If the key does not exist.
   */
  public async findOne(ruleKey: string): Promise<IRuleResponseDTO> {
    const row = await this._repo.findByKey(ruleKey);
    if (!row) throw new RuleNotFoundError(ruleKey);
    return toRuleResponseDTO(row);
  }

  /**
   * Creates a new rule. Fails if the key already exists.
   * @param {string} ruleKey - The unique rule key.
   * @param {string[]} values - The word-list values.
   * @returns {Promise<IRuleResponseDTO>} The created rule.
   * @throws {RuleAlreadyExistsError} If the key is already taken.
   */
  public async create(ruleKey: string, values: string[]): Promise<IRuleResponseDTO> {
    const existing = await this._repo.findByKey(ruleKey);
    if (existing) throw new RuleAlreadyExistsError(ruleKey);
    const row = await this._repo.upsert(ruleKey, values);
    this._registry.invalidate(ruleKey);
    this._log.info('Rule created', { ruleKey, count: values.length });
    return toRuleResponseDTO(row);
  }

  /**
   * Updates an existing rule's values. Fails if the key does not exist.
   * @param {string} ruleKey - The unique rule key.
   * @param {string[]} values - The new word-list values (replaces existing).
   * @returns {Promise<IRuleResponseDTO>} The updated rule.
   * @throws {RuleNotFoundError} If the key does not exist.
   */
  public async update(ruleKey: string, values: string[]): Promise<IRuleResponseDTO> {
    const existing = await this._repo.findByKey(ruleKey);
    if (!existing) throw new RuleNotFoundError(ruleKey);
    const row = await this._repo.upsert(ruleKey, values);
    this._registry.invalidate(ruleKey);
    this._log.info('Rule updated', { ruleKey, count: values.length });
    return toRuleResponseDTO(row);
  }
}
