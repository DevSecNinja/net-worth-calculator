import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useLocale } from '@/features/locale/LocaleProvider';

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  dangerous = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  dangerous?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  return (
    <Dialog open={open} title={title} onClose={onClose}>
      <div className="form-stack">
        <div>{children}</div>
        <div className="button-row">
          <Button type="button" variant={dangerous ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
