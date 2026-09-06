# Locked Vault Reset Contract

## Visibility

- The reset entry point exists only while the current browser profile has a locked local vault.
- Copy says the passphrase cannot be recovered and labels the action as local vault deletion.

## Confirmation

- Opening confirmation captures the exact current encrypted envelope.
- The modal names the irreversible action and presents all data-loss, backup, and profile/device
  boundaries before the text field.
- Submit remains unavailable until the exact locale-specific phrase is entered.
- Escape, close, and Cancel clear the captured envelope and typed text without changing storage.

## Commit Sequence

1. Verify the provider is still locked and has a captured envelope.
2. Attempt to acquire the standard writable-session lease.
3. If acquisition fails, show the localized active-session error and leave storage unchanged.
4. Atomically read and compare the active envelope in a strict read-write transaction.
5. If it is absent or differs, abort, show the localized changed-vault error, and leave the current
   record unchanged.
6. Delete the exact record and await transaction completion.
7. Clear captured/session/error state, publish `vault-deleted`, release the temporary lease, and set
   the current tab to onboarding.

## Cross-Tab Contract

- Successful deletion emits no user data.
- Locked recipients re-read IndexedDB and move to onboarding only if the vault remains absent.
- An unlocked recipient should make deletion impossible by owning the writable lease. If ownership
  is unexpectedly lost, existing session-loss handling locks and clears decrypted state.

## Error Contract

Distinct localized messages exist for active writer, changed/missing vault, and unexpected storage
failure. Failures never use success-shaped fallback and never clear preferences or unrelated
storage.

## Privacy Contract

Reset has no network dependency or mutation. Passphrase, confirmation text, cipher envelope,
metadata, and financial content are absent from console output, URLs, Cache Storage, local
coordination messages, and request bodies.
