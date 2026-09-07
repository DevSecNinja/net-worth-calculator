# Privacy Notice

**Effective date:** September 6, 2026

Net Worth Calculator is a local-first static application maintained by DevSecNinja. The application
does not create an application account and does not operate an application server, analytics,
advertising, telemetry, or remote font. Optional iCloud synchronization uses Apple's CloudKit service
only after you enable it and sign in with Apple.

## Data handled by the application

You may enter asset and liability names, notes, balances, rates, payments, currency settings, and
multiple exact-date observations. Amounts are stored as locale-neutral canonical decimal strings;
language controls only parsing and display. The complete vault is encrypted and authenticated before it is
written to IndexedDB. The passphrase-derived key and decrypted vault remain in the unlocked page
session and are not transmitted. If iCloud sync is enabled, only the same encrypted vault envelope and
opaque synchronization metadata are sent to the user's private CloudKit database.

The browser may store non-sensitive theme and explicit language preferences, short-lived tab-lease
metadata, and a data-free vault-deletion pulse in localStorage. The initial language is derived
locally from browser preferences. Cache Storage contains only static application-shell resources. An
exported backup is an encrypted `.nwvault` file that includes non-sensitive format metadata and an
export timestamp.

## Collection and sharing

The application does not collect, sell, share, or use your financial data for analytics or
advertising. Until iCloud sync is explicitly enabled, it makes no runtime requests to Apple. When
enabled, the app loads CloudKit JS from Apple and exchanges encrypted vault records with CloudKit.
Apple processes account, device, network, and encrypted-record data under its own terms.
DevSecNinja cannot view your vault or recover your passphrase.

The CloudKit web authentication token is configured for session-only use rather than persistence by
the app. Existing Apple sign-in cookies and Apple's own account session remain controlled by Apple
and the browser.

GitHub Pages hosts the static files. As with any website, GitHub and network providers may process
ordinary request metadata such as IP address, user agent, requested asset, time, and diagnostics under
their own policies. That infrastructure handling is separate from the application's encrypted vault.

## Retention and control

Vault retention is controlled by your browser profile and device storage. You can delete the vault in
the app while unlocked or permanently reset the exact encrypted vault from the locked screen without
entering a passphrase. Reset removes only that browser profile's local encrypted vault; it preserves
theme and language preferences, app-shell caches, downloaded files, other browser profiles, and other
devices. Browser deletion is not guaranteed forensic secure erasure, and copies may remain in device
backups or storage snapshots.

Disabling sync leaves the local vault intact. You can either retain the encrypted CloudKit copy for
later reconnection or request its deletion while signed in. Local deletion and CloudKit deletion are
separate deliberate actions. Cloud providers and device backups may retain deleted data according to
their own retention policies.

Exported files are retained wherever you save, copy, synchronize, email, or back them up. Deleting the
browser vault does not delete those files. Losing the vault without a valid backup and matching
passphrase is irreversible.

Anyone who can use the browser profile can intentionally erase its local encrypted vault, even
without the passphrase. This availability tradeoff does not let them decrypt the vault.

## Security limitations

Encryption protects persisted vault and backup contents at rest. It does not protect data displayed
in an unlocked session from a compromised device, browser, extension, same-origin code, screenshot,
memory inspection, weak passphrase, or malicious build. Review the complete
[threat model](docs/privacy-security.md).

## Changes and contact

Material changes to this notice are published in the repository and identified by the application's
version and source commit. For privacy questions, use a public issue only when no personal,
financial, vault, or security information is required. Report vulnerabilities privately according to
[SECURITY.md](SECURITY.md).
