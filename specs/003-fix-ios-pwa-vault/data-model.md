# Data Model: Installed iOS Vault Creation Fix

## Persisted Data

No persisted schema changes are introduced.

### Encrypted Vault Envelope

- **Location**: IndexedDB database `net-worth-calculator`, store `vault`, key `active`.
- **Shape**: Existing `CipherEnvelopeV1` only: format and schema versions, PBKDF2 parameters, AES-GCM
  parameters, and authenticated ciphertext.
- **Validation**: Existing strict schema validation before write and after authenticated decrypt.
- **Privacy**: No plaintext vault fields, passphrase, key, diagnostic data, or device details.

### Writable-Session Lease

- **Location**: Existing `nwc-vault-lease` localStorage key.
- **Shape**: Random opaque owner and short expiry only.
- **Lifecycle**: `available -> acquired -> renewed -> released | lost`.
- **Creation rule**: A vault cannot be created or shown as unlocked unless this session owns the lease.

## Runtime-Only State

### Critical Application Readiness

The startup module graph includes every component required to render both the onboarding view and the
first dashboard view.

- **Lifecycle**: `loading modules -> application interactive`.
- **Invariant**: Passphrase submission is impossible before the dashboard module graph has loaded.
- **Failure state**: A startup asset failure occurs before vault creation, never after encrypted
  persistence succeeds.

### Unlocked Vault Session

- **Fields**: Validated vault document, non-extractable derived key, salt, KDF iteration count, lease
  owner, operation generation.
- **Persistence**: None.
- **Lifecycle**: `absent -> creating -> unlocked -> locked`; page exit clears the runtime state.
- **Invariant**: `unlocked` is published only after the encrypted envelope transaction completes and
  lease ownership is rechecked.

### Optional Local Coordination Channel

- **Fields**: Fixed channel name and data-free message type.
- **Persistence**: None.
- **Lifecycle**: `unsupported | restricted | open -> closed`.
- **Fallback**: Data-free storage-event signaling when channel construction is unavailable for a known
  capability/security reason. Dirty-state messages contain only owner/request identifiers and a
  boolean, never field names or values.
- **Invariant**: No passphrase, financial value, envelope, or user-entered string is posted.

### Opaque Random Identifier

- **Source**: Native random UUID when callable; otherwise cryptographic random bytes formatted as an
  RFC 4122 version 4 identifier.
- **Uses**: Vault/item identity and non-sensitive local coordination ownership.
- **Invariant**: Never derived from time, user data, financial values, or passphrases.

## Test-Only Evidence

### Safe Browser Diagnostic

- **Fields**: Event category (`pageerror`, console error, unhandled rejection, failed request), error
  name, non-query asset pathname, and project name.
- **Persistence**: Test process output/artifact only on failure.
- **Exclusions**: Passphrases, form values, financial markers, ciphertext, IndexedDB values, request
  bodies, and stack traces.

### Compatibility Profile

- **Fields**: Browser engine, CSS viewport, screen dimensions, DPR, touch/mobile flags, orientation,
  and standalone signals.
- **Persistence**: Test configuration only.
- **Future-device rule**: Large Pro Max coverage is expressed as viewport/reflow ranges, not an
  unavailable named model.
