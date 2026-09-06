# Research: Fix Installed iOS Vault Creation

## Decision 1: Treat the deferred dashboard module as the root failure

**Decision**: Load the dashboard and its static dependency graph before onboarding becomes
interactive instead of dynamically importing it only after a vault has been encrypted and committed.

**Rationale**: The production build was exercised with a real generated service worker, IndexedDB,
Web Crypto, and an iPhone 14 Pro Max-sized standalone-like WebKit context. Healthy local and live
production caches completed both empty and sample creation. Removing only the precached deferred
dashboard module and taking the installed-like context offline reproduced the exact reported
AppErrorBoundary text after the encrypted write. Safe diagnostics were
`TypeError: Importing a module script failed` and the dashboard module request failure. Storage and
cryptography failures are caught by the vault workflow and render inline errors; the lazy module
rejection is the unique unhandled transition after a successful create.

**Alternatives considered**: Reloading or retrying from the error boundary can repeat the failed
module promise and masks the unsafe transition; clearing caches or vault data is destructive;
disabling the service worker removes required offline behavior; changing encryption or persistence
does not address the render failure.

## Decision 2: Keep the encrypted commit sequence unchanged

**Decision**: Continue acquiring the writable lease before creating the document, derive the
non-extractable key, encrypt, atomically compare-and-swap the envelope, and only then publish unlocked
React state.

**Rationale**: The reproduced failure occurs after this sequence succeeds. Changing it would risk
weaker encryption-at-rest or a dashboard that represents an uncommitted vault.

**Alternatives considered**: Publishing state before persistence is success-shaped failure; holding
plaintext in a recovery cache violates the local persistence boundary; lowering PBKDF2 work does not
affect module availability.

## Decision 3: Harden only optional browser capabilities

**Decision**: Use a cryptographically random RFC 4122 identifier fallback when `crypto.randomUUID` is
absent, and create BroadcastChannel through a narrow helper that falls back to data-free storage-event
coordination for vault events and dirty-state update protection when channel construction is
unsupported or security-restricted.

**Rationale**: Current iPhone WebKit exposes both APIs, so neither explains the reproduced
post-creation boundary. They are nevertheless optional conveniences with standards-compatible
alternatives, and direct construction can turn a capability quirk into an unrelated fatal render or
effect error.

**Alternatives considered**: Treating random UUID support as mandatory excludes otherwise capable
browsers; swallowing every BroadcastChannel error hides programming defects; removing coordination
weakens multi-tab behavior.

## Decision 4: Keep required capabilities fail closed

**Decision**: Web Crypto with PBKDF2/AES-GCM/random values, IndexedDB, and writable localStorage remain
required. Their failures stay explicit and do not create, unlock, or claim to save a vault.

**Rationale**: IndexedDB stores the only encrypted envelope, Web Crypto enforces confidentiality and
authentication, and localStorage carries the exclusive writer lease. The current flow acquires the
lease before key derivation and awaits the IndexedDB transaction before showing the dashboard.

**Alternatives considered**: In-memory-only success loses data on close; plaintext fallback violates
the constitution; silently disabling the lease permits concurrent last-writer-wins loss.

## Decision 5: Preserve the generated service-worker lifecycle

**Decision**: Keep prompt-mode updates, revisioned app-shell precaching, no runtime data cache,
`clientsClaim: false`, and `skipWaiting: false`. Make the dashboard a critical startup dependency
rather than adding a runtime cache or forced activation.

**Rationale**: Update policy protects unsaved work and IndexedDB is independent from Cache Storage.
The defect is the post-commit deferred dependency, not the explicit update contract.

**Alternatives considered**: Forced activation can reload dirty work; network-first runtime caching
breaks reliable offline startup and adds no guarantee during an origin outage; broad cache deletion
can strand an installed app.

## Decision 6: Model standalone mode without claiming installation automation

**Decision**: Use WebKit with the iPhone 14 Pro Max CSS screen size, DPR, touch/mobile flags, and user
agent; set `navigator.standalone` and `(display-mode: standalone)` before application code; and run
against built output with the real service worker. Record literal Add to Home Screen testing as a
manual owner check.

**Rationale**: Playwright cannot install a website through the iOS home-screen UI or reproduce iOS
process eviction. It can accurately exercise the application-visible standalone signals, viewport,
input model, service worker, IndexedDB, crypto, offline state, and lifecycle events.

**Alternatives considered**: Desktop WebKit alone misses mobile layout and input behavior; named
future iPhone descriptors are speculative; claiming emulator coverage as physical-device evidence is
misleading.

## Decision 7: Scope the compatibility matrix

**Decision**: Retain the five existing browser projects and add device-only projects for an iPhone 14
Pro Max-sized WebKit context, an iPad Pro 12.9-inch WebKit context, and Chromium at 3840 by 2160.
Device projects run focused specs rather than duplicating every browser test.

**Rationale**: This adds explicit primary-device evidence without multiplying the full privacy, PWA,
and accessibility suites across every viewport. Focused device scenarios include their own
network/privacy, overflow, footer, chart-table, and input checks.

**Alternatives considered**: Running every suite in eight projects adds disproportionate CI time;
replacing generic mobile projects reduces existing breadth; unavailable future device descriptors
would create false precision.

## Platform Path Audit

| Path | Finding | Action |
| ---- | ------- | ------ |
| PBKDF2 and AES-GCM | Completed in local and live WebKit; rejection is already surfaced before unlocked state | Preserve parameters and tests |
| Random generation | `getRandomValues` is mandatory; `randomUUID` is convenience-only | Add RFC 4122 fallback backed by `getRandomValues` |
| IndexedDB | Envelope is string/number-only and clone-safe; writes await transaction completion | Preserve strict atomic compare-and-swap |
| BroadcastChannel | Optional and already conceptually paired with storage events; constructor can be restricted | Centralize narrow feature detection |
| localStorage | Required for the exclusive lease; access errors already prevent creation | Keep fail-closed behavior |
| pagehide | Releases the lease and clears plaintext; persisted envelope is already committed first | Preserve and exercise relaunch |
| service-worker update/control | Prompted activation and versioned precaches are correct | Preserve; include iPhone update coverage |
| focus and dialogs | Native dialog behavior is unrelated to create transition | Retain keyboard/touch checks |
| hash navigation | Static-host-safe and unchanged between standalone/browser modes | Exercise root and protected routes |
| locale and media queries | Supported paths produced no errors in WebKit | Retain locale, reduced-motion, and display-mode assertions |
| storage persistence request | The app does not request durable storage and does not imply it | Document browser eviction boundary |
