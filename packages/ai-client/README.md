# @libregrid/ai-client

Connect a grid to a server that turns natural-language commands into proposed
grid state changes. The browser client captures the schema and state, validates
responses, detects stale proposals, and lets your application control when to apply them.

[Documentation and examples](https://libregrid.dev/ai-toolkit)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/ai-client @libregrid/ai-toolkit
```

Requires `ag-grid-community >=36.1.0 <37`. Register `AiToolkitModule` so
the client can inspect the grid's live schema. The client itself is a function
API and has no module to register.

## Usage

This browser example expects a protocol-compatible endpoint at
`/v1/grid-command`. Add the controls to your page:

```html
<button id="suggest">Suggest sort order</button>
<button id="apply" disabled>Apply proposal</button>
<pre id="proposal" aria-live="polite"></pre>
<div id="grid" style="height: 400px"></div>
```

```ts
import { AllCommunityModule, ModuleRegistry, createGrid } from 'ag-grid-community';
import { AiToolkitModule } from '@libregrid/ai-toolkit';
import { createGridAssistant, type GridCommandProposal } from '@libregrid/ai-client';

ModuleRegistry.registerModules([AllCommunityModule, AiToolkitModule]);

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'product' }, { field: 'sales' }],
  rowData: [
    { product: 'Notebook', sales: 120 },
    { product: 'Pen', sales: 80 },
  ],
});
const assistant = createGridAssistant({ api, endpoint: '/v1/grid-command' });
const suggest = document.querySelector<HTMLButtonElement>('#suggest')!;
const apply = document.querySelector<HTMLButtonElement>('#apply')!;
const output = document.querySelector<HTMLElement>('#proposal')!;
let proposal: GridCommandProposal | undefined;

suggest.addEventListener('click', async () => {
  suggest.disabled = true;
  apply.disabled = true;
  proposal = undefined;
  try {
    proposal = await assistant.run('Sort sales from highest to lowest');
    output.textContent = JSON.stringify(proposal.changes, null, 2);
    apply.disabled = false;
  } catch (error) {
    output.textContent = error instanceof Error ? error.message : 'Request failed';
  } finally {
    suggest.disabled = false;
  }
});

apply.addEventListener('click', () => {
  try {
    proposal?.apply();
    output.textContent = 'Proposal applied';
  } catch (error) {
    output.textContent = error instanceof Error ? error.message : 'Apply failed';
  } finally {
    proposal = undefined;
    apply.disabled = true;
  }
});
```

`run()` returns a proposal without changing the grid. `apply()` rejects stale
proposals if relevant grid state has changed. For applications that deliberately
apply immediately after validation, `execute(command)` combines both steps.

## Server integration

The default HTTP transport uses same-origin credentials. Keep provider keys
on the server. Use the `headers` option only for your application's endpoint
authentication, or inject a `GridCommandTransport` for tests or another transport.

Implement the endpoint from [`@libregrid/ai-protocol`](../ai-protocol/README.md)
or deploy [`@libregrid/ai-gateway`](../ai-gateway/README.md). The schema, grid
state, command, and supplied context are sent to that endpoint; review what
your application shares with the configured provider. Browser validation does
not replace server authorization.

## Angular

Register `AiToolkitModule` with `provideLibreGrid`, create the assistant from
the API received in `gridReady`, and bind proposal state to your component UI.
See the [Angular setup](../angular/README.md) and the
[AI Toolkit examples](https://libregrid.dev/ai-toolkit).

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
