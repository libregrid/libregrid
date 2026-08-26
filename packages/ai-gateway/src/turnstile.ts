const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileAuthorizerOptions {
  secretKey: string;
  /** Exact widget action expected in the Siteverify response. */
  expectedAction: string;
  /** Exact hostnames allowed in the Siteverify response. */
  expectedHostnames: readonly string[];
  fetch?: typeof globalThis.fetch;
  /** Request header that carries the widget token. Defaults to `x-turnstile-token`. */
  header?: string;
}

/**
 * Build an `authorize` hook that checks a Cloudflare Turnstile token.
 *
 * The gateway reads `authorize` before it reads the request body, so the token
 * must travel in a header. The hook fails closed: any missing token, declined
 * verdict, transport error, or non-200 answer returns `false`.
 */
export function createTurnstileAuthorizer(
  options: TurnstileAuthorizerOptions,
): (request: Request) => Promise<boolean> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (!fetchImplementation) throw new Error('ai-gateway: fetch is unavailable');
  if (!options.secretKey) throw new Error('ai-gateway: Turnstile secret key is required');
  if (!options.expectedAction) throw new Error('ai-gateway: Turnstile action is required');
  if (options.expectedHostnames.length === 0) {
    throw new Error('ai-gateway: at least one Turnstile hostname is required');
  }
  const expectedHostnames = new Set(options.expectedHostnames);
  const header = options.header ?? 'x-turnstile-token';

  return async (request: Request): Promise<boolean> => {
    const token = request.headers.get(header);
    if (!token || token.length > 2_048) return false;

    const body = new URLSearchParams({ secret: options.secretKey, response: token });
    const remoteIp = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for');
    if (remoteIp) body.set('remoteip', remoteIp.split(',')[0]!.trim());

    let response: Response;
    try {
      response = await fetchImplementation(SITEVERIFY, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return false;
    }
    if (!response.ok) return false;

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return false;
    }
    if (!payload || typeof payload !== 'object') return false;
    const verdict = payload as { success?: unknown; action?: unknown; hostname?: unknown };
    return verdict.success === true
      && verdict.action === options.expectedAction
      && typeof verdict.hostname === 'string'
      && expectedHostnames.has(verdict.hostname);
  };
}
