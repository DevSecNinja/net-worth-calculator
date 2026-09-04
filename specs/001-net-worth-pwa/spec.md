# Feature Specification: Private Net Worth PWA

**Feature Branch**: `devsecninja-build-net-worth-pwa`

**Created**: 2026-09-03

**Status**: Clarified

**Input**: Build and publicly deploy a polished, local-first net worth calculator that keeps
financial data encrypted on the user's device, works offline, supports multi-year planning and
insights, and provides encrypted portable backups.

## Clarifications

### Session 2026-09-03

- Q: Does the initial release support more than one vault in a browser profile? -> A: No; one active
  vault per profile, and a restore replaces it only after explicit confirmation.
- Q: How are missing asset years treated in historical totals? -> A: They are excluded and the year
  is marked incomplete; asset values are never carried forward implicitly.
- Q: What date do annual liability values represent? -> A: Manual and projected annual balances
  represent December 31; each manual value overrides that date and seeds projection from January 1.
- Q: Which passphrase protects a portable backup? -> A: The current vault passphrase; export reuses
  the authenticated vault envelope and never stores a plaintext passphrase or hint.
- Q: How are concurrent browser tabs handled? -> A: Only one tab may hold an unlocked writable
  vault; another tab stays locked and can take over only after the first releases its session.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create and Unlock a Private Vault (Priority: P1)

A privacy-conscious user creates a vault protected by a passphrase, optionally adds sample data only
after explicit consent, locks it, and later unlocks the same encrypted vault.

**Why this priority**: A secure local vault is the trust boundary and the smallest viable product.

**Independent Test**: Create a vault, add a uniquely identifiable value, reload and verify the app
is locked, unlock with the correct passphrase, reject a wrong passphrase, then delete the vault.

**Acceptance Scenarios**:

1. **Given** no vault exists, **When** the user submits a valid matching passphrase, **Then** an
   empty encrypted vault is created without transmitting data.
2. **Given** a vault exists after reopening, **When** the correct passphrase is entered, **Then**
   the vault unlocks and its data becomes available only in memory.
3. **Given** a vault exists, **When** an incorrect passphrase is entered, **Then** the app shows a
   non-destructive error and reveals no vault details.
4. **Given** an unlocked vault, **When** the user locks it or the session ends, **Then** decrypted
   data and derived keys are discarded.
5. **Given** an unlocked vault, **When** the user changes the passphrase, **Then** the complete
   vault is re-encrypted and the old passphrase no longer works.

---

### User Story 2 - Track Assets and Liabilities by Year (Priority: P1)

A user creates, edits, deletes, and reorders assets and liabilities, records actual yearly values,
and sees deterministic annual liability projections when actual balances are unavailable.

**Why this priority**: Accurate financial inventory and yearly values deliver the product's core
utility once the vault exists.

**Independent Test**: In a fresh unlocked vault, add several built-in and custom items, edit their
fields and yearly values, reorder them, verify projections and validation, then delete them.

**Acceptance Scenarios**:

1. **Given** an unlocked vault, **When** the user adds an asset with a classification, type, name,
   notes, and yearly values, **Then** all values persist encrypted and can be edited or removed.
2. **Given** an unlocked vault, **When** the user adds a liability with principal, interest,
   payment, and optional schedule fields, **Then** annual projected balances are calculated monthly
   and never fall below zero.
3. **Given** a projected liability year, **When** the user records a manual balance, **Then** the
   manual value is visibly identified as actual and takes precedence for that year.
4. **Given** multiple items, **When** the user changes their order, **Then** the order is stable
   after locking and unlocking.
5. **Given** invalid numeric, date, or amortization inputs, **When** the user submits the form,
   **Then** submission is blocked with focused, actionable field and summary errors.

---

### User Story 3 - Understand Net Worth Across Years (Priority: P1)

A user reviews total assets, liabilities, net worth, yearly change, compound growth, allocation,
annual changes, and payoff projections across configurable time ranges.

**Why this priority**: Insights turn the inventory into decisions and complete the primary value
proposition.

**Independent Test**: Load a fixed dataset spanning at least five years and compare every headline,
chart series, filter result, and accessible table cell with independently calculated expectations.

**Acceptance Scenarios**:

1. **Given** values across multiple years, **When** the dashboard opens, **Then** headline totals,
   yearly change, and compound annual growth are shown only where mathematically defined.
2. **Given** dashboard data, **When** the user changes the time range, **Then** trend, comparison,
   allocation, payoff, change charts, and their tables use the same filtered data.
3. **Given** missing asset values or projected liability values, **When** insights are shown,
   **Then** completeness and actual/projected status are clear and no value is silently invented.
4. **Given** no data for a view, **When** the dashboard renders, **Then** it shows a useful empty
   state with a direct next action instead of misleading zero-filled charts.

---

### User Story 4 - Export and Restore an Encrypted Backup (Priority: P2)

A user saves an encrypted, versioned backup with a non-sensitive filename and safely restores it on
the same or another supported browser.

**Why this priority**: Local-only storage requires a user-controlled recovery and portability path.

**Independent Test**: Export a known vault, inspect that neither filename nor bytes contain known
financial strings, import with correct and wrong passphrases, detect tampering, and confirm that a
failed import never alters the current vault.

**Acceptance Scenarios**:

1. **Given** an unlocked vault, **When** the user exports a backup, **Then** the file is encrypted,
   authenticated, versioned, and named without account names or financial values.
2. **Given** a supported desktop file API, **When** the user opens or saves a backup, **Then** the
   native picker is used; otherwise a download and file-picker fallback remains fully functional.
3. **Given** an existing vault and a valid import, **When** the user has not confirmed overwrite,
   **Then** the existing vault is unchanged.
4. **Given** a corrupt, oversized, unsupported, tampered, or wrong-passphrase backup, **When** it is
   imported, **Then** a safe error is shown and the existing vault remains byte-for-byte unchanged.
5. **Given** a valid older supported backup, **When** it is imported, **Then** it is migrated before
   becoming the active encrypted vault.

---

### User Story 5 - Personalize Currency, Theme, and Security (Priority: P2)

A user configures the vault's base currency, locale-aware display, light/dark/system theme, and
security actions from settings.

**Why this priority**: Personalization makes the calculator practical across locales while keeping
appearance preferences separate from sensitive vault data.

**Independent Test**: Switch among theme modes and currencies, change the operating-system theme
while System is selected, reload, and verify appearance preference persists without vault access.

**Acceptance Scenarios**:

1. **Given** an unlocked vault, **When** the base currency changes, **Then** all values are
   formatted consistently in that currency without implied foreign-exchange conversion.
2. **Given** System theme is active, **When** the operating-system preference changes, **Then** the
   app updates immediately and maintains readable contrast.
3. **Given** any theme, **When** the app reloads, **Then** the initial frame uses the stored
   non-sensitive preference without a light/dark flash.
4. **Given** destructive vault actions, **When** the user initiates one, **Then** an accessible
   confirmation clearly states consequences and requires deliberate confirmation.

---

### User Story 6 - Install, Use Offline, and Update Safely (Priority: P2)

A user installs the app where supported, continues calculating after the network disappears, and
chooses when to activate a new version without losing unsaved edits.

**Why this priority**: Offline reliability and safe updates are essential for a trustworthy PWA.

**Independent Test**: Load a production build once, disconnect the server, reload representative
deep links and query URLs, then serve a second build and verify the update prompt and opt-in reload.

**Acceptance Scenarios**:

1. **Given** one successful online load, **When** the network and origin server are unavailable,
   **Then** the app shell, vault unlock, calculations, and navigation still work.
2. **Given** installation is supported and criteria are met, **When** the browser offers
   installation, **Then** the app exposes an accessible install affordance; unsupported browsers do
   not show a broken control.
3. **Given** a new app build, **When** an update is detected, **Then** the user receives an
   accessible prompt and the current build remains active until explicit acceptance.
4. **Given** unsaved edits when an update is accepted, **When** activation could reload the page,
   **Then** edits are first persisted or the user must explicitly resolve the risk.
5. **Given** offline/online transitions, **When** status changes, **Then** status is announced
   without blocking work or repeatedly stealing focus.

---

### User Story 7 - Use Every Core Flow Accessibly (Priority: P2)

A keyboard, screen-reader, touch, zoom, or reduced-motion user completes onboarding, tracking,
insight review, backup, update, and settings workflows without loss of information.

**Why this priority**: Accessibility is a release requirement, not a post-launch enhancement.

**Independent Test**: Complete each core workflow with keyboard only and representative assistive
technology checks at 200% zoom across desktop and mobile viewports.

**Acceptance Scenarios**:

1. **Given** keyboard-only input, **When** any core workflow is completed, **Then** focus order,
   focus visibility, dialogs, error recovery, and shortcuts remain operable.
2. **Given** a chart, **When** it is encountered by a screen-reader user, **Then** an equivalent
   captioned data table communicates the same values and actual/projected distinctions.
3. **Given** reduced motion, high zoom, narrow viewport, or safe-area insets, **When** the UI is
   used, **Then** content remains readable and operable without forced orientation or disabled zoom.

### Edge Cases

- Storage is unavailable, quota is exceeded, or an IndexedDB operation is interrupted.
- A passphrase is empty, weak, mismatched, extremely long, wrong, or used against tampered data.
- The browser is closed, reloaded, suspended, restored from back-forward cache, or resumes on iOS.
- Two tabs attempt to edit the same vault; the second writer must not silently overwrite changes.
- A value is zero, negative, larger than safe accepted limits, fractional beyond currency precision,
  or entered with locale separators.
- An item has values for non-contiguous years, duplicate years, or years outside the supported
  range.
- A liability has zero interest, zero payment, payment below monthly interest, overpayment, payoff
  between year boundaries, a future start date, expired term, or contradictory schedule fields.
- A dashboard range contains one year, no complete years, net worth crossing zero, or a CAGR whose
  start/end values make it undefined.
- A backup is empty, malformed JSON, too large, truncated, unsupported, downgraded, tampered, or
  selected through a browser with no native file-system capability.
- An update appears while a form or confirmation dialog is active, while offline, or after the app
  returns from a long suspension.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The product MUST provide onboarding that explains local-only storage, passphrase
  responsibility, backup responsibility, and recovery limitations before vault creation.
- **FR-002**: A user MUST be able to create, unlock, manually lock, change the passphrase of, and
  permanently delete a vault through explicit, validated flows.
- **FR-003**: Persisted vault contents and portable backups MUST be encrypted and authenticated;
  decrypted vault data and unlock material MUST exist only while the current session is unlocked.
- **FR-004**: Reopening or reloading the application MUST require the vault passphrase.
- **FR-005**: Wrong passphrases and authentication failures MUST be indistinguishable to the extent
  practical and MUST NOT mutate, expose, or erase the stored vault.
- **FR-006**: Demo data MUST be created only after a clearly labeled explicit user action and MUST
  be removable using normal data or vault deletion flows.
- **FR-007**: Users MUST be able to create, edit, delete, and reorder assets and liabilities.
- **FR-008**: Assets MUST support current or long-term classification; built-in checking/bank,
  savings, cash, stocks, bonds, funds/ETF, retirement/pension, property/real estate, vehicle,
  business, crypto, valuables, and custom types; custom names/types; notes; and year-specific
  values.
- **FR-009**: Liabilities MUST support built-in mortgage, personal loan, student loan, credit card,
  vehicle loan, tax debt, and custom types plus name, current/principal amount, annual interest
  rate, monthly payment, optional start date and term, notes, and manual year-specific balances.
- **FR-010**: Each item-year MUST permit at most one manual value, and the user MUST be able to add,
  update, and remove values for multiple calendar years.
- **FR-011**: Liability projections MUST use monthly amortization, support zero rates and
  overpayment, stop at payoff without negative balances, and flag invalid/non-amortizing schedules.
- **FR-012**: Manual liability balances MUST override projections for the same year and seed later
  projections, with actual and projected values visibly and semantically distinguished.
- **FR-013**: Financial input MUST use bounded decimal validation and calculations MUST avoid binary
  floating-point drift at displayed currency precision.
- **FR-014**: The dashboard MUST provide assets, liabilities, net worth, yearly change, and compound
  annual growth where defined.
- **FR-015**: The dashboard MUST provide a net-worth trend, asset-versus-liability comparison, asset
  allocation, liability payoff projection, and annual-change view.
- **FR-016**: Every visual insight MUST have a captioned tabular alternative containing equivalent
  filtered values and status labels.
- **FR-017**: Users MUST be able to select meaningful time ranges, and all dashboard views MUST use
  one deterministic filtered dataset.
- **FR-018**: Empty, incomplete, undefined, and projected states MUST be identified rather than
  replaced with fabricated values; missing asset years MUST be excluded and marked incomplete rather
  than carrying the most recent value forward.
- **FR-019**: Each vault MUST have one base currency; all financial entries MUST be interpreted in
  that currency and formatted according to the active locale without automatic currency conversion.
- **FR-020**: Theme choices MUST include Light, Dark, and System, persist without unlocking, avoid
  an initial color flash, and react live to system changes only while System is active.
- **FR-021**: Users MUST be able to export and import an encrypted, authenticated, versioned backup
  without exposing account names or financial values in its filename or unencrypted metadata.
- **FR-022**: Import MUST validate size, shape, version, cryptographic integrity, and migration
  support before requesting explicit overwrite confirmation and replacing an existing vault.
- **FR-023**: Backup open/save MUST use supported native file capabilities when available and a
  standards-based download/file-picker fallback everywhere else.
- **FR-024**: Failed or cancelled import/export MUST leave the active vault unchanged and report an
  actionable, non-sensitive error.
- **FR-025**: The app shell MUST work offline after the first successful load, including arbitrary
  application routes and query strings under the published path.
- **FR-026**: Offline storage for the app shell MUST exclude vault records, exports, user-entered
  content, and application data responses.
- **FR-027**: Update checks MUST occur after registration and on throttled time, visibility,
  page-show, and online signals; activation MUST remain an explicit user choice.
- **FR-028**: Update activation MUST persist or explicitly resolve dirty edits before any reload and
  MUST announce offline-ready and update-available states accessibly.
- **FR-029**: An install affordance MUST appear only when supported and available; lack of install
  prompt support MUST not impair any feature.
- **FR-030**: The About/privacy view and footer MUST show the semantic app version and short build
  identifier, explain the local-only privacy model, and link to the exact public source revision.
- **FR-031**: The application MUST make no runtime request to an external origin and MUST not send
  vault data through requests, URLs, logs, beacons, sockets, service-worker messages, or caches.
- **FR-032**: All core workflows MUST be keyboard and touch operable with visible focus,
  focus-managed dialogs, error summaries, semantic landmarks, sufficient contrast, reduced-motion
  support, reflow at 200% zoom, safe-area support, and no restriction on browser zoom.
- **FR-033**: Charts, status changes, currency changes, validation errors, and destructive actions
  MUST have screen-reader understandable names, descriptions, and announcements.
- **FR-034**: The product MUST remain responsive across representative desktop and mobile browser
  engines and MUST provide fallbacks for unsupported file and installation capabilities.
- **FR-035**: The active vault MUST detect conflicting writes from another tab and prevent silent
  last-writer data loss by permitting only one unlocked writable tab at a time.
- **FR-036**: User-facing errors MUST avoid financial values and secret material; expected failures
  MUST not be swallowed or presented as success.
- **FR-037**: The public application MUST provide manifest metadata, standard and maskable icons,
  Apple metadata, crawl controls, and security policy metadata appropriate to static hosting.

### Key Entities

- **Vault envelope**: Non-sensitive version/KDF/cipher metadata plus authenticated encrypted bytes;
  no plaintext financial data.
- **Vault**: The unlocked in-memory financial document containing settings, ordered items, revision,
  and schema version.
- **Asset**: An ordered current or long-term holding with type, custom display data, notes, and
  unique yearly actual values.
- **Liability**: An ordered debt with schedule inputs, notes, yearly manual balances, and generated
  projected balances.
- **Year value**: A calendar year, bounded money amount, source status, and update timestamp.
- **Vault settings**: Base currency, locale behavior, and security/session preferences.
- **Theme preference**: Non-sensitive Light, Dark, or System choice stored separately from the
  vault.
- **Backup envelope**: A portable versioned authenticated ciphertext with non-sensitive format
  metadata and no identifying filename.
- **Dashboard snapshot**: A derived, non-persisted aggregation for one year with completeness and
  actual/projected status.
- **Build identity**: Public semantic version and source revision, independent of vault, backup, and
  service-worker schema versions.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A first-time user can create a vault and record one asset and one liability in under
  three minutes using only on-screen guidance.
- **SC-002**: Reopening always presents a locked state, and 100% of inspected persisted vault and
  backup bytes omit a seeded unique account name and financial value in plaintext.
- **SC-003**: Entering seeded unique financial data results in zero external-origin requests and
  zero POST, PUT, PATCH, DELETE, beacon, or WebSocket transmissions.
- **SC-004**: Published financial test vectors, including every amortization edge case, produce the
  same displayed result on all supported browser engines.
- **SC-005**: A representative vault of 100 items across 50 years unlocks and renders its initial
  dashboard within two seconds on a mid-range desktop test profile.
- **SC-006**: After one successful load, 100% of tested routes, deep links, and query launches
  remain usable during a real origin-server outage.
- **SC-007**: A valid backup round-trip preserves 100% of vault fields, while every invalid,
  tampered, unsupported, cancelled, or wrong-passphrase import preserves the existing vault.
- **SC-008**: A two-build update test displays the new build only after explicit acceptance,
  preserves persisted or deliberately resolved edits, and removes outdated app-shell caches.
- **SC-009**: Automated accessibility checks report zero critical or serious violations in core
  flows, and every core flow is completable by keyboard at 200% zoom.
- **SC-010**: The interface remains usable without horizontal page scrolling at widths from 320 CSS
  pixels through desktop layouts, with touch targets at least 24 by 24 CSS pixels.
- **SC-011**: Every chart series has a table containing the same labels, values, range, and
  actual/projected distinctions.
- **SC-012**: Public build identity, release tag, source revision, and deployed footer/About version
  agree exactly for the initial release.

## Assumptions

- Version 0.1 supports one active vault per browser profile and one user role; collaboration,
  accounts, synchronization, and multi-vault switching are out of scope.
- Annual item values represent balances at the end of December 31. A manual liability balance
  overrides that year's projection and becomes the January 1 opening balance for later projections.
- Backups use the current vault passphrase and encrypted envelope rather than a separate recovery
  passphrase or unencrypted hint.
- Users are responsible for remembering the passphrase and keeping backups; there is no recovery
  service, administrator, escrow, or support override.
- All entered amounts already use the selected base currency; exchange rates and multi-currency
  holdings are out of scope.
- Calendar-year reporting is sufficient; daily market prices, bank integrations, transactions,
  budgeting, taxes, and investment advice are out of scope.
- The supported year range is 1900 through 2200 and the maximum absolute amount per entry is
  999,999,999,999.99 in the base currency.
- Static hosting may not enforce all response headers, so enforceable document policies and
  documented hosting limitations form the browser-side security boundary.
- Current evergreen Chromium, Firefox, and WebKit-based browsers are supported; capability-based
  fallbacks take precedence over user-agent detection.
