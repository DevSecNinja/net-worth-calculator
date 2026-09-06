# Data Model: Reset a Locked Local Vault

## Confirmed Encrypted Vault

An in-memory reference to the exact `CipherEnvelopeV1` read when the confirmation opens.

- **Persistence**: None; held only for the open confirmation.
- **Sensitive treatment**: Opaque encrypted material; never rendered, logged, placed in URLs, or
  included in cross-tab events.
- **Validation**: Must exist at dialog opening. Commit succeeds only if the stored value is deeply
  equal inside the same read-write transaction.
- **Lifecycle**: `unselected -> captured -> deleted | conflicted | cancelled`; cleared after every
  terminal outcome.

## Writable-Session Guard

The existing short-lived lease record with random owner and expiry.

- **Persistence**: Non-sensitive localStorage coordination record.
- **Ownership**: At most one active owner; locked reset creates a temporary owner.
- **Lifecycle**: `available -> acquired -> released`; any foreign unexpired owner causes immediate
  refusal. Page exit releases only the lease owned by that tab.

## Vault Deletion Event

A local, same-origin signal containing only the event kind `vault-deleted`.

- **Persistence**: Broadcast message plus a transient non-sensitive localStorage pulse.
- **Consumer rule**: A locked recipient re-reads the envelope. It enters onboarding only when no
  envelope exists; a newly created envelope remains locked.
- **Privacy**: No timestamp requiring retention, envelope digest, metadata, financial value,
  passphrase, or confirmation text.

## Reset Workflow State

- `closed`: no envelope captured.
- `preparing`: the current envelope is being read.
- `confirming`: exact envelope captured and dialog visible.
- `deleting`: confirmation matched and temporary lease held.
- `failed-lease`: another writable tab owns the lease; capture is cleared before retry.
- `failed-conflict`: envelope is absent or differs; capture is cleared and current vault state is
  re-read.
- `succeeded`: envelope deleted, session state cleared, peers notified, status is absent.

## Preserved State

Explicit locale override, theme preference, generated app-shell caches, downloaded/copied encrypted
backups, and data in other browser profiles or devices are outside the deletion transaction.
