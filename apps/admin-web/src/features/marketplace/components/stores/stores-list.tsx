import { useTranslation } from 'react-i18next';

import { useGetStores } from '../../hooks/useGetStores';
import type { FieldSchemaViewModel } from '../../view-models/store-view-model';

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

/** Shape-matched skeleton for store cards while loading. */
function StoresListSkeleton(): JSX.Element {
  return (
    <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-outline-variant bg-surface-container-low p-md"
        >
          <div className="mb-sm h-5 w-1/2 rounded-sm bg-on-surface/10" />
          <div className="mb-xs h-4 w-1/3 rounded-sm bg-on-surface/10" />
          <div className="mb-md h-4 w-2/3 rounded-sm bg-on-surface/10" />
          <div className="space-y-xs">
            <div className="h-3 w-1/4 rounded-sm bg-on-surface/10" />
            <div className="h-8 w-full rounded-sm bg-surface-container-highest" />
            <div className="h-8 w-full rounded-sm bg-surface-container-highest" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field type chip
// ---------------------------------------------------------------------------

interface TypeChipProps {
  type: 'string' | 'number' | 'boolean';
}

function TypeChip({ type }: TypeChipProps): JSX.Element {
  const chipStyles: Record<string, string> = {
    string: 'bg-primary/10 text-primary',
    number: 'bg-success-muted text-success',
    boolean: 'bg-warning-muted text-warning',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-label-xs font-mono ${chipStyles[type] ?? 'bg-on-surface/10 text-on-surface-variant'}`}
    >
      {type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Schema field row
// ---------------------------------------------------------------------------

interface SchemaFieldRowProps {
  field: FieldSchemaViewModel;
  t: (key: string, vars?: Record<string, unknown>) => string;
}

function SchemaFieldRow({ field, t }: SchemaFieldRowProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-outline-variant bg-surface px-3 py-2 text-body-sm">
      <div className="min-w-0 flex-1">
        <span className="text-on-surface">{field.label}</span>
        <span className="ml-1 text-on-surface-variant">({field.name})</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <TypeChip type={field.type} />
        {field.required && (
          <span className="text-label-xs text-danger">{t('scrapers.stores.card.required')}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Store card
// ---------------------------------------------------------------------------

interface StoreCardProps {
  displayName: string;
  storeKey: string;
  scrapingQueue: string;
  fields: FieldSchemaViewModel[];
  t: (key: string, vars?: Record<string, unknown>) => string;
}

function StoreCard({
  displayName,
  storeKey,
  scrapingQueue,
  fields,
  t,
}: StoreCardProps): JSX.Element {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md shadow-sm">
      {/* Header */}
      <div className="mb-sm flex items-start justify-between">
        <h3 className="text-lg font-medium text-on-surface">{displayName}</h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-label-xs font-mono text-primary">
          {storeKey}
        </span>
      </div>

      {/* Queue name */}
      <div className="mb-md">
        <div className="font-mono text-body-sm text-on-surface">{scrapingQueue}</div>
      </div>

      {/* Schema fields */}
      <div>
        <h4 className="mb-1 text-body-sm font-medium text-on-surface-variant">
          {t('scrapers.stores.card.schemaFields')}
        </h4>
        <div className="space-y-1">
          {fields.map((field) => (
            <SchemaFieldRow key={field.name} field={field} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StoresList
// ---------------------------------------------------------------------------

export function StoresList(): JSX.Element {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch, isFetching } = useGetStores();

  // 1) Loading — shape-matched skeleton
  if (isLoading) {
    return <StoresListSkeleton />;
  }

  // 2) Error — message + retry
  if (isError) {
    return (
      <div className="rounded-md border border-danger bg-danger-muted p-md text-body-sm text-danger">
        <p>{t('scrapers.stores.error.message')}</p>
        {error instanceof Error && <p className="mt-xs text-on-surface-variant">{error.message}</p>}
        <button
          type="button"
          onClick={() => {
            refetch();
          }}
          className="mt-sm rounded-sm bg-danger px-md py-xs text-body-sm font-medium text-on-surface transition-colors hover:bg-danger/80"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  // 3) Empty — centered icon + message
  if (!data || data.length === 0) {
    return (
      <div className="py-xl text-center">
        <p className="text-lg font-semibold text-on-surface">{t('scrapers.stores.empty.title')}</p>
        <p className="mt-sm text-body-sm text-on-surface-variant">
          {t('scrapers.stores.empty.description')}
        </p>
      </div>
    );
  }

  // 4) Data — store cards grid
  return (
    <div>
      {isFetching && <div className="mb-sm h-0.5 animate-pulse bg-primary/20" />}
      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
        {data.map((store) => (
          <StoreCard
            key={store.key}
            displayName={store.displayName}
            storeKey={store.key}
            scrapingQueue={store.scrapingQueue}
            fields={store.jobSchema.fields}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
