---

description: "Implementation tasks for detailed localized chart tooltips"
---

# Tasks: Detailed Chart Tooltips

**Input**: Design documents from `/specs/002-detailed-chart-tooltips/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit, component, interaction, accessibility, privacy, PWA, and cross-browser tests are required.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: User story mapping

## Phase 1: Setup

**Purpose**: Confirm repository and feature integration state.

- [x] T001 Audit all Recharts usage, current helper patterns, and accessible tables in src/components/charts/
- [x] T002 Check active pull requests and synchronize once with current main before modifying shared locale keys

---

## Phase 2: Foundational

**Purpose**: Build shared exact formatting and detail presentation required by every chart.

- [x] T003 Add Decimal-safe allocation percentage formatting and typed chart-detail helpers in src/components/charts/tooltip.tsx
- [x] T004 Add shared localized detail labels and instructions for en-US, en-GB, and nl-NL in src/features/locale/catalog.ts
- [x] T005 Add the reusable chart-detail surface and accessible fallback contract in src/components/charts/ChartFrame.tsx
- [x] T006 Add token-based responsive tooltip and selected-detail styles in src/styles/global.css
- [x] T007 [P] Add shared tooltip formatting and content tests in src/components/charts/tooltip.test.tsx
- [x] T008 [P] Extend locale completeness and Dutch/English formatting tests in src/features/locale/catalog.test.ts and src/domain/currency.test.ts

**Checkpoint**: Shared localized and accessible detail foundation is ready.

---

## Phase 3: User Story 1 - Understand chart values at a glance (Priority: P1) MVP

**Goal**: Every chart presents meaningful exact facts for the active datum.

**Independent Test**: Hover or select representative data in each chart and verify all required chart-specific facts.

- [x] T009 [P] [US1] Add allocation detail data, exact Decimal percentages, localized categories, and equivalence tests in src/components/charts/AllocationChart.tsx and src/components/charts/AllocationChart.test.tsx
- [x] T010 [P] [US1] Add assets, liabilities, net worth, completeness, and source details to src/components/charts/TrendChart.tsx and its component tests
- [x] T011 [P] [US1] Add assets, liabilities, derived net worth, and source details to src/components/charts/BalanceChart.tsx and its component tests
- [x] T012 [P] [US1] Add signed amount and defined/unavailable percentage details to src/components/charts/AnnualChangeChart.tsx and src/components/charts/AnnualChangeChart.test.tsx
- [x] T013 [P] [US1] Add liability name, exact balance, source, and status details to src/components/charts/PayoffChart.tsx and src/components/charts/PayoffChart.test.tsx
- [x] T014 [P] [US1] Add exact date, assets, liabilities, net worth, completeness, and source details to src/components/charts/TimelineChart.tsx and its component tests
- [x] T015 [US1] Add representative donut, line, area, and bar hover interaction coverage in tests/e2e/chart-tooltips.spec.ts

**Checkpoint**: All six chart families expose precise meaningful details.

---

## Phase 4: User Story 2 - Read details in my locale and currency (Priority: P1)

**Goal**: Every detail follows the selected locale and vault currency.

**Independent Test**: Verify Dutch, US English, and UK English examples with multiple currencies and source labels.

- [x] T016 [US2] Add three-locale and representative-currency tooltip component cases in src/components/charts/tooltip.test.tsx
- [x] T017 [US2] Add browser coverage for Dutch decimal comma and US/UK date and currency formatting in tests/e2e/chart-tooltips.spec.ts

**Checkpoint**: Localized detail output is complete and type-safe.

---

## Phase 5: User Story 3 - Access equivalent details without a mouse (Priority: P2)

**Goal**: Keyboard, touch, and assistive-technology users can reach equivalent chart facts.

**Independent Test**: Use keyboard and mobile touch without hover and confirm detail access and complete tables.

- [x] T018 [US3] Wire selected-detail state and localized keyboard/touch instructions through src/components/charts/ChartFrame.tsx and all src/components/charts/*Chart.tsx files
- [x] T019 [US3] Add keyboard, accessible-table equivalence, touch selection, and no-noisy-live-region coverage in tests/e2e/chart-tooltips.spec.ts and tests/e2e/accessibility.spec.ts

**Checkpoint**: Non-pointer access is equivalent and existing tables remain intact.

---

## Phase 6: User Story 4 - Read details in any theme or viewport (Priority: P3)

**Goal**: Detail surfaces remain polished, readable, and bounded.

**Independent Test**: Exercise long names at 320px in light and dark themes without clipping or page overflow.

- [x] T020 [US4] Finalize responsive wrapping, edge positioning, contrast, shadow, and pointer-event behavior in src/styles/global.css
- [x] T021 [US4] Add dark/light and narrow-viewport overflow assertions in tests/e2e/chart-tooltips.spec.ts

**Checkpoint**: Visual presentation is robust across supported themes and viewports.

---

## Phase 7: Polish and release

**Purpose**: Complete full gates and delivery lifecycle.

- [x] T022 Run npm run check, npm run test:privacy, npm run test:pwa, and npm run test:e2e
- [x] T023 Review the final diff for locked-vault isolation, chart/table equivalence, local-only privacy, and translation completeness
- [x] T024 Create a signed Conventional Commit with the required co-author trailer and push the feature branch
- [x] T025 Open pull request `feat: add detailed chart tooltips` with validation and privacy evidence
- [x] T026 Monitor CI and review feedback, resolve valid failures or threads, and enable auto-merge
- [x] T027 Verify the merged commit, Pages deployment, and live tooltip behavior; report PR, merge, deployment, and live URLs

---

## Dependencies & Execution Order

- Setup precedes shared foundational work.
- Foundation blocks all chart stories.
- US1 chart adapters can be implemented in parallel after foundation.
- US2 depends on shared localization and US1 detail shapes.
- US3 depends on the shared surface and chart adapters.
- US4 depends on the final rendered surface.
- Release work follows all stories and full gates.

## Parallel Opportunities

- T007 and T008 can run in parallel after shared APIs are defined.
- T009 through T014 affect separate chart files and can run in parallel.
- Component-level locale cases and browser interaction preparation can proceed independently.

## Implementation Strategy

Deliver the shared exact-detail foundation first, complete all six chart adapters as the MVP, then add locale, non-pointer, and responsive browser guarantees before the release lifecycle.
