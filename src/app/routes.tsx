import { Navigate, Route, Routes } from 'react-router-dom';

import { AboutPage } from '@/features/about/AboutPage';
import { BackupPage } from '@/features/backup/BackupPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { UnlockPage } from '@/features/vault/UnlockPage';
import { useVault } from '@/features/vault/useVault';
import { useLocale } from '@/features/locale/LocaleProvider';

function About() {
  const { vault } = useVault();
  return vault ? <AboutPage currency={vault.settings.baseCurrency} /> : <AboutPage />;
}
function Home() {
  const { status } = useVault();
  const { t } = useLocale();
  if (status === 'loading') {
    return (
      <main id="main-content" className="page centered-page" aria-busy="true">
        <p>{t('app.checkingVault')}</p>
      </main>
    );
  }
  if (status === 'absent') return <OnboardingPage />;
  if (status === 'locked') return <UnlockPage />;
  return <DashboardPage />;
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
      <Route path="/backup" element={<BackupPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/about" element={<About />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
