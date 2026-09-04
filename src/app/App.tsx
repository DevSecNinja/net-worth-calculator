import { NavLink } from 'react-router-dom';

import { AppFooter } from '@/components/ui/AppFooter';
import { Button } from '@/components/ui/Button';
import { LockButton } from '@/features/vault/LockButton';
import { useLocale } from '@/features/locale/LocaleProvider';
import { useVault } from '@/features/vault/useVault';
import { PwaStatus } from '@/pwa/PwaStatus';

import { AppRoutes } from './routes';

function Header() {
  const { status } = useVault();
  const { t } = useLocale();
  const unlocked = status === 'unlocked';
  return (
    <header className="app-header">
      <NavLink className="brand" to="/" aria-label={t('nav.home')}>
        <span className="brand__mark" aria-hidden="true">
          NW
        </span>
        <span>
          <strong>{t('nav.product')}</strong>
          <small>{t('nav.subtitle')}</small>
        </span>
      </NavLink>
      <nav aria-label={t('nav.primary')}>
        {unlocked ? (
          <>
            <NavLink to="/">{t('nav.dashboard')}</NavLink>
            <NavLink to="/assets">{t('nav.assets')}</NavLink>
            <NavLink to="/liabilities">{t('nav.liabilities')}</NavLink>
          </>
        ) : null}
        <NavLink to="/backup">{t('nav.backup')}</NavLink>
        <NavLink to="/settings">{t('nav.settings')}</NavLink>
        <NavLink to="/about">{t('nav.about')}</NavLink>
      </nav>
      {unlocked ? <LockButton /> : null}
    </header>
  );
}

function VaultErrorBanner() {
  const { clearError, error, status } = useVault();
  if (!error || status !== 'unlocked') return null;
  return (
    <div className="status-banner" role="alert">
      <span>{error}</span>
      <Button type="button" variant="ghost" onClick={clearError}>
        Dismiss
      </Button>
    </div>
  );
}

export function App() {
  const { t } = useLocale();
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById('main-content');
          main?.setAttribute('tabindex', '-1');
          main?.focus();
        }}
      >
        {t('nav.skip')}
      </a>
      <Header />
      <PwaStatus />
      <VaultErrorBanner />
      <AppRoutes />
      <AppFooter />
    </div>
  );
}
