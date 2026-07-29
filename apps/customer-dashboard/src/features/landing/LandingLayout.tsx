import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/forms';
import { LanguageSwitcher } from '@/shared/ui/language-switcher';
import { LeftPreviewTray } from './components/LeftPreviewTray';
import { TeaserStage } from './components/TeaserStage';
import { ValueBridge } from './components/ValueBridge';

/**
 * "The Living Front Door" — pre-auth, teaser-first landing. Zero-scroll on
 * desktop (viewport-locked); reflows on mobile. The <Outlet/> renders the
 * AuthModal on /login and /register.
 */
export function LandingLayout() {
  const { t } = useTranslation(['common', 'landing']);
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col bg-surface text-on-surface md:h-screen md:flex-row md:overflow-hidden">
      <LeftPreviewTray />

      <main className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="flex items-center gap-3 border-b border-outline-variant px-4 py-3">
          <span className="font-mono text-sm font-semibold text-on-surface">
            <span className="text-success">◈</span> {t('common:appName')}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="px-2 text-sm text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {t('common:actions.register')}
            </button>
            <Button size="sm" onClick={() => navigate('/login')}>
              {t('common:actions.enter')}
            </Button>
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-hidden px-4 py-5">
          <TeaserStage />
        </section>

        <ValueBridge />
      </main>

      <Outlet />
    </div>
  );
}
