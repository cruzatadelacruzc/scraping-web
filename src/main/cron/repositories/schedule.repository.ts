import { PrismaClient, ScrapingSchedule } from '@prisma/client';
import { TYPES } from '@shared/types.container';
import { inject, injectable } from 'inversify';

type JsonArray = any[];

export interface ICreateScheduleInput {
  name: string;
  store: string;
  cron: string;
  enabled: boolean;
  jobs: JsonArray;
}

export interface IUpdateScheduleInput {
  name?: string;
  store?: string;
  cron?: string;
  enabled?: boolean;
  jobs?: JsonArray;
}

@injectable()
export class ScheduleRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly prisma: PrismaClient) {}

  /**
   * Retrieves all scraping schedules ordered by creation date ascending.
   * @returns A promise resolving to an array of ScrapingSchedule models.
   */
  public async findAll(): Promise<ScrapingSchedule[]> {
    return this.prisma.scrapingSchedule.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Finds a scraping schedule by its unique identifier.
   * @param id - The unique identifier of the schedule.
   * @returns A promise resolving to the ScrapingSchedule model if found, null otherwise.
   */
  public async findById(id: string): Promise<ScrapingSchedule | null> {
    return this.prisma.scrapingSchedule.findUnique({
      where: { id },
    });
  }

  /**
   * Creates a new scraping schedule.
   * @param data - The input data for the new schedule.
   * @returns A promise resolving to the newly created ScrapingSchedule model.
   */
  public async create(data: ICreateScheduleInput): Promise<ScrapingSchedule> {
    return this.prisma.scrapingSchedule.create({ data });
  }

  /**
   * Partially updates an existing scraping schedule by id.
   * @param id - The unique identifier of the schedule to update.
   * @param data - The partial fields to update.
   * @returns A promise resolving to the updated ScrapingSchedule model.
   * @throws Error if the schedule does not exist.
   */
  public async update(id: string, data: IUpdateScheduleInput): Promise<ScrapingSchedule> {
    return this.prisma.scrapingSchedule.update({ where: { id }, data });
  }

  /**
   * Deletes a scraping schedule by id.
   * @param id - The unique identifier of the schedule to delete.
   * @throws Error if the schedule does not exist.
   */
  public async delete(id: string): Promise<void> {
    await this.prisma.scrapingSchedule.delete({ where: { id } });
  }

  /**
   * Updates the lastRunAt timestamp of a scraping schedule to the current date.
   * @param id - The unique identifier of the schedule to update.
   * @throws Error if the schedule does not exist.
   */
  public async updateLastRunAt(id: string): Promise<void> {
    await this.prisma.scrapingSchedule.update({
      where: { id },
      data: { lastRunAt: new Date() },
    });
  }
}
