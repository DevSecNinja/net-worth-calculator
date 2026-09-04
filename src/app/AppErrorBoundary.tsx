import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocale } from '@/features/locale/LocaleProvider';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  failed: boolean;
};

function ErrorFallback() {
  const { t } = useLocale();
  return (
    <main id="main-content" className="page centered-page" role="alert">
      <section className="panel">
        <h1>{t('app.errorTitle')}</h1>
        <p>{t('app.errorText')}</p>
      </section>
    </main>
  );
}

export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(_error: Error, _details: ErrorInfo): void {
    // Financial values and secrets are intentionally never logged.
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
