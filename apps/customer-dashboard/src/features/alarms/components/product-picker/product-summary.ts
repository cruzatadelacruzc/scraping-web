import type { ProductCatalogItem } from '../../types';

/** `1,234 USD` — price with grouped thousands and the item's currency, for `font-mono` display. */
export function formatProductPrice(item: Pick<ProductCatalogItem, 'price' | 'currency'>): string {
  const amount = Number.isFinite(item.price) ? item.price : 0;
  return `${amount.toLocaleString('en-US')} ${item.currency}`.trim();
}

/** `Municipality, State` (whichever parts exist) or empty string when no location is known. */
export function formatProductLocation(item: Pick<ProductCatalogItem, 'location'>): string {
  const parts = [item.location?.municipality, item.location?.state].filter((part): part is string =>
    Boolean(part && part.trim())
  );
  return parts.join(', ');
}
