# Feature Specification: Detailed Chart Tooltips

**Feature Branch**: `devsecninja-detailed-chart-tooltips`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Add rich localized hover, focus, and touch details to every current chart while preserving accessible data-table alternatives, financial precision, privacy, and responsive presentation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand chart values at a glance (Priority: P1)

As a user reviewing my finances, I can point to, focus, or select a chart datum and see a compact explanation of what it represents, including the relevant date, localized financial values, and derived context.

**Why this priority**: Charts are otherwise difficult to interpret precisely, especially when multiple series or proportions are displayed.

**Independent Test**: Open each chart with representative data and interact with a datum to confirm that its meaning and exact values are available without consulting another screen.

**Acceptance Scenarios**:

1. **Given** an allocation chart with multiple categories, **When** a user hovers or selects a segment, **Then** the category, exact value, percentage of the displayed total, and relevant observation date are shown.
2. **Given** a trend, timeline, balance, or comparison chart, **When** a user interacts with a point or period, **Then** the date or year and every supported financial series are shown, including net worth when present or derivable.
3. **Given** annual change or payoff data, **When** a user interacts with a datum, **Then** signed changes, remaining balances, and supported status or source details are shown without inventing unavailable information.

---

### User Story 2 - Read details in my locale and currency (Priority: P1)

As a user, I see chart details formatted in my selected language, regional conventions, and vault currency so the information is immediately understandable and trustworthy.

**Why this priority**: Incorrect language, separators, dates, percentages, or currency symbols can make financial information ambiguous.

**Independent Test**: Switch among each supported locale and representative currencies, then confirm chart labels, dates, percentages, unavailable states, and monetary values follow the selected settings.

**Acceptance Scenarios**:

1. **Given** any supported chart and locale, **When** details are displayed, **Then** all labels and statuses use the selected language with no hardcoded fallback language.
2. **Given** Dutch locale data, **When** a percentage or amount is displayed, **Then** Dutch decimal and currency conventions are used.
3. **Given** United States or United Kingdom locale data, **When** dates and monetary values are displayed, **Then** their respective regional conventions are used.

---

### User Story 3 - Access equivalent details without a mouse (Priority: P2)

As a keyboard, touch, or assistive-technology user, I can access the same chart facts as a pointer user without losing the existing tabular alternative.

**Why this priority**: Hover-only interactions exclude users and devices that cannot hover.

**Independent Test**: Use keyboard-only and touch interactions at desktop and narrow viewports, and confirm equivalent information remains available through selection, focus, or the chart's accessible table.

**Acceptance Scenarios**:

1. **Given** a keyboard-only user, **When** they navigate a chart region and its associated data, **Then** meaningful chart instructions and equivalent values are available without requiring pointer hover.
2. **Given** a touch device, **When** a user taps a supported chart datum, **Then** its details remain visible long enough to be read or an explicit selected-details fallback is available.
3. **Given** any chart, **When** interactive details are unavailable, **Then** the existing equivalent accessible table remains present and usable.

---

### User Story 4 - Read details in any theme or viewport (Priority: P3)

As a user, I can read chart details in light or dark mode and on narrow screens without clipped, overflowing, or obscured content.

**Why this priority**: Detailed content is only useful when it remains legible and does not interfere with chart interaction.

**Independent Test**: Exercise representative chart details in both themes and at desktop and mobile widths, including long category and liability names.

**Acceptance Scenarios**:

1. **Given** light or dark mode, **When** chart details appear, **Then** the surface, border, shadow, labels, and values have readable contrast.
2. **Given** a narrow viewport or long label, **When** chart details appear near an edge, **Then** content wraps and remains within the visible chart or viewport.
3. **Given** visible chart details, **When** the pointer moves across the chart, **Then** the details surface does not block further chart interaction.

### Edge Cases

- A legitimate zero amount or zero percentage is displayed as zero rather than unavailable.
- Undefined annual percentage changes are explicitly labeled unavailable rather than displayed as zero.
- Allocation percentages use the same displayed slices and total as the chart and its accessible table, including very large precise amounts and rounding boundaries.
- Missing source, completeness, staleness, net-worth, or date metadata is omitted rather than inferred.
- Long translated labels and liability names wrap without covering inaccessible content or escaping the viewport.
- Empty charts preserve their existing empty-state and accessible behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every current financial visualization MUST provide consistent contextual details for its displayed data.
- **FR-002**: Allocation details MUST include the localized category label, exact locale-and-currency-formatted value, percentage of the displayed allocation total, and observation date when available.
- **FR-003**: Allocation percentage calculations MUST use the same category values and displayed total as the chart and accessible table, without introducing avoidable financial rounding errors.
- **FR-004**: Trend and exact-date timeline details MUST include the date or year plus assets, liabilities, net worth, and source, completeness, or staleness only where the chart data supports those fields.
- **FR-005**: Balance and comparison details MUST include the date or year, assets, liabilities, and net worth when present or derivable from those displayed values.
- **FR-006**: Annual-change details MUST include the date or year, signed currency change, and percentage change when defined; unavailable percentage change MUST be explicitly distinguished from a legitimate zero.
- **FR-007**: Liability-payoff details MUST include the liability name, date or year, remaining balance, and any available actual, manual, carried, or projected status.
- **FR-008**: All detail labels, status text, dates, percentages, and monetary values MUST follow the selected `en-US`, `en-GB`, or `nl-NL` locale and the vault base currency.
- **FR-009**: Detail surfaces MUST use the application's visual language, remain readable in light and dark themes, support compact label/value scanning, wrap long content, and remain visible at chart, card, and viewport edges.
- **FR-010**: Detail surfaces MUST NOT capture pointer input or interfere with continued chart interaction.
- **FR-011**: Pointer users MUST receive details through hover, and touch users MUST receive details through tap where supported or through a persistent selected-details alternative.
- **FR-012**: Keyboard and assistive-technology users MUST receive clear chart guidance and equivalent data through focusable interaction, selected details, or the existing semantic data table without noisy announcements.
- **FR-013**: Existing equivalent accessible chart tables MUST remain available and synchronized with chart values and labels.
- **FR-014**: Chart-detail data MUST remain local render state and MUST NOT be transmitted, logged, persisted, placed in URLs, or inserted as unsafe markup.
- **FR-015**: Missing optional chart information MUST be omitted or explicitly marked unavailable as appropriate; the system MUST NOT invent values or statuses.
- **FR-016**: Automated coverage MUST exercise every chart detail shape, supported locales, representative currencies, precision and rounding boundaries, zero and unavailable values, long names, source labels, pointer, keyboard, touch, themes, narrow viewports, accessible-table equivalence, privacy, and offline behavior.

### Key Entities

- **Chart datum**: One displayed category, point, period, or liability observation and its canonical financial values.
- **Chart detail**: The localized label/value facts shown for a selected chart datum, including only supported contextual metadata.
- **Allocation slice**: A displayed asset category with a value and its ratio of the displayed allocation total.
- **Observation metadata**: Optional date, source, completeness, staleness, or projection status attached to a chart datum.
- **Accessible chart table**: The semantic tabular representation that remains equivalent to the chart's displayed data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can obtain an exact meaningful value from 100% of the six current chart families using pointer interaction.
- **SC-002**: Users can obtain equivalent chart facts for 100% of the six chart families using keyboard, touch, or the persistent accessible alternative.
- **SC-003**: In all three supported locales, all tested chart labels, dates, percentages, unavailable states, and currency values follow the selected locale and vault currency.
- **SC-004**: Allocation category values represented in chart details and accessible tables reconcile exactly to the displayed allocation total, with displayed percentages using sensible locale-aware precision.
- **SC-005**: Representative detail surfaces remain fully readable with no viewport overflow or clipping in light and dark themes at widths from 320 pixels through desktop sizes.
- **SC-006**: No chart-detail interaction creates network requests, persistent user-data records, user-data URLs, logs, or unsafe markup.
- **SC-007**: All existing release-quality accessibility, privacy, offline, and cross-browser behavior remains successful.

## Assumptions

- Existing chart families, data definitions, accessible tables, locale selection, and vault base currency remain authoritative.
- Net worth may be derived only when the chart already supplies the corresponding asset and liability values for the same datum.
- Pointer details are transient; touch-selected details may persist until another datum is selected or focus leaves the relevant chart region.
- Existing locked-vault reset behavior is outside this feature and will not be modified.
- Integration will preserve translation additions from any concurrently merged cleanup work.
