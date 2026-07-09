import { Container } from 'inversify';
import { StoreRegistry } from '@cron/store-registry';
import { TYPES } from '@shared/types.container';
import { QUEUE_NAME } from './queues';

/**
 * Registers the Revolico store in the {@link StoreRegistry} so the cron
 * scheduler knows which queue to route scraping jobs to and the admin
 * dashboard can render job forms dynamically.
 */
export function registerRevolicoStore(container: Container): void {
  const registry = container.get<StoreRegistry>(TYPES.StoreRegistry);
  registry.register('revolico', {
    displayName: 'Revolico',
    scrapingQueue: QUEUE_NAME.products_scraping,
    jobSchema: {
      fields: [
        {
          name: 'category',
          type: 'string',
          required: true,
          label: 'Categoría',
          placeholder: 'ej. celulares',
        },
        {
          name: 'subcategory',
          type: 'string',
          required: false,
          label: 'Subcategoría',
          placeholder: 'ej. telefonos',
        },
        {
          name: 'pageNumber',
          type: 'number',
          required: false,
          label: 'Página inicial',
          placeholder: '1',
        },
        {
          name: 'totalPages',
          type: 'number',
          required: false,
          label: 'Total de páginas',
          placeholder: '3',
        },
      ],
    },
  });
}
