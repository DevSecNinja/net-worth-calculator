# Implementation Plan: Reset a Locked Local Vault

**Branch**: `devsecninja-reset-locked-vault` | **Date**: 2026-09-05 | **Spec**:
[spec.md](spec.md)

**Input**: Feature specification from `specs/002-reset-locked-vault/spec.md`

## Summary

Add a deliberate reset path to the locked screen. Capture the exact encrypted envelope when the
confirmation opens, acquire the existing exclusive writable-session lease on submit, and perform
the existing transactional compare-and-delete without deriving a key. Publish a data-free local
deletion event so other locked tabs re-check storage. Keep theme, locale, app-shell caches, and
downloaded backups untouched. Reuse the native accessible dialog and typed catalog across all three
supported locales.

## Technical Context

**Language/Version**: TypeScript 6.x strict mode, ECMAScript 2023, Node.js 24

**Primary Dependencies**: React 19, React Router 7 with `HashRouter`, idb 8, existing typed locale
catalog and native dialog component

**Storage**: One versioned AES-GCM cipher envelope in IndexedDB; non-sensitive locale/theme and
short-lived lease/event coordination in localStorage; app-shell-only Cache Storage

**Testing**: Vitest, React Testing Library, user-event, fake-indexeddb, Playwright across configured
desktop/mobile browsers, axe-core, privacy and PWA suites

**Target Platform**: Current evergreen desktop and mobile Chromium, Firefox, and WebKit under the
static `/net-worth-calculator/` base path

**Project Type**: Single static React PWA

**Performance Goals**: Dialog opens from local storage state without perceptible delay; successful
deletion reaches onboarding in the same interaction; no network work is added

**Constraints**: No decrypt operation or passphrase; exact-envelope transactional deletion only;
single writable owner; no user data in coordination messages; no broad storage/cache clearing; full
en-US, en-GB, and nl-NL localization; offline and WCAG 2.2 AA behavior preserved

**Scale/Scope**: One active vault per browser profile and any number of open tabs coordinated by the
existing short lease

## Constitution Check

_GATE: PASS before research and PASS after design._

| Principle                           | Gate | Design evidence                                                                                                        |
| ----------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- |
| Local-First Privacy                 | PASS | Reset reads and deletes only local ciphertext; contract forbids network and data-bearing events                        |
| Encrypt Every Persisted Vault       | PASS | No plaintext or key is created; exact opaque envelope is the compare-and-delete token                                  |
| Deterministic Financial Correctness | PASS | No financial model or calculation changes                                                                              |
| Accessible and Resilient            | PASS | Existing modal focus behavior is reused; typed confirmation, keyboard, reflow, zoom, and localized warnings are tested |
| Verification and Release Integrity  | PASS | Storage, provider, component, E2E, privacy, PWA, coverage, build, and CI gates are explicit                            |

No constitution violations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-reset-locked-vault/
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
│   └── locked-vault-reset.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── components/ui/Dialog.tsx
├── features/
│   ├── locale/catalog.ts
│   └── vault/
│       ├── UnlockPage.tsx
│       ├── VaultProvider.tsx
│       └── LockedVaultResetDialog.tsx
├── storage/
│   ├── database.ts
│   ├── sessionLease.ts
│   ├── vaultEvents.ts
│   └── vaultRepository.ts
└── styles/
tests/
├── e2e/
└── privacy/
```

**Structure Decision**: Keep persistence and local event coordination in `src/storage`, workflow
state in `src/features/vault`, and presentation in a focused reset dialog. No domain or deployment
surface changes are required.

## Delivery Phases

### Phase 0 - Safety Contract

Document the reset threat model, exact-envelope authorization token, exclusive lease sequence,
cross-tab event semantics, localized UX, and explicitly rejected broad site-data deletion.

### Phase 1 - Storage and Session Coordination

Expose a locked-delete repository operation that accepts the previously captured envelope, maps
transaction conflicts to a reset-specific error, and emits a content-free deletion notification
only after commit. Reuse the existing lease for exclusive ownership.

### Phase 2 - Accessible Localized Workflow

Add the secondary locked-screen action and focused confirmation dialog. The provider owns the
captured envelope, deletion lease, transient errors, state transition, and cross-tab subscription.

### Phase 3 - Evidence and Delivery

Cover storage, concurrency, stale replacement, idempotency, preferences, event propagation,
localization, keyboard/dialog behavior, E2E restart, privacy, and PWA regression. Update recovery
documentation, open the focused PR, resolve valid review, merge, and verify deployment.

## Complexity Tracking

No constitution exceptions or new external dependencies are introduced.
