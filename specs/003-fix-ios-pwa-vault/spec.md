# Feature Specification: Fix Installed iOS Vault Creation

**Feature Branch**: `devsecninja-fix-ios-pwa-vault-creation`

**Created**: 2026-09-06

**Status**: Implemented

**Input**: Fix the production crash that occurs after creating a vault from an installed iOS home
screen app, preserve secure local-only behavior through standalone and offline lifecycle changes, and
add explicit compatibility coverage for the owner's primary iPhone, iPad, and 4K desktop classes.

## User Scenarios & Testing

### User Story 1 - Create a Vault in the Installed iPhone App (Priority: P1)

An iPhone user installs the application to the home screen, launches it as a standalone app, enters
and confirms a passphrase, and creates either an empty or sample vault without seeing a fatal error.
The encrypted vault is durable and the dashboard is immediately usable.

**Why this priority**: The current production failure blocks the first critical task for users who
adopt the application as an installed iOS app.

**Independent Test**: From a fresh installed-app context, create an empty vault and a sample vault in
separate clean profiles, confirm the dashboard renders, lock each vault, and unlock it again.

**Acceptance Scenarios**:

1. **Given** no vault exists in a fresh installed iPhone app, **When** the user creates an empty
   vault, **Then** the encrypted vault is saved, an active session is established, and the empty
   dashboard renders without a fatal error.
2. **Given** no vault exists in a fresh installed iPhone app, **When** the user creates a sample
   vault, **Then** the encrypted vault is saved and the populated dashboard renders without a fatal
   error.
3. **Given** either new vault is active, **When** the user locks and unlocks it with the same
   passphrase, **Then** the original vault contents are restored without data loss or duplication.

---

### User Story 2 - Survive Standalone, Offline, and Update Lifecycles (Priority: P1)

An installed-app user can close or reload the application, launch it without a network connection,
unlock the existing vault, and accept an available application update without corrupting the vault
or reaching a fatal screen.

**Why this priority**: Installed mobile apps are routinely suspended, relaunched, disconnected, and
updated; vault safety cannot depend on a continuously active page or network.

**Independent Test**: Create and lock a vault, reload and unlock it, relaunch it offline, and exercise
the safe-update path while checking that the encrypted vault remains intact.

**Acceptance Scenarios**:

1. **Given** a newly created vault has been locked, **When** the installed app is reloaded or
   relaunched, **Then** it opens on the locked view and unlocks to the same data.
2. **Given** the application shell was loaded successfully before going offline, **When** the user
   launches the installed app offline, **Then** the locked vault can be unlocked and used without
   external requests.
3. **Given** an application update becomes available, **When** the user applies it from a safe
   state, **Then** the app returns to a valid locked or active view and retains the encrypted vault.
4. **Given** secure local storage or cryptography is genuinely unavailable, **When** onboarding is
   shown, **Then** vault creation is blocked before passphrase submission with specific,
   non-sensitive guidance.

---

### User Story 3 - Use Primary Device Classes Without Reflow Failures (Priority: P2)

The owner can use the application on an iPhone 14 Pro Max and future large Pro Max-sized viewports,
an iPad Pro 12.9-inch in portrait and landscape, and a 3840 by 2160 desktop without clipped,
overlapping, or excessively stretched controls and charts.

**Why this priority**: Explicit coverage for the owner's primary devices prevents regressions that
generic desktop and small-mobile checks can miss.

**Independent Test**: Complete core vault and dashboard tasks at the target viewport ranges,
including landscape, high zoom/reflow, keyboard, and touch interaction.

**Acceptance Scenarios**:

1. **Given** a large Pro Max-class phone viewport in portrait or landscape, **When** onboarding,
   dashboard, dialogs, and footer status are used, **Then** all content reflows without horizontal
   page overflow or obscured controls.
2. **Given** an iPad Pro 12.9-inch viewport in portrait or landscape, **When** the same workflows are
   used, **Then** controls remain touch operable and charts remain readable with their equivalent
   data tables.
3. **Given** a 3840 by 2160 desktop viewport, **When** the dashboard is displayed, **Then** the
   application uses a sensible readable content width rather than stretching controls and charts
   across the full screen.
4. **Given** a high-zoom or equivalent narrow reflow view, **When** the user navigates by keyboard,
   **Then** focus remains visible and no footer, status, dialog, or chart content overlaps.

---

### User Story 4 - Diagnose Failures Without Exposing Financial Data (Priority: P2)

A user who encounters an unexpected fatal error receives safe recovery guidance, while maintainers
can distinguish the failure category using only opaque, non-sensitive evidence.

**Why this priority**: A security-focused local application must be supportable without logging or
displaying secrets, financial values, or encrypted vault contents.

**Independent Test**: Trigger each intentionally classified fatal path and inspect visible text,
browser output, requests, URLs, and caches for sensitive markers.

**Acceptance Scenarios**:

1. **Given** an unexpected fatal error occurs, **When** the safe error screen renders, **Then** the
   user sees localized recovery guidance and, if present, only an opaque support code.
2. **Given** vault creation, locking, unlocking, offline launch, or a classified failure occurs,
   **When** diagnostic surfaces are inspected, **Then** no passphrase, financial value, plaintext
   vault data, encrypted payload, or stack trace is exposed.

### Edge Cases

- A required browser capability is absent, present under a vendor-prefixed form, or becomes
  unavailable while the installed app is resuming.
- A page is suspended or hidden while local persistence or writable-session ownership changes.
- Cross-tab notification is unavailable while storage-based coordination remains available.
- A storage transaction becomes inactive, aborts, or cannot clone the value being written.
- A standalone launch restores an onboarding, locked, or dashboard URL from prior navigation.
- The app changes between online and offline while creating, locking, unlocking, or updating.
- Display cutouts, safe-area insets, landscape orientation, virtual keyboards, and high zoom reduce
  the usable viewport.
- Locale formatting, theme preference, storage-persistence requests, and reduced-motion preferences
  differ from the default environment.

## Requirements

### Functional Requirements

- **FR-001**: A fresh installed iOS home screen app MUST create both empty and sample vaults without
  reaching the fatal error screen.
- **FR-002**: Successful creation MUST durably save only an authenticated encrypted vault, establish
  exclusive writable-session ownership, and render the correct dashboard before reporting success.
- **FR-003**: The application MUST preserve the existing passphrase hardening, authenticated
  encryption, unique randomness, in-memory key handling, and fail-closed behavior.
- **FR-004**: The application MUST identify and correct the initiating defect rather than reload,
  clear data, disable offline support, swallow the error, or present a success state after failure.
- **FR-005**: A newly created vault MUST survive lock, reload, standalone relaunch, unlock, offline
  relaunch, and a safe application update without data loss.
- **FR-006**: Persistence and writable-session ownership MUST complete in an order that cannot expose
  a usable dashboard for a vault that was not safely stored.
- **FR-007**: Browser capability differences MUST be handled through standards-compatible detection
  and supported alternatives where available.
- **FR-008**: If a mandatory secure capability has no safe alternative, creation MUST be blocked
  before passphrase submission with a specific localized message.
- **FR-009**: Session and cross-context coordination MUST remain correct when optional notification
  mechanisms are unavailable, pages are suspended, or lifecycle events occur.
- **FR-010**: Standalone navigation MUST retain valid onboarding, locked-vault, and dashboard states
  without escaping the installed application scope or depending on a network redirect.
- **FR-011**: Unexpected errors MUST continue to fail closed and MUST NOT cause automatic data
  deletion, silent state reset, or an uncontrolled reload.
- **FR-012**: User-facing recovery guidance and any support identifier MUST be localized and MUST NOT
  reveal internal error details.
- **FR-013**: No diagnostic surface, request, URL, application cache, or persisted preference MUST
  contain passphrases, financial values, plaintext vault data, or encrypted vault payloads.
- **FR-014**: The application MUST make no external runtime request during onboarding, vault use,
  standalone relaunch, offline use, or error handling.
- **FR-015**: The complete core workflow MUST support current evergreen browser engines and explicit
  large Pro Max-class iPhone, iPad Pro 12.9-inch, and 3840 by 2160 desktop viewport ranges.
- **FR-016**: Phone and tablet portrait and landscape layouts MUST avoid page-level horizontal
  overflow, clipped controls, status/footer overlap, inaccessible safe-area content, and unreadable
  charts.
- **FR-017**: The 3840 by 2160 layout MUST constrain primary content, forms, controls, and charts to a
  readable maximum width.
- **FR-018**: Keyboard, touch, screen-reader, reduced-motion, and high-zoom/reflow behavior MUST remain
  equivalent across the supported device classes.
- **FR-019**: Charts MUST retain readable visual content and equivalent semantic data tables at every
  supported viewport.
- **FR-020**: Release evidence MUST distinguish automated standalone emulation from literal home
  screen installation and MUST provide a concise real-device verification procedure.

### Key Entities

- **Encrypted vault envelope**: The only persisted representation of financial data, containing
  versioned authenticated ciphertext and non-sensitive cryptographic parameters.
- **Unlocked vault session**: Decrypted data and key material held only for the active page session.
- **Writable-session ownership**: Short-lived local coordination that permits exactly one active
  writer and is safely released or renewed across lifecycle changes.
- **Installed-app context**: A standalone home screen launch with an application-scoped navigation
  and offline-capable shell.
- **Compatibility profile**: A supported viewport, input, orientation, display-density, and browser
  behavior range used to validate core workflows.
- **Opaque support code**: A non-sensitive identifier for a classified failure that reveals no
  internal details or user data.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Empty and sample vault creation complete successfully in 100% of repeated fresh
  installed-iPhone regression runs, with zero fatal error screens.
- **SC-002**: 100% of created-vault regression runs retain identical user-visible data after lock,
  reload, unlock, offline relaunch, and safe-update interactions.
- **SC-003**: Persisted storage contains zero plaintext passphrases or financial values and contains
  only the expected encrypted vault representation.
- **SC-004**: Runtime privacy inspection observes zero external requests and zero sensitive markers
  across requests, logs, URLs, persisted preferences, and application caches.
- **SC-005**: All targeted phone, tablet, desktop, landscape, and high-zoom/reflow checks complete
  with zero page-level horizontal overflow, clipped primary controls, or footer/status overlap.
- **SC-006**: Core onboarding, lock, reload, unlock, sample, and backup tasks remain operable by
  keyboard and touch on every primary device class.
- **SC-007**: The 4K dashboard keeps primary content within a readable bounded layout while charts and
  their equivalent tables remain comprehensible.
- **SC-008**: A real-device owner can complete the documented iPhone and iPad smoke procedure in under
  10 minutes per device and observe every stated expected result.

## Assumptions

- Home screen installation itself cannot be fully automated in the existing browser test
  environment; automated checks reproduce observable standalone conditions, while real-device
  installation remains an explicit manual release check.
- Future large Pro Max iPhones are covered through responsive viewport ranges rather than
  unavailable or speculative named-device definitions.
- Current evergreen browser support remains unchanged; the new explicit profiles supplement rather
  than replace the existing compatibility matrix.
- Device checks are scoped to representative critical workflows to keep release feedback practical
  while retaining broad existing browser coverage.
- The application remains a static, local-only PWA with no server-side recovery or data storage.
