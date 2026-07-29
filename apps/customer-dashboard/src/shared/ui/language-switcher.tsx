import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/cn';
import { supportedLngs } from '@/shared/i18n';

const LABELS: Record<string, string> = { es: 'ES', en: 'EN' };

/** Compact EN/ES toggle. Persists the choice (i18next localStorage detector). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-outline-variant p-0.5',
        className
      )}
    >
      {supportedLngs.map((code) => {
        const active = current?.startsWith(code);
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            onClick={() => void i18n.changeLanguage(code)}
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium transition-colors',
              active
                ? 'bg-surface-container-high text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            {LABELS[code] ?? code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
