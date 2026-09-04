# Security Policy

## Supported versions

Only the latest published release is supported with security fixes. Older releases are unsupported.
Code on `main` is pre-release development and may receive fixes before the next release but has no
separate support guarantee.

| Version        | Supported |
| -------------- | --------- |
| Latest release | Yes       |
| Older releases | No        |

## Report a vulnerability privately

**Do not open a public issue or discussion.**

Use GitHub's private vulnerability reporting from this repository's **Security** tab and select
**Report a vulnerability**:

<https://github.com/DevSecNinja/net-worth-calculator/security/advisories/new>

If private reporting is unavailable, contact the repository owner privately through
<https://github.com/DevSecNinja>. Do not send secrets through a public channel.

Include the affected version/commit, impact, reproducible steps using synthetic data, and any proposed
mitigation. Never attach a real passphrase, encrypted or decrypted vault, backup file, financial
record, browser profile, or sensitive screenshot.

You should receive acknowledgement within 48 hours. Timing for remediation and disclosure depends on
severity, reproducibility, and release risk. Please allow a reasonable remediation period before
public disclosure. Credit is offered unless anonymity is requested.

## In scope

Examples include plaintext vault or backup disclosure, unexpected network transmission, cryptographic
authentication bypass, destructive import behavior, cross-tab overwrite, service-worker cache leakage,
unsafe update activation, XSS, CSP bypass caused by the application, or a vulnerable release pipeline.

General financial advice, expected browser/operating-system behavior, forgotten passphrase recovery,
compromised devices/extensions, and denial of service requiring control of the user's browser profile
are normally outside the vulnerability program unless they expose a distinct application flaw.
