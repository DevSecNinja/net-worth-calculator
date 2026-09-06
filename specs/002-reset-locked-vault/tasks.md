# Tasks: Reset a Locked Local Vault

**Input**: Design documents from `/specs/002-reset-locked-vault/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup

**Purpose**: Establish traceable feature documentation and focused test surfaces.

- [x] T001 Finalize specification and design artifacts in specs/002-reset-locked-vault/
- [x] T002 [P] Identify existing destructive dialog, repository CAS, lease, locale, and privacy test patterns in src/ and tests/

---

## Phase 2: Foundational

**Purpose**: Add the storage and cross-tab primitives needed by every user story.

- [x] T003 [P] Add data-free vault deletion event publishing/subscription in src/storage/vaultEvents.ts
- [x] T004 [P] Add event privacy and delivery tests in src/storage/vaultEvents.test.ts
- [x] T005 Add typed exact-envelope locked deletion in src/storage/vaultRepository.ts
- [x] T006 Add delete-without-decrypt, stale-envelope, absent-envelope, and second-delete tests in src/storage/vaultRepository.test.ts

**Checkpoint**: Exact ciphertext deletion and local notification are independently testable.

---

## Phase 3: User Story 1 - Start Over After Losing the Passphrase (Priority: P1)

**Goal**: Delete an unrecoverable locked local vault and create a new vault without reloading.

**Independent Test**: Create and lock a vault, confirm deletion without a passphrase, reach
onboarding, and create a replacement vault in the same page session.

- [x] T007 [US1] Add provider capture/cancel/delete methods and success state cleanup in src/features/vault/VaultProvider.tsx
- [x] T008 [US1] Implement the typed-confirmation reset dialog in src/features/vault/LockedVaultResetDialog.tsx
- [x] T009 [US1] Add the secondary forgotten-passphrase action on src/features/vault/UnlockPage.tsx
- [x] T010 [US1] Add locked reset, cancellation, wrong confirmation, onboarding, and immediate recreation component tests in src/features/vault/VaultFlows.test.tsx
- [x] T011 [US1] Add the complete browser restart journey in tests/e2e/core-workflows.spec.ts

**Checkpoint**: The primary lost-passphrase reset journey works without a passphrase or reload.

---

## Phase 4: User Story 2 - Understand Data-Loss and Recovery Boundaries (Priority: P1)

**Goal**: Present a complete accessible and localized irreversible-action warning.

**Independent Test**: Inspect and operate the dialog in en-US, en-GB, and nl-NL with keyboard,
screen-reader assertions, mobile width, and 200% zoom.

- [x] T012 [P] [US2] Add complete en-US, en-GB, and nl-NL reset catalog entries in src/features/locale/catalog.ts
- [x] T013 [US2] Render the required recovery, backup, browser-profile, and other-device warnings in src/features/vault/LockedVaultResetDialog.tsx
- [x] T014 [P] [US2] Add typed catalog completeness and Dutch no-fallback assertions in src/features/locale/catalog.test.ts
- [x] T015 [US2] Add dialog focus, Escape, cancel, warning, touch target, mobile, and high-zoom assertions in src/features/vault/VaultFlows.test.tsx and tests/e2e/accessibility.spec.ts

**Checkpoint**: Every user receives the complete warning in their selected supported language.

---

## Phase 5: User Story 3 - Preserve Concurrent and Replacement Vaults (Priority: P1)

**Goal**: Refuse active-writer deletion, preserve replacement vaults, and synchronize locked tabs.

**Independent Test**: Hold a writable lease in another tab, replace an envelope after confirmation,
and successfully delete while another locked tab observes onboarding.

- [x] T016 [US3] Acquire and release the existing short-lived writable lease around locked deletion in src/features/vault/VaultProvider.tsx
- [x] T017 [US3] Re-read IndexedDB on deletion events and transition only locked absent-vault tabs in src/features/vault/VaultProvider.tsx
- [x] T018 [P] [US3] Add active-lease, lease cleanup, conflict, preference preservation, and event transition tests in src/features/vault/VaultProvider.test.tsx
- [x] T019 [US3] Add active second-tab refusal and locked-tab notification coverage in tests/e2e/core-workflows.spec.ts

**Checkpoint**: Concurrent writers and stale confirmations cannot cause unintended data loss.

---

## Phase 6: Polish and Cross-Cutting Concerns

**Purpose**: Complete security documentation, privacy evidence, and delivery.

- [x] T020 [P] Document reset recovery limits and browser-profile erase threat in README.md, PRIVACY.md, SECURITY.md, and docs/privacy-security.md
- [x] T021 [P] Document reset state, CAS, lease, and event flow in docs/architecture.md
- [x] T022 Add no-network, no-marker-log, and app-shell-cache privacy assertions in tests/privacy/privacy.spec.ts
- [x] T023 Run npm run check, npm run test:privacy, npm run test:pwa, and npm run test:e2e
- [x] T024 Complete cross-artifact analysis in specs/002-reset-locked-vault/analysis.md and mark implemented tasks
- [ ] T025 Commit with a signed Conventional Commit and required co-author trailer
- [ ] T026 Open PR `feat: allow resetting a locked vault` with privacy, data-loss, concurrency, and validation evidence
- [ ] T027 Monitor CI and review, resolve valid findings, enable auto-merge, and verify deployment and localized live flow

## Dependencies & Execution Order

- Phase 1 precedes foundational implementation.
- T003-T006 establish the delete/event contract required by all user stories.
- User Story 1 provides the vertical reset flow.
- User Story 2 can localize and test the dialog in parallel after T008.
- User Story 3 builds on provider methods from T007 and event primitives from T003.
- Documentation and privacy tests can proceed in parallel once behavior is stable.
- Delivery requires every preceding task and gate to pass.

## Parallel Opportunities

- T002 can run while feature artifacts are finalized.
- T003/T004 and T005/T006 are separate event and repository workstreams.
- T012/T014 can run independently of provider concurrency work.
- T020/T021 can run in parallel with browser/privacy tests.

## Implementation Strategy

The MVP is User Story 1 backed by the foundational exact-envelope transaction. User Stories 2 and 3
are release-blocking because this feature is destructive: incomplete warning or concurrency handling
would make the MVP unsafe to ship.
