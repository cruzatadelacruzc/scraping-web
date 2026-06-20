import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { PlanDTO } from '@users/dto';
import { PlanMapper } from '@users/mappers/plan.mapper';
import { PlanRepository } from '@users/repositories/plan.repository';
import { inject, injectable } from 'inversify';

@injectable()
export class PlanService {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(PlanRepository) private _repository: PlanRepository,
    @inject(TYPES.PlanMapper) private _mapper: PlanMapper,
  ) {
    this._log.context = PlanService.name;
  }

  /**
   * Registers a new plan by mapping the DTO to the model,
   * persisting it using the repository, and mapping the result back to a DTO.
   *
   * @param planDto - Data Transfer Object containing plan information.
   * @returns A promise resolving to the newly created plan DTO.
   */
  public async register(planDto: PlanDTO): Promise<PlanDTO> {
    this._log.debug('Request to create new plan', planDto);
    const planModel = this._mapper.toCreateInput(planDto);
    const newPlan = await this._repository.create(planModel);
    return this._mapper.toDTO(newPlan)!;
  }

  /**
   * Updates an existing plan by mapping the DTO to the model,
   * persisting it using the repository, and mapping the result back to a DTO.
   *
   * @param id - Unique identifier of the plan to update.
   * @param dto - Data Transfer Object containing updated plan information.
   * @returns A promise resolving to the updated plan DTO.
   */
  public async update(id: string, dto: PlanDTO): Promise<PlanDTO> {
    this._log.debug(`Request to update plan with ID: ${id}`, dto);
    const updateInput = this._mapper.toUpdateInput(dto);
    const updated = await this._repository.update(id, updateInput);
    return this._mapper.toDTO(updated)!;
  }

  /**
   * Retrieves an plan by its ID.
   * @param id - The unique identifier of the plan to find.
   * @returns A promise resolving to the plan DTO if found.
   * @throws Error if the plan does not exist.
   */
  public async findById(id: string): Promise<PlanDTO | null> {
    this._log.debug(`Request to get plan with ID: ${id}`);
    const plan = await this._repository.findById(id);
    return this._mapper.toFullDTO(plan);
  }

  /**
   * Retrieves all plans.
   * @returns A promise resolving to an array of plan DTOs.
   */
  public async findAll(): Promise<PlanDTO[]> {
    this._log.debug('Request to get all plans');
    const plans = await this._repository.findAll();
    return this._mapper.toDTOs(plans);
  }

  /**
   * Deletes an plan by its ID.
   * @param id - The unique identifier of the plan to delete.
   * @returns A promise resolving to the deleted plan DTO.
   * @throws Error if the plan does not exist.
   */
  public async delete(id: string): Promise<PlanDTO> {
    this._log.debug(`Request to delete plan with ID: ${id}`);
    const plan = await this._repository.delete(id);
    return this._mapper.toDTO(plan)!;
  }

  /**
   * Returns only those plans with features.api.enabled === true,
   * mapped to a simplified shape for API usage.
   */
  public async getApiEnabledPlans(): Promise<{ id: string; name: string; rateLimit: number }[]> {
    const plans = await this._repository.findByFeature(['api', 'enabled'], true);
    return plans.map(plan => {
      const cfg = (plan.features as Record<string, any>).api || {};
      return {
        id: plan.id,
        name: plan.name,
        rateLimit: cfg.rateLimit ?? 0,
      };
    });
  }
}
