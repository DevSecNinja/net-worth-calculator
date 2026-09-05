import { Button } from '@/components/ui/Button';
import { useLocale } from '@/features/locale/LocaleProvider';

import { useVault } from './useVault';

export function LockButton() {
  const { lock } = useVault();
  const { t } = useLocale();
  return (
    <Button type="button" variant="ghost" onClick={lock}>
      {t('nav.lock')}
    </Button>
  );
}
