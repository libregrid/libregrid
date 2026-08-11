# API Seams Reference

**MUST READ before writing any module.** This is the distilled result of reading the `ag-grid-community` source. **Trust it over guesswork.**

File references point to `packages/ag-grid-community/src/` in the AG Grid repo, for verification only — you do not need the repo to build.

Verified against `ag-grid-community@36.1.0` on 2026-08-11.

---

## 1. What you may import from `'ag-grid-community'`

The package has exactly **one** JS entry point (`.`), plus CSS/SCSS subpaths. There is **no** `ag-grid-community/internal` subpath.

Everything below is reachable from the root import, because `src/main.ts` line 1216 is `export * from './main-internal';`.

> ⚠️ **This single re-export line is what the entire project rests on.** Phase 0 Task 0.8 verifies it against the published package before any feature work begins.

### Public (no underscore prefix)

```ts
import {
  ModuleRegistry,            // .registerModules(modules: Module[])
  createGrid,
  type Module,
  type AgModuleName,
  type GridOptions, type ColDef, type GridApi,
  createTheme, themeQuartz, themeAlpine, themeBalham, themeMaterial, styleMaterial,
  type Theme, type ThemeDefaultParams, type StyleMaterialParams,
  AllCommunityModule,
} from 'ag-grid-community';
```

### Internal (available, but unstable — see guardrails G5)

```ts
import {
  BeanStub,                        // base class for all beans
  Component,                       // base class for UI widgets
  type Bean, type NamedBean,
  type BeanCollection, type BeanName, type SingletonBean,
  type ComponentSelector, type AgComponentSelectorType, type ComponentEvent,
  type _ModuleWithApi, type _ModuleWithoutApi,
  type _IRowNodeGroupStage, type _IRowNodeAggregationStage,
  type _IRowNodePivotStage, type _IRowNodeFilterStage,
  type _IRowNodeSortStage,  type _IRowNodeFlattenStage,
  type _IRowNodeFilterAggregateStage,
  _ChangedRowNodes, type ChangedPath,
  type RowNode, type ColumnModel,
  _getClientSideRowModel, _getServerSideRowModel, _getViewportRowModel,
  _warnOnce, _consoleError,
  _EmptyBean,

  // Per-feature GridApi slice types — use to type `apiFunctions`:
  type _RowGroupingGridApi, type _AggregationGridApi, type _PivotGridApi,
  type _ServerSideRowModelGridApi, type _SideBarGridApi, type _StatusBarGridApi,
  type _ClipboardGridApi, type _ExcelExportGridApi, type _CellSelectionGridApi,
  type _AdvancedFilterGridApi, type _GridChartsGridApi, type _MasterDetailGridApi,
  type _FindApi, type _ContextMenuGridApi, type _ColumnChooserGridApi,
  type _NotesGridApi, type _ToolbarGridApi, type _PdfExportGridApi,
  type _FormulaGridApi, type _InfiniteRowModelGridApi, type _ClientSideRowModelGridApi,
} from 'ag-grid-community';
```

> ❌ **Never deep-import** (`ag-grid-community/dist/...`). It is not an exported subpath and will break at build or runtime.
> ❌ **Never** add `ag-grid-community` as a `dependency`. It is **always** a `peerDependency` — two copies in one app breaks the module registry.

---

## 2. The `Module` interface

`src/interfaces/iModule.ts`:

```ts
interface Module {
  moduleName: ModuleName;   // MUST be an existing literal — see §3
  version: string;          // MUST match Community's major.minor
  enterprise?: boolean;
  validate?: () => { isValid: true } | { isValid: false; message: string };
  onRegister?: () => void;  // idempotent; fires on EVERY registration call
  beans?: SingletonBean[];               // singletons created once per grid
  dynamicBeans?: Partial<Record<DynamicBeanName, ClassImp>>;
  userComponents?: Partial<Record<UserComponentName, ComponentMeta>>;
  selectors?: ComponentSelector[];       // components usable in grid templates
  icons?: Partial<Record<IconName, IconValue>>;
  rowModels?: RowModelType[];            // omit ⇒ 'all'
  dependsOn?: Module[];
  css?: string[];
}

type _ModuleWithApi<TGridApi> = Omit<Module, 'rowModels'> & {
  apiFunctions?: { [K in ApiFunctionName & keyof TGridApi]: ApiFunction<K> };
};
```

Registration is via `ModuleRegistry.registerModules([...])`. (`ModuleRegistry.register(module)` exists but is deprecated since v33 — do not use.)

---

## 3. `moduleName` must be an existing literal

`ModuleName` is a **closed union** of 270 string literals. You cannot invent names.

Reuse the Enterprise literals Community already declares — this also makes Community's built-in "you need module X" validation messages resolve correctly.

**Enterprise literals available:**
`RowGrouping`, `Pivot`, `PivotModule`, `TreeData`, `MasterDetail`, `Clipboard`, `ExcelExport`, `SideBar`, `ColumnsToolPanel`, `FiltersToolPanel`, `CellSelection`, `SetFilter`, `MultiFilter`, `GroupFilter`, `AdvancedFilter`, `IntegratedCharts`, `Sparklines`, `StatusBar`, `RichSelect`, `ContextMenu`, `ColumnMenu`, `ServerSideRowModel`, `ViewportRowModel`, `Find`, `RowNumbers`, `Notes`

**Internal/shared seam literals** (usable for sub-modules):
`EnterpriseCore`, `SharedRowGrouping`, `SharedAggregation`, `SharedPivot`, `SharedTreeData`, `SharedMasterDetail`, `SharedMenu`, `CsrmGroupStages`

> If you need a name that does not exist: **stop and ask.** Never cast with `as any`.

---

## 4. Reference module

Verbatim pattern from `pagination/paginationModule.ts`:

> ⚠️ **`VERSION` is NOT exported from `ag-grid-community`.** Verified empirically — there is no version-ish export at all. Community's own modules use an internal `./version` path that is not reachable from the published package. Use the generated `src/version.ts` described in `standards.md` §5, which is derived at build time from the installed `ag-grid-community/package.json`.
>
> At runtime the version is also readable from any community module object — `AllCommunityModule.version === '36.1.0'` — but do not import a community module purely for this, as it hurts tree-shaking.

```ts
import type { _ModuleWithApi, _RowGroupingGridApi } from 'ag-grid-community';
import { VERSION } from './version';   // generated — see standards.md §5
import { EnterpriseCoreModule } from '@libregrid/core';
import { AggFuncService } from './aggFuncService';
import { GroupStage } from './groupStage';
import { expandAll, collapseAll } from './rowGroupingApi';

export const RowGroupingModule: _ModuleWithApi<_RowGroupingGridApi> = {
  moduleName: 'RowGrouping',
  version: VERSION,
  beans: [AggFuncService, GroupStage],
  userComponents: { agGroupCellRenderer: GroupCellRenderer },
  icons: { groupExpanded: 'group-expanded', groupContracted: 'group-contracted' },
  apiFunctions: { expandAll, collapseAll },
  dependsOn: [EnterpriseCoreModule],
};
```

`VERSION` **must** equal Community's major.minor or `_registerModule` logs an error. It is generated per-package from a single root constant — see `standards.md`.

---

## 5. Writing a bean

Verbatim pattern from `pagination/paginationService.ts`:

```ts
import { BeanStub, type NamedBean } from 'ag-grid-community';

export class AggFuncService extends BeanStub implements NamedBean {
  beanName = 'aggFuncSvc' as const;      // MUST be `as const`

  private aggFuncs: Record<string, IAggFunc> = {};

  public postConstruct(): void {          // called after DI wiring
    this.gos.get('aggFuncs');
    this.addManagedPropertyListener('aggFuncs', () => this.reload());
  }

  public override destroy(): void {
    /* cleanup */
    super.destroy();
  }
}
```

### Rules

- **Constructors take no arguments.** All wiring happens via `this.beans` after construction. Do all setup in `postConstruct()`.
- `beanName` must use `as const` or the type will widen to `string` and fail.
- Never use raw `addEventListener` — it leaks across grid destruction. Use the managed helpers.

### `BeanStub` members

| Member | Purpose |
|---|---|
| `this.beans` | The `BeanCollection` — reach other beans (`this.beans.colModel`, `this.beans.rowModel`) |
| `this.gos` | Grid options service — `this.gos.get('pivotMode')` |
| `this.addManagedPropertyListener(prop, cb)` | Auto-unsubscribed grid-option listener |
| `this.addManagedEventListeners({ evt: cb })` | Auto-unsubscribed grid event listener |
| `this.addDestroyFunc(fn)` | Register teardown |
| `this.warn(id)` / `this.error(id)` / `this.deprecated(id)` | Grid-attributed diagnostics |

`BeanStub` extends `AgBeanStub` from `ag-stack`, parameterised with `BeanCollection`, `GridOptionsWithDefaults`, `AgEventTypeParams`, `AgGridCommon`, `GridOptionsService`.

---

## 6. The Client-Side Row Model pipeline

This is how grouping, aggregation and pivot attach. **The single most important mechanism in the project.**

`ClientSideRowModelStage` (`src/interfaces/iClientSideRowModel.ts`):

```ts
type ClientSideRowModelStage =
  | 'group' | 'filter' | 'sort' | 'map'
  | 'aggregate' | 'filter_aggregates' | 'pivot' | 'nothing';
```

`BeanCollection` declares these **optional** stage slots. Community fills `filterStage` and `sortStage`; the rest are ours to provide:

| Bean slot | Interface to implement | Owning phase |
|---|---|---|
| `groupStage` | `_IRowNodeGroupStage` | 2 (grouping), 10 (tree data) |
| `aggStage` | `_IRowNodeAggregationStage` | 2 |
| `filterAggStage` | `_IRowNodeFilterAggregateStage` | 2 |
| `groupFilterStage` | `_IRowNodeFilterStage` | 2 |
| `groupSortStage` | `_IRowNodeSortStage` | 2 |
| `flattenStage` | `_IRowNodeFlattenStage` | 2 |
| `pivotStage` | `_IRowNodePivotStage` | 8 |

**Execution order** (`clientSideRowModel.ts` lines 174–182):

```
groupStage → filterStage → groupFilterStage → pivotStage → aggStage
          → sortStage → groupSortStage → filterAggStage → flattenStage
```

CSRM calls them defensively — `this.beans.aggStage?.execute(changedPath)` — so absence is safe. **Registering a bean under the correct name is the entire integration.** There is no other wiring step.

Every stage interface requires:

```ts
readonly step: ClientSideRowModelStage;               // which stage triggers a rerun
readonly refreshProps: (keyof GridOptions)[] | null;  // options that invalidate it
```

plus an `execute(...)` whose signature varies per interface. Check the type — for example `_IRowNodePivotStage.execute` returns `boolean`, `_IRowNodeGroupStage.execute` returns `boolean | undefined`.

`RefreshModelParams` carries `step`, `changedProps?`, `rowDataUpdated?`, and more.

---

## 7. Enterprise bean-name slots reserved by Community

From `UntypedBeanNames` in `context.ts`, under the comment *"Things used in enterprise or elsewhere that we haven't created interfaces for"*. Use these **exact** names:

`advFilterExpSvc`, `advSettingsMenuFactory`, `autoGenColsSvc`, `agChartsExports`, `chartCrossFilterSvc`, `chartMenuItemMapper`, `chartMenuListFactory`, `chartMenuSvc`, `chartTranslation`, `colChooserFactory`, `colMenuFactory`, `colToolPanelFactory`, `enterpriseChartProxyFactory`, `lazyBlockLoadingSvc`, `menuItemMapper`, `menuUtils`, `ssrmBlockUtils`, `ssrmExpandListener`, `ssrmFilterListener`, `ssrmListenerUtils`, `ssrmNodeManager`, `ssrmSortSvc`, `ssrmStoreFactory`, `ssrmStoreUtils`, `statusBarSvc`, `testIdSvc`, `toolbarMenuBuilder`, `formula`, `showValuesAsSvc`

These slots are typed `unknown`. Declare local interfaces for them in `packages/core/src/untyped-beans.ts` and cast **once, there only**.

Other slots are properly typed in `CoreBeanCollection` — e.g. `aggFuncSvc`, `rangeSvc`, `clipboardSvc`, `sideBarSvc`, `masterDetailSvc`. **Check `context.ts` for the exact name before inventing one.**

---

## 8. Theming API — basis for the Material bridge

```ts
import { themeQuartz, type Theme } from 'ag-grid-community';

const myTheme = themeQuartz.withParams({ accentColor: '#6750A4', spacing: 8 });
// template: <ag-grid-angular [theme]="myTheme">
```

Available builders: `createTheme()`, `themeQuartz`, `themeAlpine`, `themeBalham`, `themeMaterial`, `styleMaterial`.

**Real param names** (verified in `theming/parts/theme/themes.ts`):

`accentColor`, `backgroundColor`, `foregroundColor`, `borderColor`, `chromeBackgroundColor`, `spacing`, `fontSize`, `dataFontSize`, `fontFamily`, `borderRadius`, `wrapperBorderRadius`, `headerFontWeight`, `selectedRowBackgroundColor`, `oddRowBackgroundColor`, `headerColumnBorder`, `headerColumnResizeHandleColor`, `inputFocusBorder`, `focusShadow`, `widgetVerticalSpacing`, `checkboxBorderWidth`, `checkboxBorderRadius`, `checkboxUncheckedBorderColor`, `checkboxIndeterminateBackgroundColor`, `tabSelectedUnderlineColor`, `tabSelectedBorderWidth`, `sideButtonSelectedUnderlineColor`, `sideButtonSelectedBackgroundColor`, `sideButtonHoverTextColor`, `sideButtonBarTopPadding`, `iconButtonHoverColor`, `iconButtonHoverBackgroundColor`, `toggleButtonWidth`, `toggleButtonHeight`, `toggleButtonOffBackgroundColor`, `colorPickerThumbSize`

Params accept structured values as well as literals:

```ts
{ ref: 'chromeBackgroundColor', mix: 0.5 }   // derive from another param
{ calc: 'spacing * 3' }                      // computed
{ googleFont: 'IBM Plex Sans' }              // font loading
{ color: '...', radius: 2, spread: 1.6 }     // shadows/borders
```
