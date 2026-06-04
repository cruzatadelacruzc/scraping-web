import { Alarm } from '@prisma/client';
import { injectable } from 'inversify';
import { IAlarmCondition, IProductSnapshot } from './condition.interface';

@injectable()
export class IsOutstandingCondition implements IAlarmCondition {
  public readonly type = 'IS_OUTSTANDING';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public evaluate(product: IProductSnapshot, _alarm: Alarm): boolean {
    return product.isOutstanding === true;
  }

  public buildNotification(alarm: Alarm, product: IProductSnapshot): [string, string] {
    const label = alarm.name || product.url;
    return [`Producto destacado: ${label}`, `El producto "${label}" ha sido destacado en la plataforma`];
  }
}
