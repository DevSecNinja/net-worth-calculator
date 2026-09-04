<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Modified principles: all template placeholders replaced by project governance
- Added sections: Product and Security Constraints; Delivery Workflow and Quality Gates
- Removed sections: none
- Follow-up TODOs: none
-->
# Net Worth Calculator Constitution

## Core Principles

### I. Local-First Privacy Is Non-Negotiable
Financial data MUST remain on the user's device. The application MUST NOT include a hosted
database, server API, analytics, telemetry, remote fonts, runtime CDN dependencies, or any
other mechanism that transmits vault contents. Logs, filenames, URLs, cache keys, build
artifacts, and diagnostics MUST NOT expose secrets or financial values. Any feature that
cannot satisfy this boundary is out of scope.

### II. Encrypt Every Persisted Vault
All vault contents and portable backups MUST be encrypted and authenticated before they are
written. Browser-native Web Crypto MUST use AES-GCM with a standards-based passphrase KDF,
unique random salts and IVs, explicit versioned parameters, and keys held only in memory.
Persisted records may contain only cipher envelopes and non-sensitive schema metadata.
Wrong-passphrase, tamper, migration, and recovery behavior MUST be explicit and tested.

### III. Deterministic Financial Correctness
Financial calculations MUST be pure, deterministic, currency-safe, and independently unit
tested. Assets, liabilities, yearly aggregation, CAGR, and monthly amortization MUST define
boundary behavior for zero rates, overpayment, payoff, invalid schedules, missing years,
and manual overrides. Projected values MUST be clearly distinguishable from user-entered
actual values, and balances MUST never project below zero.

### IV. Accessible and Resilient by Default
Every critical workflow MUST be keyboard operable, screen-reader understandable, responsive,
and designed toward WCAG 2.2 AA. Charts MUST have semantic tabular alternatives. Motion MUST
respect reduced-motion preferences, dialogs MUST manage focus, controls MUST meet touch-target
and contrast expectations, and theme changes MUST honor the live system preference. The app
shell MUST remain useful offline after a successful first load and MUST expose safe update,
installation, and offline states without risking unsaved work.

### V. Verification and Release Integrity
Behavior changes MUST be covered at the lowest effective test level and validated end to end
where browser integration matters. Formatting, lint, strict type checking, unit/integration
coverage, production build, bundle checks, multi-browser E2E, accessibility, privacy-network,
and PWA cache tests are release gates. Dependencies and reusable workflows MUST be pinned and
reviewable. Versions MUST originate from package/release metadata and releases MUST be
reproducible from conventional commits.

## Product and Security Constraints

- The product is a public React, TypeScript, and Vite static PWA deployed under
  `/net-worth-calculator/`, with a hosting-neutral `dist` artifact.
- IndexedDB is the primary store; Cache Storage MUST contain only app-shell resources and
  MUST never contain vault or user-entered data.
- Portable import/export MUST validate version, structure, size, authentication, and migration
  compatibility before overwrite, with explicit confirmation and safe fallback file flows.
- The Content Security Policy MUST forbid unsafe script execution and unexpected network
  destinations while remaining compatible with static PWA operation.
- Runtime dependencies MUST be few, actively maintained, and justified in feature research.
  Platform APIs are preferred for cryptography, storage, files, theme, and install behavior.
- The application MUST NOT use `eval`, unsafe HTML insertion, broad exception swallowing,
  silent data-loss fallbacks, or committed secrets.

## Delivery Workflow and Quality Gates

Each material feature MUST follow Spec Kit in this order: constitution, specification,
clarification, plan with research/design artifacts, tasks, cross-artifact analysis, and
implementation. Requirements and tasks MUST remain traceable and internally consistent.
Conventional commits and PR titles are required. Pull requests MUST include validation
evidence, privacy/security impact, and deployment impact.

CI MUST run on pull requests and keep required checks load-bearing. GitHub Pages deployment
MUST occur from the default branch through pinned workflows with least-privilege permissions.
Release automation, Renovate, repository metadata, community files, and shared workflows MUST
follow current DevSecNinja organization conventions without copying stale or irrelevant
configuration. A release is complete only after its tag, GitHub release, Pages workflow, and
public URL are verified.

## Governance

This constitution supersedes conflicting implementation convenience and repository habits.
Amendments require a documented rationale, an impact report, and a semantic version change:
MAJOR for incompatible principle changes, MINOR for new or materially expanded governance,
and PATCH for clarifications. Every specification, plan, task list, code review, and release
MUST check compliance. Any exception MUST be explicit in the implementation plan's complexity
tracking table and approved in review; privacy and persisted-vault encryption principles
cannot be waived.

**Version**: 1.0.0 | **Ratified**: 2026-09-03 | **Last Amended**: 2026-09-03
