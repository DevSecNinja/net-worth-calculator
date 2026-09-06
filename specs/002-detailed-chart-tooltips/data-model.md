# Data Model: Detailed Chart Tooltips

## Chart detail

| Field | Type | Rules |
|-------|------|-------|
| `title` | localized string | Date, year, category, or liability name; never empty |
| `rows` | ordered list of detail rows | Includes only facts supported by the source datum |

## Detail row

| Field | Type | Rules |
|-------|------|-------|
| `label` | localized string | Drawn from the typed message catalog |
| `value` | localized string | Exact money, percentage, date, status, or unavailable label |
| `tone` | optional semantic tone | Positive or negative only when meaningful |

## Allocation datum

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Localized built-in asset type or user-entered custom type |
| `valueExact` | canonical money string | Same value used by the table |
| `numericValue` | number | Geometry only |
| `percentage` | canonical percentage string | Decimal(value / displayed total * 100) |
| `date` | ISO date | Formatted only at presentation |

## Snapshot datum

| Field | Type | Rules |
|-------|------|-------|
| `date` or `year` | ISO date or integer | Matches the chart axis |
| `assetsExact` | canonical money string | Present when supported |
| `liabilitiesExact` | canonical money string | Present when supported |
| `netWorthExact` | canonical signed-money string | Supplied or derived from the same datum |
| `completeness` | complete/incomplete | Localized when present |
| `assetSource` | actual/carried/mixed/unavailable | Localized when present |
| `liabilitySource` | actual/projected/mixed | Localized when present |

## Annual change datum

| Field | Type | Rules |
|-------|------|-------|
| `year` | integer | Matches the chart axis |
| `changeExact` | canonical signed-money string or undefined | Zero remains defined |
| `percentExact` | canonical percentage string or undefined | Undefined is localized as unavailable/not defined |

## Payoff datum and series metadata

| Field | Type | Rules |
|-------|------|-------|
| `year` | integer | Matches the chart axis |
| liability exact value | canonical money string or null | Null remains an explicit chart gap |
| liability source | actual/projected or null | From the matching projection |
| liability status | actual/projected/paid-off/non-amortizing/invalid or null | From the matching projection |
| liability name | string | User-entered display name from series metadata |

## Relationships and invariants

- Charts, details, and tables consume the same normalized datum records or their canonical source records.
- Display formatters never derive exact money from numeric geometry values.
- Optional metadata is omitted unless present; undefined annual percentage is labeled explicitly.
- No detail state crosses the component boundary into persistence, URLs, logs, caches, or network calls.
