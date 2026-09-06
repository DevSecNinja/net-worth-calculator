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
3. Explicitly choose the localized sample portfolio or create one asset and one liability manually.
4. For the sample path, verify five asset categories, three declining liabilities, four prior
   year-ends, a prior mid-year observation, and today's observation with no future dates.
5. For the manual path, enter non-contiguous exact dates and a zero-rate liability; verify a target
   before the first observation is incomplete, a later observation carries forward, and debt never
   projects below zero.
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

**Expected**: All failures and cancellation preserve the current envelope. The valid current-format
import round-trips every field, while unsupported pre-release formats fail safely.

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

## Scenario 7 - Locale and Exact-Date Amendment

1. Clear only the language override and launch with `nl-NL`, UK English, and an unsupported browser
   language; verify negotiated language and `<html lang>`.
2. Enter equivalent `1,234.56`, `1 234.56`, and `1.234,56` amounts in their supported locales; verify
   identical canonical encrypted values and JPY fraction rejection.
3. Record two asset observations and two liability manual balances in one year, including July.
4. Move As of before, between, and after observations and verify no future leakage, source dates,
   staleness, asset carry-forward, and liability amortization.
5. Compare the December 31 annual table with the exact timeline.
6. Export and import current dated fixtures; verify canonical decimal strings and exact dates
   round-trip unchanged while unsupported pre-release formats fail without replacing local data.
7. Run `npm run test:performance`; verify a dense encrypted 100-item, 50-year vault unlocks through
   initial dashboard readiness within two seconds on the isolated desktop Chromium profile.

**Expected**: The complete UI is translated in all three locales, language changes never alter
currency/value, dated chart and table data agree, current-format backups preserve every observation,
and unsupported formats are rejected.

## Scenario 8 - Balance-Sheet Methodology

1. Open onboarding in `en-US`, `en-GB`, and `nl-NL`; verify the methodology heading and home-equity
   example are translated.
2. Change the onboarding base currency and verify all three values in the example reformat without
   changing the 500,000 minus 250,000 equals 250,000 relationship.
3. Create the sample vault and follow the dashboard methodology link with keyboard only.
4. Verify About defines assets, liabilities, equity, expenses, liquidity, conservative property
   valuation, cash-flow scope, and the distinct Rich Dad heuristic.
5. Confirm the sample home remains a `property` asset and its mortgage remains a separate `mortgage`
   liability; no cash-flow classification mode exists.
6. At a narrow viewport and 200% zoom, verify the onboarding explanation, dashboard link, and About
   section reflow without horizontal page scrolling.

**Expected**: The methodology is discoverable and locale-aware without changing calculations,
persisted data, privacy boundaries, or asset/liability classifications.

## Production Artifact

```powershell
npm run build
```

Output is `dist`. GitHub Pages serves it from `https://devsecninja.github.io/net-worth-calculator/`.

For a future Cloudflare Pages migration, use `npm ci && npm run build`, publish `dist`, and set the
deployment base to `/`; no runtime application API changes are required.
