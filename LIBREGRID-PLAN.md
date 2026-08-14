# LibreGrid

> **Enterprise-grade features for AG Grid Community**

MIT licensed.

_LibreGrid is an independent open-source project. It is not affiliated with, endorsed by, or sponsored by AG Grid Ltd. "AG Grid" is a trademark of AG Grid Ltd._

---

## Context Overview & Master Plan

**Read this file first.** It is the entry point to the whole specification.

**Audience:** the engineer (human or agent) writing the code.
**Assumed knowledge:** TypeScript, Angular, npm. **No prior AG Grid knowledge assumed.**
**Rule:** if this specification and your intuition disagree, follow the specification. If it is silent, **stop and ask — do not invent.**

---

## 1. What we are building

`@libregrid/*` — a set of MIT npm packages that install alongside **stock, unmodified `ag-grid-community`** and add AG Grid Enterprise-equivalent features by registering into its module system. New UI is built on Angular Material; a token bridge makes the grid inherit the host app's Material theme.

**This is not a fork.** We never modify, vendor, or republish `ag-grid-community`. Users install both packages.

## 2. Why this is possible

AG Grid Community is MIT, but grouping, aggregation, pivot, SSRM, tool panels, range selection, clipboard, Excel export and charts are gated behind the commercial `ag-grid-enterprise`.

Research (verified 2026-08-11 against npm and `github.com/ag-grid/ag-grid` at `latest`, v36.1.0) established four facts that make this tractable:

1. **Clean license boundary.** MIT: `ag-grid-community`, `ag-stack`, `ag-charts-types`, `ag-grid-angular`, `ag-charts-community`. Commercial: `ag-grid-enterprise` alone.
2. **Community publishes the Enterprise contracts under MIT.** `src/interfaces/` holds ~110 interface files covering essentially every paid feature.
3. **The core is pre-wired for the plug-ins.** `iModule.ts` declares every Enterprise module name; `context.ts` reserves DI bean slots for them under the comment _"Things used in enterprise or elsewhere that we haven't created interfaces for."_
4. **No license gate.** `_registerModule()` only warns on version mismatch. Enforcement lives entirely in the commercial package.

The hard part of any clone — inferring the architecture and reproducing the contracts — is already published under MIT. This reduces "rebuild a 15-year product" to "implement ~20 modules against a known interface."

## 3. Decisions already made — do not revisit

| Decision                 | Choice                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Project name             | **LibreGrid** (see [ADR 0005](docs/adr/0005-project-name.md))                                                    |
| Official tagline         | **"Enterprise-grade features for AG Grid Community"** — see guardrail G4 before writing any other marketing copy |
| npm scope                | ✅ **`@libregrid/*`** — org claimed 2026-08-11                                                                   |
| GitHub org               | ✅ **[github.com/libregrid](https://github.com/libregrid)** — claimed 2026-08-11                                 |
| Domain                   | `libregrid.dev` — ⚠️ not yet registered ([open actions](docs/OPEN-ACTIONS.md) A3)                                |
| CSS class prefix         | `lgr-`                                                                                                           |
| Foundation               | Additive modules on unmodified `ag-grid-community`. No fork.                                                     |
| Workspace                | Nx monorepo + ng-packagr for Angular packages.                                                                   |
| Angular Material         | All new LibreGrid UI on Material + CDK, plus a Material-3-token → grid-theme bridge.                             |
| License                  | MIT.                                                                                                             |
| Target Community version | `>=36.1.0 <37`. Develop against `36.1.0`.                                                                        |
| Angular                  | Peer `>=20.0.0`; develop on 22.x; zoneless-compatible.                                                           |
| Test stack               | Vitest (unit/integration), Playwright (E2E), axe-core (a11y).                                                    |
| Excel writer             | Own SpreadsheetML writer over `fflate`. See `phases/phase-05-excel-export.md`.                                   |

**Rejected:** forking Community (owns ~200k LOC, forfeits upstream fixes); building on `ngx-cerious-widgets` (924 downloads/mo, 3 contributors, zero Enterprise domains); greenfield grid (multi-year before Community parity).

---

## 4. How this specification is organised

```
LIBREGRID-PLAN.md              ← you are here: context + master phase list
docs/
  reference/
    guardrails.md             MUST READ. Legal/safety rules G1-G5.
    api-seams.md              MUST READ. Exact imports, bean pattern, stage slots.
    standards.md              Repo scaffolding, coding rules, test patterns, DoD.
    package-architecture.md   MUST READ. Sharding, deps, tree-shaking, CSS, singleton.
    spike-results.md          ✅ Empirical proof the seams work (run 2026-08-11).
  phases/
    phase-00-foundation.md    … through phase-13-hardening.md
  parity/
    <domain>.md               Living feature checklists (✅/🟡/❌)
  adr/
    0005-project-name.md      Why "LibreGrid" — decided, do not relitigate
  OPEN-ACTIONS.md             Non-phase work: unclaimed assets, open decisions,
                              effort context, agent execution model
```

**Before writing any code, read in this order:**

1. This file
2. `docs/reference/guardrails.md`
3. `docs/reference/api-seams.md`
4. `docs/reference/standards.md`
5. `docs/reference/package-architecture.md`
6. `docs/phases/phase-00-foundation.md`

Each phase file is self-contained and carries its own **Context**, **Todo**, **Test plan**, and **Acceptance criteria**. Work one phase at a time.

---

## 5. Master phase list

Phases are ordered by **dependency**, not preference. **Do not start a phase until the previous phase's acceptance criteria are all met**, except where a phase explicitly declares a narrower dependency set below.

**Approved sequencing exception — SSRM core:** Phase 7 may begin once Phase 0 is complete. It is deliberately independent of Phases 1–6 and is limited to flat, sorted data. This does not advance Phase 9: advanced SSRM remains blocked on Phases 2, 6, 7, and 8.

**Release strategy — decided:** `0.1.0` ships after **Phase 3**, not after Phase 13. Full parity is a 9–18 month effort; shipping a useful subset early is what attracts the users and contributors that make the rest viable. Each later phase ships as its own minor version.

**The repository is public from Phase 0.** Build in the open — guardrails G3 (attribution) and G4 (trademark, incl. taglines) apply to every public surface from the first commit.

- [x] **Phase 0 — Foundation & guardrails** · [`phases/phase-00-foundation.md`](docs/phases/phase-00-foundation.md)
      Nx workspace, CI, contamination guard, conformance matrix, `@libregrid/core`, benchmark baseline. **Contains the critical seam-verification task.**

- [ ] **Phase 1 — Enterprise core, menus & side bar** · [`phases/phase-01-menus-sidebar.md`](docs/phases/phase-01-menus-sidebar.md)
      `@libregrid/menu`, `@libregrid/side-bar`, `@libregrid/material` v1 + theme bridge.

- [ ] **Phase 2 — Row grouping & aggregation** · [`phases/phase-02-row-grouping.md`](docs/phases/phase-02-row-grouping.md)
      The largest phase. Five sequential PRs. Most later features assume it exists.

- [ ] **Phase 3 — Columns tool panel** · [`phases/phase-03-columns-tool-panel.md`](docs/phases/phase-03-columns-tool-panel.md)
      The implementation is complete for column visibility, pinning, search, grouped trees, internal reorder, row groups, and values.
      It also includes the shared column chooser, the standalone row-group panel, keyboard actions, and a Material CDK adapter.
      The panel shows static Pivot Mode and Column Labels placeholders for Phase 8. It does not include pivot controls or pivot mutation.
      Drag into the column-header area, drag options, function-member reorder, tool-panel state restore, and final release work remain open.

> ### 🚀 **`0.1.0` SHIPS HERE — Phases 0–3**
>
> Grouping, aggregation, columns tool panel, menus, side bar, Material theme bridge. Target ~2–3 months.
> **This is the first public release**, not 1.0. It is the most-demanded Enterprise cluster and useful standalone.
> Subsequent phases ship as `0.2`, `0.3`, `0.4` … — see [OPEN-ACTIONS D1](docs/OPEN-ACTIONS.md).

- [ ] **Phase 4 — Cell selection, clipboard & status bar** · [`phases/phase-04-selection-clipboard.md`](docs/phases/phase-04-selection-clipboard.md)
      Ranges, fill handle, Excel-compatible copy/paste, status panels.

- [ ] **Phase 5 — Excel export** · [`phases/phase-05-excel-export.md`](docs/phases/phase-05-excel-export.md)
      Own OOXML writer over `fflate`. Nine sub-PRs.

- [ ] **Phase 6 — Set/Multi filter & filters tool panel** · [`phases/phase-06-filters.md`](docs/phases/phase-06-filters.md)

- [ ] **Phase 7 — Server-Side Row Model (core)** · [`phases/phase-07-ssrm-core.md`](docs/phases/phase-07-ssrm-core.md)
      May begin under the approved SSRM exception once Phase 0's benchmark gate is complete. Stores, block loading, transactions, selection. Flat + sorted only.

- [ ] **Phase 8 — Pivot** · [`phases/phase-08-pivot.md`](docs/phases/phase-08-pivot.md)

- [ ] **Phase 9 — SSRM grouping/pivot & viewport model** · [`phases/phase-09-ssrm-advanced.md`](docs/phases/phase-09-ssrm-advanced.md)

- [ ] **Phase 10 — Tree data & master/detail** · [`phases/phase-10-tree-master-detail.md`](docs/phases/phase-10-tree-master-detail.md)

- [ ] **Phase 11 — Advanced filter, find & rich select** · [`phases/phase-11-advanced-filter-find.md`](docs/phases/phase-11-advanced-filter-find.md)

- [x] **Phase 12 — Integrated charts & sparklines** · [`phases/phase-12-charts.md`](docs/phases/phase-12-charts.md)
      On `ag-charts-community` (MIT).

- [ ] **Phase 13 — Long tail & 1.0 hardening** · [`phases/phase-13-hardening.md`](docs/phases/phase-13-hardening.md)
      Parity audit, a11y sweep, bundle budgets, migration guide, 1.0.0.

---

## 6. Package inventory

| Package                            | Phase | `moduleName`                           |
| ---------------------------------- | ----- | -------------------------------------- |
| `@libregrid/core`                  | 0     | `EnterpriseCore`                       |
| `@libregrid/menu`                  | 1     | `ContextMenu`, `ColumnMenu`            |
| `@libregrid/side-bar`              | 1     | `SideBar`                              |
| `@libregrid/material`              | 1     | — (Angular layer)                      |
| `@libregrid/row-grouping`          | 2     | `RowGrouping`                          |
| `@libregrid/columns-tool-panel`    | 3     | `ColumnsToolPanel`, `RowGroupingPanel` |
| `@libregrid/cell-selection`        | 4     | `CellSelection`                        |
| `@libregrid/clipboard`             | 4     | `Clipboard`                            |
| `@libregrid/status-bar`            | 4     | `StatusBar`                            |
| `@libregrid/excel-export`          | 5     | `ExcelExport`                          |
| `@libregrid/set-filter`            | 6     | `SetFilter`                            |
| `@libregrid/multi-filter`          | 6     | `MultiFilter`                          |
| `@libregrid/filters-tool-panel`    | 6     | `FiltersToolPanel`                     |
| `@libregrid/server-side-row-model` | 7, 9  | `ServerSideRowModel`                   |
| `@libregrid/pivot`                 | 8     | `Pivot`, `PivotModule`                 |
| `@libregrid/viewport-row-model`    | 9     | `ViewportRowModel`                     |
| `@libregrid/tree-data`             | 10    | `TreeData`                             |
| `@libregrid/master-detail`         | 10    | `MasterDetail`                         |
| `@libregrid/advanced-filter`       | 11    | `AdvancedFilter`                       |
| `@libregrid/find`                  | 11    | `Find`                                 |
| `@libregrid/rich-select`           | 11    | `RichSelect`                           |
| `@libregrid/integrated-charts`     | 12    | `IntegratedCharts`                     |
| `@libregrid/sparklines`            | 12    | `Sparklines`                           |
| `@libregrid/angular`               | 13    | — (Angular ergonomics)                 |
| `@libregrid/all`                   | 13    | — (bundle re-export)                   |

---

## 7. Project-wide risks

| Risk                                               | Severity                   | Mitigation                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~Seam symbols not exported from the npm build~~   | ~~Critical~~ → **Retired** | ✅ **Verified 2026-08-11** against `ag-grid-community@36.1.0`: all 18 runtime symbols and all type-only exports resolve, and CSRM invoked a custom `aggStage` bean. See [`spike-results.md`](docs/reference/spike-results.md). Phase 0 Task 0.8 still ships as a permanent CI regression test. |
| Accidental Enterprise contamination                | **Critical**               | G1, enforced mechanically in Phase 0 Task 0.5 with a proven fixture                                                                                                                                                                                                                            |
| `@internal` seams change in a Community minor      | High                       | Nightly conformance matrix; peer `>=36.1.0 <37`; compat release per Community minor                                                                                                                                                                                                            |
| Scope collapse across ~25 packages                 | High                       | Hard phase gates; no phase begins before the prior one's criteria are met                                                                                                                                                                                                                      |
| AG Grid Ltd relicenses Community                   | Medium                     | Not retroactive — released MIT code stays MIT. Archive the last MIT commit; soft fork is the fallback                                                                                                                                                                                          |
| Grouping/agg/pivot perf below Enterprise           | Medium                     | Benchmarks from Phase 0; perf is an acceptance criterion, not a follow-up                                                                                                                                                                                                                      |
| Excel writer underestimated                        | Medium                     | §Phase 5 sub-PR sequence; images/tables/notes explicitly optional                                                                                                                                                                                                                              |
| `ag-charts-community` lacks Enterprise chart types | Low                        | Document the gap; expose a `ChartProvider` seam                                                                                                                                                                                                                                                |

---

## 8. Start here

1. Read `docs/reference/guardrails.md` — **the legal rules are not optional.**
2. Read `docs/reference/api-seams.md` — everything you need to know about how modules attach.
3. Read `docs/reference/standards.md` — scaffolding, coding and test conventions.
4. Open `docs/phases/phase-00-foundation.md` and work its todo list top to bottom.
5. **Run Task 0.8 before writing any feature code.**

When blocked, or when the spec is silent: **ask. Do not invent.**
