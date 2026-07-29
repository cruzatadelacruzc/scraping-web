import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@shared/config/routes';
import { ArrowLeft } from 'lucide-react';

import { PlanForm, type PlanFormMode } from '../components/plan-form';

/**
 * Route page for creating, editing, or duplicating a plan.
 *
 * - `/plans/new` → create mode
 * - `/plans/:id` → edit mode
 * - `/plans/:id?duplicate=true` → duplicate mode
 */
export function PlanFormPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isDuplicate = searchParams.get('duplicate') === 'true';
  const mode: PlanFormMode = id === 'new' ? 'create' : isDuplicate ? 'duplicate' : 'edit';
  const planId = mode === 'create' ? null : (id ?? null);

  const handleSuccess = useCallback(() => {
    navigate(ROUTES.PLANS);
  }, [navigate]);

  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div>
      <button
        type="button"
        onClick={handleCancel}
        className="mb-md inline-flex items-center gap-xs text-body-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {t('nav.plans')}
      </button>

      <h1 className="mb-lg text-headline-lg text-on-surface">
        {mode === 'create'
          ? t('plans.create.title')
          : mode === 'duplicate'
            ? t('plans.duplicate.title')
            : t('plans.edit.title')}
      </h1>

      <PlanForm
        mode={mode}
        planId={planId}
        sourcePlan={null}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
