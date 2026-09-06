# Implementation Analysis: Fix Installed iOS Vault Creation

## Root Cause

Vault encryption and the atomic IndexedDB write completed before React attempted the first import of
the lazy dashboard route. In an installed iOS PWA, a missing or unavailable deferred module can occur
after service-worker cache eviction, incomplete cache population, or an origin outage. That import
rejection bypassed the handled vault-operation error path and was caught by `AppErrorBoundary`, leaving
an encrypted vault committed but the current UI unusable.

The pre-fix production build reproduced the reported screen with real Web Crypto, IndexedDB, and the
generated service worker after deleting only the deferred `DashboardPage` cache entry and taking the
standalone-like iPhone context offline. Captured safe diagnostics were:

- `pageerror` category `module-load`
- `console` category `module-load`
- failed application script path category `module-load`

The raw test observation was `TypeError: Importing a module script failed`; no passphrase, financial
value, envelope, request body, or stack trace was retained.

Healthy Playwright WebKit runs against both local production output and the live pre-fix deployment
did not reproduce natural iOS cache eviction. This confirms the automation boundary rather than
claiming literal home-screen installation coverage.

## Fix

- `src/app/routes.tsx` now imports the first unlocked dashboard statically. Onboarding cannot become
  interactive until the dashboard and chart dependency graph is available, so a successful encrypted
  commit has no subsequent route-module fetch.
- `scripts/verify-build.mjs` and `tests/pwa/build.spec.ts` reject a deferred `DashboardPage` artifact.
- `src/domain/model.ts` retains cryptographic identifiers when `crypto.randomUUID` is missing by
  formatting `crypto.getRandomValues` bytes as RFC 4122 version 4.
- `src/storage/broadcastChannel.ts` permits the existing storage-event fallback only when
  BroadcastChannel is absent or explicitly security/not-supported restricted. Unexpected constructor
  errors still propagate.
- Dirty-state update coordination now uses data-free storage events alongside BroadcastChannel and
  conservatively requires confirmation if neither mechanism is available. Lease failures clear their
  timer and owned record before notifying lock listeners and surfacing unexpected errors.
- Onboarding detects insecure context, missing Web Crypto, unavailable IndexedDB, and blocked
  localStorage before enabling passphrase or create controls, with localized capability-specific
  guidance.
- Vault storage, PBKDF2 iterations, AES-GCM parameters, envelope validation, lease ordering, service
  worker policy, and error-boundary copy are unchanged.

## Requirement Trace

| Requirement group | Evidence |
| ----------------- | -------- |
| FR-001 to FR-006 | Installed-like iPhone empty/sample creation, post-startup cache-loss regression, atomic create unit test, lock/reload/unlock assertions |
| FR-007 to FR-010 | Random UUID, optional BroadcastChannel, and required-capability unit/component tests; standalone signals, hash routes, pagehide, offline origin-outage, and update scenario |
| FR-011 to FR-014 | Existing fail-closed boundary, new non-sensitive boundary test, same-origin request checks, marker scans of URLs/web storage/cache/IndexedDB |
| FR-015 to FR-019 | Existing five browser projects plus scoped iPhone, iPad, and 4K projects; portrait/landscape, 430-to-480 range, large text, touch, keyboard, chart table, bounded width, and overflow checks |
| FR-020 | README, architecture, privacy/security, contract, and quickstart explicitly distinguish standalone emulation from physical Add to Home Screen testing |

## Automated Evidence

- Static/unit/coverage/build gate: 51 files and 237 tests; 86.07% statements, 76.11% branches, 84.09%
  functions, and 88.94% lines.
- Focused device matrix: 6 tests passed across `iphone-14-pro-max`, `ipad-pro-12-9`, and `desktop-4k`.
- Privacy matrix: 10 tests passed across the five broad browser projects.
- PWA lifecycle matrix includes the explicit N-to-N+1 update on `iphone-14-pro-max`.
- Full Playwright matrix at CI concurrency: 130 passed and 17 intentionally skipped across 147
  discovered cases.
- Production artifact: five hashed CSS/JavaScript assets, 271,230 compressed startup bytes, complete
  service-worker precache, and no deferred dashboard artifact.

## Manual Boundary

Playwright cannot install through Safari's home-screen UI, emulate physical iOS process eviction, or
verify future named hardware. The exact owner procedure for an iPhone 14 Pro Max and iPad Pro 12.9-inch
is in [quickstart.md](quickstart.md); results must record the real iOS/iPadOS and Safari versions.
