# Research: Reset a Locked Local Vault

## Decision 1: Authorize deletion with the observed encrypted envelope

**Decision**: Read the opaque envelope when confirmation opens and pass that exact value to the
existing transactional compare-and-delete operation after confirmation.

**Rationale**: It proves the record committed for deletion is precisely the record the user saw
exist, while requiring neither decryption nor new persisted metadata.

**Alternatives considered**: Unconditional key deletion could erase a replacement vault; comparing
only schema metadata is not unique; decrypting for an identifier contradicts the lost-passphrase
use case.

## Decision 2: Reuse the writable-session lease for deletion

**Decision**: A locked reset attempt acquires the same short-lived exclusive lease required by
unlocked writers, holds it through the delete transaction, and releases it after success or failure.

**Rationale**: An unlocked tab already owns this lease, so reset is refused without adding a second
coordination mechanism that could disagree with normal writes.

**Alternatives considered**: A separate deletion flag creates split-brain states; ignoring the lease
can delete beneath an active decrypted session; waiting indefinitely is less actionable than an
immediate refusal.

## Decision 3: Publish a data-free local deletion event

**Decision**: After commit, send a constant `vault-deleted` event over BroadcastChannel and a
non-sensitive localStorage pulse. Recipients re-read IndexedDB before moving to onboarding.

**Rationale**: BroadcastChannel provides immediate same-origin notification while the storage pulse
covers tabs without a live channel. Re-reading prevents a delayed event from hiding a newly created
replacement vault.

**Alternatives considered**: Polling delays onboarding and wastes work; embedding an envelope hash
or metadata in the event is unnecessary disclosure; assuming IndexedDB changes generate events is
not portable.

## Decision 4: Keep reset errors local to the dialog

**Decision**: Storage exposes typed reset errors and the dialog maps them to catalog entries. The
provider clears stale global errors on success but does not expose raw storage messages.

**Rationale**: Every user-facing failure must be fully localized, while typed errors preserve
specific handling without broad catches or string matching.

**Alternatives considered**: Raw exception messages create English fallback; a single generic error
hides actionable lease and stale-envelope outcomes.

## Decision 5: Preserve all non-vault persistence

**Decision**: Delete only the active IndexedDB envelope and release ephemeral lease state. Do not
delete the database, localStorage preferences, Cache Storage, service workers, or files.

**Rationale**: The user's intent is to erase one unrecoverable vault, not reset the application or
remove app-shell availability.

**Alternatives considered**: Clearing site data is overbroad and could remove preferences and offline
assets; deleting the whole database creates unnecessary lifecycle and blocked-connection hazards.
