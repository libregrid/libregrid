# ADR 0001 — Additive module strategy

**Status:** Accepted
**Date:** 2026-08-11

---

## Context

LibreGrid exists to add AG Grid Enterprise-equivalent features to `ag-grid-community`. The how — fork, standalone grid, or additive modules — determined every other architectural decision.

Three facts constrained the choice:
1. **`ag-grid-community` is MIT.** Forking it (200k+ LOC) forfeits upstream fixes and creates a permanent divergence cost.
2. **Community publishes Enterprise contracts.** ~110 interface files, every Enterprise `moduleName`, and DI bean slots for Enterprise beans are all MIT and reachable from the published npm package.
3. **The re-export `export * from './main-internal'` in `src/main.ts`** makes BeanStub, `_ModuleWithApi`, and the CSRM stage interfaces importable by consumers.

### Options considered

| Option | Description |
|---|---|
| **Fork** | Clone and modify `ag-grid-community` directly |
| **Standalone grid** | Build a new grid from scratch |
| **Additive modules** | Register plug-in modules into unmodified `ag-grid-community` |

## Decision

**Additive modules.** LibreGrid ships as MIT npm packages that install alongside stock `ag-grid-community` and register into its module system.

## Consequences

- No fork maintenance burden. Upstream Community updates arrive as normal `npm update`.
- Module registration is explicit (`ModuleRegistry.registerModules`), so tree-shaking works naturally.
- The entire project rests on one re-export line. If it disappears, the strategy is dead.
- Verified empirically against `ag-grid-community@36.1.0` before any feature code was written.
