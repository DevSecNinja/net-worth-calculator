import { NavLink } from 'react-router-dom';

import { AppFooter } from '@/components/ui/AppFooter';
import { LockButton } from '@/features/vault/LockButton';
import { useVault } from '@/features/vault/useVault';
import { PwaStatus } from '@/pwa/PwaStatus';

import { AppRoutes } from './routes';

function Header() {
  const { status } = useVault();
  const unlocked = status === 'unlocked';
  return (
    <header className="app-header">
      <NavLink className="brand" to="/" aria-label="Net Worth Calculator home">
        <span className="brand__mark" aria-hidden="true">
          NW
        </span>
        <span>
          <strong>Net Worth</strong>
          <small>Private calculator</small>
        </span>
      </NavLink>
      <nav aria-label="Primary navigation">
        {unlocked ? (
          <>
            <NavLink to="/">Dashboard</NavLink>
            <NavLink to="/assets">Assets</NavLink>
            <NavLink to="/liabilities">Liabilities</NavLink>
            <NavLink to="/backup">Backup</NavLink>
          </>
        ) : null}
        <NavLink to="/settings">Settings</NavLink>
        <NavLink to="/about">About</NavLink>
      </nav>
      {unlocked ? <LockButton /> : null}
    </header>
  );
}

export function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header />
      <PwaStatus />
      <AppRoutes />
      <AppFooter />
    </div>
  );
}
