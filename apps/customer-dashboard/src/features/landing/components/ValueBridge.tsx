import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/shared/ui/forms';

/** Connects the teaser data to the product promise: value prop + primary CTA. */
export function ValueBridge() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center gap-3 border-t border-outline-variant px-4 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
      <p className="max-w-md text-sm text-on-surface-variant">{t('tagline')}</p>
      <Button onClick={() => navigate('/register')} className="shrink-0">
        {t('cta')}
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
