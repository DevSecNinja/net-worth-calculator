# Research: Detailed Chart Tooltips

## Decision: Shared custom content with chart-specific row builders

Use one typed tooltip surface and small chart-specific adapters that produce a title and ordered label/value rows.

**Rationale**: Visual behavior, localization, wrapping, and exact-value handling stay consistent while each chart exposes only metadata its datum actually supports.

**Alternatives considered**: Repeated formatter callbacks were rejected because they cannot consistently express multiple labeled facts, provenance, or responsive presentation. One universal untyped payload parser was rejected because the six chart data shapes differ and missing metadata could be misrepresented.

## Decision: Canonical strings for display, numbers only for geometry

Retain canonical monetary and percentage strings on chart data objects. Use Decimal arithmetic for allocation totals and ratios, then locale-aware formatting for display. Convert to numbers only for chart coordinates.

**Rationale**: This preserves deterministic financial display for large values and rounding boundaries while satisfying the chart library's numeric coordinate requirements.

**Alternatives considered**: Computing display values from chart numbers was rejected because binary floating-point can alter user-visible financial values.

## Decision: Pointer visualization plus explicit accessible selected details

Keep charts non-semantic and expose pointer/touch tooltip behavior in the visual. Add a focusable localized chart-details control and selected-detail region where interaction requires a non-hover fallback; preserve the expandable semantic table as the complete source of truth.

**Rationale**: SVG chart internals do not provide a stable cross-browser keyboard contract. The existing table is reliable for all assistive technologies, while a focused control and persistent selected detail supply concise context without noisy live announcements.

**Alternatives considered**: Making generated SVG shapes individually tabbable was rejected due to inconsistent chart-library rendering and excessive keyboard stops. Removing `aria-hidden` from the raw chart was rejected because generated SVG semantics are incomplete.

## Decision: Constrain the tooltip at both chart and viewport boundaries

Allow the chart library to escape the chart view box while styling the content with a viewport-relative maximum width, wrapping, tokenized surface colors, border, and shadow. Disable pointer events on the wrapper and content.

**Rationale**: The surface remains readable near card edges and on narrow screens without blocking subsequent pointer movement.

**Alternatives considered**: Portaling tooltips to the document was rejected as unnecessary complexity for current chart cards.

## Decision: Test pure content and representative browser interactions

Unit-test percentage precision and typed tooltip rows, component-test every chart shape and table equivalence, and add Playwright coverage for desktop hover, touch selection/fallback, keyboard/table access, themes, locales, and narrow viewports.

**Rationale**: Pure tests give precise boundary coverage while real browsers verify chart-library interaction and layout behavior.

**Alternatives considered**: Screenshot-only tests were rejected because they are brittle and do not prove exact localized content or semantic equivalence.
