import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-on-surface">{t('forgot.title')}</h1>
      <ForgotPasswordForm />
      <Link
        to="/login"
        className="block text-center text-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        {t('forgot.backToLogin')}
      </Link>
    </div>
  );
}
