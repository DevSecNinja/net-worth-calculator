# Implementation Plan: Detailed Chart Tooltips

**Branch**: `devsecninja-detailed-chart-tooltips` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-detailed-chart-tooltips/spec.md`

## Summary

Replace every default chart tooltip with a shared typed detail surface that renders canonical monetary strings, locale-aware percentages and dates, supported provenance metadata, and accessible touch/keyboard fallbacks. Extend existing chart data objects with exact values and metadata while preserving numeric geometry fields and equivalent semantic tables.

## Technical Context

**Language/Version**: TypeScript 6, React 19, Node.js 24

**Primary Dependencies**: Recharts 3, Decimal.js 10, browser internationalization APIs

**Storage**: No new persistence; unlocked vault data remains in memory and encrypted persistence is unchanged

**Testing**: Vitest, Testing Library, Playwright, axe-core

**Target Platform**: Static responsive PWA on current Chromium, Firefox, and WebKit

**Project Type**: Client-only web application

**Performance Goals**: Tooltip updates remain immediate during pointer movement without network, storage, or expensive repeated financial aggregation

**Constraints**: Offline-capable, local-only, exact display formatting from canonical strings, WCAG 2.2 AA, 320px minimum viewport, no locked-vault reset changes

**Scale/Scope**: Six chart components, one shared tooltip system, three locales, component and browser interaction coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Local-first privacy**: PASS. Tooltip state is ephemeral render state with no logging, persistence, URL, cache, analytics, or network behavior.
- **Encrypted persistence**: PASS. Vault repository, cipher envelope, and locked-vault flows are untouched.
- **Financial correctness**: PASS. Display values retain canonical strings; allocation ratios use Decimal arithmetic; numeric conversion remains limited to chart geometry.
- **Accessibility and resilience**: PASS. Existing tables remain; chart frames gain keyboard/touch selected-detail access and localized instructions; themes, reduced motion, and responsive layout are preserved.
- **Verification and release integrity**: PASS. Unit, component, cross-browser interaction, privacy, PWA, build, and full checks cover the behavior.

Post-design re-check: PASS. The contracts preserve the local-only boundary and require equivalent table/detail data from shared records.

## Project Structure

### Documentation (this feature)

```text
specs/002-detailed-chart-tooltips/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── chart-details.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── components/charts/
│   ├── ChartFrame.tsx
│   ├── tooltip.tsx
│   └── *Chart.tsx
├── domain/
│   └── currency.ts
├── features/locale/
│   └── catalog.ts
└── styles/
    └── global.css

tests/
├── e2e/
├── privacy/
└── pwa/
```

**Structure Decision**: Keep the existing single client application. Shared chart-detail composition belongs in `src/components/charts`, exact numeric formatting remains in `src/domain`, translations remain in the typed locale catalog, and browser behavior remains under `tests`.

## Complexity Tracking

No constitution violations.
