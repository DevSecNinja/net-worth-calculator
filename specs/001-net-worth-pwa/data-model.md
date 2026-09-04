# Data Model: Private Net Worth PWA

## Serialization Rules

- All persisted application data is one UTF-8 JSON vault document encrypted as one AES-GCM
  ciphertext. IndexedDB never stores the entities below separately.
- Identifiers are random UUID strings. Dates are ISO `YYYY-MM-DD`; timestamps are ISO UTC strings;
  calendar years are integers from 1900 through 2200.
- Money is a canonical non-negative decimal string with no grouping separator, exponent, sign, or
  excess precision. The accepted maximum is `999999999999.99`; display rounding follows the base
  currency.
- Percent rates are canonical decimal strings from `0` through `100`. User-entered text is trimmed;
  notes are capped at 2,000 characters and names/types at 100.
- Unknown fields are rejected at import trust boundaries. Migrations explicitly transform one known
  schema version at a time before current-schema validation.

## Persisted Cipher Envelope

```ts
interface CipherEnvelopeV1 {
  format: 'net-worth-vault';
  formatVersion: 1;
  vaultSchemaVersion: 1;
  kdf: {
    name: 'PBKDF2';
    hash: 'SHA-256';
    iterations: 600000;
    salt: string; // 16 random bytes, base64url
  };
  cipher: {
    name: 'AES-GCM';
    iv: string; // 12 random bytes, base64url
    tagLength: 128;
  };
  ciphertext: string; // base64url, includes authentication tag
}
```

`format`, `formatVersion`, `vaultSchemaVersion`, and canonical KDF/cipher parameters form the
additional authenticated data. The envelope contains no activity timestamps, display name, item
count, currency, financial value, passphrase verifier, hint, or source filename.

## Vault

| Field           | Type          | Rules                                                 |
| --------------- | ------------- | ----------------------------------------------------- |
| `schemaVersion` | `1`           | Migrated independently from envelope format           |
| `id`            | UUID          | Created once; encrypted                               |
| `revision`      | integer       | Starts at 1; increments after each committed mutation |
| `createdAt`     | ISO timestamp | Immutable                                             |
| `updatedAt`     | ISO timestamp | Updated for committed mutations                       |
| `settings`      | VaultSettings | Exactly one                                           |
| `assets`        | Asset[]       | Unique IDs and `order`, maximum 500 combined items    |
| `liabilities`   | Liability[]   | Unique IDs and `order`, maximum 500 combined items    |

### State Transitions

```text
absent -> creating -> unlocked -> locked -> unlocked
unlocked -> changing passphrase -> unlocked
locked/unlocked -> deleting -> absent
locked -> importing/validating -> overwrite confirmation -> unlocked
any transient failure -> previous stable state
```

Plaintext and `CryptoKey` references are destroyed on `locked`, `absent`, page reload, page close,
or lost lease. Failed transitions never replace the previous envelope.

## VaultSettings

| Field                   | Type                 | Rules                                                 |
| ----------------------- | -------------------- | ----------------------------------------------------- |
| `baseCurrency`          | ISO 4217 string      | Exactly one; default inferred locally, fallback `USD` |
| `locale`                | string or `"system"` | Formatting only; no remote lookup                     |
| `createdWithSampleData` | boolean              | True only after explicit action                       |

Changing currency reinterprets stored numeric amounts; it does not convert them. The confirmation
must state this explicitly.

## Asset

| Field                    | Type                         | Rules                           |
| ------------------------ | ---------------------------- | ------------------------------- |
| `id`                     | UUID                         | Unique within vault             |
| `order`                  | integer                      | Dense order within assets       |
| `classification`         | `"current"` or `"long-term"` | Required                        |
| `type`                   | AssetType                    | Required built-in or `"custom"` |
| `customType`             | string or absent             | Required only for custom        |
| `name`                   | string                       | 1-100 characters                |
| `notes`                  | string                       | 0-2,000 characters              |
| `values`                 | YearValue[]                  | Unique year, manual source only |
| `createdAt`, `updatedAt` | ISO timestamps               | Encrypted audit metadata        |

`AssetType` is `checking`, `savings`, `cash`, `stocks`, `bonds`, `fund`, `retirement`, `property`,
`vehicle`, `business`, `crypto`, `valuables`, or `custom`.

Missing asset years remain absent. Aggregation excludes the asset for that year and reports
incompleteness rather than carrying another year's value.

## Liability

| Field                    | Type               | Rules                                   |
| ------------------------ | ------------------ | --------------------------------------- |
| `id`                     | UUID               | Unique within vault                     |
| `order`                  | integer            | Dense order within liabilities          |
| `type`                   | LiabilityType      | Required built-in or `"custom"`         |
| `customType`             | string or absent   | Required only for custom                |
| `name`                   | string             | 1-100 characters                        |
| `principal`              | MoneyString        | Current/principal balance               |
| `annualInterestRate`     | RateString         | 0-100 percent                           |
| `monthlyPayment`         | MoneyString        | May be zero only for zero balance       |
| `startDate`              | ISO date or absent | Defaults to current date for projection |
| `termMonths`             | integer or absent  | 1-1,200 months                          |
| `notes`                  | string             | 0-2,000 characters                      |
| `manualBalances`         | YearValue[]        | Unique December 31 actual balances      |
| `createdAt`, `updatedAt` | ISO timestamps     | Encrypted audit metadata                |

`LiabilityType` is `mortgage`, `personal-loan`, `student-loan`, `credit-card`, `vehicle-loan`,
`tax-debt`, or `custom`.

Projection status is derived, never persisted:

- `projected`: a monthly schedule produced a December 31 balance;
- `actual`: a manual balance exists for that year;
- `paid-off`: the balance reached zero;
- `non-amortizing`: payment does not exceed monthly interest;
- `invalid`: schedule fields contradict validation rules.

## YearValue

| Field       | Type          | Rules                                      |
| ----------- | ------------- | ------------------------------------------ |
| `year`      | integer       | 1900-2200; unique within parent collection |
| `amount`    | MoneyString   | Non-negative and bounded                   |
| `updatedAt` | ISO timestamp | Encrypted                                  |

Manual values always represent the end of December 31. A liability manual value becomes the opening
balance for January 1 of the following year.

## Derived DashboardSnapshot

| Field                 | Type                            | Meaning                                              |
| --------------------- | ------------------------------- | ---------------------------------------------------- |
| `year`                | integer                         | Selected calendar year                               |
| `assets`              | MoneyString                     | Sum of explicit asset values                         |
| `liabilities`         | MoneyString                     | Sum of actual/projected liability balances           |
| `netWorth`            | MoneyString                     | Assets minus liabilities; may be negative            |
| `yearlyChange`        | MoneyString or undefined        | Current minus previous complete snapshot             |
| `yearlyChangePercent` | decimal string or undefined     | Undefined for zero/missing prior value               |
| `cagr`                | decimal string or undefined     | Defined only across >0 years with positive endpoints |
| `completeness`        | complete/incomplete             | Incomplete when any tracked asset lacks a value      |
| `liabilitySource`     | actual/projected/mixed          | Semantic status for totals                           |
| `assetAllocation`     | category/value[]                | Explicit values only                                 |
| `payoff`              | liability/year/balance/status[] | Projection series                                    |

Snapshots and chart series are recomputed from the unlocked vault and never persisted or cached.

## ThemePreference

Stored separately because it is non-sensitive:

```ts
type ThemePreference = 'light' | 'dark' | 'system';
```

The effective theme is derived from `prefers-color-scheme` only for `system`.

## TabLease

Stored as non-sensitive localStorage metadata:

```ts
interface TabLease {
  owner: string; // random per-tab UUID
  expiresAt: number;
}
```

The active tab refreshes the lease. A write also requires matching vault revision, so lease races
cannot silently overwrite newer ciphertext.

## BackupEnvelope

The portable file wraps exactly one `CipherEnvelopeV1` plus non-sensitive format metadata:

```ts
interface BackupEnvelopeV1 {
  format: 'net-worth-backup';
  formatVersion: 1;
  exportedAt: string;
  payload: CipherEnvelopeV1;
}
```

No original filename, machine/browser data, item count, currency, account name, or value is stored.
The JSON contract is defined in `contracts/backup-envelope.schema.json`.

## Migration Policy

1. Validate the outer envelope against its exact format version.
2. Authenticate/decrypt without modifying IndexedDB.
3. Parse the plaintext JSON with a size/depth-bounded parser input.
4. Apply sequential pure migrations (`v1 -> v2`, never skipping versions).
5. Validate the current Vault schema.
6. Re-encrypt with current parameters.
7. Request overwrite confirmation.
8. Commit one IndexedDB transaction and open as a new unlocked session.

Unsupported future versions and any failure before step 8 leave the current envelope unchanged.
