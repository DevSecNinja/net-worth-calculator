# Implementation Plan: Private Net Worth PWA

**Branch**: `devsecninja-build-net-worth-pwa` | **Date**: 2026-09-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-net-worth-pwa/spec.md`

## Summary

Build a static, local-first React PWA in which an in-memory vault document is serialized and
encrypted with AES-256-GCM before every IndexedDB write. A passphrase-derived PBKDF2-SHA-256 key is
never persisted. Pure domain modules provide deterministic localized money parsing, exact-date
observations, amortization, exact As of snapshots, timelines, and December 31 aggregation. A typed
in-repository catalog localizes the complete accessible shell into English (US), English (UK), and
Nederlands. Vite emits a content-hashed GitHub Pages artifact, while `vite-plugin-pwa` generates a
revisioned Workbox service worker with prompt-based updates and no user-data caching.

## Technical Context

**Language/Version**: TypeScript 6.x in strict mode, ECMAScript 2023, Node.js 24 LTS

**Primary Dependencies**: React 19; React Router with `HashRouter`; Zod; idb; decimal.js; Recharts;
vite-plugin-pwa/Workbox. Exact versions are locked in `package-lock.json`.

**Storage**: IndexedDB containing one versioned encrypted vault envelope; localStorage contains only
non-sensitive theme, explicit locale override, tab lease, and cross-tab dirty-state metadata; Cache
Storage contains only generated app-shell assets.

**Testing**: Vitest, React Testing Library, user-event, fake-indexeddb, Playwright for Chromium,
Firefox, WebKit, mobile Chromium and mobile WebKit, plus axe-core browser assertions.

**Target Platform**: Current evergreen desktop and mobile Chromium, Firefox, and WebKit browsers,
served from static HTTPS hosting under `/net-worth-calculator/`.

**Project Type**: Single static web application/PWA.

**Performance Goals**: Initial production shell under 300 KiB compressed excluding lazy chart code;
initial dashboard for 100 items over 50 years within two seconds on a CI desktop profile; update
checks throttled to at most one network request per hour except initial/manual checks.

**Constraints**: No server, hosted database, analytics, telemetry, remote assets, runtime CDN,
unsafe HTML, eval, secret persistence, or financial values in logs/URLs/cache/network. Offline after
first load. One writable tab. GitHub Pages subpath. WCAG 2.2 AA intent. Locale changes are
presentation-only; canonical encrypted amounts and dates are invariant.

**Scale/Scope**: One active vault, up to 500 items, up to 301 supported years (1900-2200), and
portable encrypted backups capped at 10 MiB.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                           | Pre-research gate                                                     | Post-design evidence                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Local-First Privacy                 | PASS: no runtime service or external asset is planned                 | Network/cache contracts forbid user-data and external requests; privacy E2E is mandatory                     |
| Encrypt Every Persisted Vault       | PASS: only a versioned cipher envelope enters storage                 | Data model specifies AES-GCM envelope, PBKDF2 parameters, AAD, strict version handling, and memory-only keys |
| Deterministic Financial Correctness | PASS: domain functions are isolated from UI/storage                   | Money, amortization, yearly aggregation, and dashboard derivations have pure contracts and vectors           |
| Accessible and Resilient            | PASS: all visualizations require tables and all core flows are tested | UI/PWA contract covers focus, status, reflow, reduced motion, safe areas, offline, and updates               |
| Verification and Release Integrity  | PASS: the requested gates are first-class tasks                       | CI/release design includes strict checks, multi-browser E2E, pinned workflows, version/build identity        |

No constitution violations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-net-worth-pwa/
├── spec.md
├── clarifications.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── analysis.md
├── checklists/
│   └── requirements.md
├── contracts/
│   ├── backup-envelope.schema.json
│   ├── browser-boundaries.md
│   └── ui-pwa.md
└── tasks.md
```

### Source Code (repository root)

```text
public/
├── icons/
├── .nojekyll
├── favicon.svg
└── robots.txt
scripts/
├── generate-icons.mjs
└── verify-build.mjs
src/
├── app/
│   ├── App.tsx
│   ├── AppProviders.tsx
│   └── routes.tsx
├── components/
│   ├── charts/
│   ├── dialogs/
│   ├── forms/
│   └── ui/
├── domain/
│   ├── aggregation.ts
│   ├── amortization.ts
│   ├── currency.ts
│   ├── observations.ts
│   ├── migrations.ts
│   ├── model.ts
│   └── validation.ts
├── features/
│   ├── about/
│   ├── backup/
│   ├── dashboard/
│   ├── inventory/
│   ├── onboarding/
│   ├── settings/
│   ├── locale/
│   └── vault/
├── hooks/
├── pwa/
├── storage/
│   ├── crypto.ts
│   ├── database.ts
│   ├── files.ts
│   ├── sessionLease.ts
│   └── vaultRepository.ts
├── styles/
├── test/
├── main.tsx
└── vite-env.d.ts
tests/
├── e2e/
├── fixtures/
├── privacy/
└── pwa/
```

**Structure Decision**: A single application keeps static hosting and privacy boundaries simple.
Pure `src/domain` modules have no browser dependencies; `src/storage` owns all persistence and
cryptography; feature directories compose UI without bypassing those layers. Browser-level suites
exercise built `dist` through the same local preview server used by CI.

## Delivery Phases

### Phase 0 - Foundation and Contracts

Lock dependency versions, configure Node/Vite/TypeScript, implement shared domain types, schema
validation, encrypted repository boundaries, test utilities, and the responsive app shell.

### Phase 1 - Private Vault MVP

Deliver onboarding, vault creation/unlock/lock/change/delete, IndexedDB ciphertext-only persistence,
single-tab lease, sample data opt-in, and crypto/storage/version-compatibility tests.

### Phase 2 - Financial Inventory and Insights

Deliver asset/liability CRUD/reorder, deterministic amortization and aggregation, charts with
tables, time filters, empty/incomplete states, and all calculation/component tests.

### Phase 3 - Portability, Settings, and PWA

Deliver encrypted import/export and capability fallbacks, currency/theme/security settings,
About/privacy, manifest/icons, generated service worker, install/offline/update UI, and N-to-N+1
cache/update tests.

### Phase 3A - Locale and Exact-Date Amendment

Deliver a complete typed catalog for `en-US`, `en-GB`, and `nl-NL`; deterministic browser
negotiation and explicit override; localized money parsing/blur formatting with currency context;
the initial public dated-observation schema; exact-date liability projections; As of dashboard,
timeline, annual snapshots, source/staleness semantics, and Dutch/browser round-trip coverage.

### Phase 3B - Balance-Sheet Methodology Amendment

Document conventional net-worth semantics in localized onboarding and About content, format the
home-equity example with locale-aware currency presentation, and add an accessible dashboard link to
the methodology. Preserve the existing `property` asset and `mortgage` liability types; add no
cash-flow fields, classification toggle, persisted data, runtime dependency, or network behavior.

### Phase 4 - Repository, Release, and Deployment

Apply DevSecNinja shared configuration and pinned workflow callers, run all local and CI gates,
publish a detailed PR, squash merge after green checks, tag/release v0.1.0, enable Pages, and verify
the deployed build identity and offline shell.

## Complexity Tracking

No exceptions to the constitution or unnecessary architectural layers are introduced.
