# Clarification Record: Private Net Worth PWA

**Session**: 2026-09-03

**Result**: Five high-impact ambiguities were resolved autonomously from the locked product
decisions and privacy-first defaults. The decisions are integrated into
[spec.md](spec.md#clarifications).

| Area                       | Decision                                                               | Specification impact                                                                 |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Vault scope                | One active vault per browser profile                                   | Restore is a confirmed replacement; account sync and multi-vault UI are out of scope |
| Missing asset observations | Exclude before the first eligible observation; carry forward afterward | Exact snapshots expose source date and staleness without fabricating growth          |
| Annual liability date      | December 31 derived balance                                            | Project from the latest eligible exact-date manual balance or schedule baseline      |
| Backup secret              | Current vault passphrase                                               | No separate backup hint or recovery secret is persisted                              |
| Concurrent tabs            | One unlocked writable tab                                              | A second tab remains locked until ownership is released                              |

## Coverage Summary

| Taxonomy category             | Status   | Resolution                                                                            |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------- |
| Functional scope and behavior | Clear    | Seven independently testable user journeys and explicit exclusions                    |
| Domain and data model         | Resolved | Vault count, exact-date value semantics, and unavailable/carry-forward behavior fixed |
| Interaction and UX flow       | Clear    | Onboarding, errors, confirmations, updates, empty states, and fallbacks defined       |
| Non-functional quality        | Clear    | Measurable privacy, performance, offline, security, and accessibility outcomes        |
| Integration and dependencies  | Clear    | No runtime external services; backup and static-hosting boundaries defined            |
| Edge cases and failures       | Clear    | Cryptography, storage, schedules, files, offline, and update failures covered         |
| Constraints and tradeoffs     | Clear    | Local-only, single-currency, one-vault, and browser capability boundaries stated      |
| Terminology and consistency   | Clear    | Vault, envelope, actual, projected, and build identity are canonical                  |
| Completion signals            | Clear    | Twelve measurable success criteria and acceptance scenarios are present               |
| Placeholders                  | Clear    | No unresolved clarification or template markers remain                                |

The specification quality checklist remains **16/16 passing** after clarification.

## Amendment Session: 2026-09-04

The release scope was expanded with five locked, implementation-changing decisions:

| Area                      | Decision                                                                                       | Specification impact                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Supported locales         | `en-US`, `en-GB`, and `nl-NL` with complete typed catalogs                                     | Every user-visible and accessibility string is localized                  |
| Locale negotiation        | Ordered browser languages, with Dutch and UK-English specialization and `en-US` fallback       | Initial locale is deterministic without a remote lookup                   |
| Localized money input     | Locale-specific decimal/group separators, safe space paste variants, canonical decimal storage | Parsing cannot silently change magnitude                                  |
| Observation identity      | Exact ISO date, unique per item, multiple observations per year                                | Year-only values are replaced by dated observations                       |
| As-of calculations        | Latest eligible observation, no future leakage, asset carry-forward, liability amortization    | Exact timeline and December 31 annual views share source/status semantics |
| Pre-release compatibility | No database conversion; current dated schema is the first production format                    | Unsupported prototypes fail safely instead of adding migration complexity |
| Canonical money           | Store locale-neutral decimal strings such as `"100000"`                                        | Locale affects parsing/display only, never encrypted financial meaning    |

No clarification questions remain. Functional scope, data identity, migration behavior, localization,
accessibility, privacy, edge cases, and measurable completion signals are fully specified. The
requirements checklist remains **16/16 passing**.
