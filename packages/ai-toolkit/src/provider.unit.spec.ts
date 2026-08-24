import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAiCompatibleProvider, type AiProvider, type AiRequest, type NeedleEngine } from './provider';
import { runToolkit, DEFAULT_CONFIDENCE_THRESHOLD } from './escalation';
import { NeedleWasmProvider } from './provider';

const request: AiRequest = {
  prompt: 'Hide the age column',
  context: 'grid columns:\nage: competitor age in years',
  tools: [{ name: 'setColumnVisibility', description: 'Show or hide columns.', parameters: { type: 'object' } }],
};

interface FakeEngineHooks {
  complete(input: string): object;
  loadCount: number;
  initCount: number;
  resetCount: number;
  lastSystem: string;
  lastTools: string;
  concurrency: number;
  maxConcurrency: number;
}

function makeFakeEngine(handlers: (input: string) => object): { engine: NeedleEngine; hooks: FakeEngineHooks } {
  const heap = new Uint8Array(1 << 20);
  let nextPtr = 4096;
  const hooks: FakeEngineHooks = {
    loadCount: 0,
    initCount: 0,
    resetCount: 0,
    lastSystem: '',
    lastTools: '',
    concurrency: 0,
    maxConcurrency: 0,
  };

  const engine: NeedleEngine = {
    _malloc(n) {
      const p = nextPtr;
      nextPtr += n + 4096;
      return p;
    },
    _free() {},
    HEAPU8: heap,
    UTF8ToString(p) {
      let end = p;
      while (end < heap.length && heap[end] !== 0) end++;
      return new TextDecoder().decode(heap.subarray(p, end));
    },
    _needle_load() {
      hooks.loadCount++;
      return 0;
    },
    _needle_init(systemPtr, toolsPtr) {
      hooks.initCount++;
      hooks.lastSystem = engine.UTF8ToString(systemPtr);
      hooks.lastTools = engine.UTF8ToString(toolsPtr);
      return 0;
    },
    _needle_complete(inputPtr, _maxNewTokens, outPtr, capacity) {
      hooks.concurrency++;
      hooks.maxConcurrency = Math.max(hooks.maxConcurrency, hooks.concurrency);
      const out = JSON.stringify(handlers(engine.UTF8ToString(inputPtr)));
      const bytes = new TextEncoder().encode(out);
      if (bytes.length + 1 > capacity) throw new Error('fake: output buffer too small');
      heap.set(bytes, outPtr);
      heap[outPtr + bytes.length] = 0;
      hooks.concurrency--;
      return bytes.length;
    },
    _needle_reset() {
      hooks.resetCount++;
    },
  };

  return { engine, hooks };
}

function needleProvider(handlers: (input: string) => object) {
  const { engine, hooks } = makeFakeEngine(handlers);
  return { provider: new NeedleWasmProvider({ loadEngine: async () => engine }), hooks };
}

function fakeCaches(initial: Map<string, Response>, openShouldReject = false) {
  const store = new Map(initial);
  const cache = {
    match: vi.fn(async (url: string) => store.get(url)),
    put: vi.fn(async (url: string, res: Response) => {
      store.set(url, res);
    }),
  };
  const open = vi.fn(async () => {
    if (openShouldReject) throw new Error('insecure context');
    return cache;
  });
  vi.stubGlobal('caches', { open });
  return { cache, open, store };
}

describe('NeedleWasmProvider', () => {
  it('normalises a tool call with confidence and reasoning', async () => {
    const { provider } = needleProvider(() => ({
      type: 'call',
      function_calls: [{ name: 'setColumnVisibility', arguments: { hiddenColIds: ['age'] } }],
      confidence: 0.86,
      reasoning: "'age' -> hiddenColIds",
    }));
    const result = await provider.complete(request);
    expect(result).toEqual({
      calls: [{ name: 'setColumnVisibility', arguments: { hiddenColIds: ['age'] } }],
      confidence: 0.86,
      reasoning: "'age' -> hiddenColIds",
    });
  });

  it('reports empty calls for off-topic (respond) results', async () => {
    const { provider } = needleProvider(() => ({ type: 'respond', function_calls: [], confidence: 0.9 }));
    expect(await provider.complete(request)).toMatchObject({ calls: [] });
  });

  it('resets the session before every completion and initialises only when tools change', async () => {
    const { provider, hooks } = needleProvider(() => ({ type: 'call', function_calls: [], confidence: 1 }));
    await provider.complete(request);
    await provider.complete({ ...request, prompt: 'Reset everything' });
    expect(hooks.resetCount).toBe(2);
    expect(hooks.initCount).toBe(1);
    // A custom loadEngine hook owns weight loading — the provider never calls _needle_load.
    expect(hooks.loadCount).toBe(0);

    await provider.complete({ ...request, tools: [{ name: 'resetGrid', parameters: {} }] });
    expect(hooks.initCount).toBe(2);
    expect(hooks.loadCount).toBe(0);
  });

  it('passes context as the system turn at init', async () => {
    const { provider, hooks } = needleProvider(() => ({ type: 'call', function_calls: [], confidence: 1 }));
    await provider.complete(request);
    expect(hooks.lastSystem).toBe(request.context);
    expect(JSON.parse(hooks.lastTools)).toHaveLength(1);
  });

  it('serialises concurrent requests on one session', async () => {
    const { provider, hooks } = needleProvider(() => ({ type: 'call', function_calls: [], confidence: 1 }));
    await Promise.all([provider.complete(request), provider.complete({ ...request, prompt: 'x' }), provider.complete({ ...request, prompt: 'y' })]);
    expect(hooks.maxConcurrency).toBe(1);
  });

  it('throws a named error on malformed engine output', async () => {
    const heap = new Uint8Array(1 << 20);
    let nextPtr = 4096;
    const engine: NeedleEngine = {
      _malloc(n) {
        const p = nextPtr;
        nextPtr += n + 4096;
        return p;
      },
      _free() {},
      HEAPU8: heap,
      UTF8ToString(p) {
        let end = p;
        while (end < heap.length && heap[end] !== 0) end++;
        return new TextDecoder().decode(heap.subarray(p, end));
      },
      _needle_load() {
        return 0;
      },
      _needle_init() {
        return 0;
      },
      _needle_complete(_in, _max, outPtr) {
        heap.set(new TextEncoder().encode('not-json'), outPtr);
        return 8;
      },
      _needle_reset() {},
    };
    const provider = new NeedleWasmProvider({ loadEngine: async () => engine });
    await expect(provider.complete(request)).rejects.toThrowError(/malformed Needle response/);
  });

  it('refuses to run outside a browser without a loadEngine hook', async () => {
    const provider = new NeedleWasmProvider();
    await expect(provider.complete(request)).rejects.toThrowError(/loadEngine/);
  });
});

describe('OpenAiCompatibleProvider', () => {
  function fakeFetch(body: object, status = 200): [typeof fetch, () => RequestInit | undefined] {
    let captured: RequestInit | undefined;
    const fn = (_url: string, init?: RequestInit) => {
      captured = init;
      return Promise.resolve(new Response(JSON.stringify(body), { status }));
    };
    const fetchImpl = fn as unknown as typeof fetch;
    return [fetchImpl, () => captured];
  }

  it('posts the request in OpenAI shape and parses tool_calls', async () => {
    const [fetchImpl, capture] = fakeFetch({
      choices: [{ message: { tool_calls: [{ function: { name: 'setSort', arguments: '{"sortModel":[{"colId":"age","sort":"asc"}]}' } }] } }],
    });
    const provider = new OpenAiCompatibleProvider({ endpoint: 'https://example.test/v1/chat/completions', model: 'gpt-5-mini', apiKey: 'k', fetchImpl });
    const result = await provider.complete(request);
    expect(result.calls).toEqual([{ name: 'setSort', arguments: { sortModel: [{ colId: 'age', sort: 'asc' }] } }]);
    expect(result.confidence).toBe(1);

    const init = capture();
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer k' });
    const body = JSON.parse(String(init.body)) as Record<string, any>;
    expect(body.model).toBe('gpt-5-mini');
    expect(body.messages[0]).toEqual({ role: 'system', content: request.context });
    expect(body.tools).toEqual([{ type: 'function', function: request.tools[0] }]);
  });

  it('returns empty calls when the model declines and tolerates bad argument JSON', async () => {
    const [fetchImpl] = fakeFetch({ choices: [{ message: {} }] });
    expect((await new OpenAiCompatibleProvider({ endpoint: 'e', model: 'm', fetchImpl }).complete(request)).calls).toEqual([]);

    const [fetchImpl2] = fakeFetch({ choices: [{ message: { tool_calls: [{ function: { name: 'x', arguments: 'not-json' } }] } }] });
    expect((await new OpenAiCompatibleProvider({ endpoint: 'e', model: 'm', fetchImpl: fetchImpl2 }).complete(request)).calls).toEqual([
      { name: 'x', arguments: {} },
    ]);
  });

  it('throws a named error on non-OK responses', async () => {
    const [fetchImpl] = fakeFetch({}, 500);
    await expect(new OpenAiCompatibleProvider({ endpoint: 'e', model: 'm', fetchImpl }).complete(request)).rejects.toThrowError(/remote provider failed \(500\)/);
  });
});

describe('runToolkit (ADR 0006 escalation)', () => {
  function stubProvider(result: object, name: 'needle-wasm' | 'openai-compatible') {
    return { name, complete: vi.fn(async () => result) } as unknown as AiProvider;
  }

  const highConf = { calls: [{ name: 'resetGrid', arguments: {} }], confidence: 0.8 };
  const lowConf = { calls: [{ name: 'setSort', arguments: { sortModel: [] } }], confidence: 0.2 };

  it('selects the primary call above the threshold without touching the fallback', async () => {
    const primary = stubProvider(highConf, 'needle-wasm');
    const fallback = stubProvider({ calls: [], confidence: 1 }, 'openai-compatible');
    const outcome = await runToolkit(primary, request, { fallback });
    expect(outcome).toEqual({ status: 'selected', call: highConf.calls[0], confidence: 0.8, via: 'needle-wasm' });
    expect(fallback.complete).not.toHaveBeenCalled();
    expect(DEFAULT_CONFIDENCE_THRESHOLD).toBe(0.5);
  });

  it('clarifies on low confidence when no fallback is configured', async () => {
    const outcome = await runToolkit(stubProvider(lowConf, 'needle-wasm'), request);
    expect(outcome).toMatchObject({ status: 'clarify', reason: expect.stringContaining('0.20 < 0.5') });
  });

  it('escalates to the fallback below the threshold', async () => {
    const primary = stubProvider(lowConf, 'needle-wasm');
    const fallback = stubProvider(highConf, 'openai-compatible');
    const outcome = await runToolkit(primary, request, { fallback });
    expect(outcome).toEqual({ status: 'selected', call: highConf.calls[0], confidence: 0.8, via: 'openai-compatible' });
  });

  it('clarifies when the selected result carries no actionable call', async () => {
    const outcome = await runToolkit(stubProvider({ calls: [], confidence: 0.9 }, 'needle-wasm'), request);
    expect(outcome).toMatchObject({ status: 'clarify', reason: expect.stringContaining('off-topic') });
  });

  it('honours a custom threshold', async () => {
    const outcome = await runToolkit(stubProvider(lowConf, 'needle-wasm'), request, { threshold: 0.1 });
    expect(outcome).toMatchObject({ status: 'selected', via: 'needle-wasm' });
  });
});

describe('NeedleWasmProvider weight caching (built-in loader)', () => {
  const BASE = 'https://artifacts.test/needle2';
  const WEIGHTS_URL = `${BASE}/needle2.cact`;

  function makeBuiltInEngine() {
    const heap = new Uint8Array(1 << 20);
    const hooks = { loadedBytes: -1n };
    const engine: NeedleEngine = {
      _malloc: () => 4096,
      _free: () => {},
      HEAPU8: heap,
      UTF8ToString: () => '',
      _needle_load(_p, n) {
        hooks.loadedBytes = n;
        return 0;
      },
      _needle_init: () => 0,
      _needle_complete: () => 0,
      _needle_reset: () => {},
    };
    return { engine, hooks };
  }

  function stubBrowser(engine: NeedleEngine) {
    vi.stubGlobal('document', {
      head: {
        appendChild(script: { onload?: () => void }) {
          queueMicrotask(() => script.onload?.());
        },
      },
      createElement: () => ({ src: '', onload: undefined as (() => void) | undefined, onerror: undefined as (() => void) | undefined }),
    });
    vi.stubGlobal('createNeedle', () => Promise.resolve(engine));
  }

  function fakeFetch(cact: Uint8Array): string[] {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      ((url: string) => {
        calls.push(String(url));
        if (String(url).endsWith('needle2.cact')) return Promise.resolve(new Response(cact));
        return Promise.reject(new Error(`unexpected fetch ${url}`));
      }) as unknown as typeof fetch,
    );
    return calls;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serves cached weights without a network fetch', async () => {
    const cact = new Uint8Array([9, 8, 7]);
    const { engine, hooks } = makeBuiltInEngine();
    stubBrowser(engine);
    fakeCaches(new Map([[WEIGHTS_URL, new Response(cact)]]));
    const calls = fakeFetch(cact);

    await new NeedleWasmProvider({ baseUrl: BASE }).ensureEngine();

    expect(calls).toEqual([]);
    expect(hooks.loadedBytes).toBe(3n);
  });

  it('fetches on a cache miss and stores the weights for next time', async () => {
    const cact = new Uint8Array([1, 2, 3, 4]);
    const { engine, hooks } = makeBuiltInEngine();
    stubBrowser(engine);
    const { open, store } = fakeCaches(new Map());
    const calls = fakeFetch(cact);

    await new NeedleWasmProvider({ baseUrl: BASE }).ensureEngine();

    expect(calls).toEqual([WEIGHTS_URL]);
    expect(open).toHaveBeenCalled();
    const stored = await (store.get(WEIGHTS_URL) as Response).arrayBuffer();
    expect(new Uint8Array(stored)).toEqual(cact);
    expect(hooks.loadedBytes).toBe(4n);
  });

  it('skips Cache Storage entirely when cacheWeights is false', async () => {
    const cact = new Uint8Array([5, 6]);
    const { engine } = makeBuiltInEngine();
    stubBrowser(engine);
    const { open } = fakeCaches(new Map());
    const calls = fakeFetch(cact);

    await new NeedleWasmProvider({ baseUrl: BASE, cacheWeights: false }).ensureEngine();

    expect(open).not.toHaveBeenCalled();
    expect(calls).toEqual([WEIGHTS_URL]);
  });

  it('falls back to a plain fetch when Cache Storage is unavailable', async () => {
    const cact = new Uint8Array([7, 8, 9, 10]);
    const { engine, hooks } = makeBuiltInEngine();
    stubBrowser(engine);
    vi.stubGlobal('caches', undefined);
    const calls = fakeFetch(cact);

    await new NeedleWasmProvider({ baseUrl: BASE }).ensureEngine();

    expect(calls).toEqual([WEIGHTS_URL]);
    expect(hooks.loadedBytes).toBe(4n);
  });

  it('degrades to a network fetch if the cache cannot be opened', async () => {
    const cact = new Uint8Array([11, 12]);
    const { engine, hooks } = makeBuiltInEngine();
    stubBrowser(engine);
    fakeCaches(new Map(), true);
    const calls = fakeFetch(cact);

    await new NeedleWasmProvider({ baseUrl: BASE }).ensureEngine();

    expect(calls).toEqual([WEIGHTS_URL]);
    expect(hooks.loadedBytes).toBe(2n);
  });
});

describe('NeedleWasmProvider.willDownloadWeights', () => {
  const BASE = 'https://artifacts.test/needle2';
  const WEIGHTS_URL = `${BASE}/needle2.cact`;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports no download once the weights are resident', async () => {
    const { engine } = makeFakeEngine(() => ({}));
    const provider = new NeedleWasmProvider({ baseUrl: BASE, loadEngine: async () => engine });
    await provider.ensureEngine();
    expect(await provider.willDownloadWeights()).toBe(false);
  });

  it('reports no download when a custom loader owns weight loading', async () => {
    const { engine } = makeFakeEngine(() => ({}));
    const provider = new NeedleWasmProvider({ baseUrl: BASE, loadEngine: async () => engine });
    expect(await provider.willDownloadWeights()).toBe(false);
  });

  it('reports a download when Cache Storage is unavailable', async () => {
    vi.stubGlobal('caches', undefined);
    const provider = new NeedleWasmProvider({ baseUrl: BASE });
    expect(await provider.willDownloadWeights()).toBe(true);
  });

  it('reports a download when caching is disabled, even with a warm cache', async () => {
    fakeCaches(new Map([[WEIGHTS_URL, new Response([1])]]));
    const provider = new NeedleWasmProvider({ baseUrl: BASE, cacheWeights: false });
    expect(await provider.willDownloadWeights()).toBe(true);
  });

  it('reports no download when the weights are already cached', async () => {
    fakeCaches(new Map([[WEIGHTS_URL, new Response([1])]]));
    const provider = new NeedleWasmProvider({ baseUrl: BASE });
    expect(await provider.willDownloadWeights()).toBe(false);
  });

  it('reports a download on a cache miss', async () => {
    fakeCaches(new Map());
    const provider = new NeedleWasmProvider({ baseUrl: BASE });
    expect(await provider.willDownloadWeights()).toBe(true);
  });

  it('reports a download if the cache cannot be opened', async () => {
    fakeCaches(new Map(), true);
    const provider = new NeedleWasmProvider({ baseUrl: BASE });
    expect(await provider.willDownloadWeights()).toBe(true);
  });
});
