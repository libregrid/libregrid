import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

export interface NodeGatewayServerOptions {
  handler: (request: Request) => Promise<Response>;
  host?: string;
  maxBodyBytes?: number;
  port?: number;
}

async function nodeBody(request: IncomingMessage, maxBytes: number): Promise<Uint8Array | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk;
    size += bytes.byteLength;
    if (size > maxBytes) throw new RangeError('request body is too large');
    chunks.push(bytes);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function send(response: Response, target: ServerResponse): Promise<void> {
  target.statusCode = response.status;
  response.headers.forEach((value, key) => target.setHeader(key, value));
  target.end(new Uint8Array(await response.arrayBuffer()));
}

export function createNodeGatewayServer(options: NodeGatewayServerOptions): Server {
  return createServer(async (incoming, outgoing) => {
    try {
      const host = incoming.headers.host ?? '127.0.0.1';
      const url = new URL(incoming.url ?? '/', `http://${host}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (Array.isArray(value)) value.forEach((entry) => headers.append(key, entry));
        else if (value !== undefined) headers.set(key, value);
      }
      const body = await nodeBody(incoming, options.maxBodyBytes ?? 512 * 1024);
      const requestInit: RequestInit = { method: incoming.method ?? 'GET', headers };
      if (body) requestInit.body = new TextDecoder().decode(body);
      const request = new Request(url, requestInit);
      await send(await options.handler(request), outgoing);
    } catch (error) {
      outgoing.statusCode = error instanceof RangeError ? 413 : 500;
      outgoing.setHeader('content-type', 'application/json; charset=utf-8');
      outgoing.end(JSON.stringify({ error: error instanceof RangeError ? error.message : 'internal gateway error' }));
    }
  });
}

export async function listenNodeGateway(options: NodeGatewayServerOptions): Promise<Server> {
  const server = createNodeGatewayServer(options);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 8787, options.host ?? '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  return server;
}
