import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/forms';
import { Modal } from './modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
}

/** Destructive-action confirmation. Stays open while pending; confirm is `destructive`. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  pending,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');
  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-sm">
      <p className="mb-5 text-sm text-on-surface-variant">{description}</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          {t('actions.cancel')}
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
