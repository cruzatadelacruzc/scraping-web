import { PrismaClient, Plan, Prisma } from '@prisma/client';
import { TYPES } from '@shared/types.container';
import { inject, injectable } from 'inversify';

@injectable()
export class PlanRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly prisma: PrismaClient) {}

  /**
   * Finds all plans where a JSON path under "features" equals a given value.
   * @param path - JSON path inside the "features" column.
   * @param equals - Value to compare against.
   */
  public findByFeature(path: string[], equals: any): Promise<Plan[]> {
    const args: Prisma.PlanFindManyArgs = {
      where: {
        features: {
          path,
          equals,
        },
      },
    };
    return this.prisma.plan.findMany(args);
  }

  /**
   * Creates a new plan in the database.
   *
   * @param data - The partial data to apply to the plan.
   * @returns A promise resolving to the newly created plan.
   */
  public create(data: Prisma.PlanCreateInput): Promise<Plan> {
    return this.prisma.plan.create({ data });
  }

  /**
   * Updates an existing plan by id.
   * @param id - The unique identifier of the plan to update.
   * @param data - The partial data to apply to the plan.
   * @returns A promise resolving to the updated Plan model.
   * @throws Error if the plan does not exist or update fails.
   */
  public async update(id: string, data: Prisma.PlanUpdateInput): Promise<Plan> {
    return this.prisma.plan.update({ where: { id }, data });
  }

  /**
   * Find plan by id.
   * @param id - The unique identifier of the plan to find.
   * @returns A promise resolving to the Plan model if found, null otherwise.
   */
  public async findById(id: string): Promise<Prisma.PlanGetPayload<{ include: { subscriptions: { select: { id: true } } } }> | null> {
    return this.prisma.plan.findUnique({
      where: { id },
      include: {
        subscriptions: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  /**
   * Retrieve all plans.
   * @returns A promise resolving to an array of Plan models.
   */
  public async findAll(): Promise<Prisma.PlanGetPayload<{ include: { subscriptions: { select: { id: true } } } }>[]> {
    return this.prisma.plan.findMany({
      include: {
        subscriptions: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  /**
   * Delete an plan by id.
   * @param id - The unique identifier of the plan to delete.
   * @returns A promise resolving to the deleted Plan model.
   * @throws Error if the plan does not exist.
   */
  public async delete(id: string): Promise<Plan> {
    return this.prisma.plan.delete({ where: { id } });
  }
}
