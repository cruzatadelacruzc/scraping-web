import { Alarm } from '@prisma/client';
import { injectable } from 'inversify';
import { IAlarmCondition, IProductSnapshot } from './condition.interface';

@injectable()
export class ViewsExceedCondition implements IAlarmCondition {
  public readonly type = 'VIEWS_EXCEED';

  public evaluate(product: IProductSnapshot, alarm: Alarm): boolean {
    return product.views >= alarm.threshold.toNumber();
  }

  public buildNotification(alarm: Alarm, product: IProductSnapshot): [string, string] {
    const label = alarm.name || product.url;
    return [
      `Muchas visitas detectadas: ${label}`,
      `El producto "${label}" alcanzó ${product.views} visitas (umbral: ${alarm.threshold.toNumber()})`,
    ];
  }
}
