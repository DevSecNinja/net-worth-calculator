# Feature Specification: Reset a Locked Local Vault

**Feature Branch**: `devsecninja-reset-locked-vault`

**Created**: 2026-09-05

**Status**: Clarified

**Input**: Allow a user who has lost the passphrase to intentionally delete the unrecoverable
encrypted vault stored in the current browser profile and return to onboarding without weakening
the confidentiality of that vault.

## User Scenarios & Testing

### User Story 1 - Start Over After Losing the Passphrase (Priority: P1)

A user who cannot unlock the local vault can clearly distinguish deletion from passphrase recovery,
review the permanent consequences, type an explicit confirmation, and return immediately to
onboarding without supplying the lost passphrase.

**Why this priority**: Without this path, an unrecoverable local vault permanently blocks use of the
application in that browser profile.

**Independent Test**: Create and lock a vault, open the forgotten-passphrase path, verify every
warning, reject an incorrect confirmation, confirm deletion, and create a new vault without
reloading.

**Acceptance Scenarios**:

1. **Given** an encrypted local vault exists and is locked, **When** the unlock screen opens,
   **Then** it shows a secondary forgotten-passphrase path that does not promise recovery.
2. **Given** the reset dialog is open, **When** the user has not entered the exact confirmation,
   **Then** deletion cannot proceed and the encrypted vault remains unchanged.
3. **Given** the exact confirmation is entered and no other writable session exists, **When**
   deletion commits, **Then** the current encrypted local vault is removed, the user reaches
   onboarding immediately, and a new vault can be created without reloading.
4. **Given** the reset dialog is cancelled or dismissed, **When** the user returns to unlock,
   **Then** the encrypted vault and locked state are unchanged.

---

### User Story 2 - Understand Data-Loss and Recovery Boundaries (Priority: P1)

Before deletion, a user receives a complete, accessible warning that passphrases cannot be
recovered, deletion is permanent for this browser profile, encrypted backups remain separate, and
other devices or browser profiles are unaffected.

**Why this priority**: The action is irreversible and must support an informed decision without
misrepresenting recovery or deletion scope.

**Independent Test**: Review the dialog with keyboard and screen-reader navigation in English (US),
English (UK), and Dutch, and verify all required consequences are present without untranslated text.

**Acceptance Scenarios**:

1. **Given** the reset dialog is open, **When** its warning is read, **Then** it explains all
   permanent-loss, backup, and profile/device boundaries before the confirmation control.
2. **Given** any supported language is active, **When** the complete reset flow is used, **Then**
   every label, instruction, error, and status message is localized.
3. **Given** keyboard, touch, mobile, or high-zoom use, **When** the flow is completed or cancelled,
   **Then** controls remain operable, readable, and focus is managed predictably.

---

### User Story 3 - Preserve Concurrent and Replacement Vaults (Priority: P1)

A reset attempt cannot delete a vault while another tab owns an active writable session and cannot
delete a vault that changed after the user opened the confirmation.

**Why this priority**: A stale or concurrent destructive action could erase newer data the user did
not intend to delete.

**Independent Test**: Attempt deletion while another tab holds the writable session and after
replacing the encrypted vault between confirmation and commit; both attempts fail visibly and leave
the current encrypted vault intact.

**Acceptance Scenarios**:

1. **Given** another tab owns an active writable vault session, **When** reset is submitted, **Then**
   deletion is refused with an actionable localized message and no data changes.
2. **Given** the encrypted vault has changed since confirmation opened, **When** reset is submitted,
   **Then** deletion fails visibly and the replacement vault remains intact.
3. **Given** one tab successfully deletes the vault, **When** other locked tabs receive the change,
   **Then** they transition to onboarding without a reload.
4. **Given** deletion has already succeeded, **When** the same operation is repeated or a stale
   confirmation is submitted, **Then** it does not delete a later vault and reports the changed
   state safely.

### Edge Cases

- The local vault disappears before confirmation is submitted.
- A writable session lease expires, is released during page exit, or changes ownership while
  deletion is attempting to commit.
- The vault is replaced after the warning is displayed but before deletion commits.
- Cross-tab notifications are unavailable; storage change observation still prevents unsafe
  deletion and the current tab remains correct.
- Deletion fails because local storage is unavailable or the encrypted store transaction fails.
- Theme and language preferences exist before reset and must remain unchanged afterward.

## Requirements

### Functional Requirements

- **FR-001**: The locked vault screen MUST show a visible, secondary action for users who have lost
  their passphrase, and MUST clearly describe the action as deletion rather than recovery.
- **FR-002**: The destructive confirmation MUST state that passphrases cannot be recovered; deletion
  permanently removes this browser profile's local encrypted vault; its financial data becomes
  inaccessible unless the user has an encrypted backup and that backup's passphrase; downloaded or
  copied backups are not deleted; and other devices or browser profiles are unaffected.
- **FR-003**: The user MUST type the exact localized confirmation phrase before the destructive
  action is enabled or accepted.
- **FR-004**: Locked deletion MUST NOT require, inspect, derive, or transmit a passphrase.
- **FR-005**: The system MUST capture the encrypted vault selected for deletion when confirmation
  begins and atomically delete only that exact encrypted vault.
- **FR-006**: If the encrypted vault is absent, changed, or replaced before commit, deletion MUST
  fail visibly and MUST NOT remove the current vault.
- **FR-007**: The system MUST acquire an exclusive short-lived writable guard before deletion and
  MUST refuse deletion while another active writable session owns that guard.
- **FR-008**: Successful deletion MUST clear decrypted session material, writable-session state,
  operation errors, and stale destructive-dialog state.
- **FR-009**: Successful deletion MUST notify other open application tabs; locked tabs MUST move to
  onboarding, while an active writable tab normally prevents deletion.
- **FR-010**: Successful deletion MUST route immediately to onboarding and permit creating a new
  vault without a page reload.
- **FR-011**: Theme, language, and other explicitly non-sensitive preferences MUST remain unchanged.
- **FR-012**: The system MUST remove only the encrypted vault record and related ephemeral session
  coordination state; it MUST NOT clear application caches, downloaded files, unrelated browser
  storage, or other profiles/devices.
- **FR-013**: Cancelling, dismissing, or repeating deletion MUST be safe and MUST NOT delete a vault
  that was not the exact vault originally confirmed.
- **FR-014**: The complete workflow, including validation, concurrency, conflict, and storage errors,
  MUST be localized for English (US), English (UK), and Dutch without raw translation keys or
  English fallback in Dutch.
- **FR-015**: The dialog MUST support keyboard operation, Escape cancellation, contained focus,
  restored focus, screen-reader naming, touch targets, mobile reflow, and high zoom.
- **FR-016**: The reset operation MUST make no network request and MUST not expose confirmation
  input, encrypted vault content, metadata, passphrases, or financial values in logs, URLs, or
  application caches.

### Key Entities

- **Confirmed encrypted vault**: The exact opaque encrypted record observed when the reset dialog
  opens and authorized for deletion by the user.
- **Writable-session guard**: A short-lived exclusive ownership record that prevents simultaneous
  vault modification or deletion across tabs.
- **Vault-deleted notification**: A local cross-tab signal that the encrypted vault no longer
  exists and locked views should return to onboarding.
- **Non-sensitive preference**: Theme or language selection that remains stored independently from
  the encrypted vault.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user with a locked vault can intentionally reach onboarding and begin creating a new
  vault in under two minutes without entering a passphrase or reloading.
- **SC-002**: 100% of deletion attempts made while another active writable session exists leave the
  encrypted vault unchanged and show an actionable message.
- **SC-003**: 100% of deletion attempts against a changed or replaced vault leave the replacement
  vault unchanged and show a conflict message.
- **SC-004**: All supported languages present the complete warning, confirmation, errors, and
  successful navigation with zero untranslated keys or fallback-language strings.
- **SC-005**: Successful reset preserves all non-sensitive preferences and removes only the selected
  encrypted local vault.
- **SC-006**: The complete flow can be operated by keyboard and touch at mobile width and 200% zoom,
  with no keyboard trap or obscured destructive warning.
- **SC-007**: Automated privacy inspection observes zero network mutations and zero disclosure of a
  unique vault marker or confirmation input in requests, logs, URLs, or application caches.

## Assumptions

- One encrypted vault exists per browser profile.
- An encrypted backup is recoverable only when the user retains both the backup and its passphrase.
- Anyone with access to the browser profile may intentionally erase the local ciphertext, but this
  grants no ability to decrypt it.
- Existing theme and locale settings are explicitly non-sensitive and independent of the vault.
- Local cross-tab coordination is best effort for notification but mandatory for deletion safety.
