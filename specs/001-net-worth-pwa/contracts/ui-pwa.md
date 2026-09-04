# UI and PWA Contract

## Routes

All routes use hash navigation below the hosting base, so static document navigation always resolves
to `/net-worth-calculator/`.

| Hash route      | Locked behavior                        | Unlocked purpose                           |
| --------------- | -------------------------------------- | ------------------------------------------ |
| `#/`            | Onboarding or unlock                   | Dashboard                                  |
| `#/assets`      | Redirect to unlock with announcement   | Asset list and editor                      |
| `#/liabilities` | Redirect to unlock with announcement   | Liability list and editor                  |
| `#/backup`      | Redirect to unlock with announcement   | Export/import and recovery guidance        |
| `#/settings`    | Theme available; vault controls locked | Currency, theme, passphrase, delete        |
| `#/about`       | Publicly available                     | Privacy, limitations, version/build/source |

Protected-route redirects never place vault state in URL or history.

## Dialog and Form Contract

- Native semantic controls and `<dialog>` or an equivalent focus-trapped implementation are used.
- Opening moves focus to the heading or first invalid field; closing returns focus to the invoker.
- Escape cancels non-destructive dialogs. Destructive confirmation requires an explicit button and,
  for vault deletion/import overwrite, typed confirmation.
- Forms provide labels, descriptions, per-field errors, an error summary linked to invalid fields,
  and preserve user-entered drafts after validation failure.
- Money entry accepts canonical decimal input and announces the selected currency. Visual grouping
  separators are display-only.
- Reordering is available through accessible Move Up/Move Down actions in addition to any pointer
  interaction.

## Dashboard Contract

Every chart is introduced by a heading and concise text summary, is excluded from the accessibility
tree if its SVG is redundant, and is followed by a captioned table with the exact same labels and
values. Color is never the sole distinction; actual/projected/incomplete states use text and
patterns. Range controls update one shared derived dataset.

## Responsive and Motion Contract

- The viewport permits zoom and includes `viewport-fit=cover`.
- Layout reflows without page-level horizontal scrolling from 320 CSS pixels and at 200% zoom.
- Interactive targets are at least 24 by 24 CSS pixels, with 44 pixels preferred for primary touch
  actions.
- Fixed surfaces honor `env(safe-area-inset-*)`.
- `prefers-reduced-motion: reduce` disables non-essential transforms, smooth scrolling, and chart
  animation.
- No route or feature forces orientation.

## Theme Contract

An inline nonce-free external bootstrap script or a minimal parser-safe inline script covered by a
CSP hash applies the stored `light`, `dark`, or current system theme before stylesheet paint. While
System is active, a `matchMedia` change listener updates the effective theme and `color-scheme`.
Changing theme announces the effective mode. Only the preference string is stored outside the vault.

## Locale and Amount Contract

- The supported locale identifiers and labels are `en-US` (English (US)), `en-GB` (English (UK)),
  and `nl-NL` (Nederlands).
- Every user-visible, validation, chart/table, status, dialog, privacy, and accessibility string is a
  required typed catalog key.
- Initial negotiation follows ordered `navigator.languages`; an explicit override persists
  separately and updates `<html lang>`.
- Amount fields show the vault currency code/symbol in visible and accessible context. Input remains
  stable while typing, parses locale syntax on blur/submit, and stores one canonical decimal string.

## Exact-Date Insight Contract

- Inventory editors use exact ISO dates and allow multiple observations per year while rejecting
  duplicate dates.
- As of defaults to the local current date. No observation after that date contributes.
- Asset status is `actual` at the observation date and `carry-forward` afterward, with source date
  and staleness visible. Liability status is `actual` on a manual date and `projected` afterward.
- The exact timeline and December 31 annual view are derived from the same snapshot engine. Every
  chart has an equivalent dated table.

## Install, Offline, and Update Contract

- Install UI appears only after a captured `beforeinstallprompt` event and disappears after install,
  dismissal for the session, or `appinstalled`.
- Online/offline status uses a polite live region and never blocks calculations.
- Offline-ready appears after Workbox confirms caching, without claiming all user data is backed up.
- Update checks run at registration and on throttled hourly, visibility, pageshow, and online
  events.
- Update available remains non-modal. "Later" keeps the current worker. "Update now" first checks
  the global dirty registry; if dirty, a confirmation names the unsaved form before activation.
- The app sends `SKIP_WAITING` only after explicit acceptance through the plugin update callback and
  reloads once under application control.

## Manifest and Asset Contract

- Base-aware `id`, `start_url`, and `scope` resolve to `/net-worth-calculator/`.
- Icons exist as standard 192/512 PNG, maskable 192/512 PNG with safe-zone artwork, Apple 180 PNG,
  and a local SVG favicon.
- The manifest declares `lang`, display, description, categories, and theme/background colors but no
  forced orientation.
- Build verification checks file existence, PNG dimensions, manifest paths, generated service
  worker/precache references, `.nojekyll`, CSP, and absence of source maps in release output.

## Build Identity Contract

The footer and About view render `v{packageVersion} ({shortSha})`; the short SHA links to
`https://github.com/DevSecNinja/net-worth-calculator/commit/{fullSha}`. Development builds show
`dev` only when no Git revision is available. Vault schema, backup format, and cache revisions are
not presented as the app version.
