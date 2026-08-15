# @libregrid/advanced-filter

Expression-based filtering across every column at once. Type an expression
like `country = 'Japan' AND sales > 100`, or build the same filter visually.
Both produce the same serializable model.

Replaces AG Grid Enterprise's `AdvancedFilter` module.

## Install

```bash
npm install ag-grid-community @libregrid/advanced-filter
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { AdvancedFilterModule } from '@libregrid/advanced-filter';

ModuleRegistry.registerModules([AllCommunityModule, AdvancedFilterModule]);

const parent = document.querySelector<HTMLElement>('#advanced-filter-host')!;

const api = createGrid(document.querySelector('#grid')!, {
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
import { parseAdvancedFilterExpression, serialiseAdvancedFilterModel, evaluateAdvancedFilterModel } from '@libregrid/advanced-filter';

const { model, error } = parseAdvancedFilterExpression("country = 'Japan' AND sales > 100", [
  { id: 'country', kind: 'text' },
  { id: 'sales', kind: 'number' },
]);

if (model) {
  api.setAdvancedFilterModel(model);
  const expression = serialiseAdvancedFilterModel(model); // round-trips back to text
  const matches = evaluateAdvancedFilterModel(model, (colId) => ({ country: 'Japan', sales: 150 })[colId]);
}
```

## API

| Export | Purpose |
| --- | --- |
| `AdvancedFilterModule` | Registers the feature (`moduleName: 'AdvancedFilter'`). |
| `parseAdvancedFilterExpression(text, columns?)` | Parses a typed expression into an `AdvancedFilterModel`, or returns an `ExpressionError` with a position. |
| `serialiseAdvancedFilterModel(model)` | Converts a model back into its expression text. |
| `evaluateAdvancedFilterModel(model, getValue)` | Evaluates a model against arbitrary values, outside the grid. |
| `AdvancedFilterBuilder` | The visual builder component, mounted via `advancedFilterParent` / `showAdvancedFilterBuilder()`. |
| `AdvancedFilterService`, `AdvancedFilterExpressionService`, `AdvancedSettingsMenuFactory` | Internal services. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/find`](https://github.com/libregrid/libregrid/blob/main/packages/find/README.md) — search within rendered cells, a lighter-weight alternative

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
