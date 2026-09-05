# Deployment and Cloudflare cutover

## Current production state

The `Pages` workflow builds one root-based `dist` artifact from every `main` commit, verifies it, and
deploys those exact bytes to both:

- GitHub Pages, which continues to serve <https://net-worth.ravensberg.org/>;
- Cloudflare Pages at <https://net-worth-calculator-xn8.pages.dev/>.

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

The token needs only Account > Cloudflare Pages > Edit for the owning account. Do not expose either
value in logs, workflow inputs, local environment files, or documentation. The workflow creates the
Pages project when absent, deploys production from `main`, and uses branch deployments for previews.
After a successful production deploy it idempotently registers `net-worth.ravensberg.org` with the
Pages project but does not create, update, or delete DNS. The reusable workflow reports
`cloudflare-custom-domain-status` and `cloudflare-custom-domain-dns-target`; the resolved target is
expected to be `net-worth-calculator-xn8.pages.dev`.

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

## DNS cutover (user action)

Do not perform these steps until the staged `pages.dev` deployment and its latest `main` workflow are
healthy. The current `net-worth.ravensberg.org` DNS record and GitHub Pages custom-domain setting are
intentionally unchanged so GitHub Pages remains production and the ready rollback target.

1. Open the successful `main` Pages workflow summary and confirm the custom-domain registration
   status is `pending`, `initializing`, or `active`. Copy its
   `cloudflare-custom-domain-dns-target` value; the expected value is
   `net-worth-calculator-xn8.pages.dev`.
2. In Cloudflare DNS, edit the existing `net-worth` CNAME in place and set its target to the exact
   workflow-reported value. Do not delete the record, create a second record, or change any other DNS
   entry.
3. Wait until the Pages custom domain reports `active` and its certificate is issued.
4. Verify `https://net-worth.ravensberg.org/` serves the same commit as the successful `main`
   deployment, has a valid HTTPS certificate and the documented security headers, and passes
   `DEPLOYMENT_BASE_URL=https://net-worth.ravensberg.org/ npm run test:deployment`.
5. Confirm installation, online and offline reloads, hash/deep navigation, and explicit update
   prompting in a clean browser profile. Confirm no request uses `/net-worth-calculator/`.

Do not remove the GitHub Pages custom-domain setting during cutover. Keeping it configured makes the
rollback below possible without another repository deployment.

## Rollback

If the custom domain fails after cutover:

1. In Cloudflare DNS, restore the existing `net-worth` CNAME target to `devsecninja.github.io`.
2. Leave the GitHub Pages custom-domain setting as `net-worth.ravensberg.org`.
3. Wait for DNS and TLS to settle, then verify the root URL, manifest, service worker, offline reload,
   and displayed commit.
4. Keep `net-worth-calculator.pages.dev` available for diagnosis; no browser vault migration or data
   movement is involved because each origin keeps its own encrypted local IndexedDB.

After a stable observation period, choose explicitly between retaining dual deployment as a warm
rollback or disabling `github-pages` in the workflow and removing the GitHub Pages custom domain.
Retirement is not part of the staged migration and must not happen implicitly.
