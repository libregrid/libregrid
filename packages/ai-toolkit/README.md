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
import { AiToolkitModule, applyAiCommand } from '@libregrid/ai-toolkit';

ModuleRegistry.registerModules([AllCommunityModule, AiToolkitModule]);

const api = createGrid(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'country' }, { field: 'age' }],
  rowData,
});

// `getStructuredSchema` remains available when you need to integrate a model
// yourself. For the ordinary local-first path, use `applyAiCommand` instead.
const schema = api.getStructuredSchema({ exclude: ['filter'] });

const result = await applyAiCommand(api, 'Show the highest-revenue customers first');
if (result.status === 'not-applied') {
  // Ask the user to clarify `result.message`, or show it in the UI.
  console.info(result.reason, result.message);
}
```

`applyAiCommand` snapshots the live grid, gives the model a capability-scoped
environment, validates the complete response, and applies a single atomic
state patch. It supports typed text, number, date, boolean, and set filters,
sorting, column visibility, and reset. Requests that are ambiguous,
unsupported, off-topic, or invalid resolve as `{ status: 'not-applied' }`;
only operational failures such as a failed model load reject the promise.

Pass `dryRun: true` to inspect validated changes without applying them, `onPlan`
to observe the semantic plan, and `columns` to enrich live columns with
descriptions or allowed values. The default local provider is shared per page.
To use a hosted or self-hosted model, provide its API schema, base URL, model,
and (where needed) API key directly:

```ts
await applyAiCommand(api, 'Hide internal notes', {
  remote: {
    schema: 'openai', // or 'anthropic'
    baseUrl: 'https://models.example.com/v1',
    model: 'your-tool-calling-model',
    apiKey: '…',
  },
});
```

The advanced APIs are deliberately separate: they expose the environment
builder, plan decoder/validator/compiler, and provider seam for bespoke flows.
For `schema: 'openai'`, LibreGrid appends `/chat/completions`; for
`schema: 'anthropic'`, it appends `/v1/messages`. That means any gateway or
self-hosted model speaking either tool-calling wire format can be used without
an adapter.

## Local-first inference

The default provider runs **Cactus Needle 2** ([Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0),
~45M parameters) entirely in the browser via WebAssembly. Prompts, schema and
inference never leave the page; the only network request is the one-time
artifact fetch described below. See ADR 0006 for the local-first decision.

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

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source project
and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd. See
[NOTICE](./NOTICE) for third-party attribution.
