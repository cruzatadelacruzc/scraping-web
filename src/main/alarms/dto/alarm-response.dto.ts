import { Alarm, AlarmConditionType } from '@prisma/client';

export class AlarmResponseDTO {
  public constructor(
    public readonly id: string,
    public readonly accountId: string,
    public readonly productUrl: string,
    public readonly name: string,
    public readonly condition: AlarmConditionType,
    public readonly threshold: number,
    public readonly percentage: number | null,
    public readonly params: Record<string, unknown> | null,
    public readonly enabled: boolean,
    public readonly lastEvaluatedAt: Date | null,
    public readonly lastEvaluatedPrice: number | null,
    public readonly lastMatchedAt: Date | null,
    public readonly lastNotifiedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  public static fromModel(model: Alarm): AlarmResponseDTO {
    return new AlarmResponseDTO(
      model.id,
      model.accountId,
      model.productUrl,
      model.name,
      model.condition,
      model.threshold.toNumber(),
      model.percentage,
      (model.params as Record<string, unknown> | null) ?? null,
      model.enabled,
      model.lastEvaluatedAt,
      model.lastEvaluatedPrice ? model.lastEvaluatedPrice.toNumber() : null,
      model.lastMatchedAt,
      model.lastNotifiedAt,
      model.createdAt,
      model.updatedAt,
    );
  }
}
