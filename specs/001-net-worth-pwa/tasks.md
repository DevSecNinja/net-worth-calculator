# Tasks: Private Net Worth PWA

**Input**: Design documents from `specs/001-net-worth-pwa/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`,
`quickstart.md`

**Tests**: Test-first tasks are mandatory because the specification explicitly requires unit,
integration, accessibility, privacy, PWA, compatibility, and multi-browser evidence.

**Organization**: Tasks are grouped by user story so each increment can be validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets separate files and has no unfinished dependency.
- **[Story]**: Maps to the numbered user story in `spec.md`.
- Requirement IDs in parentheses provide analysis traceability.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the locked toolchain, static application, and release metadata.

- [x] T001 Create exact pinned React/Vite runtime and development manifests in `package.json` and
      `package-lock.json`
- [x] T002 [P] Configure Node 24, repository ignores, formatting, and editor defaults in
      `.mise.toml`, `.gitignore`, `.prettierignore`, and `.prettierrc.json`
- [x] T003 [P] Configure strict TypeScript and Vite aliases in `tsconfig.json`, `tsconfig.app.json`,
      and `tsconfig.node.json`
- [x] T004 Configure GitHub Pages base, build identity injection, PWA generateSW, Workbox cleanup,
      and bundle chunking in `vite.config.ts` (FR-025-FR-030)
- [x] T005 [P] Configure ESLint, Vitest coverage, DOM test setup, and Playwright projects in
      `eslint.config.js`, `vitest.config.ts`, `playwright.config.ts`, and `src/test/setup.ts`
- [x] T006 [P] Create CSP-safe document metadata and no-flash theme bootstrap in `index.html` and
      `public/theme-init.js` (FR-020, FR-032, FR-037)
- [x] T007 [P] Create local icon source/generator and public static files in
      `scripts/generate-icons.mjs`, `public/favicon.svg`, `public/icons/`, `public/robots.txt`, and
      `public/.nojekyll` (FR-037)
- [x] T008 Create the accessible responsive application entry and shared design tokens in
      `src/main.tsx`, `src/app/App.tsx`, `src/styles/global.css`, and `src/vite-env.d.ts`

**Checkpoint**: `npm run build` emits a base-aware static shell with injected package version and
commit identity.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement trusted types, calculations, persistence boundaries, and application state
used by every story.

**CRITICAL**: No user story work starts until these modules and tests are in place.

- [x] T009 [P] Define canonical vault, asset, liability, settings, envelope, and derived types plus
      exact Zod schemas in `src/domain/model.ts` and `src/domain/validation.ts` (FR-007-FR-013)
- [x] T010 [P] Write failing money parsing/rounding/formatting tests in
      `src/domain/currency.test.ts` (FR-013, FR-019)
- [x] T011 Implement deterministic decimal money helpers and locale-aware formatting in
      `src/domain/currency.ts` (FR-013, FR-019)
- [x] T012 [P] Write failing schema/version-compatibility and import-boundary tests in
      `src/domain/migrations.test.ts` (FR-022)
- [x] T013 Implement strict current-format vault/backup parsing and unsupported-format rejection in `src/domain/migrations.ts`
      (FR-022)
- [x] T014 [P] Write failing AES-GCM/PBKDF2 round-trip, wrong-passphrase, IV, AAD, and tamper tests
      in `src/storage/crypto.test.ts` (FR-003-FR-005)
- [x] T015 Implement versioned Web Crypto envelope derivation/encryption/decryption in
      `src/storage/crypto.ts` (FR-003-FR-005)
- [x] T016 [P] Implement the fixed-key IndexedDB adapter and ciphertext-only inspection helpers in
      `src/storage/database.ts` (FR-003, FR-026)
- [x] T017 Implement atomic revision-checked encrypted vault repository operations in
      `src/storage/vaultRepository.ts` (FR-002-FR-005, FR-035)
- [x] T018 [P] Implement expiring single-writer lease and cross-tab notifications in
      `src/storage/sessionLease.ts` (FR-035)
- [x] T019 [P] Create deterministic empty/sample vault fixtures with explicit opt-in semantics in
      `src/domain/fixtures.ts` and `tests/fixtures/vault.ts` (FR-006)
- [x] T020 Compose router, global dirty-state registry, error boundary, status live region, and
      vault provider contracts in `src/app/AppProviders.tsx`, `src/app/routes.tsx`,
      `src/hooks/useDirtyState.ts`, and `src/components/ui/AppStatus.tsx` (FR-028, FR-032, FR-036)

**Checkpoint**: Pure and storage tests prove that only authenticated ciphertext crosses the
persistence boundary.

---

## Phase 3: User Story 1 - Create and Unlock a Private Vault (Priority: P1) MVP

**Goal**: Deliver onboarding and the complete secure vault lifecycle.

**Independent Test**: Create, populate, lock, reload, reject a wrong passphrase, unlock, change the
passphrase, lose/reacquire the tab lease, and delete the vault without plaintext persistence.

### Tests for User Story 1

- [x] T021 [P] [US1] Write vault repository lifecycle, interrupted-write, revision-conflict, and
      lease tests in `src/storage/vaultRepository.test.ts` and `src/storage/sessionLease.test.ts`
      (FR-002-FR-005, FR-035)
- [x] T022 [P] [US1] Write onboarding, unlock error, sample opt-in, change-passphrase, lock, and
      typed-delete component tests in `src/features/vault/VaultFlows.test.tsx` (FR-001-FR-006)

### Implementation for User Story 1

- [x] T023 [US1] Implement in-memory vault session state and lifecycle actions in
      `src/features/vault/VaultProvider.tsx` and `src/features/vault/useVault.ts` (FR-002-FR-005)
- [x] T024 [P] [US1] Implement passphrase validation and accessible reusable secret fields in
      `src/features/vault/passphrase.ts` and `src/components/forms/PassphraseFields.tsx`
      (FR-001-FR-005)
- [x] T025 [US1] Implement privacy onboarding, vault creation, and explicit sample-data action in
      `src/features/onboarding/OnboardingPage.tsx` (FR-001, FR-006)
- [x] T026 [US1] Implement unlock, wrong-passphrase, lease-conflict, and manual-lock UI in
      `src/features/vault/UnlockPage.tsx` and `src/features/vault/LockButton.tsx` (FR-002-FR-005,
      FR-035)
- [x] T027 [US1] Implement change-passphrase and typed vault-deletion dialogs in
      `src/features/vault/VaultSecurityDialogs.tsx` (FR-002, FR-032, FR-036)

**Checkpoint**: User Story 1 is a deployable encrypted-vault MVP.

---

## Phase 4: User Story 2 - Track Assets and Liabilities by Year (Priority: P1)

**Goal**: Deliver validated inventory CRUD, reorder, yearly actuals, and liability projections.

**Independent Test**: Create, edit, reorder, and delete every item class; validate non-contiguous
years and all amortization edge cases; lock/unlock and confirm encrypted persistence.

### Tests for User Story 2

- [x] T028 [P] [US2] Write monthly amortization vectors for zero rate, non-amortizing, overpayment,
      payoff, future start, term, and manual overrides in `src/domain/amortization.test.ts`
      (FR-011-FR-012)
- [x] T029 [P] [US2] Write asset/liability validation, reorder, and CRUD reducer tests in
      `src/features/inventory/inventory.test.ts` (FR-007-FR-013)
- [x] T030 [P] [US2] Write accessible asset and liability form/list component tests in
      `src/features/inventory/InventoryPage.test.tsx` (FR-007-FR-013, FR-032-FR-033)

### Implementation for User Story 2

- [x] T031 [US2] Implement deterministic monthly liability projection and status output in
      `src/domain/amortization.ts` (FR-011-FR-012)
- [x] T032 [P] [US2] Implement item mutation/reorder commands and encrypted commit integration in
      `src/features/inventory/inventory.ts` (FR-007, FR-035)
- [x] T033 [P] [US2] Implement reusable year-value editor and validation error summary in
      `src/components/forms/YearValuesEditor.tsx` and `src/components/forms/ErrorSummary.tsx`
      (FR-010, FR-032-FR-033)
- [x] T034 [US2] Implement asset list/editor with classifications and built-in/custom types in
      `src/features/inventory/AssetsPanel.tsx` and `src/features/inventory/AssetDialog.tsx`
      (FR-007-FR-010)
- [x] T035 [US2] Implement liability list/editor with schedule status and manual balances in
      `src/features/inventory/LiabilitiesPanel.tsx` and `src/features/inventory/LiabilityDialog.tsx`
      (FR-007, FR-009-FR-012)
- [x] T036 [US2] Compose inventory navigation, empty states, and accessible move actions in
      `src/features/inventory/InventoryPage.tsx` (FR-007, FR-018, FR-032)

**Checkpoint**: User Story 2 independently tracks all required financial items and projections.

---

## Phase 5: User Story 3 - Understand Net Worth Across Years (Priority: P1)

**Goal**: Deliver deterministic multi-year insights, visual charts, equivalent tables, and filters.

**Independent Test**: Load a fixed five-year dataset and compare every metric, status, series,
range, empty state, and table cell to expected values.

### Tests for User Story 3

- [x] T037 [P] [US3] Write aggregation, completeness, yearly change, CAGR, allocation, and filter
      vectors in `src/domain/aggregation.test.ts` (FR-014-FR-018)
- [x] T038 [P] [US3] Write chart-series/table equivalence and empty-state component tests in
      `src/features/dashboard/DashboardPage.test.tsx` (FR-015-FR-018, FR-033)

### Implementation for User Story 3

- [x] T039 [US3] Implement pure yearly snapshots, range filtering, change, CAGR, allocation, payoff,
      and source derivation in `src/domain/aggregation.ts` (FR-014-FR-018)
- [x] T040 [P] [US3] Implement headline metrics, range controls, and completeness summaries in
      `src/features/dashboard/DashboardSummary.tsx` and `src/features/dashboard/RangeFilter.tsx`
      (FR-014, FR-017-FR-018)
- [x] T041 [P] [US3] Implement accessible reusable chart/table frame and trend/change charts in
      `src/components/charts/ChartFrame.tsx`, `src/components/charts/TrendChart.tsx`, and
      `src/components/charts/AnnualChangeChart.tsx` (FR-015-FR-016)
- [x] T042 [P] [US3] Implement asset allocation, asset/liability comparison, and payoff charts with
      tables in `src/components/charts/AllocationChart.tsx`,
      `src/components/charts/BalanceChart.tsx`, and `src/components/charts/PayoffChart.tsx`
      (FR-015-FR-016)
- [x] T043 [US3] Compose lazy dashboard routes, loading behavior, and actionable empty states in
      `src/features/dashboard/DashboardPage.tsx` (FR-014-FR-018)

**Checkpoint**: User Story 3 independently turns a fixed vault into verified insights.

---

## Phase 6: User Story 4 - Export and Restore an Encrypted Backup (Priority: P2)

**Goal**: Deliver authenticated portable backup with native and fallback file flows.

**Independent Test**: Export and inspect a marker vault, exercise both file capability paths, and
prove every failed/cancelled import preserves the current ciphertext.

### Tests for User Story 4

- [x] T044 [P] [US4] Write backup schema, size, tamper, wrong-passphrase, version-compatibility, and
      atomic-overwrite tests in `src/features/backup/backup.test.ts` (FR-021-FR-024)
- [x] T045 [P] [US4] Write native file API and download/input fallback component tests in
      `src/features/backup/BackupPage.test.tsx` (FR-023)

### Implementation for User Story 4

- [x] T046 [US4] Implement versioned backup validation, export, decrypt/migrate, and
      validate-before-commit pipeline in `src/features/backup/backup.ts` (FR-021-FR-024)
- [x] T047 [P] [US4] Implement capability-checked native open/save and fallback download/input
      adapters in `src/storage/files.ts` (FR-023-FR-024)
- [x] T048 [US4] Implement backup guidance, progress/errors, generic filename, and typed overwrite
      confirmation in `src/features/backup/BackupPage.tsx` (FR-021-FR-024, FR-032)

**Checkpoint**: User Story 4 provides safe recovery without a server or plaintext export.

---

## Phase 7: User Story 5 - Personalize Currency, Theme, and Security (Priority: P2)

**Goal**: Deliver locale-aware currency, live no-flash theme, settings, and privacy/build details.

**Independent Test**: Change theme/system preference/currency, reload while locked, verify no flash,
and complete security and About flows.

### Tests for User Story 5

- [x] T049 [P] [US5] Write theme persistence, live system change, locked-load, and bootstrap tests
      in `src/features/settings/theme.test.tsx` (FR-020)
- [x] T050 [P] [US5] Write settings currency confirmation, About privacy, and build identity tests
      in `src/features/settings/SettingsPage.test.tsx` and `src/features/about/AboutPage.test.tsx`
      (FR-019-FR-020, FR-030)

### Implementation for User Story 5

- [x] T051 [US5] Implement theme preference/effective mode provider and system listener in
      `src/features/settings/ThemeProvider.tsx` (FR-020)
- [x] T052 [US5] Implement currency/theme controls and reinterpretation confirmation in
      `src/features/settings/SettingsPage.tsx` (FR-019-FR-020)
- [x] T053 [P] [US5] Implement About/privacy/threat-model/build identity view and shared footer in
      `src/features/about/AboutPage.tsx` and `src/components/ui/AppFooter.tsx` (FR-030-FR-031)

**Checkpoint**: User Story 5 is usable before and after unlocking without sensitive preference
leaks.

---

## Phase 8: User Story 6 - Install, Use Offline, and Update Safely (Priority: P2)

**Goal**: Deliver the generated app shell, install/offline states, and explicit safe updates.

**Independent Test**: Perform real origin outage and two-build update tests across required desktop
and mobile engines, including deep links/query strings and dirty state.

### Tests for User Story 6

- [x] T054 [P] [US6] Write manifest, icon dimensions/safe-zone, CSP, generated SW, precache, and
      bundle assertions in `scripts/verify-build.mjs` and `tests/pwa/build.spec.ts` (FR-025-FR-030,
      FR-037)
- [x] T055 [P] [US6] Write offline/install/update status component tests in
      `src/pwa/PwaStatus.test.tsx` (FR-027-FR-029)
- [x] T056 [P] [US6] Write real outage/deep-link/query/base-path and Cache Storage E2E in
      `tests/pwa/offline.spec.ts` (FR-025-FR-026)
- [x] T057 [P] [US6] Write N-to-N+1 explicit update/dirty-state/build-ID/old-precache E2E in
      `tests/pwa/update.spec.ts` (FR-027-FR-030)

### Implementation for User Story 6

- [x] T058 [US6] Implement prompt-mode service-worker registration and throttled lifecycle update
      checks in `src/pwa/usePwaUpdate.ts` (FR-027-FR-028)
- [x] T059 [P] [US6] Implement capability-based install prompt lifecycle in
      `src/pwa/useInstallPrompt.ts` (FR-029)
- [x] T060 [US6] Implement accessible offline-ready, offline, install, and update UI with
      dirty-state confirmation in `src/pwa/PwaStatus.tsx` (FR-027-FR-029, FR-032)

**Checkpoint**: User Story 6 proves offline and update behavior against built output, not mocks
alone.

---

## Phase 9: User Story 7 - Use Every Core Flow Accessibly (Priority: P2)

**Goal**: Verify and close keyboard, screen-reader, touch, zoom, motion, and compatibility gaps.

**Independent Test**: Run every core flow with keyboard and axe across desktop and mobile projects
at 200% zoom, reduced motion, and missing browser capabilities.

### Tests for User Story 7

- [x] T061 [P] [US7] Write Playwright core workflow and browser-capability fallback suites in
      `tests/e2e/core-workflows.spec.ts` and `tests/e2e/fallbacks.spec.ts` (FR-032-FR-034)
- [x] T062 [P] [US7] Write runtime axe, keyboard/focus, 200% zoom/reflow, reduced-motion, safe-area,
      and live-region tests in `tests/e2e/accessibility.spec.ts` (FR-032-FR-033)
- [x] T063 [P] [US7] Write mandatory marker-based network/storage/cache/log/service-worker privacy
      audit in `tests/privacy/privacy.spec.ts` (FR-003, FR-026, FR-031)

### Implementation for User Story 7

- [x] T064 [US7] Implement accessible dialog, button, field, skip-link, visually-hidden, and
      live-region primitives in `src/components/ui/Dialog.tsx`, `src/components/ui/Button.tsx`,
      `src/components/forms/Field.tsx`, and `src/components/ui/VisuallyHidden.tsx` (FR-032-FR-033)
- [x] T065 [US7] Apply responsive reflow, focus, touch, contrast, safe-area, chart, and
      reduced-motion fixes across `src/styles/global.css` and feature components (FR-032-FR-034)

**Checkpoint**: All critical workflows satisfy the documented accessibility and compatibility
contract in representative engines and viewports.

---

## Phase 10: Polish and Cross-Cutting Release Work

**Purpose**: Document, secure, automate, validate, release, and deploy the complete product.

- [x] T066 [P] Write product setup, privacy model, features, browser support, commands, PWA updates,
      encrypted backup caveats, deployment URL, and Cloudflare migration in `README.md`
- [x] T067 [P] Write architecture and privacy/security threat model documentation in
      `docs/architecture.md` and `docs/privacy-security.md`
- [x] T068 [P] Add MIT-aligned contribution, code of conduct, security, changelog, and app privacy
      documents in `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, and
      `PRIVACY.md`
- [x] T069 [P] Add adapted issue/PR templates, CODEOWNERS, app labels, and concise coding guidance
      in `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md`, `.github/CODEOWNERS`,
      `.github/labels-base.yaml`, and `.github/copilot-instructions.md`
- [x] T070 Configure PR-only local CI for format, lint, strict types, coverage, build, bundle,
      privacy, PWA, and multi-browser E2E in `.github/workflows/ci.yml`
- [x] T071 [P] Add full-SHA-pinned DevSecNinja v2.5.0 lint, Pages, config-sync, release-please, and
      tag-release callers in `.github/workflows/` with least-privilege permissions
- [x] T072 [P] Add synchronized central baseline/config-sync selection and Renovate policy in
      `.github/config-sync.yml`, `.github/.config-sync-ignore`, and `renovate.json5`
- [x] T073 [P] Add package release metadata, release-please manifest/config, and git-cliff
      configuration in `release-please-config.json`, `.release-please-manifest.json`, and
      `cliff.toml`
- [x] T074 Run and fix `npm run format:check`, `npm run lint`, `npm run typecheck`,
      `npm run test:coverage`, `npm run build`, `npm run test:build`, and all Playwright projects
      from `quickstart.md`
- [x] T075 Update `specs/001-net-worth-pwa/tasks.md` to completed state and run a Spec Kit
      convergence pass against all requirements and artifacts
- [x] T076 Commit with conventional history, push the branch, open a detailed PR with evidence, and
      obtain green required checks for `DevSecNinja/net-worth-calculator`
- [x] T077 Configure repository security/features/metadata and GitHub Pages for
      `DevSecNinja/net-worth-calculator` through the GitHub API, then squash-merge the PR when
      policy permits
- [x] T078 Create and verify tag/release `v0.1.0`, trigger Pages deployment, and verify
      `https://devsecninja.github.io/net-worth-calculator/` build identity and offline shell

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup** has no dependency.
- **Foundational** depends on Setup and blocks all user stories.
- **US1** depends on Foundational and provides the unlocked vault used by later UI stories.
- **US2** depends on Foundational and integrates with US1 persistence.
- **US3** depends on US2 domain data but is independently testable with fixtures.
- **US4** depends on US1 repository/crypto boundaries.
- **US5** depends on the app shell; theme/About are testable while locked.
- **US6** depends on a production build and global dirty-state contract.
- **US7** spans completed critical flows and therefore follows US1-US6.
- **Polish/release** depends on all selected stories and all checks passing.

### User Story Dependency Graph

```text
Setup -> Foundation -> US1 -> US4
                    -> US2 -> US3
                    -> US5
                    -> US6
US1 + US2 + US3 + US4 + US5 + US6 -> US7 -> Release
```

### Parallel Opportunities

- T002, T003, T005, T006, and T007 target independent setup files after T001.
- Pure domain test files T010, T012, and T014 can be authored in parallel.
- Within each story, `[P]` test and leaf-component tasks can proceed after their shared model.
- Documentation, templates, and release configuration T066-T073 can proceed in parallel after
  behavior and workflow names stabilize.

## Parallel Example: User Story 2

```text
Task T028: Author amortization test vectors.
Task T029: Author inventory command tests.
Task T030: Author accessible inventory component tests.

After T031:
Task T032: Implement commands/reorder.
Task T033: Implement year editor/error summary.
```

## Implementation Strategy

1. Complete Setup and Foundational gates.
2. Deliver US1 as the encrypted-vault MVP and validate it independently.
3. Deliver US2 then US3 for the complete primary financial workflow.
4. Add US4-US6 as independently testable portability, preference, and PWA slices.
5. Run US7 across all flows.
6. Complete repository/release tasks only after local gates pass.

## Notes

- Every task follows the required checkbox, sequential ID, optional parallel marker, story label,
  and concrete file-path format.
- Tests precede their corresponding implementation wherever behavior can be isolated.
- No task may weaken or skip a failing gate to obtain a green build.

---

## Phase 11: Locale and Observation Foundation Amendment

**Purpose**: Establish shared typed localization, localized numeric input, and the initial public
dated-observation vault/backup schemas before the amended user stories.

- [x] T079 [P] Add typed `en-US`, `en-GB`, and `nl-NL` catalogs with key-completeness tests in `src/features/locale/catalog.ts` and `src/features/locale/catalog.test.ts` (FR-038)
- [x] T080 [P] Implement ordered browser locale negotiation, explicit localStorage override, document-language synchronization, and tests in `src/features/locale/LocaleProvider.tsx` and `src/features/locale/LocaleProvider.test.tsx` (FR-039-FR-040)
- [x] T081 [P] Implement strict localized decimal/group parsing and blur formatting with en-US/en-GB/nl-NL/JPY tests in `src/domain/localizedMoney.ts` and `src/domain/localizedMoney.test.ts` (FR-041-FR-043)
- [x] T082 Replace year values with exact-date observations and bump vault/backup schemas in `src/domain/model.ts` and `src/domain/validation.ts` (FR-044, FR-049)
- [x] T083 Write current dated vault/backup round-trip and unsupported-format rejection tests in `src/domain/migrations.test.ts` and `src/features/backup/backup.test.ts` (FR-049)
- [x] T084 Implement initial dated schema and backup-format validation in `src/domain/migrations.ts`, `src/storage/crypto.ts`, `src/features/backup/backup.ts`, and `specs/001-net-worth-pwa/contracts/backup-envelope.schema.json` (FR-049)

**Checkpoint**: Locale and schema foundations are independently unit-tested and current encrypted
vaults/backups round-trip without data loss.

---

## Phase 12: User Story 8 - Use the Complete Product in My Language (Priority: P1)

**Goal**: Deliver complete accessible localization and locale-safe currency input.

**Independent Test**: Launch with each browser language, switch all three languages while locked and
unlocked, enter equivalent localized amounts including JPY, and verify canonical values do not change.

- [x] T085 [P] [US8] Add a reusable currency-aware localized amount field with visible/screen-reader context in `src/components/forms/MoneyField.tsx` and `src/components/forms/MoneyField.test.tsx` (FR-041, FR-042, FR-043)
- [x] T086 [US8] Replace financial amount inputs with `MoneyField` in `src/features/inventory/AssetDialog.tsx`, `src/features/inventory/LiabilityDialog.tsx`, and `src/components/forms/YearValuesEditor.tsx` (FR-041-FR-043)
- [x] T087 [US8] Wire locale selection into settings and application providers in `src/features/settings/SettingsPage.tsx` and `src/app/AppProviders.tsx` (FR-038-FR-040)
- [x] T088 [US8] Translate navigation, vault, onboarding, inventory, dashboard, backup, settings, About, PWA, dialogs, errors, charts, and tables across `src/app/`, `src/components/`, `src/features/`, and `src/pwa/` (FR-038)
- [x] T089 [P] [US8] Add Dutch workflow, locale persistence, `<html lang>`, visible asset currency, and value-invariance Playwright coverage in `tests/e2e/localization.spec.ts` (SC-013, SC-014, SC-015)

**Checkpoint**: Every core workflow is complete in three languages and financial input remains
canonical and currency-invariant.

---

## Phase 13: User Story 9 - Track and Forecast Exact Observation Dates (Priority: P1)

**Goal**: Deliver exact-date observations, As of snapshots, timeline, staleness, and dated liability
forecasts while retaining December 31 annual reporting.

**Independent Test**: Record same-year July/December observations, change As of across them, verify
no future leakage, compare asset carry-forward and liability amortization, and match chart/table data.

- [x] T090 [P] [US9] Implement sorted unique dated-observation helpers, source/staleness semantics, and tests in `src/domain/observations.ts` and `src/domain/observations.test.ts` (FR-044-FR-046)
- [x] T091 [P] [US9] Refactor liability amortization to exact target dates and latest eligible manual seeds with month-end/leap-day tests in `src/domain/amortization.ts` and `src/domain/amortization.test.ts` (FR-047)
- [x] T092 [US9] Refactor exact As of snapshots, December 31 annual snapshots, and timeline derivation with no-future-leakage/July-forecast tests in `src/domain/aggregation.ts` and `src/domain/aggregation.test.ts` (FR-045-FR-048)
- [x] T093 [US9] Replace year editors with exact-date observation editors in `src/components/forms/YearValuesEditor.tsx`, `src/features/inventory/AssetDialog.tsx`, and `src/features/inventory/LiabilityDialog.tsx` (FR-044)
- [x] T094 [US9] Add As of selection, source date, staleness, carry-forward/projected labels, exact timeline, and annual-mode controls in `src/features/dashboard/DashboardPage.tsx`, `src/features/dashboard/DashboardSummary.tsx`, and `src/features/dashboard/RangeFilter.tsx` (FR-045-FR-048)
- [x] T095 [P] [US9] Update chart/table contracts for exact dates and source equivalence in `src/components/charts/ChartFrame.tsx`, `src/components/charts/TrendChart.tsx`, `src/components/charts/BalanceChart.tsx`, `src/components/charts/AllocationChart.tsx`, `src/components/charts/PayoffChart.tsx`, and `src/components/charts/AnnualChangeChart.tsx` (FR-046-FR-048)
- [x] T096 [P] [US9] Add exact-date inventory/dashboard/round-trip browser coverage in `tests/e2e/dated-observations.spec.ts` and `tests/privacy/privacy.spec.ts` (SC-016, SC-017, SC-018)

**Checkpoint**: Exact-date and annual views derive from one deterministic engine and expose equal
chart/table values with source semantics.

---

## Phase 14: Amendment Polish and Release Revalidation

- [x] T097 Update locale, dated-value, version-compatibility, backup, and threat-model documentation in `README.md`, `PRIVACY.md`, `docs/architecture.md`, and `docs/privacy-security.md`
- [x] T098 Re-run and fix format, lint, strict typecheck, coverage, production build, build verification, privacy/PWA suites, and all five Playwright projects
- [x] T099 Re-run Spec Kit analysis and convergence for FR-038-FR-049 and SC-013-SC-018 in `specs/001-net-worth-pwa/analysis.md` and `specs/001-net-worth-pwa/tasks.md`
- [x] T100 Commit and push the amended release candidate, then complete PR/merge/security configuration for `DevSecNinja/net-worth-calculator`
- [x] T101 Create and verify v0.1.0 release and the deployed GitHub Pages locale/date behavior at `https://devsecninja.github.io/net-worth-calculator/`

---

## Phase 15: Convergence

- [x] T102 Add a deterministic production-browser performance gate for a representative encrypted vault with 100 items across 50 years, measuring unlock through initial dashboard readiness within two seconds on a CI desktop profile in `tests/performance/dashboard.spec.ts` per SC-005 (missing)

---

## Phase 16: Realistic Localized Sample Portfolio

- [x] T103 Expand the explicit sample action into a bounded, schema-valid five-asset/three-liability household history with four prior year-ends, a prior mid-year date, today's date, carry-forward, and projections in `src/domain/fixtures.ts` and `src/domain/fixtures.test.ts` (FR-006, SC-019)
- [x] T104 Localize sample names at creation, preserve them across later language changes, and prove the populated annual/timeline/allocation/payoff experience in `src/features/onboarding/OnboardingPage.tsx`, `src/features/vault/VaultProvider.tsx`, `src/features/vault/VaultFlows.test.tsx`, and `tests/e2e/localization.spec.ts` (FR-006, SC-019)
