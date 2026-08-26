# @libregrid/ai-toolkit

Generates a strict, capability-scoped JSON Schema for the **live** AG Grid.
It replaces AG Grid Enterprise's `AiToolkitModule` API surface without bundling
a model, provider SDK, network client, credentials, or state-application code.

## Install

```bash
npm install ag-grid-community @libregrid/ai-toolkit
```

## Use

```ts
import { AllCommunityModule, ModuleRegistry, createGrid } from 'ag-grid-community';
import { AiToolkitModule } from '@libregrid/ai-toolkit';

ModuleRegistry.registerModules([AllCommunityModule, AiToolkitModule]);

const api = createGrid(document.querySelector('#grid')!, { columnDefs, rowData });
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

For a full bring-your-own-model workflow, add `@libregrid/ai-client` in the
browser and deploy `@libregrid/ai-gateway` behind your own authentication. The
language-neutral wire contract and OpenAPI document are in
`@libregrid/ai-protocol`. Provider secrets always remain on the server.

See [ADR 0007](../../docs/adr/0007-pure-ai-schema-and-byom-gateway.md) and the
[BYOM delivery plan](../../docs/plans/ai-toolkit-byom.md).

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
