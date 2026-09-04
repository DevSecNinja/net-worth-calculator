# Browser Privacy and Persistence Contract

## Allowed Persistent Surfaces

| Surface                                | Allowed content                                                       | Forbidden content                                                   |
| -------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| IndexedDB `net-worth-calculator/vault` | One authenticated cipher envelope and non-sensitive format timestamps | Plaintext vault fields, passphrases, keys, derived aggregates       |
| localStorage                           | Theme mode and expiring random tab lease                              | Vault data, currency, item count, names, values, notes, passphrases |
| sessionStorage                         | Nothing required                                                      | Vault data, keys, or passphrases                                    |
| Cache Storage                          | Workbox-generated content-hashed app shell only                       | IndexedDB responses, exports, blobs, user input, vault data         |
| File download/picker                   | Versioned encrypted backup selected by user                           | Plaintext export or identifying filename                            |
| In-memory React session                | Decrypted current vault and non-extractable CryptoKey while unlocked  | Persistence beyond lock/reload/session loss                         |

## Network Contract

- Runtime requests MUST target only the app's own origin and base path.
- Allowed methods are GET/HEAD for static app-shell assets, navigation, and service-worker update
  checks.
- POST, PUT, PATCH, DELETE, beacon, WebSocket, EventSource, and external-origin requests are
  forbidden.
- No request URL, header, body, service-worker message, console output, or error report may contain
  user-entered names, notes, amounts, passphrases, or decrypted JSON.
- Service-worker fetch handling is generated precache/navigation fallback only. There is no blanket
  runtime cache and no application API route.

## Write Contract

1. The active tab must own the non-sensitive session lease.
2. The proposed vault must pass current Zod schema validation.
3. The repository must compare the caller's expected revision with the decrypted active revision.
4. Encryption must use a fresh random IV and current authenticated envelope metadata.
5. One IndexedDB readwrite transaction replaces the fixed envelope key.
6. The caller receives success only after transaction completion.
7. Errors remain non-sensitive and leave the prior envelope intact.

## Lock Contract

Locking releases the lease, clears the in-memory vault, key, dirty draft registry, and derived chart
data, and returns navigation to the unlock screen. Reload, close, lost lease, and successful vault
deletion have the same memory-clearing effect.

## Import Contract

Parsing, shape validation, authentication, plaintext validation, and migration happen before
overwrite confirmation and before any write transaction. The repository never attempts partial
recovery from unauthenticated bytes. Cancellation and every failure preserve the exact current
envelope.

## Executable Privacy Assertions

Browser tests seed a marker account name, marker amount, marker note, and marker passphrase, then
assert those markers are absent from:

1. all observed requests and responses;
2. URLs and history entries;
3. console/error output;
4. Cache Storage keys and bodies;
5. service-worker messages;
6. localStorage and sessionStorage;
7. exported filenames and unencrypted envelope metadata.
