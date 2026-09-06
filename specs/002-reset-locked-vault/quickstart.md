# Quickstart: Validate Locked Vault Reset

## Prerequisites

- Node.js 24 and npm 11 or newer
- Dependencies installed with `npm ci`
- Playwright browsers already installed for browser suites

## Static and Unit Gates

```powershell
npm run check
```

Expected: formatting, lint, strict types, coverage, production build, and build artifact checks pass.

## Focused Browser Gates

```powershell
npm run test:privacy
npm run test:pwa
npm run test:e2e
```

Expected: the reset flow works in configured desktop and mobile browsers, makes no user-data network
request, preserves app-shell caching, and passes accessibility assertions.

## Manual Concurrency Scenario

1. Create a vault and leave it unlocked in tab A.
2. Open the same app in tab B and choose the locked reset action.
3. Enter the required phrase and submit.
4. Verify tab B shows the active-session refusal and tab A remains usable.
5. Lock or close tab A, retry in tab B, and verify immediate onboarding.

## Manual Replacement Scenario

1. Open reset confirmation for a locked vault.
2. Replace the envelope from another controlled test context before submitting.
3. Submit the original confirmation.
4. Verify the replacement remains and a changed-vault error is shown.

## Manual Recovery Boundary

After successful reset, create a new vault without reload. Verify the old passphrase cannot unlock
the new local vault, while a previously downloaded encrypted backup remains outside the app and can
only be restored with its own passphrase.
