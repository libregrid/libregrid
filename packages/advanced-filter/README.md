# @libregrid/advanced-filter

Build filters that combine conditions across columns with AND/OR expressions.
Users can type an expression or use a visual builder; both produce a
serializable filter model.

[Documentation and examples](https://libregrid.dev/advanced-filter-find)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/advanced-filter
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="advanced-filter-host"></div>
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { AdvancedFilterModule } from '@libregrid/advanced-filter';

ModuleRegistry.registerModules([AllCommunityModule, AdvancedFilterModule]);

const parent = document.querySelector<HTMLElement>('#advanced-filter-host')!;

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'country' }, { field: 'sales', cellDataType: 'number' }],
  rowData: [{ country: 'United Kingdom', sales: 120 }],
  enableAdvancedFilter: true,
  advancedFilterBuilderParams: { showMoveButtons: true, minWidth: 520 },
});

// Renders the expression input into the given element:
api.setGridOption('advancedFilterParent', parent);
```

Open the visual builder, or clear the current filter, from the grid API:

```ts
api.showAdvancedFilterBuilder();
api.setAdvancedFilterModel(null); // clear
```

### Working with the serializable model directly

Useful for saving a user's filter, or applying one without going through the
UI at all:

```ts
import {
  parseAdvancedFilterExpression,
  serialiseAdvancedFilterModel,
  evaluateAdvancedFilterModel,
} from '@libregrid/advanced-filter';

const { model, error } = parseAdvancedFilterExpression("country = 'Japan' AND sales > 100", [
  { id: 'country', kind: 'text' },
  { id: 'sales', kind: 'number' },
]);

const values: Record<string, unknown> = { country: 'Japan', sales: 150 };

if (model) {
  api.setAdvancedFilterModel(model);
  const expression = serialiseAdvancedFilterModel(model); // round-trips back to text
  const matches = evaluateAdvancedFilterModel(model, (colId) => values[colId]);
}
```

## API

| Export                                          | Purpose                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `AdvancedFilterModule`                          | Registers the feature (`moduleName: 'AdvancedFilter'`).                                                   |
| `parseAdvancedFilterExpression(text, columns?)` | Parses a typed expression into an `AdvancedFilterModel`, or returns an `ExpressionError` with a position. |
| `serialiseAdvancedFilterModel(model)`           | Converts a model back into its expression text.                                                           |
| `evaluateAdvancedFilterModel(model, getValue)`  | Evaluates a model against arbitrary values, outside the grid.                                             |
| `api.showAdvancedFilterBuilder()`               | Open the visual builder.                                                                                  |
| `api.setAdvancedFilterModel(model)`             | Apply a saved model, or `null` to clear it.                                                               |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/find`](https://github.com/libregrid/libregrid/blob/main/packages/find/README.md) — search within rendered cells, a lighter-weight alternative

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
