# Privacy Notice

**Effective date:** September 3, 2026

Net Worth Calculator is a local-first static application maintained by DevSecNinja. The application
does not create an account and does not operate an application server, hosted database, analytics,
advertising, telemetry, remote font, or runtime third-party API.

## Data handled by the application

You may enter asset and liability names, notes, balances, rates, payments, currency settings, and
multiple exact-date observations. Amounts are stored as locale-neutral canonical decimal strings;
language controls only parsing and display. The complete vault is encrypted and authenticated before it is
written to IndexedDB. The passphrase-derived key and decrypted vault remain in the unlocked page
session and are not intentionally transmitted.

The browser may store non-sensitive theme and explicit language preferences plus short-lived
tab-lease metadata in localStorage. The initial language is derived locally from browser preferences.
Cache Storage contains only static application-shell resources. An exported backup is an encrypted
`.nwvault` file that includes non-sensitive format metadata and an export timestamp.

## Collection and sharing

The application does not collect, sell, share, or use your financial data for analytics or
advertising. It makes no runtime requests to external origins. DevSecNinja cannot view your vault,
recover your passphrase, synchronize your data, or remotely delete a backup.

GitHub Pages hosts the static files. As with any website, GitHub and network providers may process
ordinary request metadata such as IP address, user agent, requested asset, time, and diagnostics under
their own policies. That infrastructure handling is separate from the application's encrypted vault.

## Retention and control

Vault retention is controlled by your browser profile and device storage. You can delete the vault in
the app or clear site data. Browser deletion is not guaranteed forensic secure erasure, and copies may
remain in device backups or storage snapshots.

Exported files are retained wherever you save, copy, synchronize, email, or back them up. Deleting the
browser vault does not delete those files. Losing the vault without a valid backup and matching
passphrase is irreversible.

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
