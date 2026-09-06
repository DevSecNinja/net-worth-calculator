# Quickstart: Validate Installed iOS Vault Creation

## Prerequisites

- Node.js 24 and npm 11 or newer
- Dependencies installed with `npm ci`
- Playwright Chromium, Firefox, and WebKit browsers installed

## Automated Release Gates

```powershell
npm run check
npm run test:privacy
npm run test:pwa
npm run test:e2e
```

Expected: unit/coverage/build checks pass; existing evergreen projects remain green; scoped
`iphone-14-pro-max`, `ipad-pro-12-9`, and `desktop-4k` projects pass their built-output workflows.

## Focused Installed-iPhone Regression

```powershell
npm run build
npx playwright test tests/device/iphone-installed.spec.ts --project=iphone-14-pro-max
```

Expected: the context reports both standalone signals, empty and sample vaults reach the dashboard,
the fatal-boundary text never appears, the encrypted envelope survives lock/reload/unlock and offline
launch, and no sensitive marker reaches diagnostics, network, URLs, or app-shell caches.

## Emulation Boundary

Playwright WebKit supplies the iPhone CSS viewport, DPR, mobile/touch input, user agent, browser crypto,
IndexedDB, and service worker. An init script supplies the two application-visible standalone signals.
It cannot press Safari's **Add to Home Screen**, reproduce physical iOS process eviction exactly, or
certify a named future iPhone. The automated regression therefore pairs with the following owner smoke
check.

## Real iPhone 14 Pro Max Smoke Check

Record the exact iOS and Safari version with the result.

1. In Safari, remove any prior home-screen icon, open `https://net-worth.ravensberg.org/`, wait for the
   offline-ready status, use **Share > Add to Home Screen**, then close Safari.
2. Launch **Net Worth** from the home screen and confirm it has no Safari browser chrome.
3. Enter and confirm a test-only passphrase, choose **Create empty vault**, and verify **Build your
   first net worth snapshot** appears without the fatal safety message.
4. Delete that test vault, relaunch from the home screen, create a vault with sample data, and verify
   the dashboard, charts, and chart data-table disclosures.
5. Lock, fully close the app, reopen it, unlock with the same passphrase, and verify the same sample
   data.
6. Enable Airplane Mode, fully close and reopen the app, unlock again, navigate among Dashboard,
   Assets, Liabilities, Backup, Settings, and About, then disable Airplane Mode.
7. If an update notice is present, choose **Later** once, verify the current session remains usable,
   then choose **Update now** from a clean state and verify the vault returns locked and unlocks.
8. Rotate to landscape and back. Verify no horizontal page scroll, clipped controls, hidden safe-area
   content, footer/status overlap, or unreadable chart table.

Do not use a real financial vault or production passphrase for this smoke check.

## Real iPad Pro 12.9-inch Smoke Check

Record the exact iPadOS and Safari version with the result.

1. Install and launch the production app from the home screen using the same procedure.
2. Create a sample vault, export an encrypted backup, lock, close, reopen, and unlock it.
3. Repeat dashboard, chart-table, Backup, Settings, and About checks in 1024 by 1366 portrait and 1366
   by 1024 landscape orientations.
4. With Airplane Mode enabled, relaunch, unlock, and confirm the cached app shell remains usable.
5. Verify touch targets, keyboard focus when a hardware keyboard is available, safe-area clearance,
   footer/status separation, and absence of horizontal page scrolling.

Do not attach screenshots containing test passphrases, financial markers, or encrypted backup bytes
to public issues or pull requests.
