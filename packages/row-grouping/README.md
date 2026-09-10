# @libregrid/row-grouping

Group client-side rows by one or more columns, aggregate values, and show
group or grand totals. The same package also includes an opt-in module for
editing group values and distributing changes to child rows.

[Documentation and examples](https://libregrid.dev/row-grouping) · [Editing group values](https://libregrid.dev/group-editing)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/row-grouping
```

Requires `ag-grid-community >=36.1.0 <37`. No additional package is needed
for group editing: `RowGroupingModule` and `RowGroupingEditModule` are both
exports of this package.

## Group and aggregate rows

Add a sized container to your page:

```html
<div id="grid" style="height: 400px"></div>
```

Register the module and define group and value columns:

```ts
import { AllCommunityModule, ModuleRegistry, createGrid } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [
    { field: 'country', rowGroup: true, hide: true },
    { field: 'product' },
    { field: 'sales', aggFunc: 'sum' },
  ],
  rowData: [
    { country: 'Canada', product: 'Notebook', sales: 120 },
    { country: 'Canada', product: 'Pen', sales: 80 },
    { country: 'Japan', product: 'Notebook', sales: 240 },
  ],
  groupDefaultExpanded: 1,
  groupTotalRow: 'bottom',
  grandTotalRow: 'bottom',
});
```

Use `rowGroup: true` on multiple columns for nested groups. Built-in
aggregations include `sum`, `avg`, `min`, `max`, `count`, `first`, and `last`.
Group and grand totals are optional. Set `groupDefaultExpanded: -1` to open
all levels, or control expansion through `api.expandAll()` and `api.collapseAll()`.

## Edit group values

Register `RowGroupingEditModule` before grid creation and opt value columns
into group editing. This is a separate example using the same container:

```ts
import { AllCommunityModule, ModuleRegistry, createGrid } from 'ag-grid-community';
import { RowGroupingEditModule } from '@libregrid/row-grouping';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingEditModule]);

createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [
    { field: 'team', rowGroup: true, hide: true },
    { field: 'project' },
    {
      field: 'budget',
      aggFunc: 'sum',
      editable: true,
      groupRowEditable: true,
      groupRowValueSetter: { distribution: 'uniform', precision: 2 },
    },
  ],
  rowData: [
    { id: 'a', team: 'Research', project: 'Survey', budget: 100 },
    { id: 'b', team: 'Research', project: 'Prototype', budget: 200 },
  ],
  getRowId: ({ data }) => data.id,
  groupDefaultExpanded: -1,
});
```

Edit the Research group budget from 300 to 400; the uniform strategy assigns
200 to each child. The edit module registers grouping as a dependency.

| Distribution | Behavior                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `uniform`    | Split a sum equally; for an average, assign the edited value to each child                          |
| `percentage` | Scale values in proportion to their current total; use uniform distribution when that total is zero |
| `increment`  | Distribute the change in the aggregate across children                                              |
| `overwrite`  | Assign the edited value to each child                                                               |

Use `distributeGroupValue(params, options)` inside a custom
`groupRowValueSetter` when you need to combine built-in distribution with
application rules. The [editing guide](https://libregrid.dev/group-editing)
covers eligible children, callbacks, rounding, and aggregate refresh.
Application code remains responsible for persisting committed row changes.

## Additional configuration

- `api.setRowGroupColumns(['country'])` changes grouping at runtime.
- `api.addAggFuncs(...)` registers custom aggregation functions.
- `showValuesAs` supports percentage-of-total views; see the
  [grouping examples](https://libregrid.dev/row-grouping).
- Add [`@libregrid/columns-tool-panel`](../columns-tool-panel/README.md)
  for user controls or [`@libregrid/pivot`](../pivot/README.md) for cross-tab reports.

## Limitations

Group rows and total rows scroll normally; sticky rows and group-row dragging
are not implemented. Aggregation refreshes after edits, but recalculation of
only changed value columns remains an optimization gap. See the
[grouping compatibility notes](../../docs/parity/row-grouping.md).

## Angular

Use these options with `ag-grid-angular` and register the required modules
through `provideLibreGrid`. See the [Angular quick start](../angular/README.md)
and the [group-editing examples](https://libregrid.dev/group-editing), which
include Angular source.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
