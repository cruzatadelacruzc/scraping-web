import { injectable, inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interface';
import { ScheduleRepository } from '@cron/repositories/schedule.repository';
import { CronSchedulerService } from '@cron/services/scheduler.service';
import { CreateScheduleDTO, UpdateScheduleDTO } from '@cron/services/dto';
import { toScheduleResponseDTO, IScheduleResponseDTO } from '@cron/mappers';
import { ScheduleNotFoundError } from '@cron/errors';

/**
 * Business logic for scraping schedule CRUD.
 *
 * All write operations synchronise the in-memory CronSchedulerService so that
 * running schedules pick up changes immediately.
 */
@injectable()
export class ScheduleService {
  public constructor(
    @inject(TYPES.ScheduleRepository) private readonly _repo: ScheduleRepository,
    @inject(TYPES.CronSchedulerService) private readonly _scheduler: CronSchedulerService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = ScheduleService.name;
  }

  /**
   * Returns all scraping schedules.
   * @returns {Promise<IScheduleResponseDTO[]>} Mapped schedule list.
   */
  public async list(): Promise<IScheduleResponseDTO[]> {
    const rows = await this._repo.findAll();
    return rows.map(toScheduleResponseDTO);
  }

  /**
   * Returns a single scraping schedule by its id.
   * @param {string} id - The schedule unique identifier.
   * @returns {Promise<IScheduleResponseDTO>} The mapped schedule.
   * @throws {ScheduleNotFoundError} If the id does not exist.
   */
  public async findOne(id: string): Promise<IScheduleResponseDTO> {
    const row = await this._repo.findById(id);
    if (!row) throw new ScheduleNotFoundError(id);
    return toScheduleResponseDTO(row);
  }

  /**
   * Creates a new scraping schedule and registers it with the cron scheduler.
   * @param {CreateScheduleDTO} dto - The validated creation payload.
   * @returns {Promise<IScheduleResponseDTO>} The created schedule.
   */
  public async create(dto: CreateScheduleDTO): Promise<IScheduleResponseDTO> {
    const row = await this._repo.create({
      name: dto.name,
      store: dto.store,
      cron: dto.cron,
      enabled: dto.enabled,
      jobs: dto.jobs,
    });
    this._scheduler.register(row);
    this._log.info('Scraping schedule created', {
      scheduleId: row.id,
      store: row.store,
      cron: row.cron,
      enabled: row.enabled,
    });
    return toScheduleResponseDTO(row);
  }

  /**
   * Updates an existing scraping schedule and re-registers it with the cron
   * scheduler. Only the fields present in the DTO are applied (partial update).
   * @param {string} id - The schedule unique identifier.
   * @param {UpdateScheduleDTO} dto - The validated partial payload.
   * @returns {Promise<IScheduleResponseDTO>} The updated schedule.
   * @throws {ScheduleNotFoundError} If the id does not exist.
   */
  public async update(id: string, dto: UpdateScheduleDTO): Promise<IScheduleResponseDTO> {
    const existing = await this._repo.findById(id);
    if (!existing) throw new ScheduleNotFoundError(id);

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.store !== undefined) updateData.store = dto.store;
    if (dto.cron !== undefined) updateData.cron = dto.cron;
    if (dto.enabled !== undefined) updateData.enabled = dto.enabled;
    if (dto.jobs !== undefined) updateData.jobs = dto.jobs;

    const row = await this._repo.update(id, updateData);
    this._scheduler.register(row);
    this._log.info('Scraping schedule updated', {
      scheduleId: row.id,
      changes: Object.keys(updateData),
    });
    return toScheduleResponseDTO(row);
  }

  /**
   * Deletes a scraping schedule and unregisters it from the cron scheduler.
   * @param {string} id - The schedule unique identifier.
   * @throws {ScheduleNotFoundError} If the id does not exist.
   */
  public async delete(id: string): Promise<void> {
    const existing = await this._repo.findById(id);
    if (!existing) throw new ScheduleNotFoundError(id);

    await this._repo.delete(id);
    this._scheduler.unregister(id);
    this._log.info('Scraping schedule deleted', { scheduleId: id });
  }

  /**
   * Toggles the `enabled` flag of a scraping schedule and re-registers it
   * with the cron scheduler (the scheduler respects the flag internally).
   * @param {string} id - The schedule unique identifier.
   * @returns {Promise<IScheduleResponseDTO>} The updated schedule.
   * @throws {ScheduleNotFoundError} If the id does not exist.
   */
  public async toggle(id: string): Promise<IScheduleResponseDTO> {
    const existing = await this._repo.findById(id);
    if (!existing) throw new ScheduleNotFoundError(id);

    const row = await this._repo.update(id, { enabled: !existing.enabled });
    this._scheduler.register(row);
    this._log.info('Scraping schedule toggled', {
      scheduleId: id,
      enabled: row.enabled,
    });
    return toScheduleResponseDTO(row);
  }
}
