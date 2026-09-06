# Architecture

## System overview

Net Worth Calculator is a single static React and TypeScript progressive web app. Vite produces one
verified, content-hashed root `dist` artifact. Cloudflare Pages exposes the stable origin
<https://net-worth-calculator-xn8.pages.dev/> directly and serves
<https://net-worth.ravensberg.org/> through user-managed DNS. GitHub Pages receives the same bytes and
remains a warm rollback target. There is no application server, hosted database, account system,
analytics service, runtime API, Pages Function, or Worker.

```text
React features and accessible components
                |
        session state/reducers
          /             \
pure domain logic     storage boundary
money, projections    Web Crypto, IndexedDB,
and aggregation       files, single-tab lease
                |
       encrypted vault envelope

Generated service worker -> Cache Storage (app-shell resources only)
```

`HashRouter` keeps in-app routes compatible with static hosting and direct Pages launches. Chart-heavy
dependencies remain isolated in a generated vendor chunk, but the first unlocked dashboard is part of
the critical startup module graph. This prevents an encrypted vault from committing before a deferred
route fetch that an installed app can no longer satisfy. Browser-level suites exercise built output
through the same local preview harness used by CI.

## Module boundaries

| Area                  | Responsibility                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/app`             | Providers, route composition, shell, and top-level lifecycle                                                |
| `src/components`      | Reusable accessible UI, forms, dialogs, and chart/table presentation                                        |
| `src/domain`          | Pure types, validation, localized/canonical money, observations, amortization, and exact/annual aggregation |
| `src/features/locale` | Typed en-US/en-GB/nl-NL catalogs, browser negotiation, override, and document language                      |
| `src/features`        | Vault, inventory, dashboard, backup, settings, onboarding, and About workflows                              |
| `src/storage`         | Cryptography, IndexedDB, encrypted repository, file capability, tab lease, and data-free vault events       |
| `src/pwa`             | Install capability, offline status, update checks, and opt-in activation                                    |
| `tests`               | Built-output E2E, privacy-network, browser fallback, and PWA lifecycle validation                           |
| `scripts`             | Deterministic icon generation, local preview, and production artifact verification                          |

Feature code must not bypass the storage layer to persist vault data. Domain calculations remain
browser-independent and deterministic. Derived dashboard snapshots and chart series are recomputed
from the unlocked vault and are never persisted or cached.

## Balance-sheet methodology

The domain model uses conventional household balance-sheet semantics:

- net worth is total assets minus total liabilities;
- an owner-occupied home is a `property` asset at a supportable current market value;
- outstanding mortgage principal is a separate `mortgage` liability;
- home equity is the residual contribution of those two entries;
- expenses and carrying costs are outside the model unless an amount is currently owed or accrued.

Liquidity is a separate analytical dimension. Users may calculate a conservative liquid-net-worth
view by excluding home and other illiquid assets while retaining relevant liabilities, or estimate
liquidation value by reducing the property asset for selling costs. The data model does not
reclassify assets according to income or expenses and has no cash-flow toggle. Income, expenses, cash
flow, and return forecasting are outside the current product scope.

These semantics align with the
[Federal Reserve Financial Accounts household balance sheet](https://www.federalreserve.gov/releases/z1/current/default.htm),
which reports household real estate among assets and home mortgages among liabilities, and the
[Consumer Financial Protection Bureau's home-equity definition](https://www.consumerfinance.gov/ask-cfpb/what-is-a-home-equity-loan-en-106/).
Rich Dad's "puts money in your pocket" framing is documented as a separate cash-flow heuristic rather
than an alternative accounting mode.

## Vault lifecycle

The browser profile contains at most one active vault:

```text
absent -> creating -> unlocked -> locked -> unlocked
unlocked -> changing passphrase -> unlocked
locked/unlocked -> deleting -> absent
locked -> confirming exact-envelope reset -> deleting under lease -> absent
locked -> validating import -> overwrite confirmation -> unlocked
failure during a transition -> previous stable state
```

An unlocked session owns the plaintext document and a non-extractable `CryptoKey` in JavaScript
memory. Every committed mutation increments an encrypted revision and replaces the single IndexedDB
envelope atomically. A short-lived localStorage lease, `BroadcastChannel` or storage events, and
compare-and-swap envelope checks prevent silent last-writer-wins behavior across tabs.

Random local identifiers prefer `crypto.randomUUID` and use an RFC 4122 version 4 formatter backed by
`crypto.getRandomValues` when that convenience method is absent. BroadcastChannel is optional: a
missing or security-restricted constructor retains the existing storage-event path, while unexpected
constructor defects still surface. Web Crypto, IndexedDB, and writable localStorage remain mandatory
and fail closed. Onboarding probes those required capabilities before enabling currency/passphrase
submission; IndexedDB open failures also return to the same localized unavailable state.

Locked reset does not derive a key or decrypt the vault. Opening its confirmation captures the exact
opaque envelope. Submission acquires the same writable lease used by unlocked sessions, then performs
a strict IndexedDB compare-and-delete transaction. A foreign active lease refuses deletion; an absent
or replaced envelope aborts as a conflict. After commit, a constant data-free local event makes other
locked tabs re-read IndexedDB before moving to onboarding. Theme, locale, app-shell caches, and backup
files are outside this transaction.

## Cryptographic envelope

The whole validated vault is UTF-8 JSON encrypted with AES-256-GCM. PBKDF2-HMAC-SHA-256 derives the
key from the passphrase using a random 16-byte salt and 600,000 iterations. Every write uses a fresh
12-byte IV and a 128-bit authentication tag.

The persisted version 1 envelope contains:

- fixed format, envelope version, and vault schema version;
- PBKDF2 name, hash, iteration count, and base64url salt;
- AES-GCM name, base64url IV, and tag length;
- base64url ciphertext containing the authentication tag.

Canonical format/version/KDF/cipher fields are additional authenticated data. The public envelope has
no timestamps, display name, item count, currency, financial value, verifier, hint, or source
filename. Schema version checks are strict and applied only after successful
authentication and before current-schema validation.

## Persistence boundaries

| Surface         | Permitted content                                                               |
| --------------- | ------------------------------------------------------------------------------- |
| IndexedDB       | One authenticated cipher envelope at a fixed key                                |
| localStorage    | Theme, locale, short-lived random tab lease, and data-free coordination pulses |
| Cache Storage   | Generated HTML, JavaScript, CSS, manifest, and local image app-shell resources  |
| JavaScript heap | Decrypted vault and derived key only while the writable session is unlocked     |
| Backup file     | Versioned wrapper around the authenticated cipher envelope and export timestamp |

Cache Storage has no runtime caching rules. The service worker has no access path to IndexedDB vault
content and does not cache backups, data responses, or user-entered values.

## Backup and recovery flow

Export copies the latest authenticated envelope into a versioned `.nwvault` JSON wrapper. Native file
save/open APIs are used where supported; Blob download and file-input fallbacks provide compatibility.
Import enforces the 10 MiB limit, exact outer structure, supported versions, authentication,
current vault schema before asking for overwrite confirmation. The only IndexedDB
write occurs after all validation and confirmation succeeds.

There is no escrow, passphrase reset, recovery key, synchronization service, or remote copy. Recovery
depends entirely on a retained backup and its passphrase.

## PWA and update model

`vite-plugin-pwa` generates a Workbox service worker in prompt mode. The manifest, scope, start URL,
and navigation fallback use the build base. Revisioned precaching covers the static shell;
`cleanupOutdatedCaches` removes obsolete generated precaches.

The app checks for updates after registration and on hourly, visibility, page-show, and online signals
behind a one-hour throttle. A waiting worker remains inactive until the user accepts the update.
Dirty form state must be saved or explicitly discarded before activation reloads the page. The app
never deletes all origin caches and service-worker updates do not alter IndexedDB.

The installed-iOS regression suite runs production output with the generated service worker,
IndexedDB, and Web Crypto in a WebKit context using the iPhone 14 Pro Max CSS viewport, DPR, touch
input, user agent, `navigator.standalone`, and standalone display media query. It covers a controlled
post-startup cache loss, empty/sample creation, pagehide, lock/reload/unlock, real origin outage, and
safe update. Playwright cannot automate Safari's Add to Home Screen UI or physical iOS process/cache
eviction, so the release quickstart keeps those as explicit real-device checks.

## Build and deployment

`npm run build` emits `dist`; `npm run test:build` derives the expected base from
`EXPECTED_BASE_PATH`, then `VITE_BASE_PATH`, then the `/net-worth-calculator/` default. It verifies
required assets, CSP metadata, manifest base/scope, maskable icons, absence of source maps, bundle
ceiling, generated precache, and vault exclusion from the service worker.

The production workflow uses `VITE_BASE_PATH=/` and verifies the artifact with
`EXPECTED_BASE_PATH=/`, uploads it once, and passes that exact artifact to the pinned shared workflow.
Every `main` run deploys it to GitHub Pages and Cloudflare Pages production. Same-repository pull
requests deploy isolated Cloudflare previews and closed pull requests trigger cleanup; fork previews
skip safely when secrets are unavailable. The default project path remains available for normal CI
and fallback-hosting checks, and `npm run test:build:bases` checks both forms.

Cloudflare Pages consumes `dist` through Direct Upload with `main` as the production branch. The
committed `_headers` file adds response CSP/security headers and immutable caching only for hashed
assets while keeping HTML, manifest, and service-worker updates revalidated. No Cloudflare runtime
package or service is part of the application. After a successful production deploy, the reusable
workflow idempotently registers `net-worth.ravensberg.org` with the Pages project and resolves its
collision-safe `pages.dev` target. The consumer intentionally leaves DNS management disabled so its
Cloudflare token remains Pages-only; GitHub Actions never reads or mutates the zone. The user owns
cutover and rollback by changing the `net-worth` CNAME between
`net-worth-calculator-xn8.pages.dev` and `devsecninja.github.io`, as documented in
[deployment operations](deployment.md).

## Release integrity

PR CI runs formatting, ESLint, strict TypeScript, coverage, production build verification, privacy,
PWA, and all configured desktop/mobile Playwright projects. The five broad compatibility projects are
supplemented by scoped iPhone 14 Pro Max, iPad Pro 12.9-inch, and desktop 4K projects so primary-device
coverage does not multiply every suite. Organization reusable workflows and third-party actions are
pinned to immutable commits. Release Please owns conventional semantic version PRs, tags, and direct
GitHub Release publication. The central v3 workflow requires installed GitHub App credentials, mints
a short-lived token, and fails closed without a `GITHUB_TOKEN` fallback. This simple static PWA has no
separate tag-triggered publisher because it has no release assets or attestations.
