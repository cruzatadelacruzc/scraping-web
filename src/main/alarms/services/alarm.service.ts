import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { inject, injectable } from 'inversify';
import { CreateAlarmDTO } from '@alarms/dto/create-alarm.dto';
import { UpdateAlarmDTO } from '@alarms/dto/update-alarm.dto';
import { AlarmResponseDTO } from '@alarms/dto/alarm-response.dto';
import { AlarmRepository } from '@alarms/repositories/alarm.repository';
import { AlarmMapper } from '@alarms/mappers/alarm.mapper';
import { PlanEnforcementService } from '@users/services/plan-enforcement.service';
import { ConditionNotAllowedError } from '@users/errors/condition-not-allowed.error';
import { getRequestContext } from '@shared/tenant-context-als';
import { AlarmNotFoundError } from '@alarms/errors/alarm-not-found.error';

@injectable()
export class AlarmService {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(AlarmRepository) private readonly _repository: AlarmRepository,
    @inject(TYPES.AlarmMapper) private readonly _mapper: AlarmMapper,
    @inject(PlanEnforcementService) private readonly _planEnforcement: PlanEnforcementService,
  ) {
    this._log.context = AlarmService.name;
  }

  public async create(dto: CreateAlarmDTO): Promise<AlarmResponseDTO> {
    const tenantId = this.getTenantId();
    this._log.debug('Request to create alarm', { tenantId, dto });

    // Enforce plan limits before creating the alarm
    await this._planEnforcement.enforceAlarmLimit(tenantId);
    const conditionAllowed = await this._planEnforcement.isConditionAllowed(tenantId, dto.condition);
    if (!conditionAllowed) {
      throw new ConditionNotAllowedError(dto.condition);
    }

    const input = this._mapper.toCreateInput(dto, tenantId);
    const created = await this._repository.create(input);
    return this._mapper.toDTO(created)!;
  }

  public async getById(id: string): Promise<AlarmResponseDTO | null> {
    this._log.debug('Request to get alarm by id', { id });
    const alarm = await this._repository.findById(id);
    return this._mapper.toDTO(alarm);
  }

  public async getAll(): Promise<AlarmResponseDTO[]> {
    this._log.debug('Request to list all alarms');
    const alarms = await this._repository.findAll();
    return this._mapper.toDTOs(alarms);
  }

  public async update(id: string, dto: UpdateAlarmDTO): Promise<AlarmResponseDTO> {
    this._log.debug('Request to update alarm', { id, dto });
    const tenantId = this.getTenantId();
    const existing = await this._repository.findById(id);
    if (!existing) throw new AlarmNotFoundError(id);

    // Enforce condition allowed by plan, if condition is being changed
    if (dto.condition !== undefined) {
      const conditionAllowed = await this._planEnforcement.isConditionAllowed(tenantId, dto.condition);
      if (!conditionAllowed) {
        throw new ConditionNotAllowedError(dto.condition);
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.condition !== undefined) data.condition = dto.condition;
    if (dto.threshold !== undefined) data.threshold = dto.threshold;
    if (dto.percentage !== undefined) data.percentage = dto.percentage;
    if (dto.params !== undefined) data.params = dto.params;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;

    const updated = await this._repository.update(id, data);
    return this._mapper.toDTO(updated)!;
  }

  public async delete(id: string): Promise<void> {
    this._log.debug('Request to delete alarm', { id });
    const existing = await this._repository.findById(id);
    if (!existing) throw new AlarmNotFoundError(id);
    await this._repository.delete(id);
  }

  private getTenantId(): string {
    const ctx = getRequestContext();
    if (!ctx?.tenantId) throw new Error('Tenant context not available');
    return ctx.tenantId;
  }
}
