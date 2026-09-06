# Quickstart: Validate Detailed Chart Tooltips

## Prerequisites

- Node.js 24 and npm 11
- Dependencies installed with `npm ci`
- Playwright browsers available for the repository test setup

## Automated validation

```powershell
npm run check
npm run test:privacy
npm run test:pwa
npm run test:e2e
```

Expected: formatting, lint, type checking, unit/component coverage, production build, build verification, privacy, offline/PWA, and Chromium/Firefox/WebKit browser suites all pass.

## Manual scenarios

1. Create the sample vault and hover each donut, line, area, and bar datum. Confirm the facts in [the UI contract](./contracts/chart-details.md).
2. Switch among `en-US`, `en-GB`, and `nl-NL`; confirm date, currency, percentage, labels, and unavailable text.
3. Use a keyboard to focus the chart details/table controls and read equivalent values without relying on hover.
4. Use a touch viewport to tap representative data and confirm details remain readable.
5. Repeat in light and dark themes at 320px width with a long asset or liability name; confirm no page overflow or clipped tooltip.
6. Inspect network activity while interacting with every chart; confirm no tooltip-related requests occur.
