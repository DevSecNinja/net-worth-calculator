# Contributing

Thank you for improving Net Worth Calculator. Contributions must preserve its local-only privacy
boundary, deterministic financial behavior, accessibility, and static-host deployment model.

## Before opening an issue

- Search existing issues first.
- Use synthetic values and redact screenshots, logs, filenames, URLs, and browser storage.
- Never publish a real passphrase, `.nwvault` file, decrypted vault, or financial data.
- Report suspected vulnerabilities privately through [SECURITY.md](SECURITY.md), not an issue.

## Development

Use Node.js 24 and npm 11 or newer:

```powershell
mise install
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run dev
```

Do not add remote fonts, runtime CDNs, analytics, telemetry, APIs, hosted persistence, unsafe HTML,
`eval`, or plaintext vault persistence. Prefer browser platform APIs and existing project helpers.
Keep financial calculations pure and decimal-safe, and preserve chart/table equivalence.

## Validation

Run the smallest relevant checks while developing, then the complete gate before submitting:

```powershell
npm run check
npm run test:privacy
npm run test:pwa
npm run test:e2e
```

Tests that need browser integration must run against built `dist`, not a development-only behavior.
Behavior changes require coverage at the lowest effective test level and browser coverage where
storage, cryptography, files, PWA lifecycle, accessibility, or privacy boundaries are involved.

## Pull requests

- Use a Conventional Commit title such as `fix(vault): preserve envelope on failed import`.
- Keep changes focused and document user-visible, privacy/security, and deployment effects.
- Explain validation performed and include only synthetic reproduction data.
- Update documentation when a command, compatibility claim, threat boundary, or behavior changes.
- Do not weaken required checks, action pins, CSP, or privacy assertions to make CI pass.

By contributing, you agree that your contribution is licensed under the repository's MIT License and
that you will follow the [Code of Conduct](CODE_OF_CONDUCT.md).
