import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  failed: boolean;
};

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
      return (
        <main id="main-content" className="page centered-page" role="alert">
          <section className="panel">
            <h1>The app could not continue safely.</h1>
            <p>
              Reload to return to the locked vault. Your last committed encrypted data is unchanged.
            </p>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
