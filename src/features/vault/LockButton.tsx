import { Button } from '@/components/ui/Button';

import { useVault } from './useVault';

export function LockButton() {
  const { lock } = useVault();
  return (
    <Button type="button" variant="ghost" onClick={lock}>
      Lock vault
    </Button>
  );
}
