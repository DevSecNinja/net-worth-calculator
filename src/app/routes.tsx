import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AboutPage } from '@/features/about/AboutPage';
import { BackupPage } from '@/features/backup/BackupPage';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { UnlockPage } from '@/features/vault/UnlockPage';
import { useVault } from '@/features/vault/useVault';

const DashboardPage = lazy(async () => {
  const module = await import('@/features/dashboard/DashboardPage');
  return { default: module.DashboardPage };
});

function Dashboard() {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="page centered-page" aria-busy="true">
          <p>Preparing private insights...</p>
        </main>
      }
    >
      <DashboardPage />
    </Suspense>
  );
}

function Home() {
  const { status } = useVault();
  if (status === 'loading') {
    return (
      <main id="main-content" className="page centered-page" aria-busy="true">
        <p>Checking for an encrypted vault...</p>
      </main>
    );
  }
  if (status === 'absent') return <OnboardingPage />;
  if (status === 'locked') return <UnlockPage />;
  return <Dashboard />;
}

function Protected({ children }: { children: React.ReactNode }) {
  const { status } = useVault();
  return status === 'unlocked' ? children : <Navigate to="/" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/assets"
        element={
          <Protected>
            <InventoryPage kind="assets" />
          </Protected>
        }
      />
      <Route
        path="/liabilities"
        element={
          <Protected>
            <InventoryPage kind="liabilities" />
          </Protected>
        }
      />
      <Route
        path="/backup"
        element={
          <Protected>
            <BackupPage />
          </Protected>
        }
      />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
