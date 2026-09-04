export function AppFooter() {
  const shortSha = __COMMIT_SHA__ === 'dev' ? 'dev' : __COMMIT_SHA__.slice(0, 7);
  const sourceUrl =
    __COMMIT_SHA__ === 'dev'
      ? __REPOSITORY_URL__
      : `${__REPOSITORY_URL__}/commit/${__COMMIT_SHA__}`;
  return (
    <footer className="app-footer">
      <span>Your financial data stays in this browser.</span>
      <a href={sourceUrl} rel="noreferrer">
        v{__APP_VERSION__} ({shortSha})
      </a>
    </footer>
  );
}
