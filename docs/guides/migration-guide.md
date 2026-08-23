# Migrating from `ag-grid-enterprise` to LibreGrid

LibreGrid adds AG Grid Enterprise-equivalent features to **stock, unmodified
`ag-grid-community`**. You keep the grid you already have — same `ag-grid-community`,
same `ag-grid-angular`, same grid options. You swap only the module registration.

LibreGrid is an independent open-source project. It is not affiliated with AG Grid Ltd.

## The five-minute migration

Before:

```ts
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import {
  RowGroupingModule,
  MenuModule,
  ColumnsToolPanelModule,
  // ... every other Enterprise feature you use
} from 'ag-grid-enterprise';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, MenuModule, ColumnsToolPanelModule]);
```

After:

```ts
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { ContextMenuModule, ColumnMenuModule } from '@libregrid/menu';
import { ColumnsToolPanelModule } from '@libregrid/columns-tool-panel';

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowGroupingModule,
  ContextMenuModule,
  ColumnMenuModule,
  ColumnsToolPanelModule,
]);
```

Install the packages you need alongside `ag-grid-community` (it stays a peer dependency):

```bash
npm i ag-grid-community @libregrid/row-grouping @libregrid/menu @libregrid/columns-tool-panel
```

That is the whole migration for most applications: **no grid code changes**.
LibreGrid registers into the same module seams and bean slots that Community already
declares. Registration performs no license check. The grid behaves exactly as it does
with the commercial package for the features listed here.

## Module-by-module mapping

| Enterprise module | LibreGrid package | Notes |
| --- | --- | --- |
| `EnterpriseCore` | `@libregrid/core` | Dependency of every feature module; never imported by hand |
| `ContextMenu` | `@libregrid/menu` | |
| `ColumnMenu` | `@libregrid/menu` | |
| `SideBar` | `@libregrid/side-bar` | |
| `ColumnsToolPanel` | `@libregrid/columns-tool-panel` | |
| `RowGroupingPanel` | `@libregrid/columns-tool-panel` | Standalone row-group panel ships with the columns tool panel |
| `RowGrouping` | `@libregrid/row-grouping` | Grouping, aggregation, totals, show-values-as |
| `CellSelection` | `@libregrid/cell-selection` | Ranges and the fill handle (Enterprise's range selection is folded into cell selection in v36) |
| `Clipboard` | `@libregrid/clipboard` | Excel-compatible TSV copy/cut/paste |
| `StatusBar` | `@libregrid/status-bar` | |
| `SetFilter` | `@libregrid/set-filter` | |
| `MultiFilter` | `@libregrid/multi-filter` | |
| `FiltersToolPanel` | `@libregrid/filters-tool-panel` | |
| `ServerSideRowModel` | `@libregrid/server-side-row-model` | Full and lazy stores, grouping, pivot, analytical requests |
| `Pivot` | `@libregrid/pivot` | Client-side pivot on Community's CSRM |
| `ViewportRowModel` | `@libregrid/viewport-row-model` | |
| `TreeData` | `@libregrid/tree-data` | |
| `MasterDetail` | `@libregrid/master-detail` | |
| `AdvancedFilter` | `@libregrid/advanced-filter` | |
| `Find` | `@libregrid/find` | |
| `RichSelect` | `@libregrid/rich-select` | |
| `IntegratedCharts` | `@libregrid/integrated-charts` | Built on MIT `ag-charts-community` — see the chart gaps below |
| `Sparklines` | `@libregrid/sparklines` | |
| `ExcelExport` | `@libregrid/excel-export` | `.xlsx` export; cell images, Excel tables and cell notes are not included (see the [gap list](../parity/gap-list.md)) |
| `Toolbar` | `@libregrid/toolbar` | Quick Access Toolbar; quick-filter, find, row-group, pivot, menu items |
| `RowNumbers` | `@libregrid/row-numbers` | Row-number column with cell-selection integration and row resizer |
| `ColumnHeaderEdit` | `@libregrid/column-header-edit` | Editable header names (`headerNameEditable`), live or deferred apply |
| `BatchEdit` | `@libregrid/batch-edit` | `startBatchEdit`/`commitBatchEdit`/`cancelBatchEdit`/`isBatchEditing` over Community's edit service (Phase 17) |
| `CalculatedColumns` | `@libregrid/calculated-columns` | `calculatedExpression` columns, dialog, Grid State round-trip (Phase 18) |
| `PdfExport` | — | **Not planned.** See the [gap list](../parity/gap-list.md) |
| `Notes` | `@libregrid/notes` | Cell and full-width-row notes: `notesDataSource`, hover/click/`Shift+F2`, read-only notes, `suppressNoteActions`, context-menu items (Phase 15) |
| AI toolkit | — | Post-1.0 candidate; see the [gap list](../parity/gap-list.md) |

LibreGrid-only packages with no Enterprise equivalent:

| Package | Purpose |
| --- | --- |
| `@libregrid/material` | Angular Material theme bridge and Material renderers for menus, side bar, status bar, rich select |
| `@libregrid/angular` | Angular signal ergonomics: `provideLibreGrid(...)`, `createGridApiSignals(...)`, typed helpers |
| `@libregrid/all` | Convenience barrel re-exporting every module — for quick starts and demos only; prefer per-feature imports so your bundle contains exactly what you use |

## What is identical

- The grid instance, its options, events and API are `ag-grid-community`'s own. Nothing is forked.
- Module names match Enterprise's names. Code that checks `ModuleName` or registers
  modules by name keeps working.
- Version compatibility follows Community. LibreGrid peers on `ag-grid-community >=36.1.0 <37`.
  Every package ships a generated `VERSION` pinned to the installed Community version.

## What differs

- **Charts** are drawn by MIT `ag-charts-community`. Chart types that exist only in the
  commercial AG Charts are not available. The gap is documented in
  [`integrated-charts.md`](../parity/integrated-charts.md) and the gap list.
- **UI shells** (menus, side bar, tool panels, status bar) are framework-neutral components
  with optional Angular Material renderers. Install `@libregrid/material` for a Material look.
- **Performance characteristics** can differ per feature. Benchmarks run against a Phase-0
  baseline in CI (see `apps/bench`).

## What is missing

The per-feature checklists under [`docs/parity/`](../parity/) track every
unimplemented or partially implemented option, with a written rationale. The
[gap list](../parity/gap-list.md) summarizes them. Read the gap list before
you plan a migration. It helps you judge whether LibreGrid covers your usage.

## Versioning and releases

- LibreGrid packages are versioned in lockstep. `@libregrid/core` is a regular dependency,
  never a peer. It must resolve to one copy in your app.
- Keep `ag-grid-community` inside `>=36.1.0 <37`. A conformance matrix runs in CI against
  every supported Community release.
