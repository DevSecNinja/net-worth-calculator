# Deployment and Cloudflare cutover

## Current production state

The `Pages` workflow builds one root-based `dist` artifact from every `main` commit, verifies it, and
deploys those exact bytes to both:

- Cloudflare Pages at <https://net-worth.ravensberg.org/> and
  <https://net-worth-calculator-xn8.pages.dev/>;
- GitHub Pages, which remains deployed as the rollback target.

Same-repository pull requests receive isolated Cloudflare preview deployments. Closing a pull request
deletes its preview deployments. Fork pull requests do not receive repository secrets and therefore
skip preview deployment while the required `CI` workflow still runs normally.

The Cloudflare project is a Direct Upload project named `net-worth-calculator`, with `main` as its
production branch and `dist` as the uploaded artifact. It contains static assets only: there are no
Pages Functions, Workers, bindings, databases, analytics, or Web Analytics.

## Deployment credentials

The reusable workflow receives two repository Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`;
- `CLOUDFLARE_API_TOKEN`.

The token needs Account > Cloudflare Pages > Edit, Zone > Zone > Read, and Zone > DNS > Edit for
`ravensberg.org`. Do not expose either value in logs, workflow inputs, local environment files, or
documentation. The workflow creates the Pages project when absent, deploys production from `main`, and
uses branch deployments for previews. After a successful production deploy it idempotently registers
`net-worth.ravensberg.org`, resolves the exact project `pages.dev` target, and manages the DNS record.
The reusable workflow reports `cloudflare-custom-domain-status`,
`cloudflare-custom-domain-dns-target`, and `cloudflare-custom-domain-dns-action`; the expected target
is `net-worth-calculator-xn8.pages.dev`, and the DNS action is `created` on first cutover or `no-op` on
an already-matching later run.

## Verify a deployment

Run the deployed-site gate against the production or preview root:

```powershell
$env:DEPLOYMENT_BASE_URL = "https://net-worth-calculator-xn8.pages.dev/"
npm run test:deployment
```

The gate checks root and deep/hash navigation, hashed assets, the root manifest identity/scope/start
URL, service-worker delivery and offline reload, response CSP/security headers, old project-path
absence, and browser-local handling of unique financial markers across desktop Chromium, Firefox,
WebKit, mobile Chromium, and mobile WebKit. The normal `npm run test:pwa` gate separately exercises an
actual opt-in service-worker update from one build to the next, including dirty-state protection and
old-cache cleanup; production and previews receive that exact verified artifact.

## Automated DNS cutover

DNS management is enabled only for non-pull-request production runs. After Cloudflare production and
custom-domain registration succeed, the pinned central workflow:

1. resolves exactly one active `ravensberg.org` zone in the configured account;
2. resolves the deployed project's collision-safe `pages.dev` target;
3. creates a proxied CNAME for `net-worth.ravensberg.org` only when the exact hostname has no record;
4. performs a no-op only for one CNAME with the exact target and requested proxy state;
5. fails without creating, replacing, or updating anything when a record conflicts or is duplicated;
6. polls custom-domain activation for a bounded period and reports its final status.

Open the successful `main` Pages workflow summary and confirm the resolved project is
`net-worth-calculator-xn8`, the target is `net-worth-calculator-xn8.pages.dev`, the DNS action is
`created` or `no-op`, and the Pages domain status is `active`. Then verify
`https://net-worth.ravensberg.org/` serves the successful commit, has a valid HTTPS certificate, and
passes `DEPLOYMENT_BASE_URL=https://net-worth.ravensberg.org/ npm run test:deployment`.

Do not manually overwrite a conflicting record. A conflict or a Zone Read/DNS Edit authorization
failure is a blocked deployment that must be investigated without weakening the workflow safeguards.

Do not remove the GitHub Pages custom-domain setting during cutover. Keeping it configured makes the
rollback below possible without another repository deployment.

## Rollback

If the custom domain fails after cutover:

1. In a reviewed PR, change `cloudflare-manage-dns` in `.github/workflows/pages.yml` to `false` and
   merge it before changing the workflow-managed record.
2. In Cloudflare DNS, change the `net-worth` CNAME target to `devsecninja.github.io`.
3. Leave the GitHub Pages custom-domain setting as `net-worth.ravensberg.org`.
4. Wait for DNS and TLS to settle, then verify the root URL, manifest, service worker, offline reload,
   and displayed commit.
5. Keep `net-worth-calculator-xn8.pages.dev` available for diagnosis; no browser vault migration or data
   movement is involved because each origin keeps its own encrypted local IndexedDB.

After a stable observation period, choose explicitly between retaining dual deployment as a warm
rollback or disabling `github-pages` in the workflow and removing the GitHub Pages custom domain.
Retirement is not part of the staged migration and must not happen implicitly.
