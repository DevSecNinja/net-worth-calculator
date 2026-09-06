# Implementation Plan: Fix Installed iOS Vault Creation

**Branch**: `devsecninja-fix-ios-pwa-vault-creation` | **Date**: 2026-09-06 | **Spec**:
[spec.md](spec.md)

**Input**: Feature specification from `specs/003-fix-ios-pwa-vault/spec.md`

## Summary

Make the dashboard part of the critical startup module graph so a successful encrypted-vault commit
never transitions into a deferred module fetch that an installed iOS app may be unable to satisfy.
Retain real service-worker, IndexedDB, and Web Crypto coverage in a standalone-like iPhone profile;
harden optional BroadcastChannel and random UUID use with standards-compatible alternatives; and add
scoped iPhone 14 Pro Max, iPad Pro 12.9-inch, and 4K layout/workflow projects. No persisted data,
cryptographic parameter, or update policy changes.

## Technical Context

**Language/Version**: TypeScript 6.x strict mode, ECMAScript 2022 build target, Node.js 24

**Primary Dependencies**: React 19, React Router 7 with `HashRouter`, idb 8, Recharts 3,
vite-plugin-pwa 1, existing typed locale and storage helpers

**Storage**: One versioned AES-GCM cipher envelope in IndexedDB; in-memory plaintext/key material;
non-sensitive locale/theme and short-lived lease/event coordination in localStorage; generated
app-shell-only Cache Storage

**Testing**: Vitest, React Testing Library, fake-indexeddb, Playwright Chromium/Firefox/WebKit,
service-worker-backed built-output tests, axe-core, privacy and PWA suites

**Target Platform**: Current evergreen Chromium, Firefox, and WebKit; explicit installed-like iPhone
14 Pro Max, iPad Pro 12.9-inch portrait/landscape, and 3840 by 2160 desktop profiles

**Project Type**: Single static React PWA

**Performance Goals**: Preserve the existing vault-derivation and dashboard budgets; add no network
round trip after vault commit; keep device-only browser checks scoped enough for the existing CI limit

**Constraints**: Root and `/net-worth-calculator/` hosting; local-only operation; no data-bearing logs
or requests; no cryptographic weakening; no reload or success-shaped fallback; offline app shell;
WCAG 2.2 AA interaction and reflow; no speculative future device descriptor

**Scale/Scope**: One local encrypted vault and one writable session per browser profile; focused
critical workflows across five existing browser projects plus three scoped compatibility projects

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

_GATE: PASS before research and PASS after design._

| Principle                           | Gate | Design evidence                                                                                                   |
| ----------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------- |
| Local-First Privacy                 | PASS | All diagnostics are data-free; device tests reject external requests and sensitive persistence outside IndexedDB  |
| Encrypt Every Persisted Vault       | PASS | Envelope format, PBKDF2, AES-GCM, randomness, key lifetime, and atomic IndexedDB write remain unchanged           |
| Deterministic Financial Correctness | PASS | No financial calculation changes; sample/dashboard values remain covered                                          |
| Accessible and Resilient            | PASS | Critical UI code is startup-ready; touch, keyboard, safe area, orientation, chart table, and reflow checks expand |
| Verification and Release Integrity  | PASS | Unit, build, privacy, PWA, device, browser, live deployment, and real-device manual evidence are explicit         |

No constitution violations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/003-fix-ios-pwa-vault/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── analysis.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── installed-ios-vault.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── AppErrorBoundary.tsx
│   └── routes.tsx
├── domain/
│   └── model.ts
├── features/
│   ├── dashboard/
│   ├── onboarding/
│   └── vault/
├── hooks/
│   └── useDirtyState.ts
├── storage/
│   ├── broadcastChannel.ts
│   ├── crypto.ts
│   ├── database.ts
│   ├── sessionLease.ts
│   ├── vaultEvents.ts
│   └── vaultRepository.ts
└── styles/
    └── global.css

tests/
├── device/
├── e2e/
├── privacy/
└── pwa/
```

**Structure Decision**: Keep the critical-route correction in `src/app`, reusable optional browser
coordination detection in `src/storage`, and scoped built-output compatibility scenarios in
`tests/device`. Persisted vault and financial-domain structures do not change.

## Delivery Phases

### Phase 0 - Reproduction and Platform Audit

Reproduce the boundary through a production build, real service worker, IndexedDB, and Web Crypto in
an installed-like iPhone profile. Record only exception class/message and asset path, never user data.
Audit Web Crypto, random UUID, IndexedDB transaction lifetime/cloning, BroadcastChannel,
localStorage, page lifecycle, service-worker control/update, focus/dialog, hash navigation, locale,
media queries, and persistence behavior.

### Phase 1 - Critical Transition Fix

Move the dashboard into the startup module graph so onboarding is not interactive unless the complete
post-creation view is already executable. Preserve the existing create sequence: lease, construct,
derive, encrypt, atomic compare-and-swap, then expose the unlocked state. Add narrow optional-channel
and random-identifier compatibility helpers without converting required storage failures into success.

### Phase 2 - Device and Lifecycle Evidence

Add standalone emulation and diagnostics helpers plus scoped iPhone, iPad, and 4K projects. Cover
empty/sample creation, persistence shape, lock/reload/unlock, offline launch, safe update interaction,
backup, orientations, touch/keyboard, safe-area rules, reflow, bounded 4K layout, chart tables, footer
clearance, and external-network/privacy markers.

### Phase 3 - Delivery

Run all repository quality/browser gates, rebase once on current `main`, create one signed conventional
commit, open the focused PR, address CI and review, enable auto-merge, verify the default-branch
deployment, and provide the real iPhone/iPad smoke procedure.

## Complexity Tracking

No constitution exceptions or new dependencies are introduced.
