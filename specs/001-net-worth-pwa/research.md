# Research and Architecture Decisions

## R1. Spec Kit Baseline

**Decision**: Initialize GitHub Spec Kit v1.0.4 from the official `github/spec-kit` tag with the
Copilot skills integration and PowerShell scripts. Persist the constitution and full feature design.

**Rationale**: v1.0.4 is the latest stable release on 2026-09-03. It provides the official
constitution -> specify -> clarify -> plan -> tasks -> analyze -> implement sequence and avoids
depending on the unreleased `main` development version.

**Alternatives considered**: Handwritten lookalike artifacts were rejected because they would not
initialize the official workflow. The bundled automated workflow was rejected because it omits
constitution, clarify, and analyze gates.

## R2. Application Stack

**Decision**: Use React with TypeScript and Vite, a `HashRouter`, plain layered CSS, React context
and reducers for session state, and lazy-load chart-heavy routes.

**Rationale**: The locked product stack is mature and appropriate for a static PWA. `HashRouter`
avoids GitHub Pages SPA 404 behavior while preserving the base path and arbitrary in-app deep links.
Built-in React state is sufficient for one local vault and avoids a global-state dependency.

**Alternatives considered**: Browser routing plus a copied `404.html` was rejected because it adds
host-specific fallback behavior. Next.js and server rendering violate the hosting-neutral static
constraint. Redux is unnecessary for the application scale.

## R3. Minimal Runtime Dependency Set

**Decision**:

- `zod` validates forms, vault documents, backup envelopes, and migrations at trust boundaries.
- `idb` provides a small typed Promise wrapper around IndexedDB transactions.
- `decimal.js` provides deterministic decimal interest calculations and explicit rounding.
- `recharts` provides maintained responsive SVG chart primitives; every chart has an independent
  semantic table, so chart internals are not the accessibility contract.
- `react-router-dom` provides hash-based route/focus boundaries.
- `vite-plugin-pwa` generates Workbox assets and exposes prompt-based React update registration.

**Rationale**: Each library addresses a specialized error-prone concern, is widely adopted, and is
replaceable behind local modules. Native APIs remain the only cryptography, file, install, theme,
network, and storage primitives.

**Alternatives considered**: A hand-written service worker was rejected due to brittle cache
versioning and update behavior. Argon2/WASM was rejected for v0.1 because native Web Crypto does not
provide it and adding a WASM cryptography runtime expands CSP, supply-chain, and compatibility risk.
Homegrown SVG charts were rejected because interaction and responsive behavior would consume more
code than the bounded chart dependency.

## R4. Encryption and Key Derivation

**Decision**: Serialize the full validated vault as UTF-8 JSON and encrypt with AES-256-GCM using a
fresh 96-bit IV on every write. Derive a non-extractable AES key from the passphrase with native
PBKDF2-HMAC-SHA-256, a fresh 128-bit salt, and 600,000 iterations. Authenticate canonical envelope
version, KDF parameters, cipher name, and vault schema version as additional authenticated data.
Persist base64url fields and public parameters only, without activity timestamps. Hold the
`CryptoKey` and plaintext vault solely in the active React session.

**Rationale**: AES-GCM and PBKDF2 are standardized and supported by Web Crypto across the required
browser engines. The iteration count follows widely used OWASP PBKDF2-SHA-256 guidance while
remaining feasible on mobile. A unique IV per encryption and authenticated metadata prevent nonce
reuse and parameter substitution. Whole-document encryption ensures item names, notes, categories,
and values are never queryable or leaked at rest.

**Alternatives considered**: Per-record encryption leaks collection shape and complicates atomic
migrations. Persisting a wrapped key adds a second key-management problem. Password hints, hashes,
and recovery questions leak metadata and create false recovery expectations.

## R5. Storage, Revisions, and Cross-Tab Safety

**Decision**: Store one envelope at a fixed IndexedDB key in database `net-worth-calculator`, object
store `vault`, with no activity or content metadata outside the cipher envelope. Every successful
write increments an encrypted vault revision and compares the expected in-memory revision. An
expiring localStorage lease plus `BroadcastChannel` permits one unlocked writer; a second tab stays
locked until release or lease expiry.

**Rationale**: One atomic encrypted document prevents partial writes and simplifies backups.
Optimistic revision checks and a short lease prevent silent stale-tab overwrites without storing
financial data outside the envelope. A fallback based on standard storage events supports browsers
without Web Locks.

**Alternatives considered**: Multiple plaintext object stores violate the privacy boundary.
Navigator Locks alone lacks universal support. Allowing concurrent writers with last-write-wins
risks irrecoverable data loss.

## R6. Money and Amortization

**Decision**: Persist money as canonical decimal strings, parse to `Decimal` only inside pure domain
functions, and round with half-up currency rounding at explicit display/persistence boundaries.
Calculate monthly liability interest as annual percentage / 12, apply payment after interest, clamp
to zero, and record each December 31 balance. A manual December 31 value overrides that year and
seeds the following January 1. Zero-rate schedules subtract payment directly. A positive-rate
schedule whose payment does not exceed first-month interest is marked non-amortizing.

**Rationale**: Decimal arithmetic avoids binary floating-point drift and is easy to serialize.
Monthly simulation handles overpayment, payoff, start dates, and overrides more transparently than a
closed formula.

**Alternatives considered**: JavaScript numbers are unsafe for repeated money calculations. Integer
minor units alone still require fractional-interest rounding rules and currency-specific exponents.

## R7. Backup Contract

**Decision**: Export the latest persisted encrypted envelope in a versioned JSON container using the
current vault passphrase. The filename is `net-worth-backup-YYYY-MM-DD.nwvault`. Import caps files
at 10 MiB, parses and validates before decryption, validates/migrates the decrypted document, and
asks for typed overwrite confirmation before the sole commit. Use `showSaveFilePicker` and
`showOpenFilePicker` when present; otherwise use Blob download and a hidden file input.

**Rationale**: Reusing the authenticated envelope avoids decrypting for export or creating another
secret. Validate-then-commit guarantees failed imports cannot alter the active vault. Capability
checks give desktop convenience with Safari/Firefox/mobile parity.

**Alternatives considered**: Plain CSV/JSON breaks the privacy requirement. Encoding item names in
filenames leaks metadata. Automatically overwriting after decryption is unsafe.

## R8. PWA and Update Strategy

**Decision**: Configure `vite-plugin-pwa` in `generateSW` and `prompt` mode with base-aware
`start_url`, `scope`, and `navigateFallback`; `cleanupOutdatedCaches`; revisioned precache; and no
runtime caching rules. Use `virtual:pwa-register/react`. Check registration on startup, hourly,
visibility, pageshow, and online signals behind a one-hour throttle. Show accessible offline-ready
and update prompts. Activate only after the user chooses Update and confirms or resolves dirty form
state.

**Rationale**: Generated Workbox revisions and content-hashed Vite assets provide reliable
cache-busting without manual cache names. No runtime cache avoids accidentally caching vault,
exports, or dynamic user data. Resume signals address mobile/iOS lifecycle behavior.

**Alternatives considered**: A handwritten service worker, global same-origin runtime caching,
automatic `SKIP_WAITING`, controller-change reload, and deletion of all origin caches were rejected
as unsafe or brittle.

## R9. Manifest, Icons, and Static Security

**Decision**: Generate and commit standard 192/512, maskable 192/512, Apple 180, and favicon assets
from a local SVG source. Use stable manifest `id`, `lang`, base-aware scope/start URL, no forced
orientation, light/dark theme metadata, and `.nojekyll`. Apply a restrictive document CSP permitting
only self-hosted scripts/styles/connect/worker/manifest plus local data/blob images. Allow zoom and
use `viewport-fit=cover`.

**Rationale**: Separate maskable art preserves safe zones, and committed assets avoid runtime
fetches. A meta CSP is the strongest enforceable application policy on GitHub Pages, while
unsupported header-only protections are documented.

**Alternatives considered**: Remote fonts/icons, root-absolute manifest URLs, inline app code,
`unsafe-eval`, and zoom restrictions violate privacy, base-path, CSP, or accessibility constraints.

## R10. Version and Build Identity

**Decision**: Keep semantic version solely in `package.json`; inject it and the full commit SHA at
build time through Vite. Render `vX.Y.Z (abcdefg)` in footer/About, linking to the exact commit.
Keep app version, vault schema, backup format, and Workbox revisions independent.

**Rationale**: One release metadata source prevents drift. Exact build identity makes deployed
verification and update tests objective without conflating data or cache migrations with SemVer.

**Alternatives considered**: Duplicated constants and manual cache names are drift-prone. Runtime
GitHub API calls violate the zero-external-request boundary.

## R11. Testing and Privacy Proof

**Decision**: Use Vitest for pure/domain/storage tests, React Testing Library for components and
flows, and Playwright against built output for Chromium/Firefox/WebKit plus mobile Chromium/WebKit.
Browser tests cover accessibility, missing-capability fallbacks, real server-outage reload,
deep-link/query launch, non-root base, and two-build N-to-N+1 updates. A mandatory privacy test
seeds unique secrets and rejects external origins, mutating requests, beacons, sockets,
secret-bearing URLs/logs/requests/messages, and user data in Cache Storage.

**Rationale**: Mock-only PWA tests cannot prove offline behavior or service-worker lifecycle.
Network instrumentation and storage inspection turn the privacy promise into an executable CI gate.

**Alternatives considered**: Lighthouse-only checks do not exercise workflows or privacy. A single
Chromium project misses fallback and lifecycle differences.

## R12. DevSecNinja Repository Operations

**Decision**: Pin every reusable `DevSecNinja/.github` caller to
`0d0f448de257f354c89dc3a128871235d6ba8c11` (`v2.5.0`). Add local PR CI for app-specific checks,
central lint with fail-on-error, main/manual Pages deployment of tested `dist`, config sync,
release-please with `skip-github-release: true`, and a `v*` tag release workflow using git-cliff.
Bootstrap Node 24 in `.mise.toml`, release metadata for `net-worth-calculator`, the synchronized
Renovate baseline, and concise Copilot instructions. Use squash merges and conventional PR titles.

**Rationale**: Full-SHA pins and centrally maintained baselines reduce supply-chain and fleet drift.
Local CI remains load-bearing for application/PWA/browser behavior that shared lint cannot know.
Direct `gh` release creation remains the initial-release fallback if organization App secrets are
not installed.

**Alternatives considered**: Stale v2.2.0 pins, stock Cloudflare/APM/autofix workflows, blanket
label deletion, and unadapted repository templates were explicitly rejected by the owner audit.

## R13. Hosting Portability

**Decision**: Keep `npm run build` and `dist` as the only deployment contract. Restrict
GitHub-specific behavior to workflow YAML and compile-time base configuration. Document Cloudflare
Pages as build command `npm ci && npm run build`, output `dist`, with base `/` supplied by a future
hosting environment.

**Rationale**: The runtime uses standard browser APIs and static assets, so migration requires only
base/deploy configuration.

**Alternatives considered**: Runtime GitHub APIs or Pages-only route scripts would couple the app to
the initial host.

## Primary Sources

- [GitHub Spec Kit v1.0.4](https://github.com/github/spec-kit/releases/tag/v1.0.4)
- [Web Crypto API](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API)
- [SubtleCrypto deriveKey](https://developer.mozilla.org/docs/Web/API/SubtleCrypto/deriveKey)
- [IndexedDB API](https://developer.mozilla.org/docs/Web/API/IndexedDB_API)
- [File System API](https://developer.mozilla.org/docs/Web/API/File_System_API)
- [Vite public base path](https://vite.dev/guide/build.html#public-base-path)
- [vite-plugin-pwa documentation](https://vite-pwa-org.netlify.app/)
- [Workbox precaching](https://developer.chrome.com/docs/workbox/modules/workbox-precaching)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
