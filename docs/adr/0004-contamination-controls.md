# ADR 0004 — Contamination controls (G1 enforcement)

**Status:** Accepted
**Date:** 2026-08-11

---

## Context

Guardrail G1 prohibits reading, downloading, decompiling or referencing `ag-grid-enterprise` in any form. This is the project's legal foundation: LibreGrid must be a demonstrably clean-room implementation built against MIT-published interfaces.

A rule enforced by discipline will eventually be broken by a tired engineer or an AI agent that decides "just looking once" is fine. Mechanical enforcement is not optional.

## Decision

Three layers of enforcement, each catching what the previous layer misses:

### Layer 1 — ESLint (edit time)
`eslint.config.mjs` uses `no-restricted-imports` to block:
- `ag-grid-enterprise` and `ag-charts-enterprise` imports
- `ag-grid-community/dist/*` and `ag-grid-community/src/*` deep imports

Fails in the editor before a commit exists.

### Layer 2 — Standalone scanner (commit/CI time)
`tools/check-contamination/bin.mjs` scans all non-prose files for:
- The strings `ag-grid-enterprise`, `ag-charts-enterprise`, `@ag-grid-enterprise`
- Installed `node_modules/ag-grid-enterprise` directory existence

The scanner allows:
- Markdown files (prose cannot import)
- Its own source (the rule must name what it forbids)
- `eslint.config.mjs` (same reason)
- `node_modules/ag-grid-community` (its validation messages name the enterprise module)

### Layer 3 — Proved-to-fire fixture
`__fixtures__/violation.ts.txt` contains an offending import. `bin.spec.ts` asserts the scanner *does* flag it. A guard never proven to fire is not a guard.

### CI ordering
The contamination job runs **first** and blocks every other job.

## Consequences

- Three orders of magnitude between the fastest and slowest detection paths
- CI becomes the authoritative audit trail
- A contaminated PR cannot pass CI, period
