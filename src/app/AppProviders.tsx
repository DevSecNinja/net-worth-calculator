import type { ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';

import { AppStatusProvider } from '@/components/ui/AppStatus';
import { LocaleProvider } from '@/features/locale/LocaleProvider';
import { ThemeProvider } from '@/features/settings/ThemeProvider';
import { CloudSyncProvider } from '@/features/sync/CloudSyncProvider';
import { VaultProvider } from '@/features/vault/VaultProvider';
import { DirtyStateProvider } from '@/hooks/useDirtyState';

import { AppErrorBoundary } from './AppErrorBoundary';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <AppErrorBoundary>
        <ThemeProvider>
          <AppStatusProvider>
            <DirtyStateProvider>
              <VaultProvider>
                <CloudSyncProvider>
                  <HashRouter>{children}</HashRouter>
                </CloudSyncProvider>
              </VaultProvider>
            </DirtyStateProvider>
          </AppStatusProvider>
        </ThemeProvider>
      </AppErrorBoundary>
    </LocaleProvider>
  );
}
