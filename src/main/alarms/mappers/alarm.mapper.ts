import { Prisma } from '@prisma/client';
import { CreateAlarmDTO } from '@alarms/dto/create-alarm.dto';
import { AlarmResponseDTO } from '@alarms/dto/alarm-response.dto';
import { injectable } from 'inversify';

type AlarmModel = Parameters<typeof AlarmResponseDTO.fromModel>[0];

@injectable()
export class AlarmMapper {
  public toCreateInput(dto: CreateAlarmDTO, tenantId: string): Prisma.AlarmCreateInput {
    return {
      account: { connect: { id: tenantId } },
      productUrl: dto.productUrl,
      name: dto.name,
      condition: dto.condition,
      threshold: dto.threshold,
      percentage: dto.percentage ?? null,
      params: (dto.params as Prisma.InputJsonValue) ?? Prisma.DbNull,
      enabled: dto.enabled ?? true,
    };
  }

  public toDTO(model: AlarmModel | null | undefined): AlarmResponseDTO | null {
    if (!model) return null;
    return AlarmResponseDTO.fromModel(model);
  }

  public toDTOs(models: AlarmModel[]): AlarmResponseDTO[] {
    return models.map(m => AlarmResponseDTO.fromModel(m));
  }
}
