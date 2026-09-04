# Quickstart and End-to-End Validation

## Prerequisites

- Git
- [mise](https://mise.jdx.dev/) or Node.js 24 with npm
- Playwright browser dependencies for Chromium, Firefox, and WebKit

## Setup

```powershell
mise install
npm ci
npx playwright install --with-deps chromium firefox webkit
```

All dependency versions come from `package-lock.json`. Runtime operation requires no environment
variables, accounts, remote APIs, or secrets.

## Development

```powershell
npm run dev
```

Open the local URL printed by Vite. The development base remains compatible with the Pages subpath.

## Required Validation

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run test:build
npm run test:e2e
```

`npm run check` runs the non-browser gates together. Browser projects run against the locked local
preview command from this repository, never an unpinned external server package.

## Scenario 1 - Vault and Financial Model

1. Start with cleared site storage.
2. Create a vault using a unique marker passphrase.
3. Explicitly choose sample data or create one asset and one liability manually.
4. Enter at least two non-contiguous asset years and a zero-rate liability.
5. Verify the missing asset year is marked incomplete and the liability reaches zero without a
   negative projected balance.
6. Lock, reload, reject a wrong passphrase, unlock correctly, change the passphrase, and verify the
   old passphrase fails.

**Expected**: Only an authenticated cipher envelope is present in IndexedDB. Marker names, values,
notes, and passphrases are absent from every other persistence surface.

## Scenario 2 - Dashboard Accessibility

1. Load the deterministic five-year fixture.
2. Compare headline totals, yearly change, CAGR, trend, allocation, payoff, and annual-change values
   with fixture expectations.
3. Change the range and compare each chart with its captioned table.
4. Complete the flow with keyboard only, activate 200% zoom and reduced motion, and run axe.

**Expected**: Values match exactly, undefined metrics are labeled, actual/projected states are text
distinguishable, focus remains visible, no page-level horizontal scroll appears, and axe reports no
serious or critical violations.

## Scenario 3 - Encrypted Backup Safety

1. Export through native save when available and download fallback otherwise.
2. Confirm the generic dated filename and inspect raw bytes for unique marker values.
3. Attempt empty, oversized, malformed, tampered, future-version, and wrong-passphrase imports.
4. Import a valid backup, cancel overwrite, then repeat and confirm overwrite.

**Expected**: All failures and cancellation preserve the current envelope. The valid confirmed
import round-trips every field and migration output.

## Scenario 4 - Real Offline and Deep Links

1. Build and serve `dist` from the repository's preview harness under `/net-worth-calculator/`.
2. Visit the app online until offline-ready is announced.
3. Stop the origin server, not merely browser network emulation.
4. Reload the dashboard, `#/assets`, `#/about?source=offline`, and the base URL with a query.
5. Unlock and run calculations.

**Expected**: The canonical app shell loads for every URL and calculations remain available. Cache
Storage contains only generated app-shell assets.

## Scenario 5 - N-to-N+1 Update

1. Build version N with a known commit/build marker and cache it in a browser context.
2. Keep a persisted item plus a dirty form draft.
3. Serve version N+1 from the same local origin and trigger visibility/pageshow/online checks.
4. Choose Later and verify version N remains active.
5. Choose Update, resolve the dirty draft warning, and accept activation.

**Expected**: Version N+1 appears only after acceptance, persisted data survives, the new build
identity is visible, and old generated precache entries are cleaned without touching unrelated
origin caches.

## Scenario 6 - Privacy Network Proof

Run `npm run test:privacy`. The suite enters unique marker financial data and fails if it observes:

- any external-origin runtime request;
- any mutating request, beacon, WebSocket, or EventSource;
- marker data in requests, URLs, logs, service-worker messages, web storage, or Cache Storage;
- any remote font, CDN, analytics, telemetry, or GitHub API request.

## Production Artifact

```powershell
npm run build
```

Output is `dist`. GitHub Pages serves it from `https://devsecninja.github.io/net-worth-calculator/`.

For a future Cloudflare Pages migration, use `npm ci && npm run build`, publish `dist`, and set the
deployment base to `/`; no runtime application API changes are required.
