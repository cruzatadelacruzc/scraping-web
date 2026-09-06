import { useTranslation } from 'react-i18next';
import { ImageOff, MapPin, Star } from 'lucide-react';
import { Button } from '@/shared/ui/forms';
import type { ProductCatalogItem } from '../../types';
import { formatProductLocation, formatProductPrice } from './product-summary';

interface ProductCardProps {
  item: ProductCatalogItem;
  onSelect: (item: ProductCatalogItem) => void;
}

/** A single catalog listing in the picker grid. Presentational — no data hooks. */
export function ProductCard({ item, onSelect }: ProductCardProps) {
  const { t } = useTranslation('alarms');
  const location = formatProductLocation(item);

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low">
      <div className="relative aspect-[4/3] w-full bg-surface-container-high">
        {item.imageURL ? (
          <img src={item.imageURL} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
            <ImageOff className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
        {item.isOutstanding && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success">
            <Star className="h-3 w-3" aria-hidden="true" />
            {t('picker.featured')}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm text-on-surface">{item.description ?? item.url}</p>

        <p className="font-mono text-sm text-on-surface">{formatProductPrice(item)}</p>

        <div className="mt-auto flex flex-col gap-1 text-xs text-on-surface-variant">
          {location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              {location}
            </span>
          )}
          {typeof item.views === 'number' && (
            <span>{t('picker.views', { count: item.views })}</span>
          )}
        </div>

        <Button type="button" size="sm" className="mt-2 w-full" onClick={() => onSelect(item)}>
          {t('picker.select')}
        </Button>
      </div>
    </article>
  );
}
