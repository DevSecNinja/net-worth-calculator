# Net Worth Calculator

A private, local-first progressive web app for tracking assets, liabilities, yearly net worth, and
payoff projections. Financial data stays in an encrypted browser vault; the app has no account,
server API, analytics, telemetry, advertising, remote fonts, or runtime CDN dependency.

**Live app:** <https://net-worth.ravensberg.org/>

**Cloudflare Pages origin:** <https://net-worth-calculator-xn8.pages.dev/>

> [!IMPORTANT]
> The app cannot reset or recover a forgotten passphrase. Clearing site data or losing the device
> destroys the local vault unless you have a usable encrypted backup.

## Privacy model

- The entire vault is serialized and encrypted before persistence with AES-256-GCM.
- A non-extractable key is derived from the passphrase with PBKDF2-HMAC-SHA-256, a random 128-bit
  salt, and 600,000 iterations.
- Each write uses a fresh random 96-bit IV. Envelope version and algorithm parameters are
  authenticated as AES-GCM additional data.
- IndexedDB stores one versioned cipher envelope. Item names, notes, currency, counts, and values are
  not stored as searchable plaintext records.
- The passphrase-derived key and decrypted vault exist only in the unlocked page session. Reloading,
  locking, closing the page, or losing the single-writer lease requires another unlock.
- Cache Storage contains only the generated application shell. It does not contain vault records,
  backups, user input, or application data responses.
- Theme preference and short-lived tab-lease metadata are non-sensitive and may use localStorage.
- The application makes no runtime request to an external origin and sends no financial data.

Encryption protects stored vault bytes and backup contents, not an already unlocked session. A
compromised device, browser, extension, same-origin script, weak passphrase, screen capture, or
maliciously modified build can expose visible data. JavaScript cannot guarantee immediate memory
zeroization, and browser deletion does not guarantee forensic secure erase. Static hosting also
exposes ordinary web request metadata to the hosting provider. See
[Privacy and security](docs/privacy-security.md) and the [privacy notice](PRIVACY.md).

## Features

- One encrypted vault per browser profile with create, unlock, lock, passphrase change, and permanent
  deletion flows
- Asset and liability tracking with ordering, notes, multiple exact-date observations per year, and
  deterministic monthly liability projections
- Exact As of snapshots, dated timeline, December 31 annual totals, yearly change, CAGR, allocation,
  comparison, annual-change, and payoff views
- Captioned data tables for every chart and clear actual, carried-forward, projected, stale,
  incomplete, and undefined states
- Complete English (US), English (UK), and Nederlands UI with browser negotiation and explicit
  language override
- Locale-aware amount entry and formatting with visible currency context and locale-neutral
  canonical encrypted values (for example `"100000"`)
- Explicit opt-in fictional household sample with localized names, five asset categories, three
  declining debts, and multi-year exact-date history that can be edited or deleted normally
- Light, dark, and live system theme preferences
- Encrypted, authenticated, versioned `.nwvault` backup export and restore
- Native file pickers where supported and download/file-input fallbacks elsewhere
- Installable app shell, offline use after the first successful load, and explicit update activation
- Keyboard, touch, reduced-motion, high-zoom, responsive, and screen-reader-oriented workflows
- Exact semantic version and source commit identity in the app

## Browser support

The supported target is current evergreen desktop and mobile Chromium, Firefox, and WebKit browsers.
CI exercises desktop Chromium, Firefox, and WebKit plus representative mobile Chromium and WebKit
profiles. HTTPS, Web Crypto, IndexedDB, service workers, and modern JavaScript are required.

Installation UI and native file-system pickers are capability-dependent. Browsers that do not expose
them continue to work through normal browser installation controls and standards-based backup
download/upload fallbacks. Private browsing, storage restrictions, quota pressure, enterprise policy,
or browser data eviction can prevent or remove local persistence.

## Local setup

Prerequisites are Git, Node.js 24 with npm 11 or newer, and Playwright browser dependencies.

```powershell
git clone https://github.com/DevSecNinja/net-worth-calculator.git
Set-Location net-worth-calculator
mise install
npm ci
npx playwright install --with-deps chromium firefox webkit
```

`mise` is optional when a compatible Node/npm toolchain is already installed. No runtime environment
variables, accounts, remote services, or secrets are required.

## Commands

| Command                   | Purpose                                                         |
| ------------------------- | --------------------------------------------------------------- |
| `npm run dev`             | Start Vite on `127.0.0.1`                                       |
| `npm run format`          | Format supported files                                          |
| `npm run format:check`    | Check formatting                                                |
| `npm run lint`            | Run ESLint with zero warnings                                   |
| `npm run typecheck`       | Run the strict TypeScript project build                         |
| `npm run test`            | Run Vitest                                                      |
| `npm run test:coverage`   | Run Vitest with coverage                                        |
| `npm run build`           | Build the production app into `dist`                            |
| `npm run test:build`      | Verify CSP, Pages base, PWA assets, icons, cache, and size      |
| `npm run check`           | Run formatting, lint, types, coverage, build, and build checks  |
| `npm run preview`         | Serve `dist` at the base path declared by its built manifest    |
| `npm run test:privacy`    | Run Playwright privacy and transmission checks                  |
| `npm run test:pwa`        | Run Playwright offline, cache, and update checks                |
| `npm run test:e2e`        | Build and run all Playwright desktop/mobile compatibility tests |
| `npm run test:e2e:headed` | Build and run Playwright with visible browsers                  |
| `npm run generate:icons`  | Regenerate committed local icon assets                          |

Run the complete local release gate with:

```powershell
npm run check
npm run test:privacy
npm run test:pwa
npm run test:e2e
```

## Vaults and backups

There is one active vault per browser profile. A short-lived cross-tab lease allows one unlocked
writer at a time, and encrypted revision checks reject stale writes. The application never stores a
passphrase, hint, recovery answer, plaintext verifier, or administrator key.

Backups reuse the current encrypted vault envelope and passphrase. The file is named
`net-worth-backup-YYYY-MM-DD.nwvault`, is limited to 10 MiB on import, and contains plaintext format
metadata including the export time, but no item names, counts, currency, or values. A valid import is
authenticated, decrypted, and validated before explicit overwrite confirmation. Restore
remains available while locked and when no local vault exists. Vault serialization is capped below
the backup limit before encryption, so the app cannot save a vault that it cannot later unlock or
export. Failed, cancelled, malformed, oversized, future-version, tampered, or wrong-passphrase
imports do not replace the current vault.

Treat backup files as sensitive ciphertext: keep multiple copies in locations you control, remember
the matching passphrase, and test restores. Export does not create a recovery service. Deleting the
browser vault does not delete downloaded, synced, emailed, or copied backup files.

## Offline, installation, and updates

After one successful online production load, the generated service worker precaches the revisioned
app shell. Calculations, navigation, and vault access can then work during a real origin outage.
Unvisited or evicted assets may still require a connection, and reinstalling or clearing site data
starts from an empty local state.

An install action appears only when the browser exposes an install prompt. New service-worker builds
wait until the app reports an update and the user accepts it. Choosing **Later** keeps the current
build active. If a form is dirty, activation requires saving it or explicitly accepting its loss
before reload. Outdated app-shell precaches are cleaned without deleting unrelated origin caches or
IndexedDB.

## Deployment

The production workflow builds and verifies one root-hosted `dist` artifact, then deploys those exact
bytes to GitHub Pages and Cloudflare Pages. After a successful Cloudflare production deployment and
custom-domain registration, the pinned central workflow safely creates the proxied
`net-worth.ravensberg.org` CNAME when it is absent. It performs a no-op only when the existing record
already has the expected target and proxy state, and fails without changing a conflicting record.
GitHub Pages remains deployed as the documented rollback target.

```powershell
npm ci
$env:VITE_BASE_PATH = "/"; npm run build
$env:EXPECTED_BASE_PATH = "/"; npm run test:build
```

The GitHub Pages project URL <https://devsecninja.github.io/net-worth-calculator/> redirects to the
custom domain. The default `npm run build` base remains `/net-worth-calculator/` for project-site CI
compatibility and fallback hosting; `npm run test:build:bases` verifies both deployment shapes.

Same-repository pull requests receive Cloudflare preview deployments and their preview is deleted when
the pull request closes. Fork pull requests receive no deployment secrets and continue through the
required CI workflow without a preview. See [deployment and Cloudflare cutover](docs/deployment.md) for
the deployed-site test, DNS/custom-domain verification, rollback, and the eventual GitHub Pages
retirement decision.

### Release automation credentials

Release Please authenticates as an installed GitHub App. Configure these repository-level Actions
credentials under **Settings > Secrets and variables > Actions**:

- Variable `RELEASE_PLEASE_APP_ID`: the GitHub App ID.
- Secret `RELEASE_PLEASE_APP_PRIVATE_KEY`: the GitHub App private key.

Install the app for this repository with **Contents: write** and **Pull requests: write** repository
permissions, and enable **Allow GitHub Actions to create and approve pull requests** under
**Settings > Actions > General > Workflow permissions**. Store the complete private key, including
its PEM header, footer, and newlines, with:

```sh
gh secret set RELEASE_PLEASE_APP_PRIVATE_KEY --repo DevSecNinja/net-worth-calculator < app-private-key.pem
```

The central reusable workflow requires both credentials, rejects empty or whitespace-only values,
and always authenticates with a short-lived App token; it fails closed without a `GITHUB_TOKEN`
fallback. Release Please directly creates the version tag and GitHub Release when its release PR is
merged. This repository intentionally has no competing tag-triggered release publisher.

Cloudflare Pages is a static Direct Upload target only. The project has no Functions, Workers,
bindings, backend, database, analytics, Web Analytics, or runtime Cloudflare dependency. The existing
encrypted local-storage boundary is unchanged.

`npm run preview` derives the serving path from the built manifest. Use `-- --base /custom-path/`
or set `VITE_BASE_PATH` only when an explicit preview override is needed.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and validation expectations. Report
vulnerabilities privately according to [SECURITY.md](SECURITY.md); do not include passphrases,
financial data, vault files, or decrypted screenshots in public issues.

## License

Copyright (c) 2026 Jean-Paul van Ravensberg. Licensed under the [MIT License](LICENSE).
