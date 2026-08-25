# @libregrid/ai-client

Browser orchestration for LibreGrid's provider-neutral grid-command protocol.
It captures the live schema and state, calls one same-origin HTTP endpoint,
validates the response again in the browser, detects stale grid changes, shows
a dry-run diff, and applies state only after an explicit `apply()` call.

```ts
import { createGridAssistant } from '@libregrid/ai-client';

const assistant = createGridAssistant({
  api,
  endpoint: '/v1/grid-command',
  context: { density: 'compact', totalRecordCount: 42_000 },
});

const proposal = await assistant.run(
  'Show sales over $5,000 from North America, hardware only, highest first',
);

renderDiff(proposal.changes);
if (await userConfirms()) proposal.apply();
```

The default transport uses same-origin credentials, so normal session cookies
work without client-side provider secrets. Supply `headers` only for your own
gateway authentication. Never put a provider key in browser code.

For a one-line apply-after-validation flow, use `assistant.execute(command)`.
For tests or non-HTTP runtimes, inject the tiny `GridCommandTransport` port.

The server can be implemented in any language from
`@libregrid/ai-protocol/openapi.json`, or deployed from
`@libregrid/ai-gateway`.

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
