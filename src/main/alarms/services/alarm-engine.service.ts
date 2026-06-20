import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { inject, injectable } from 'inversify';
import { AlarmRepository } from '@alarms/repositories/alarm.repository';
import { NotificationRepository } from '@alarms/repositories/notification.repository';
import { ConditionRegistry } from '@alarms/conditions/condition-registry';
import { IProductSnapshot } from '@alarms/conditions/condition.interface';
import { Alarm } from '@prisma/client';

type AlarmWithHistory = Alarm & { history: { price: { toNumber(): number } }[] };

@injectable()
export class AlarmEngineService {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(AlarmRepository) private readonly _alarmRepo: AlarmRepository,
    @inject(NotificationRepository) private readonly _notificationRepo: NotificationRepository,
    @inject(TYPES.ConditionRegistry) private readonly _registry: ConditionRegistry,
  ) {
    this._log.context = AlarmEngineService.name;
  }

  /**
   * Evaluates all enabled alarms against the provided product snapshots.
   * Called after product storage completes — never blocks the pipeline.
   *
   * @returns Number of matched alarms.
   */
  public async evaluateAlarms(products: IProductSnapshot[]): Promise<number> {
    try {
      const urls = products.map(p => p.url);
      if (!urls.length) return 0;

      const alarms = (await this._alarmRepo.findByProductUrls(urls)) as AlarmWithHistory[];
      if (!alarms.length) return 0;

      const snapshotByUrl = new Map<string, IProductSnapshot>(products.map(p => [p.url, p]));
      let matches = 0;

      for (const alarm of alarms) {
        const product = snapshotByUrl.get(alarm.productUrl);
        if (!product) continue;

        const condition = this._registry.get(alarm.condition);
        if (!condition) {
          this._log.warn(`Unknown condition type "${alarm.condition}" for alarm ${alarm.id}`);
          continue;
        }

        if (condition.evaluate(product, alarm)) {
          // Dedup: skip if we already notified for this price
          const alreadyNotified = await this._alarmRepo.findHistoryByAlarmAndPrice(alarm.id, product.price);
          if (!alreadyNotified) {
            await this.createMatch(alarm, product, condition);
            matches++;
          }
        }

        // Update last-evaluated state, delegating params computation to the condition
        const currentParams = (alarm.params as Record<string, unknown> | null) || {};
        const paramsUpdate = condition.computeParamsUpdate ? condition.computeParamsUpdate(currentParams, product) : null;

        await this._alarmRepo.update(alarm.id, {
          lastEvaluatedAt: new Date(),
          lastEvaluatedPrice: product.price,
          ...(paramsUpdate ? { params: paramsUpdate } : {}),
        } as any);
      }

      if (matches > 0) {
        this._log.info(`Alarm engine matched ${matches} condition(s)`);
      }

      return matches;
    } catch (err) {
      this._log.error('Alarm engine evaluation failed', err);
      return 0;
    }
  }

  private async createMatch(
    alarm: AlarmWithHistory,
    product: IProductSnapshot,
    condition: { buildNotification(alarm: Alarm, product: IProductSnapshot): [string, string] },
  ): Promise<void> {
    const matchedAt = new Date();
    const [title, message] = condition.buildNotification(alarm, product);

    await this._alarmRepo.createHistory({
      alarm: { connect: { id: alarm.id } },
      productUrl: alarm.productUrl,
      price: product.price,
      matchedAt,
    });

    await this._notificationRepo.create({
      account: { connect: { id: alarm.accountId } },
      alarm: { connect: { id: alarm.id } },
      title,
      message,
    });

    await this._alarmRepo.update(alarm.id, {
      lastMatchedAt: matchedAt,
      lastNotifiedAt: matchedAt,
    });

    this._log.debug(`Alarm ${alarm.id} triggered: ${title}`);
  }
}
