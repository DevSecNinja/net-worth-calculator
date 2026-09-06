# Clarifications: Reset a Locked Local Vault

**Date**: 2026-09-05

No critical ambiguities required user clarification. The feature description already fixes the
security boundary, destructive warning content, typed confirmation, concurrency behavior,
cross-tab outcome, localization matrix, persistence scope, and delivery gates.

Planning adopts these explicit interpretations:

- The captured encrypted envelope itself is the deletion authorization token; no decrypted
  identifier is available or needed.
- The existing writable-session lease is reused for locked deletion and held until the atomic
  compare-and-delete commits or fails.
- A cross-tab deletion event contains only a constant event type; recipients re-read local storage
  before changing state.
- Confirmation uses the localized imperative shown in the dialog (`DELETE` in English and
  `VERWIJDEREN` in Dutch).
