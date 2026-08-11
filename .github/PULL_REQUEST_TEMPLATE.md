## What & why

<!-- What does this change, and which phase/sub-PR does it belong to? -->

**Phase:** <!-- e.g. Phase 2, PR 2.2 — link docs/phases/phase-02-row-grouping.md -->

## Todo items completed

<!-- Tick the boxes you completed in the phase file, and tick them there too. -->

- [ ]

## Definition of Done

- [ ] Unit tests pass, ≥85% coverage on new code
- [ ] **At least one integration test against a real grid** (unit tests do not prove the seam works)
- [ ] Playwright E2E for any mouse-driven surface
- [ ] Working route in `apps/docs`
- [ ] `docs/parity/<domain>.md` updated — every ❌ has a rationale
- [ ] `npm run verify` green
- [ ] Bundle budgets met; no other `@libregrid/*` package leaks in
- [ ] axe-core: 0 violations, light and dark
- [ ] `NOTICE` + README attribution present in any new package
- [ ] Changeset added

## Guardrails

- [ ] **G1** — I have not read, installed or referenced `ag-grid-enterprise` in any form
- [ ] **G4** — no new user-facing wording implies affiliation with AG Grid Ltd
- [ ] Any new `agXxx` identifiers are ones Community's closed unions require, not invented

## Notes for reviewers

<!-- Anything surprising, deliberately deferred, or worth a closer look. -->
