# Installed iOS Vault Creation Contract

## Startup Readiness

1. Serve the production-built app shell and all critical route modules through the generated service
   worker.
2. Do not expose an operable onboarding form until the code required for the first unlocked dashboard
   is loaded.
3. Keep optional local messaging unavailable when it cannot be constructed; retain storage-event
   coordination and fail on unexpected implementation errors.

## Create Commit Sequence

1. Validate the passphrase pair and selected currency without persisting either.
2. Acquire the exclusive writable-session lease.
3. Construct and validate an empty or localized sample vault.
4. Derive the existing PBKDF2 key using a fresh random salt.
5. Encrypt with the existing AES-GCM parameters and fresh IV.
6. Atomically compare the absent IndexedDB key and write the envelope.
7. Recheck operation generation and lease ownership.
8. Publish the in-memory vault/key and unlocked state.
9. Render the already-loaded empty or populated dashboard.

Any failure before step 6 leaves no envelope. Any failed/obsolete operation after step 6 must not
pretend that an unlocked session exists. No step writes plaintext outside memory.

## Standalone Emulation Contract

- WebKit uses a 430 by 932 CSS viewport, 430 by 932 screen, DPR 3, mobile input, touch, and an iPhone
  user agent for the iPhone 14 Pro Max profile.
- Application code observes `navigator.standalone === true` and
  `matchMedia('(display-mode: standalone)').matches === true`.
- The generated production service worker, Cache Storage, IndexedDB, and Web Crypto remain enabled.
- Tests capture page errors, console errors, unhandled promise rejections, and failed asset requests
  without serializing user input or persisted values.
- Tests fail immediately if the fatal boundary text appears.
- This contract does not claim to automate Safari's Add to Home Screen UI, iOS process suspension, or
  physical-device cache eviction.

## Lifecycle Contract

- Empty and sample creation each start from a fresh browser context.
- Lock and reload show the locked screen; the original passphrase unlocks the same vault.
- Once the service worker controls the page, an offline launch can load, unlock, and render the
  dashboard.
- A controlled missing deferred-module scenario after startup cannot strand a newly committed vault.
- Explicit update activation remains prompted and preserves the encrypted envelope.

## Device Layout Contract

- iPhone portrait checks span 430 through 480 CSS pixels, with a selected 932 by 430 landscape and
  large-text check; none has page-level horizontal overflow, clipped primary controls, unsafe
  footer/status overlap, or sub-24-pixel interactive targets.
- iPad Pro 12.9-inch checks use 1024 by 1366 portrait and 1366 by 1024 landscape CSS viewports with
  touch input.
- Desktop 4K checks use 3840 by 2160 and require bounded primary content and chart widths.
- Every chart retains a visible heading and an operable equivalent data-table disclosure.

## Privacy Contract

- Runtime requests are same-origin `GET` or `HEAD` app-shell requests only.
- Passphrases and unique financial markers never appear in requests, URLs, console output,
  localStorage, sessionStorage, or Cache Storage.
- IndexedDB contains exactly the versioned encrypted envelope shape.
- Test diagnostics never print the passphrase, financial marker, or ciphertext.
