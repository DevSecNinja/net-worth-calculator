---
description: "Implementation tasks for installed iOS vault creation and primary-device coverage"
---

# Tasks: Fix Installed iOS Vault Creation

**Input**: Design documents from `specs/003-fix-ios-pwa-vault/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Browser and unit regressions are required because the defect occurs only across the built
module, service-worker, persistence, and render boundaries.

**Organization**: Tasks are grouped by user story so the root fix and each compatibility outcome
remain independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story from `spec.md`
- Every task names the file that contains its evidence

## Phase 1: Setup and Reproduction

**Purpose**: Establish the production failure and exact non-sensitive evidence before implementation.

- [x] T001 Record healthy live/local standalone-like WebKit results and the deterministic deferred-module failure in `specs/003-fix-ios-pwa-vault/research.md`
- [x] T002 Add reusable standalone emulation and safe browser diagnostics helpers in `tests/helpers/standalone.ts`
- [x] T003 Configure scoped `iphone-14-pro-max`, `ipad-pro-12-9`, and `desktop-4k` projects without expanding existing suites in `playwright.config.ts`

---

## Phase 2: Foundational Compatibility Guards

**Purpose**: Make optional platform APIs safe before exercising the user stories.

**CRITICAL**: Complete this phase before device workflows so test failures identify required
capabilities rather than optional coordination APIs.

- [x] T004 [P] Add a cryptographic RFC 4122 identifier fallback and boundary tests in `src/domain/model.ts` and `src/domain/model.test.ts`
- [x] T005 [P] Add narrowly classified optional BroadcastChannel construction and unit tests in `src/storage/broadcastChannel.ts` and `src/storage/broadcastChannel.test.ts`
- [x] T006 Reuse the random identifier and channel helpers in `src/storage/sessionLease.ts`, `src/storage/vaultEvents.ts`, and `src/hooks/useDirtyState.ts`
- [x] T007 Add the localized pre-submit capability gate and extend fallback coverage in `src/storage/capabilities.ts`, `src/features/onboarding/OnboardingPage.tsx`, and related unit/component tests

**Checkpoint**: Missing or restricted optional APIs use existing safe local alternatives; unexpected
errors and required storage failures remain visible.

---

## Phase 3: User Story 1 - Create a Vault in the Installed iPhone App (Priority: P1)

**Goal**: Empty and sample vault creation render the dashboard after an atomic encrypted commit even
when no post-startup JavaScript module can be fetched.

**Independent Test**: In a fresh standalone-like iPhone context, load the production app shell,
remove cached JavaScript after startup, go offline, create a vault, and verify the expected dashboard,
encrypted envelope shape, lease, and absence of the fatal boundary.

### Tests for User Story 1

- [x] T008 [US1] Add a failing missing-deferred-module reproduction with real service worker, IndexedDB, and Web Crypto in `tests/device/iphone-installed.spec.ts`
- [x] T009 [P] [US1] Add fresh empty and sample creation scenarios with fatal-boundary diagnostics in `tests/device/iphone-installed.spec.ts`

### Implementation for User Story 1

- [x] T010 [US1] Move the first unlocked dashboard into the critical startup module graph in `src/app/routes.tsx`
- [x] T011 [US1] Verify vault creation still awaits lease ownership and the atomic encrypted write before unlocked render in `src/features/vault/VaultProvider.test.tsx`
- [x] T012 [US1] Assert production output has no deferred dashboard transition and keeps bundle limits meaningful in `tests/pwa/build.spec.ts` and `scripts/verify-build.mjs`

**Checkpoint**: Vault creation no longer has a post-commit asset dependency and both creation choices
are independently covered.

---

## Phase 4: User Story 2 - Survive Standalone, Offline, and Update Lifecycles (Priority: P1)

**Goal**: A created vault survives lock, reload, standalone relaunch, offline use, and safe update.

**Independent Test**: Create and lock a sample vault, reload under service-worker control, launch
offline, unlock the same data, and run the explicit N-to-N+1 update in the iPhone profile.

### Tests for User Story 2

- [x] T013 [US2] Add lock, reload, unlock, and real offline standalone launch coverage in `tests/device/iphone-installed.spec.ts`
- [x] T014 [US2] Run the existing explicit update scenario in the iPhone project and allocate its isolated server port in `tests/pwa/update.spec.ts`
- [x] T015 [P] [US2] Assert standalone root/hash navigation and pagehide lease release in `tests/device/iphone-installed.spec.ts`

### Implementation for User Story 2

- [x] T016 [US2] Correct heartbeat cleanup exposed by lifecycle review in `src/storage/sessionLease.ts`
- [x] T017 [US2] Verify prompt-mode service-worker activation and encrypted storage remain correct in `src/pwa/usePwaUpdate.ts`

**Checkpoint**: Relaunch, offline, and update behavior preserve the encrypted envelope and return to a
valid locked or unlocked state.

---

## Phase 5: User Story 3 - Use Primary Device Classes Without Reflow Failures (Priority: P2)

**Goal**: Primary iPhone, iPad, and 4K layouts keep controls, status, charts, and tables usable.

**Independent Test**: Run the three device projects through their scoped specs in portrait,
landscape, and reflow-equivalent viewports with overflow, target-size, footer, and width assertions.

### Tests for User Story 3

- [x] T018 [P] [US3] Add iPhone portrait, landscape, touch, safe-area, footer, and reflow checks in `tests/device/iphone-layout.spec.ts`
- [x] T019 [P] [US3] Add iPad Pro 12.9 portrait/landscape sample, backup, chart-table, and touch checks in `tests/device/ipad-pro.spec.ts`
- [x] T020 [P] [US3] Add 3840 by 2160 bounded-layout, chart readability, data-table, keyboard, and 200%-reflow-equivalent checks in `tests/device/desktop-4k.spec.ts`

### Implementation for User Story 3

- [x] T021 [US3] Confirm existing responsive constraints satisfy the new device assertions in `src/styles/global.css`

**Checkpoint**: Every primary device project passes without page overflow, overlap, clipped controls,
or giant stretched dashboard content.

---

## Phase 6: User Story 4 - Diagnose Failures Without Exposing Financial Data (Priority: P2)

**Goal**: Automated failures provide safe categories while user-facing failure behavior remains
localized and non-sensitive.

**Independent Test**: Inject a classified failure and unique markers, then prove the fatal screen and
test output exclude passphrases, values, ciphertext, and stack traces.

### Tests for User Story 4

- [x] T022 [P] [US4] Add iPhone/iPad same-origin network, Cache Storage, localStorage, URL, and console marker assertions in `tests/device/iphone-installed.spec.ts` and `tests/device/ipad-pro.spec.ts`
- [x] T023 [P] [US4] Add a component-level non-sensitive error-boundary contract in `src/app/App.test.tsx`

### Implementation for User Story 4

- [x] T024 [US4] Verify the existing localized fatal guidance remains non-sensitive in `src/app/AppErrorBoundary.tsx` and `src/features/locale/catalog.ts`
- [x] T025 [US4] Document diagnostic exclusions and physical-device limitations in `docs/privacy-security.md`

**Checkpoint**: Maintainer evidence identifies the failed platform boundary without disclosing user
or encrypted data.

---

## Phase 7: Polish, Documentation, and Delivery

**Purpose**: Complete traceability, release gates, and deployment evidence across all stories.

- [x] T026 [P] Update explicit browser/device support and standalone emulation boundaries in `README.md`
- [x] T027 [P] Update critical module, platform fallback, and installed lifecycle design in `docs/architecture.md`
- [x] T028 [P] Add exact iPhone/iPad versioned manual smoke steps and expected results in `specs/003-fix-ios-pwa-vault/quickstart.md`
- [x] T029 Mark implemented requirements and evidence in `specs/003-fix-ios-pwa-vault/analysis.md` and `specs/003-fix-ios-pwa-vault/tasks.md`
- [x] T030 Run `npm run check`, `npm run test:privacy`, `npm run test:pwa`, and `npm run test:e2e` from `package.json`
- [ ] T031 Rebase once on current `origin/main`, create the signed conventional commit, and open `fix: support vault creation in installed iOS PWA`
- [ ] T032 Monitor and repair PR CI/review, enable auto-merge, and verify default-branch Pages deployment plus live browser smoke
- [ ] T033 Report the PR, merge, deployment, automated evidence, emulation limit, and exact real-device owner checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup and Reproduction (Phase 1)**: No dependency.
- **Foundational Compatibility Guards (Phase 2)**: Uses the audited platform paths from Phase 1.
- **User Story 1 (Phase 3)**: Depends on the deterministic reproduction and project configuration.
- **User Story 2 (Phase 4)**: Depends on User Story 1 because lifecycle validation must begin with a
  successful vault.
- **User Story 3 (Phase 5)**: Depends only on the scoped project configuration and may run alongside
  User Stories 1 and 2 after Phase 2.
- **User Story 4 (Phase 6)**: Depends on the safe diagnostics helper and may run alongside User Story
  3 after Phase 2.
- **Polish and Delivery (Phase 7)**: Depends on all desired user stories.

### Parallel Opportunities

- T004 and T005 affect separate compatibility helpers and tests.
- T009 can be authored while T008 establishes the failing cache-dependency scenario.
- T018, T019, and T020 are independent device specifications.
- T022, T023, T026, T027, and T028 touch separate test or documentation files.

## Parallel Example: User Story 3

```text
Task: "Add iPhone layout coverage in tests/device/iphone-layout.spec.ts"
Task: "Add iPad coverage in tests/device/ipad-pro.spec.ts"
Task: "Add 4K coverage in tests/device/desktop-4k.spec.ts"
```

## Implementation Strategy

### MVP First

1. Complete reproduction and compatibility foundations.
2. Add the failing post-startup module-unavailability regression.
3. Make the dashboard critical at startup.
4. Prove empty and sample creation on the installed-like iPhone profile.

### Incremental Delivery

1. Add lifecycle and update evidence after creation is safe.
2. Add scoped iPad and 4K compatibility coverage without multiplying the full matrix.
3. Confirm privacy and diagnostic boundaries.
4. Run all release gates, rebase once, and deliver one focused bugfix PR.

## Notes

- Tests that simulate missing cached code must retain the real generated service worker and delete only
  app-shell JavaScript after the current page has loaded.
- Never log or snapshot passphrases, financial markers, IndexedDB values, or ciphertext.
- Keep fixes surgical: platform hardening may fall back only for optional APIs and known availability
  errors.
- Literal Add to Home Screen and physical iOS eviction remain manual checks and must not be described
  as CI coverage.
