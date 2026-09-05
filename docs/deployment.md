# Deployment and Cloudflare cutover

## Current production state

The `Pages` workflow builds one root-based `dist` artifact from every `main` commit, verifies it, and
deploys those exact bytes to both:

- Cloudflare Pages at <https://net-worth.ravensberg.org/> and
  <https://net-worth-calculator-xn8.pages.dev/> through user-managed DNS;
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

The token needs only **Account > Cloudflare Pages > Edit** for the owning account. It intentionally
has no Zone Read or DNS Edit permission. Do not expose either value in logs, workflow inputs, local
environment files, or documentation. The workflow creates the Pages project when absent, deploys
production from `main`, and uses branch deployments for previews. After a successful production
deploy it idempotently registers `net-worth.ravensberg.org` and resolves the exact project
`pages.dev` target. The reusable workflow reports `cloudflare-custom-domain-status` and
`cloudflare-custom-domain-dns-target`; the expected target is
`net-worth-calculator-xn8.pages.dev`. It never reads or mutates DNS for this consumer.

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

## Manual DNS cutover

DNS is intentionally a user-operated control plane. The workflow registers and maintains the Pages
custom domain, but the repository does not opt in to the central workflow's DNS mutation feature.
This keeps the deployment token scoped to Pages and ensures Actions cannot read or change any record
in `ravensberg.org`. The production cutover uses exactly this user-managed record: name `net-worth`,
type `CNAME`, target `net-worth-calculator-xn8.pages.dev`.

For a new cutover or later maintenance:

1. Open the successful `main` Pages workflow summary and confirm the resolved project is
   `net-worth-calculator-xn8`, the custom domain is registered, and the reported target is
   `net-worth-calculator-xn8.pages.dev`.
2. In Cloudflare DNS, create or update exactly this record: name `net-worth`, type `CNAME`, target
   `net-worth-calculator-xn8.pages.dev`. The user decides the proxy setting and owns the change.
3. Wait until the Pages custom domain reports `active` and its HTTPS certificate is issued.
4. Verify `https://net-worth.ravensberg.org/` serves the successful commit and passes
   `DEPLOYMENT_BASE_URL=https://net-worth.ravensberg.org/ npm run test:deployment`.

Do not remove the GitHub Pages custom-domain setting during cutover. Keeping it configured makes the
rollback below possible without another repository deployment.

## Rollback

If the custom domain fails after cutover:

1. In Cloudflare DNS, change the `net-worth` CNAME target to `devsecninja.github.io`.
2. Leave the GitHub Pages custom-domain setting as `net-worth.ravensberg.org`.
3. Wait for DNS and TLS to settle, then verify the root URL, manifest, service worker, offline reload,
   and displayed commit.
4. Keep `net-worth-calculator-xn8.pages.dev` available for diagnosis; no browser vault migration or data
   movement is involved because each origin keeps its own encrypted local IndexedDB.

After a stable observation period, choose explicitly between retaining dual deployment as a warm
rollback or disabling `github-pages` in the workflow and removing the GitHub Pages custom domain.
Retirement is not part of the staged migration and must not happen implicitly.
