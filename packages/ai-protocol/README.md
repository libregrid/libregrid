# @libregrid/ai-protocol

The versioned, provider-neutral contract shared by LibreGrid's browser client
and server gateway. It has no framework, AG Grid, or provider SDK dependency.

The package ships:

- TypeScript request, response, error, and provider-output types.
- Runtime request/response and restricted JSON Schema validation.
- Strict provider-output schema composition with safe `$defs` hoisting.
- Deterministic state revisions.
- JSON Schema files and an OpenAPI 3.1 document for generating clients in Go,
  Java, C#, Python, Rust, PHP, Ruby, or any other server language.

The stable HTTP operation is `POST /v1/grid-command`. Authentication is owned
by the deploying application and intentionally not prescribed by the protocol.
The browser request never contains a model name or provider credential.

```ts
import {
  buildProviderOutputSchema,
  validateGridCommandRequest,
  validateProviderGridOutput,
} from '@libregrid/ai-protocol';
```

See [openapi.json](./openapi.json) and [ADR 0007](../../docs/adr/0007-pure-ai-schema-and-byom-gateway.md).

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
