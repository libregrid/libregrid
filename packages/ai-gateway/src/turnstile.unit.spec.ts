import { describe, expect, it, vi } from 'vitest';
import { createTurnstileAuthorizer } from './turnstile';

function post(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/v1/grid-command', { method: 'POST', headers });
}

describe('Turnstile authorizer', () => {
  it('accepts a token that siteverify approves', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    const authorize = createTurnstileAuthorizer({ secretKey: 'secret', fetch });

    await expect(authorize(post({ 'x-turnstile-token': 'good-token' }))).resolves.toBe(true);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body = new URLSearchParams(String(init.body));
    expect(body.get('secret')).toBe('secret');
    expect(body.get('response')).toBe('good-token');
  });

  it('rejects a token that siteverify declines', async () => {
    const authorize = createTurnstileAuthorizer({
      secretKey: 'secret',
      fetch: async () => new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 }),
    });
    await expect(authorize(post({ 'x-turnstile-token': 'bad-token' }))).resolves.toBe(false);
  });

  it('rejects a request with no token and never calls siteverify', async () => {
    const fetch = vi.fn(async () => new Response('{}'));
    const authorize = createTurnstileAuthorizer({ secretKey: 'secret', fetch });
    await expect(authorize(post())).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails closed when siteverify errors or returns a non-200', async () => {
    const network = createTurnstileAuthorizer({
      secretKey: 'secret',
      fetch: async () => { throw new Error('network down'); },
    });
    await expect(network(post({ 'x-turnstile-token': 't' }))).resolves.toBe(false);

    const server = createTurnstileAuthorizer({
      secretKey: 'secret',
      fetch: async () => new Response('gateway timeout', { status: 504 }),
    });
    await expect(server(post({ 'x-turnstile-token': 't' }))).resolves.toBe(false);
  });

  it('fails closed when siteverify returns 200 with an unparseable body', async () => {
    const authorize = createTurnstileAuthorizer({
      secretKey: 'secret',
      fetch: async () => new Response('not json', { status: 200 }),
    });
    await expect(authorize(post({ 'x-turnstile-token': 't' }))).resolves.toBe(false);
  });

  it('reads a custom header name', async () => {
    const authorize = createTurnstileAuthorizer({
      secretKey: 'secret',
      header: 'cf-token',
      fetch: async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
    });
    await expect(authorize(post({ 'cf-token': 'good' }))).resolves.toBe(true);
  });
});
