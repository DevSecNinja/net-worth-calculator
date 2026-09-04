import type { ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';

import { AppStatusProvider } from '@/components/ui/AppStatus';
import { ThemeProvider } from '@/features/settings/ThemeProvider';
import { VaultProvider } from '@/features/vault/VaultProvider';
import { DirtyStateProvider } from '@/hooks/useDirtyState';

import { AppErrorBoundary } from './AppErrorBoundary';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <AppStatusProvider>
          <DirtyStateProvider>
            <VaultProvider>
              <HashRouter>{children}</HashRouter>
            </VaultProvider>
          </DirtyStateProvider>
        </AppStatusProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
