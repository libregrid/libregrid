# @libregrid/ai-toolkit

Adds natural-language control of grid state to AG Grid Community — describe what
you want ("hide the age column", "sort youngest first") and the grid applies it.

Replaces AG Grid Enterprise's `AiToolkit` module.

## Install

```bash
npm install ag-grid-community @libregrid/ai-toolkit
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { AiToolkitModule } from '@libregrid/ai-toolkit';

ModuleRegistry.registerModules([AllCommunityModule, AiToolkitModule]);

const api = createGrid(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'country' }, { field: 'age' }],
  rowData,
});

// Build the structured schema for the LLM.
const schema = api.getStructuredSchema({ exclude: ['aggregation', 'pivot'] });

// Or drive a tool call directly (the provider layer is pluggable).
```

## Local-first inference

The default provider runs **Cactus Needle 2** ([Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0),
45M parameters) entirely in the browser via WebAssembly — no network calls, no
row data leaves the page. A remote OpenAI-compatible provider is available as an
opt-in fallback for requests the local model declines (see ADR 0006).

Artifacts are fetched at runtime from a pinned, self-hostable base URL; nothing
is bundled into this package.

## Parity

See [`docs/parity/ai-toolkit.md`](../../docs/parity/ai-toolkit.md) for the
feature checklist and [ADR 0006](../../docs/adr/0006-local-first-ai-inference.md)
for the local-first decision.
