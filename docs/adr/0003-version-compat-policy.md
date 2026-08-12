# ADR 0003 — Version compatibility policy

**Status:** Accepted
**Date:** 2026-08-11

---

## Context

LibreGrid depends on `@internal` seams in `ag-grid-community` that are explicitly marked unstable (G5). Every Community minor release could break them. Without a version policy, users experience silent breakage — `_registerModule` logs a warning on version mismatch but still registers the module, so drift fails loudly in the console yet silently in behaviour.

Additionally, `@libregrid/core` must be a singleton in the application. Two copies break the module registry (package-architecture.md §7).

## Decision

1. **Peer range:** Every package declares `"ag-grid-community": ">=36.1.0 <37"`. Never widen this speculatively.
2. **Version single-source:** `VERSION` is derived from the installed `ag-grid-community/package.json` at build time via `tools/version/generate.mjs`. No hand-maintained constant.
3. **CI enforcement:** `tools/version/check.mjs` fails the build on drift. Runs on every commit.
4. **Conformance matrix:** `tools/conformance/matrix.mjs` runs the full suite against each supported version. Nightly CI detects seam churn.
5. **Core singleton:** Runtime duplicate guard + CI check that no two workspace packages resolve different core ranges.
6. **Compatibility releases:** Every Community minor gets a LibreGrid compatibility release within one week. This is a project commitment, not a CI guarantee.

## Consequences

- Users never hit the silent-drift bug: CI catches it before a package is published.
- Adding a new Community minor to the matrix is the only step needed to widen the peer range.
- The cost is per-minor CI maintenance. That cost is bounded by the narrow peer range.
