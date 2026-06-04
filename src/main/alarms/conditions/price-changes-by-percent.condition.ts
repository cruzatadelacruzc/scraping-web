import { Alarm } from '@prisma/client';
import { injectable } from 'inversify';
import { IAlarmCondition, IProductSnapshot } from './condition.interface';

@injectable()
export class PriceChangesByPercentCondition implements IAlarmCondition {
  public readonly type = 'PRICE_CHANGES_BY_PERCENT';

  public evaluate(product: IProductSnapshot, alarm: Alarm): boolean {
    if (!alarm.lastEvaluatedPrice || alarm.percentage === null) return false;
    const lastPrice = alarm.lastEvaluatedPrice.toNumber();
    const changePercent = Math.abs((product.price - lastPrice) / lastPrice) * 100;
    return changePercent >= alarm.percentage;
  }

  public buildNotification(alarm: Alarm, product: IProductSnapshot): [string, string] {
    const label = alarm.name || product.url;
    return [`Cambio de precio detectado: ${label}`, `El producto "${label}" cambió a $${product.price} (cambio >= ${alarm.percentage}%)`];
  }
}
