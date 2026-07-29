import { useTranslation } from 'react-i18next';

interface PlaceholderProps {
  titleKey: string;
  note?: string;
}

/** Simple centered placeholder for routes whose feature ships in a later phase. */
export function Placeholder({ titleKey, note }: PlaceholderProps) {
  const { t } = useTranslation('common');
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-xl font-semibold text-on-surface">{t(titleKey)}</h1>
      {note && <p className="text-sm text-on-surface-variant">{note}</p>}
    </div>
  );
}
