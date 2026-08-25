import { afterEach, describe, expect, it } from 'vitest';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { runGatewayConformance } from './conformance';
import { createGridCommandHandler } from './gateway';
import { createMockProvider } from './mockProvider';
import { createNodeGatewayServer } from './nodeServer';

let server: Server | undefined;

afterEach(async () => {
  if (!server) return;
  server.close();
  await once(server, 'close');
  server = undefined;
});

describe('Node gateway server', () => {
  it('serves health and the protocol over a real HTTP socket', async () => {
    server = createNodeGatewayServer({
      handler: createGridCommandHandler({ provider: createMockProvider() }),
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address() as AddressInfo;
    const root = `http://127.0.0.1:${address.port}`;

    const health = await fetch(`${root}/health`);
    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toMatchObject({ status: 'ok' });
    await expect(runGatewayConformance({ endpoint: `${root}/v1/grid-command` })).resolves.toMatchObject({
      ok: true,
      status: 'ok',
    });
  });
});
