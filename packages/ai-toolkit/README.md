# @libregrid/ai-toolkit

Generate a JSON Schema describing the operations available on a live grid.
Use it to constrain a model’s proposed changes to the grid’s columns and enabled
features. This package generates schemas; it does not call a model or apply changes.

[Documentation and examples](https://libregrid.dev/ai-toolkit)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/ai-toolkit
```

Requires `ag-grid-community >=36.1.0 <37`. Register any feature modules
whose operations the generated schema should expose.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

```ts
import { AllCommunityModule, ModuleRegistry, createGrid } from 'ag-grid-community';
import { AiToolkitModule } from '@libregrid/ai-toolkit';

ModuleRegistry.registerModules([AllCommunityModule, AiToolkitModule]);

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'region' }, { field: 'sales', cellDataType: 'number' }],
  rowData: [{ region: 'North America', sales: 120 }],
});
const schema = api.getStructuredSchema({
  columns: {
    region: {
      description: 'Sales territory, such as North America or EMEA',
      includeSetValues: true,
    },
  },
});
```

The schema describes applicable AG Grid `GridState` sections for all seven AI
Toolkit features: aggregation, filter, sort, pivot, column visibility, column
sizing, and row grouping. It includes live column identifiers, data types,
filter operators, opt-in set values, and per-column capabilities. Objects are
strict and every property is required. Nullable feature sections let a strict
output provider represent “do not change this.”

For model-driven commands, add [`@libregrid/ai-client`](../ai-client/README.md)
in the browser and deploy [`@libregrid/ai-gateway`](../ai-gateway/README.md)
behind your own authentication. The wire contract and OpenAPI document are in
[`@libregrid/ai-protocol`](../ai-protocol/README.md). Provider secrets always remain on the server.

See the [architecture decision](../../docs/adr/0007-pure-ai-schema-and-byom-gateway.md)
for the separation between schema generation and provider execution.

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
