import { describe, expect, it, vi } from 'vitest';
import { createTurnstileAuthorizer } from './turnstile';

function post(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/v1/grid-command', { method: 'POST', headers });
}

function authorizerOptions(fetch: typeof globalThis.fetch) {
  return {
    secretKey: 'secret',
    expectedAction: 'grid_command',
    expectedHostnames: ['libregrid.dev'],
    fetch,
  };
}

describe('Turnstile authorizer', () => {
  it('accepts a token that siteverify approves', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      action: 'grid_command',
      hostname: 'libregrid.dev',
    }), { status: 200 }));
    const authorize = createTurnstileAuthorizer(authorizerOptions(fetch));

    await expect(authorize(post({ 'x-turnstile-token': 'good-token' }))).resolves.toBe(true);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body = new URLSearchParams(String(init.body));
    expect(body.get('secret')).toBe('secret');
    expect(body.get('response')).toBe('good-token');
  });

  it('rejects a token that siteverify declines', async () => {
    const authorize = createTurnstileAuthorizer({
      ...authorizerOptions(async () => new Response()),
      fetch: async () => new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 }),
    });
    await expect(authorize(post({ 'x-turnstile-token': 'bad-token' }))).resolves.toBe(false);
  });

  it('rejects a request with no token and never calls siteverify', async () => {
    const fetch = vi.fn(async () => new Response('{}'));
    const authorize = createTurnstileAuthorizer(authorizerOptions(fetch));
    await expect(authorize(post())).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails closed when siteverify errors or returns a non-200', async () => {
    const network = createTurnstileAuthorizer({
      ...authorizerOptions(async () => new Response()),
      fetch: async () => { throw new Error('network down'); },
    });
    await expect(network(post({ 'x-turnstile-token': 't' }))).resolves.toBe(false);

    const server = createTurnstileAuthorizer({
      ...authorizerOptions(async () => new Response()),
      fetch: async () => new Response('gateway timeout', { status: 504 }),
    });
    await expect(server(post({ 'x-turnstile-token': 't' }))).resolves.toBe(false);
  });

  it('fails closed when siteverify returns 200 with an unparseable body', async () => {
    const authorize = createTurnstileAuthorizer({
      ...authorizerOptions(async () => new Response()),
      fetch: async () => new Response('not json', { status: 200 }),
    });
    await expect(authorize(post({ 'x-turnstile-token': 't' }))).resolves.toBe(false);
  });

  it('reads a custom header name', async () => {
    const authorize = createTurnstileAuthorizer({
      ...authorizerOptions(async () => new Response()),
      header: 'cf-token',
      fetch: async () => new Response(JSON.stringify({
        success: true,
        action: 'grid_command',
        hostname: 'libregrid.dev',
      }), { status: 200 }),
    });
    await expect(authorize(post({ 'cf-token': 'good' }))).resolves.toBe(true);
  });

  it.each([
    [{ success: true, action: 'different_action', hostname: 'libregrid.dev' }, 'action mismatch'],
    [{ success: true, action: 'grid_command', hostname: 'attacker.example' }, 'hostname mismatch'],
    [{ success: true, hostname: 'libregrid.dev' }, 'missing action'],
    [{ success: true, action: 'grid_command' }, 'missing hostname'],
  ])('rejects an approved token with %s (%s)', async (payload) => {
    const authorize = createTurnstileAuthorizer(authorizerOptions(
      async () => new Response(JSON.stringify(payload), { status: 200 }),
    ));
    await expect(authorize(post({ 'x-turnstile-token': 'token' }))).resolves.toBe(false);
  });

  it('rejects an oversized token without calling siteverify', async () => {
    const fetch = vi.fn(async () => new Response('{}'));
    const authorize = createTurnstileAuthorizer(authorizerOptions(fetch));
    await expect(authorize(post({ 'x-turnstile-token': 'x'.repeat(2_049) }))).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires an action and at least one approved hostname', () => {
    expect(() => createTurnstileAuthorizer({
      secretKey: 'secret',
      expectedAction: '',
      expectedHostnames: ['libregrid.dev'],
    })).toThrow('Turnstile action is required');
    expect(() => createTurnstileAuthorizer({
      secretKey: 'secret',
      expectedAction: 'grid_command',
      expectedHostnames: [],
    })).toThrow('at least one Turnstile hostname is required');
  });
});
