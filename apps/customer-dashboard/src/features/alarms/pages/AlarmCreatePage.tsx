import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { ROUTES } from '@shared/config/routes';
import { Button } from '@/shared/ui/forms';
import { useCreateAlarm } from '../hooks/use-alarm-mutations';
import { usePlanLimits } from '../hooks/use-plan-limits';
import { AlarmForm } from '../components/AlarmForm';
import { ProductPicker } from '../components/ProductPicker';
import { formValuesToInput } from '../components/alarm-form-values';
import {
  formatProductLocation,
  formatProductPrice,
} from '../components/product-picker/product-summary';
import type { ProductCatalogItem } from '../types';
import type { AlarmFormValues } from '../schemas/alarm-schemas';

export default function AlarmCreatePage() {
  const { t } = useTranslation(['alarms', 'common']);
  const navigate = useNavigate();
  const planLimits = usePlanLimits();
  const create = useCreateAlarm();
  const [product, setProduct] = useState<ProductCatalogItem | null>(null);

  const onSubmit = (values: AlarmFormValues) => {
    if (!product) return;
    create.mutate(formValuesToInput({ ...values, productUrl: product.url }), {
      onSuccess: () => navigate(ROUTES.ALARMS),
    });
  };

  if (planLimits.atLimit) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-center">
        <ShieldAlert className="h-10 w-10 text-on-surface-variant" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-on-surface">{t('plan.limitReached')}</h1>
        <p className="text-sm text-on-surface-variant">{t('plan.upgradeHint')}</p>
        <Button asChild variant="outline" className="mt-2">
          <Link to={ROUTES.ALARMS}>{t('detail.back')}</Link>
        </Button>
      </div>
    );
  }

  const location = product ? formatProductLocation(product) : '';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">{t('wizard.titleCreate')}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {product ? t('wizard.step2') : t('wizard.step1')}
        </p>
      </div>

      {!product ? (
        <ProductPicker onSelect={setProduct} />
      ) : (
        <div className="space-y-6">
          <section className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {t('wizard.selectedProduct')}
              </h2>
              <Button variant="outline" size="sm" onClick={() => setProduct(null)}>
                {t('wizard.changeProduct')}
              </Button>
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <dd className="text-on-surface">{product.description ?? product.url}</dd>
              <dd className="font-mono text-on-surface">{formatProductPrice(product)}</dd>
              {location && <dd className="text-on-surface-variant">{location}</dd>}
              <dd
                className="truncate font-mono text-xs text-on-surface-variant"
                title={product.url}
              >
                {product.url}
              </dd>
            </dl>
          </section>

          <AlarmForm
            lockedProductUrl={product.url}
            onSubmit={onSubmit}
            submitting={create.isPending}
            onCancel={() => navigate(ROUTES.ALARMS)}
          />
        </div>
      )}
    </div>
  );
}
