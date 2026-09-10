# @libregrid/ai-protocol

The versioned contract between the LibreGrid AI browser client and gateway.
Use its TypeScript types, runtime validators, JSON Schemas, and OpenAPI document
to implement or test an endpoint in your own server stack. It has no framework,
AG Grid, or provider SDK dependency.

[Documentation and examples](https://libregrid.dev/ai-toolkit)

## Install

```bash
npm install @libregrid/ai-protocol
```

No grid or Angular installation is needed to use the protocol on a server.

## Usage

Validate untrusted request data before using it. This helper can be called from
your server's request handler after parsing the JSON body:

```ts
import { validateGridCommandRequest, type GridCommandRequest } from '@libregrid/ai-protocol';

export function parseCommand(body: unknown): GridCommandRequest {
  const result = validateGridCommandRequest(body);
  if (!result.ok) throw new Error('Invalid grid command request');
  return result.value;
}
```

The stable HTTP operation is `POST /v1/grid-command`. Requests describe the
live schema, current grid state, and user command. They do not select the
provider model or carry a provider credential. Authentication and access policy
belong to the application hosting the endpoint.

## Shipped contracts

| Resource or export                                          | Purpose                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| [`openapi.json`](./openapi.json)                            | OpenAPI 3.1 contract for generating server stubs and clients |
| [`schemas/`](./schemas/)                                    | JSON Schemas for wire-format validation                      |
| `GridCommandRequest`, `GridCommandResponse`                 | Versioned request and response types                         |
| `validateGridCommandRequest`, `validateGridCommandResponse` | Runtime envelope validation                                  |
| `buildProviderOutputSchema`                                 | Compose a strict output schema from grid capabilities        |
| `validateProviderGridOutput`                                | Validate model output against the live schema                |
| `revisionFor`, `stableJson`                                 | Deterministic revision and serialization helpers             |

The JSON resources are also available through package paths such as
`@libregrid/ai-protocol/openapi.json`. A matching schema is a data-shape check,
not authorization to read or modify application records.

## Related packages

- [`@libregrid/ai-toolkit`](../ai-toolkit/README.md) generates live grid schemas.
- [`@libregrid/ai-client`](../ai-client/README.md) sends requests and applies proposals in the browser.
- [`@libregrid/ai-gateway`](../ai-gateway/README.md) supplies a handler, provider adapters, and conformance CLI.

See the [protocol architecture decision](../../docs/adr/0007-pure-ai-schema-and-byom-gateway.md)
for the separation between schema generation, transport, and provider execution.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
