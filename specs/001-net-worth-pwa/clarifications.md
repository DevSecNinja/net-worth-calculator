# Clarification Record: Private Net Worth PWA

**Session**: 2026-09-03

**Result**: Five high-impact ambiguities were resolved autonomously from the locked product
decisions and privacy-first defaults. The decisions are integrated into
[spec.md](spec.md#clarifications).

| Area                  | Decision                             | Specification impact                                                                 |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| Vault scope           | One active vault per browser profile | Restore is a confirmed replacement; account sync and multi-vault UI are out of scope |
| Missing asset years   | Exclude and mark the year incomplete | No implicit carry-forward or fabricated historical totals                            |
| Annual liability date | December 31 balance                  | Manual values override that date and seed the next January projection                |
| Backup secret         | Current vault passphrase             | No separate backup hint or recovery secret is persisted                              |
| Concurrent tabs       | One unlocked writable tab            | A second tab remains locked until ownership is released                              |

## Coverage Summary

| Taxonomy category             | Status   | Resolution                                                                       |
| ----------------------------- | -------- | -------------------------------------------------------------------------------- |
| Functional scope and behavior | Clear    | Seven independently testable user journeys and explicit exclusions               |
| Domain and data model         | Resolved | Vault count, annual value semantics, and missing-year behavior fixed             |
| Interaction and UX flow       | Clear    | Onboarding, errors, confirmations, updates, empty states, and fallbacks defined  |
| Non-functional quality        | Clear    | Measurable privacy, performance, offline, security, and accessibility outcomes   |
| Integration and dependencies  | Clear    | No runtime external services; backup and static-hosting boundaries defined       |
| Edge cases and failures       | Clear    | Cryptography, storage, schedules, files, offline, and update failures covered    |
| Constraints and tradeoffs     | Clear    | Local-only, single-currency, one-vault, and browser capability boundaries stated |
| Terminology and consistency   | Clear    | Vault, envelope, actual, projected, and build identity are canonical             |
| Completion signals            | Clear    | Twelve measurable success criteria and acceptance scenarios are present          |
| Placeholders                  | Clear    | No unresolved clarification or template markers remain                           |

The specification quality checklist remains **16/16 passing** after clarification.
