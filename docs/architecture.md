# Architecture

## System overview

Net Worth Calculator is a single static React and TypeScript progressive web app. Vite produces a
content-hashed `dist` artifact; GitHub Pages serves that artifact at the custom-domain root
<https://net-worth.ravensberg.org/>. Cloudflare provides DNS only. There is no application server,
hosted database, account system, analytics service, or runtime API.

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
routes are lazy-loaded. Browser-level suites exercise built output through the same local preview
harness used by CI.

## Module boundaries

| Area             | Responsibility                                                                     |
| ---------------- | ---------------------------------------------------------------------------------- |
| `src/app`        | Providers, route composition, shell, and top-level lifecycle                       |
| `src/components` | Reusable accessible UI, forms, dialogs, and chart/table presentation               |
| `src/domain`     | Pure types, validation, decimal money, amortization, aggregation, and migrations   |
| `src/features`   | Vault, inventory, dashboard, backup, settings, onboarding, and About workflows     |
| `src/storage`    | Cryptography, IndexedDB, encrypted repository, file capability, and tab lease      |
| `src/pwa`        | Install capability, offline status, update checks, and opt-in activation           |
| `tests`          | Built-output E2E, privacy-network, browser fallback, and PWA lifecycle validation  |
| `scripts`        | Deterministic icon generation, local preview, and production artifact verification |

Feature code must not bypass the storage layer to persist vault data. Domain calculations remain
browser-independent and deterministic. Derived dashboard snapshots and chart series are recomputed
from the unlocked vault and are never persisted or cached.

## Vault lifecycle

The browser profile contains at most one active vault:

```text
absent -> creating -> unlocked -> locked -> unlocked
unlocked -> changing passphrase -> unlocked
locked/unlocked -> deleting -> absent
locked -> validating import -> overwrite confirmation -> unlocked
failure during a transition -> previous stable state
```

An unlocked session owns the plaintext document and a non-extractable `CryptoKey` in JavaScript
memory. Every committed mutation increments an encrypted revision and replaces the single IndexedDB
envelope atomically. A short-lived localStorage lease, `BroadcastChannel` or storage events, and
compare-and-swap envelope checks prevent silent last-writer-wins behavior across tabs.

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
filename. Schema migrations are sequential pure transforms applied only after successful
authentication and before current-schema validation.

## Persistence boundaries

| Surface         | Permitted content                                                               |
| --------------- | ------------------------------------------------------------------------------- |
| IndexedDB       | One authenticated cipher envelope at a fixed key                                |
| localStorage    | Theme preference and short-lived, random tab-lease metadata only                |
| Cache Storage   | Generated HTML, JavaScript, CSS, manifest, and local image app-shell resources  |
| JavaScript heap | Decrypted vault and derived key only while the writable session is unlocked     |
| Backup file     | Versioned wrapper around the authenticated cipher envelope and export timestamp |

Cache Storage has no runtime caching rules. The service worker has no access path to IndexedDB vault
content and does not cache backups, data responses, or user-entered values.

## Backup and recovery flow

Export copies the latest authenticated envelope into a versioned `.nwvault` JSON wrapper. Native file
save/open APIs are used where supported; Blob download and file-input fallbacks provide compatibility.
Import enforces the 10 MiB limit, exact outer structure, supported versions, authentication,
migration, and current vault schema before asking for overwrite confirmation. The only IndexedDB
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

## Build and deployment

`npm run build` emits `dist`; `npm run test:build` derives the expected base from
`EXPECTED_BASE_PATH`, then `VITE_BASE_PATH`, then the `/net-worth-calculator/` default. It verifies
required assets, CSP metadata, manifest base/scope, maskable icons, absence of source maps, bundle
ceiling, generated precache, and vault exclusion from the service worker.

The GitHub Pages production workflow uses `VITE_BASE_PATH=/` and verifies that exact artifact with
`EXPECTED_BASE_PATH=/` for the custom domain. The default project path remains available for normal CI
and fallback hosting, and `npm run test:build:bases` checks both forms. The `github.io` project URL
redirects to the custom domain. A future Cloudflare Pages migration remains tracked in Issue #3;
Cloudflare is not the current host. No runtime product service is host-specific.

## Release integrity

PR CI runs formatting, ESLint, strict TypeScript, coverage, production build verification, privacy,
PWA, and all configured desktop/mobile Playwright projects. Organization reusable workflows and
third-party actions are pinned to immutable commits. Release Please owns conventional semantic version
PRs and tags; the tag-triggered release workflow generates release notes with git-cliff.
