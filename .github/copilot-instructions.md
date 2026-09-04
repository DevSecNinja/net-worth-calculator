# Copilot instructions

- Use Node.js 24 and npm. Install with `npm ci`; do not substitute another package manager.
- The app is a static React/TypeScript/Vite PWA. `src/domain` is pure financial logic, `src/storage`
  owns cryptography/persistence/files, `src/features` owns workflows, and `src/pwa` owns lifecycle.
- Preserve the local-only boundary: no APIs, analytics, telemetry, remote assets, plaintext vault
  persistence, user data in logs/URLs/cache, unsafe HTML, or `eval`.
- IndexedDB may contain only the versioned AES-GCM cipher envelope. Keep derived keys and plaintext in
  the unlocked session; Cache Storage is app-shell only.
- GitHub Pages uses `/net-worth-calculator/`; `npm run build` emits `dist`. Root hosting requires
  `VITE_BASE_PATH=/`.
- Reuse existing typed helpers and validation. Keep money calculations decimal-safe, deterministic,
  pure, and covered for boundaries.
- Preserve keyboard/screen-reader/reflow/reduced-motion behavior and equivalent chart data tables.
- Validate with `npm run check`, then relevant `npm run test:privacy`, `npm run test:pwa`, and
  `npm run test:e2e` browser gates.
- Use Conventional Commits. Pin GitHub Actions and reusable workflows to immutable full SHAs.
