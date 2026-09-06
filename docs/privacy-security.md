# Privacy and Security Threat Model

## Security goals

The application is designed to:

1. keep financial content on the user's device;
2. keep persisted vault and portable backup contents confidential and authenticated;
3. make wrong-passphrase, tamper, import, update, and storage failures non-destructive;
4. exclude secrets and financial values from network traffic, URLs, logs, caches, filenames, and
   public metadata;
5. make release artifacts and their source revisions reviewable.

It is not a bank, password manager, synchronization service, hardened operating-system keystore, or
substitute for device security.

## Assets and trust boundaries

Protected assets include the passphrase, derived key, decrypted vault, item names and notes, financial
values, settings inside the vault, and backup contents.

The trusted application boundary is the reviewed static build executing in a supported browser on a
device the user controls. Browser APIs for Web Crypto, IndexedDB, files, service workers, and random
generation are trusted platform dependencies. GitHub Pages and Cloudflare Pages are trusted to
deliver the same expected static bytes but are not given vault plaintext or cryptographic keys.

The following are outside the application's control:

- device, operating-system, browser, browser-extension, and same-origin compromise;
- malicious or substituted application builds;
- screen readers, clipboard tools, screenshots, crash dumps, swap, and forensic memory access;
- hosting-provider access logs containing ordinary request metadata;
- user-selected storage, synchronization, sharing, or deletion of exported backup files;
- passphrase strength, reuse, disclosure, and availability.

## Threats and mitigations

| Threat                                  | Mitigation                                                                         | Residual limitation                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Browser storage inspection              | IndexedDB contains one AES-256-GCM cipher envelope only                            | Envelope format/KDF parameters and ciphertext length remain visible              |
| Offline guessing of a stolen envelope   | PBKDF2-SHA-256 with random salt and 600,000 iterations                             | Weak or reused passphrases remain guessable                                      |
| Ciphertext or metadata modification     | AES-GCM authentication covers ciphertext and canonical envelope parameters         | Authentication reports failure; it cannot repair corrupted bytes                 |
| AES-GCM nonce reuse                     | Fresh random 96-bit IV for every encryption                                        | Depends on browser cryptographic random generation                               |
| Plaintext recovery from another record  | Whole-document encryption prevents plaintext per-item stores and metadata indexes  | Approximate vault size and write activity may be inferred externally             |
| Stale or concurrent tab writes          | Single-writer lease plus encrypted revisions and atomic compare-and-swap writes    | A compromised same-origin tab can still act with its privileges                  |
| Locked-vault destructive reset          | Typed warning, exclusive lease, and exact-envelope compare-and-delete              | Anyone with browser-profile access can erase local ciphertext but not decrypt it |
| Accidental backup overwrite/import loss | Validate, authenticate, and confirm before the sole replacement transaction        | A confirmed restore intentionally replaces the one local vault                   |
| Backup content or filename disclosure   | Generic dated filename and encrypted authenticated payload                         | Plaintext wrapper exposes format version and export timestamp                    |
| Cache leakage                           | Revisioned app-shell precache only; no runtime cache rules or vault data responses | Static source and assets are intentionally public                                |
| External data transmission              | No runtime third-party origins, analytics, telemetry, APIs, or remote assets       | The static host receives normal HTTPS asset requests                             |
| XSS and injected script                 | React escaping, no unsafe HTML/eval, local dependencies, restrictive document CSP  | CSP cannot protect against every trusted same-origin or extension compromise     |
| Unsafe automatic updates                | Waiting worker, explicit activation, dirty-state confirmation, immutable build ID  | Accepted updates replace the running application code                            |
| Cross-release data incompatibility      | Independent envelope/vault versions and strict validation                          | Unsupported or damaged backups cannot be restored                                |
| Secret-bearing diagnostics              | Non-sensitive error messages and automated privacy/network checks                  | Browser/devtool extensions and user screenshots are outside the boundary         |

## Cryptographic model

The app imports the passphrase into Web Crypto and derives a non-extractable AES-256 key with
PBKDF2-HMAC-SHA-256. The salt is unique to vault creation or passphrase change. Encryption uses a
fresh IV for every write, a 128-bit authentication tag, and canonical additional authenticated data.

The key and decrypted vault are held only in the active unlocked JavaScript session and are not
written to IndexedDB, Cache Storage, localStorage, backups, or logs. "Memory-only" is a lifecycle
boundary, not a secure-erasure guarantee: JavaScript garbage collection, browser process memory, swap,
crash reporting, accessibility tooling, and privileged extensions are not controlled by the app.

PBKDF2 raises guessing cost but does not turn a weak passphrase into a strong one. There is no
passphrase verifier, hint, recovery path, recovery question, server-held key, or administrator
override. The locked reset path destroys ciphertext; it does not reset or recover the passphrase.
Wrong passphrases and modified ciphertext intentionally produce the same authentication-style error.

## Storage and cache boundaries

IndexedDB database `net-worth-calculator` contains a fixed `vault` store and `active` key. Its value is
the cipher envelope; domain entities and derived dashboard data are not separate records.
localStorage may reveal the selected theme, explicit locale, a random tab owner/expiry lease, and a
transient constant vault-deletion pulse; none contains vault content.

The Workbox service worker precaches only generated app-shell resources. There are no runtime caching
routes. Backup extensions are denied as navigation fallbacks, and the build verifier rejects
service-worker references to vault storage or backup data. Cache cleanup targets obsolete generated
precache entries rather than all origin caches.

## Backup and file behavior

An exported backup wraps the existing encrypted envelope and includes a non-sensitive ISO export
timestamp. It normally uses the current vault passphrase and does not decrypt the vault merely to
export it. Native file-system APIs provide a picker when available; other browsers receive a Blob
download and hidden file-input restore path.

Restore remains available from the locked and first-run states. Imports are authenticated and
validated before an existing envelope is atomically replaced. The plaintext serialization budget
is lower than the 10 MiB portable-file limit so every locally committed vault remains exportable and
unlockable.

Backup ciphertext should still be handled as sensitive. A copy can be attacked offline, and a cloud
drive, email client, removable disk, backup agent, or shared folder selected by the user applies its
own security and retention policy. The app cannot revoke previously exported files or determine
whether they were copied.

## CSP and static-host limitations

The built document supplies a restrictive meta Content Security Policy compatible with local scripts,
styles, images, workers, manifests, and Web Crypto operation. It excludes remote fonts, runtime CDNs,
unexpected network destinations, unsafe evaluation, and injected application HTML patterns.

GitHub Pages does not provide repository-controlled response security headers. The root artifact
therefore retains its restrictive in-document policy. Cloudflare Pages applies the committed
`_headers` policy to static responses, adding the same CSP plus `frame-ancestors`, HSTS, MIME,
referrer, framing, and browser-capability restrictions. Hashed assets are immutable; root HTML,
manifest, and service-worker responses disable browser HTTP caching so explicit updates are not
suppressed. DNS, TLS, hosting integrity, and ordinary request logs remain hosting-platform
responsibilities.

## Update and supply-chain model

The service worker uses revisioned generated precaches and does not automatically activate a waiting
build. Update checks are throttled except for the initial/manual lifecycle check. The user sees the
new semantic version/source identity only after accepting activation and resolving dirty edits.

Dependencies are lockfile-pinned; reusable workflows and actions use immutable commit SHAs; Renovate
applies release-age and security policies; CI scans configuration, secrets, source, built output,
browser privacy behavior, and multi-engine compatibility. These controls reduce but do not eliminate
malicious upstream packages, compromised registries, GitHub accounts, runners, or maintainers.

## Deletion and recovery

Unlocked deletion and locked reset remove only the active encrypted envelope and discard related
in-memory session and lease state. Locked reset captures the exact envelope at confirmation, acquires
the standard writable lease, and atomically compares before deleting. It is refused while another tab
owns an active writable session and fails if the envelope changed or was replaced. A data-free local
event tells other locked tabs to re-read storage and return to onboarding when the vault is absent.

Theme and language preferences, app-shell caches, downloaded files, other browser profiles, and
other devices are unaffected. Clearing all browser site data is broader and also removes app-shell
caches and preferences. Browsers, storage media, synchronization tools, filesystem snapshots, and
device backups may retain recoverable copies; the application cannot promise forensic secure erasure.

Deletion never removes downloaded or copied `.nwvault` files. Conversely, losing or deleting the only
local envelope is irreversible without a valid backup and its passphrase. Corrupt, unsupported,
future-version, tampered, oversized, or wrongly protected backups cannot be bypassed or recovered by
the project owner.

This is an intentional availability tradeoff: anyone with access to the browser profile can erase
the local ciphertext without knowing the passphrase, but that capability cannot reveal its plaintext.

## Reporting

Report suspected vulnerabilities privately using [SECURITY.md](../SECURITY.md). Do not attach real
vaults, passphrases, financial data, decrypted exports, or sensitive screenshots to a public issue.
