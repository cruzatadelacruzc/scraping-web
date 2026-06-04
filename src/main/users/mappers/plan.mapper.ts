import { Plan, Prisma } from '@prisma/client';
import { injectable } from 'inversify';
import { PlanDTO } from '@users/dto';
import { PlanType } from '@prisma/client';

/**
 * Responsible for converting between Prisma models and DTOs for Plan.
 */
@injectable()
export class PlanMapper {
  /**
   * Maps a PlanDTO to the data shape Prisma expects for creation.
   * @param dto - DTO with the fields required to create a plan.
   * @returns Prisma.PlanCreateInput
   */
  public toCreateInput(dto: PlanDTO): Prisma.PlanCreateInput {
    return {
      name: dto.name,
      type: dto.type as PlanType,
      features: dto.features,
      price: dto.price ?? 0,
    };
  }

  /**
   * Maps a PlanDTO to the data shape Prisma expects for update.
   * Only fields that are defined on the DTO will be included.
   * @param dto - DTO with the fields to update on the plan.
   * @returns Prisma.PlanUpdateInput
   */
  public toUpdateInput(dto: PlanDTO): Prisma.PlanUpdateInput {
    const input: Prisma.PlanUpdateInput = {};
    if (dto.name !== undefined) {
      input.name = dto.name;
    }
    if (dto.type !== undefined) {
      input.type = dto.type as PlanType;
    }
    if (dto.features !== undefined) {
      input.features = dto.features;
    }
    if (dto.price !== undefined) {
      input.price = dto.price;
    }
    return input;
  }

  public toDTO(model: Plan | null | undefined): PlanDTO | null {
    if (!model) {
      return null;
    }

    const raw = model.features;
    const features = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, any>) : {};
    const priceNumber: number | undefined =
      model.price !== null && model.price !== undefined
        ? typeof model.price === 'object' && 'toNumber' in model.price
          ? model.price.toNumber()
          : Number(model.price)
        : undefined;

    return new PlanDTO(model.name, model.type as PlanType, features, priceNumber, model.id, model.createdAt, model.updatedAt);
  }

  /**
   * Maps a Prisma Plan model to a PlanDTO with subscription IDs.
   * @param model - The Prisma Plan model with subscriptions or null/undefined
   * @returns PlanDTO | null
   */
  public toFullDTO(model: (Plan & { subscriptions?: { id: string }[] }) | null | undefined): PlanDTO | null {
    if (!model) return null;

    const base = this.toDTO(model);
    if (!base) return null;

    const subscriptionIds = model.subscriptions?.map(s => s.id) ?? [];
    return { ...base, subscriptionIds } as PlanDTO;
  }

  /**
   * Maps an array of Prisma Plan models to an array of PlanDTOs.
   * @param models - Array of Prisma Plan models with optional subscriptions
   * @returns PlanDTO[] — never null.
   */
  public toDTOs(models: Array<Plan & { subscriptions?: { id: string }[] }>): PlanDTO[] {
    return models.map(m => this.toFullDTO(m)).filter((dto): dto is PlanDTO => dto !== null);
  }
}
