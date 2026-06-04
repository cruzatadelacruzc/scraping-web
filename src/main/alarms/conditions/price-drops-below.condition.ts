import { Alarm } from '@prisma/client';
import { injectable } from 'inversify';
import { IAlarmCondition, IProductSnapshot } from './condition.interface';

@injectable()
export class PriceDropsBelowCondition implements IAlarmCondition {
  public readonly type = 'PRICE_DROPS_BELOW';

  public evaluate(product: IProductSnapshot, alarm: Alarm): boolean {
    return product.price < alarm.threshold.toNumber();
  }

  public buildNotification(alarm: Alarm, product: IProductSnapshot): [string, string] {
    const label = alarm.name || product.url;
    return [`Precio bajo detectado: ${label}`, `El producto "${label}" bajó a $${product.price} (umbral: $${alarm.threshold.toNumber()})`];
  }
}
