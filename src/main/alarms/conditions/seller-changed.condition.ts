import { Alarm } from '@prisma/client';
import { injectable } from 'inversify';
import { IAlarmCondition, IProductSnapshot } from './condition.interface';

/**
 * Fires when the seller information has changed from the last evaluation.
 * Stores the previous seller fingerprint in the alarm's params JSON column.
 */
@injectable()
export class SellerChangedCondition implements IAlarmCondition {
  public readonly type = 'SELLER_CHANGED';

  public evaluate(product: IProductSnapshot, alarm: Alarm): boolean {
    const currentFingerprint = this.sellerFingerprint(product.seller);
    if (!currentFingerprint) return false;

    const params = (alarm.params as Record<string, unknown> | null) || {};
    const previousFingerprint = params.lastSellerFingerprint as string | undefined;

    return previousFingerprint !== undefined && previousFingerprint !== currentFingerprint;
  }

  public buildNotification(alarm: Alarm, product: IProductSnapshot): [string, string] {
    const label = alarm.name || product.url;
    return [`Cambio de vendedor: ${label}`, `El producto "${label}" ahora lo vende ${product.seller.name || 'otra persona'}`];
  }

  public computeParamsUpdate(currentParams: Record<string, unknown>, product: IProductSnapshot): Record<string, unknown> {
    const fingerprint = this.sellerFingerprint(product.seller);
    return { ...currentParams, lastSellerFingerprint: fingerprint };
  }

  private sellerFingerprint(seller: IProductSnapshot['seller']): string | null {
    if (!seller.name && !seller.phone) return null;
    return `${seller.name || ''}|${seller.phone || ''}|${seller.email || ''}`;
  }
}
