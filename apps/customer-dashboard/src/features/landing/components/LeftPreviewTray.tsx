import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, BellRing, Bot, LayoutDashboard, Lock, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface NavItem {
  key: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { key: 'dashboard', icon: LayoutDashboard },
  { key: 'alarms', icon: BellRing },
  { key: 'notifications', icon: Bell },
  { key: 'bots', icon: Bot },
  { key: 'account', icon: User },
];

/**
 * Guest preview navigation. Every item is locked — clicking nudges to sign up.
 * Vertical rail on desktop, bottom tab bar on mobile.
 */
export function LeftPreviewTray() {
  const { t } = useTranslation(['common', 'landing']);
  const navigate = useNavigate();
  const nudge = () => navigate('/register');

  return (
    <>
      {/* Desktop rail */}
      <nav
        aria-label={t('landing:locked')}
        className="hidden w-20 shrink-0 flex-col items-center gap-1 border-r border-outline-variant bg-surface-container-low py-4 md:flex"
      >
        <span className="mb-4 font-mono text-base font-semibold text-on-surface" aria-hidden="true">
          ◈
        </span>
        {ITEMS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={nudge}
            title={t('landing:locked')}
            className="group relative flex w-full flex-col items-center gap-1 rounded-md px-1 py-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <span className="relative">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <Lock
                className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 text-on-surface-variant"
                aria-hidden="true"
              />
            </span>
            <span className="text-[10px] leading-none">{t(`common:nav.${key}`)}</span>
          </button>
        ))}
      </nav>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label={t('landing:locked')}
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-outline-variant bg-surface-container-low py-1.5 md:hidden"
      >
        {ITEMS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={nudge}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-on-surface-variant"
          >
            <span className="relative">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <Lock className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5" aria-hidden="true" />
            </span>
            <span className={cn('text-[10px] leading-none')}>{t(`common:nav.${key}`)}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
