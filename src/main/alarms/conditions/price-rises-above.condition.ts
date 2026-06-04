import { Alarm } from '@prisma/client';
import { injectable } from 'inversify';
import { IAlarmCondition, IProductSnapshot } from './condition.interface';

@injectable()
export class PriceRisesAboveCondition implements IAlarmCondition {
  public readonly type = 'PRICE_RISES_ABOVE';

  public evaluate(product: IProductSnapshot, alarm: Alarm): boolean {
    return product.price > alarm.threshold.toNumber();
  }

  public buildNotification(alarm: Alarm, product: IProductSnapshot): [string, string] {
    const label = alarm.name || product.url;
    return [`Precio alto detectado: ${label}`, `El producto "${label}" subió a $${product.price} (umbral: $${alarm.threshold.toNumber()})`];
  }
}
