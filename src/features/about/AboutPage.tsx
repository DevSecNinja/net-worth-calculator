export function AboutPage() {
  const shortSha = __COMMIT_SHA__ === 'dev' ? 'dev' : __COMMIT_SHA__.slice(0, 7);
  const sourceUrl =
    __COMMIT_SHA__ === 'dev'
      ? __REPOSITORY_URL__
      : `${__REPOSITORY_URL__}/commit/${__COMMIT_SHA__}`;

  return (
    <main id="main-content" className="page prose-page">
      <p className="eyebrow">Open source and private</p>
      <h1>About this calculator</h1>
      <p className="lede">
        Net Worth Calculator is a local-first PWA. It has no account system, database server,
        analytics, advertising, telemetry, remote fonts, or runtime third-party requests.
      </p>
      <section>
        <h2>Privacy model</h2>
        <p>
          The complete vault is authenticated and encrypted before IndexedDB stores it. Your
          passphrase-derived key and decrypted document stay in memory only while this tab is
          unlocked. Cache Storage contains the app shell, never vault data.
        </p>
      </section>
      <section>
        <h2>Important limitations</h2>
        <ul>
          <li>There is no passphrase reset, recovery service, or administrator override.</li>
          <li>Clearing browser site data deletes the local vault unless you have a backup.</li>
          <li>
            A compromised device, browser extension, or unlocked session may access visible data.
          </li>
          <li>
            This calculator is informational and is not financial, legal, tax, or investment advice.
          </li>
          <li>
            Market values and exchange rates are never fetched; you enter all values manually.
          </li>
        </ul>
      </section>
      <section>
        <h2>Build</h2>
        <p>
          Version <strong>v{__APP_VERSION__}</strong>, build{' '}
          <a href={sourceUrl} rel="noreferrer">
            {shortSha}
          </a>
          . Vault schema, backup format, and service-worker revisions are versioned independently.
        </p>
      </section>
      <section>
        <h2>Source and security</h2>
        <p>
          Review the <a href={__REPOSITORY_URL__}>public source code</a> and report vulnerabilities
          privately through the repository security policy.
        </p>
      </section>
    </main>
  );
}
