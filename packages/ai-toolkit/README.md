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

// Build the structured schema for the LLM. v1 covers `filter`, `sort` and
// `columnVisibility`; `exclude` narrows it to the sections you want.
const schema = api.getStructuredSchema({ exclude: ['filter'] });

// Or drive a tool call directly (the provider layer is pluggable).
```

### Filters need a set filter

`setFilters` emits a `{ filterType: 'set', values: [...] }` model, which only an
`agSetColumnFilter` accepts — any other filter discards it silently. Register
[`@libregrid/set-filter`](../set-filter) and configure the columns you want the
model to filter:

```ts
ModuleRegistry.registerModules([AllCommunityModule, SetFilterModule, AiToolkitModule]);
// columnDefs: [{ field: 'country', filter: 'agSetColumnFilter' }]
```

Columns Community does not consider filterable are left out of the generated
schema and rejected by `validateToolCall`, so the model is never offered a
filter the grid would refuse.

### Applying a call

Use `applyToolCall(beans, call)` inside the grid, or map it yourself at the API
level. Either way pass the **current** filter model — `setState` replaces the
filter model rather than merging into it, so a filter patch built without it
clears every other column's filter:

```ts
api.setState(toolCallToStatePatch(validated, api.getFilterModel()));
```

## Local-first inference

The default provider runs **Cactus Needle 2** ([Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0),
~45M parameters) entirely in the browser via WebAssembly. Prompts, schema and
inference never leave the page; the only network request is the one-time
artifact fetch described below. A remote OpenAI-compatible provider is available
as an opt-in fallback for requests the local model declines (see ADR 0006).

Artifacts are fetched at runtime from a pinned, self-hostable base URL; nothing
is bundled into this package. The ~14 MB weights file is cached cache-first in
Cache Storage (`libregrid-needle-v1`, keyed by artifact URL), so repeat visits
load with zero model downloads; pass `cacheWeights: false` to force a network
fetch. Call `provider.willDownloadWeights()` before a request to label UI
accurately — it resolves true only when the next load actually fetches from
the network (false for cache hits and in-memory weights).

### Loading third-party script

The built-in loader injects the emscripten glue (`wasm/needle.js`) from
`baseUrl` and executes it in the host page. The default URL is commit-pinned;
pass `scriptIntegrity: 'sha384-…'` to have the browser verify the bytes as well,
or set `baseUrl` to your own origin to avoid the third-party load entirely.
A page with a Content-Security-Policy needs `script-src` and `connect-src` to
allow that origin (`https://huggingface.co` by default).

## Parity

See [`docs/parity/ai-toolkit.md`](../../docs/parity/ai-toolkit.md) for the
feature checklist and [ADR 0006](../../docs/adr/0006-local-first-ai-inference.md)
for the local-first decision.
