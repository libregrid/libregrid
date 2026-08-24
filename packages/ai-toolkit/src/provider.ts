import type { RawToolCall } from './tools';

/** One completed request as normalised by a provider. */
export interface AiProviderResult {
  /** Tool calls to apply (empty = off-topic / nothing actionable). */
  calls: RawToolCall[];
  /**
   * Calibrated confidence, or `undefined` when the provider does not report
   * one. Tuned Needle weights report no confidence at all — fine-tuning does
   * not update the confidence head — so this must stay distinct from 0, which
   * means "certainly wrong" and would reject every tuned response.
   */
  confidence: number | undefined;
  reasoning?: string;
}

export interface AiRequest {
  /** The user's natural-language request. */
  prompt: string;
  /** Stable session facts (column descriptions, value sets) — the system turn. */
  context: string;
  /** Tool catalogue in standard function-schema form. */
  tools: Record<string, unknown>[];
  maxNewTokens?: number;
}

export interface AiProvider {
  readonly name: 'needle-wasm' | 'openai-compatible';
  complete(request: AiRequest): Promise<AiProviderResult>;
}

/** Wire shape of an OpenAI-compatible tool call. */
interface ToolCallWire {
  function?: { name: string; arguments?: string };
}

/** The emscripten surface of the Needle engine (wasm/needle.h). */
export interface NeedleEngine {
  _malloc(n: number): number;
  _free(p: number): void;
  HEAPU8: Uint8Array;
  UTF8ToString(p: number): string;
  _needle_load(cactPtr: number, n: bigint): number;
  _needle_init(systemPtr: number, toolsPtr: number, indexPtr: number): number;
  _needle_complete(inputPtr: number, maxNewTokens: number, outPtr: number, outCapacity: number): number;
  _needle_reset(): void;
}

const DEFAULT_BASE_URL = 'https://huggingface.co/Cactus-Compute/needle2/resolve/98fbd955b0347e78059be0c253cc1ffa09b87bc7';

/** Cache Storage name for pinned artifacts — bump when the artifact set changes. */
const ARTIFACT_CACHE = 'libregrid-needle-v1';

/** Caches from earlier `ARTIFACT_CACHE` generations, swept on first use. */
const ARTIFACT_CACHE_PATTERN = /^libregrid-needle-v\d+$/;

/** Output buffer handed to `needle_complete`; one JSON object fits easily. */
const OUTPUT_CAPACITY = 65536;

/** Needle's context window is ~256 tokens (spike §3) — the useful ceiling. */
const DEFAULT_MAX_NEW_TOKENS = 256;

export interface NeedleWasmOptions {
  /** Base URL of the pinned artifact set (self-hostable). Defaults to the HF CDN. */
  baseUrl?: string;
  /** Test/SSR hook: return a ready engine instead of fetching artifacts. */
  loadEngine?: (() => Promise<NeedleEngine>) | undefined;
  /**
   * Persist fetched weights in Cache Storage (cache-first, keyed by artifact
   * URL so CDN and self-hosted base URLs coexist). Enabled by default
   * wherever the browser exposes `caches` (secure contexts); set false to
   * force a network fetch (tests, or a self-hosted URL that changes in place).
   */
  cacheWeights?: boolean;
  /**
   * Subresource Integrity hash for the emscripten glue (`wasm/needle.js`),
   * e.g. `'sha384-…'`. The default base URL is commit-pinned, but pinning
   * alone does not stop the host serving different bytes: set this to make
   * the browser verify them. Implies `crossorigin="anonymous"` on the tag.
   */
  scriptIntegrity?: string;
}

/**
 * Copy a JS string into the engine heap as a NUL-terminated C string. The
 * caller owns the returned pointer and must `_free` it — `_needle_*` copies
 * what it needs out of the buffer before returning (same contract the weight
 * buffer in `loadWeights` relies on).
 */
function strPtr(engine: NeedleEngine, s: string): number {
  const bytes = new TextEncoder().encode(s);
  const p = engine._malloc(bytes.length + 1);
  engine.HEAPU8.set(bytes, p);
  // `_malloc` hands back dirty memory: without this the C side reads past the
  // end of the string into whatever the previous allocation left behind.
  engine.HEAPU8[p + bytes.length] = 0;
  return p;
}

/**
 * The default provider (ADR 0006): Cactus Needle 2 running entirely in the
 * browser via WebAssembly. No network traffic except the one-time artifact
 * fetch from a pinned, self-hostable base URL — and even that is cached:
 * weights are served cache-first from Cache Storage (`libregrid-needle-v1`),
 * so repeat visits load with zero model downloads. Requests are stateless —
 * `needle_reset()` before every completion keeps the 256-token window clean
 * (spike finding C) — and serialised on a single session queue.
 */
export class NeedleWasmProvider implements AiProvider {
  readonly name = 'needle-wasm' as const;

  private readonly baseUrl: string;
  private readonly loadEngine: (() => Promise<NeedleEngine>) | undefined;
  private readonly cacheWeights: boolean;
  private readonly scriptIntegrity: string | undefined;
  private engine: NeedleEngine | null = null;
  private weightsLoaded = false;
  private initKey: string | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  /** In-flight `ensureEngine()`, so concurrent callers share one load. */
  private loading: Promise<NeedleEngine> | null = null;
  /** In-flight/settled engine instantiation, kept across weight-load retries. */
  private enginePromise: Promise<NeedleEngine> | null = null;

  constructor(options: NeedleWasmOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.loadEngine = options.loadEngine;
    this.cacheWeights = options.cacheWeights ?? true;
    this.scriptIntegrity = options.scriptIntegrity;
  }

  private get weightsUrl(): string {
    return `${this.baseUrl}/needle2.cact`;
  }

  /**
   * Whether the next `ensureEngine()` will fetch the weights from the network
   * (true) or serve them from memory / Cache Storage (false). Cheap — at most
   * one `Cache.match`. Use it to label UI accurately: only announce a model
   * download when this returns true.
   *
   * Advisory, not a guarantee: the cache can be evicted between this call and
   * the load. It shares `openCache()` with the fetch path so both answer the
   * "is caching usable here?" question the same way.
   */
  async willDownloadWeights(): Promise<boolean> {
    if (this.weightsLoaded || this.loadEngine) return false;
    const cache = await this.openCache();
    if (!cache) return true;
    return (await cache.match(this.weightsUrl).catch(() => undefined)) === undefined;
  }

  /**
   * Load the engine + weights once (lazy). With the built-in browser loader
   * the .cact weights are fetched from `baseUrl` (cache-first via Cache
   * Storage when available); a custom `loadEngine` hook is trusted to return
   * an already-loaded engine (tests, SSR, self-hosted bundles).
   *
   * Concurrent callers share one load; a failure part-way through leaves the
   * instantiated engine in place so a retry does not inject the glue twice.
   */
  async ensureEngine(): Promise<NeedleEngine> {
    if (this.engine) return this.engine;
    this.loading ??= this.loadOnce().finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  private async loadOnce(): Promise<NeedleEngine> {
    this.enginePromise ??= (this.loadEngine ? this.loadEngine() : loadBrowserEngine(this.baseUrl, this.scriptIntegrity)).catch(
      (error: unknown) => {
        // Instantiation itself failed — let the next attempt start over.
        this.enginePromise = null;
        throw error;
      },
    );
    const engine = await this.enginePromise;

    // A custom loadEngine hook owns weight loading; the built-in loader does not.
    if (!this.weightsLoaded && !this.loadEngine) await this.loadWeights(engine);

    this.weightsLoaded = true;
    this.engine = engine;
    return engine;
  }

  private async loadWeights(engine: NeedleEngine): Promise<void> {
    const cact = new Uint8Array(await this.fetchWeights());
    const p = engine._malloc(cact.length);
    engine.HEAPU8.set(cact, p);
    const rc = engine._needle_load(p, BigInt(cact.length));
    engine._free(p);
    if (rc < 0) throw new Error(`ai-toolkit: needle_load failed (rc=${rc})`);
  }

  /**
   * Open the artifact cache, or null when caching is off or unusable
   * (insecure context, no Cache Storage, quota errors). The single place that
   * decides whether caching is available — `willDownloadWeights` and
   * `fetchWeights` must never disagree. Sweeps caches left by earlier
   * `ARTIFACT_CACHE` generations so a bump does not strand their weights.
   */
  private async openCache(): Promise<Cache | null> {
    if (!this.cacheWeights || typeof caches === 'undefined') return null;
    try {
      const cache = await caches.open(ARTIFACT_CACHE);
      await sweepStaleCaches();
      return cache;
    } catch {
      return null;
    }
  }

  /**
   * Fetch the weights cache-first. Pinned artifact URLs are immutable (the
   * base URL embeds the HF commit), so a Cache Storage hit is always valid —
   * no revalidation needed. Any Cache Storage failure degrades to a plain
   * network fetch: caching must never break loading.
   */
  private async fetchWeights(): Promise<ArrayBuffer> {
    const url = this.weightsUrl;
    const cache = await this.openCache();
    if (cache) {
      const hit = await cache.match(url).catch(() => undefined);
      if (hit) return hit.arrayBuffer();
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`ai-toolkit: artifact fetch failed (${response.status}) for ${url}`);
    // Read once and store the bytes: `response.clone()` would make the browser
    // buffer this ~14 MB body twice to feed both consumers.
    const buffer = await response.arrayBuffer();
    if (cache) {
      try {
        await cache.put(url, new Response(buffer, { headers: response.headers }));
      } catch {
        // Quota exceeded or opaque response — this load still succeeds.
      }
    }
    return buffer;
  }

  complete(request: AiRequest): Promise<AiProviderResult> {
    // One session, one request at a time.
    const run = this.queue.then(() => this.completeOnce(request));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async completeOnce(request: AiRequest): Promise<AiProviderResult> {
    const engine = await this.ensureEngine();
    // Re-initialise when either the system turn or the tool catalogue changes —
    // both are part of the engine's session state.
    const toolsJson = JSON.stringify(request.tools);
    const sessionKey = `${request.context}\u0000${toolsJson}`;
    if (this.initKey !== sessionKey) {
      const systemPtr = strPtr(engine, request.context);
      const toolsPtr = strPtr(engine, toolsJson);
      try {
        const rc = engine._needle_init(systemPtr, toolsPtr, 0);
        if (rc < 0) throw new Error(`ai-toolkit: needle_init failed (rc=${rc})`);
        this.initKey = sessionKey;
      } finally {
        engine._free(systemPtr);
        engine._free(toolsPtr);
      }
    }

    engine._needle_reset();
    const inPtr = strPtr(engine, request.prompt);
    const outPtr = engine._malloc(OUTPUT_CAPACITY);
    try {
      // `_malloc` memory is dirty: terminate the buffer up front so an engine
      // that writes nothing reads back empty rather than as stale bytes.
      engine.HEAPU8[outPtr] = 0;
      const rc = engine._needle_complete(inPtr, request.maxNewTokens ?? DEFAULT_MAX_NEW_TOKENS, outPtr, OUTPUT_CAPACITY);
      // Distinguish "the engine failed" from "the engine answered something we
      // could not parse" — collapsing both into one message hides the rc.
      if (rc < 0) throw new Error(`ai-toolkit: needle_complete failed (rc=${rc})`);
      return parseCompletion(engine.UTF8ToString(outPtr));
    } finally {
      engine._free(inPtr);
      engine._free(outPtr);
    }
  }
}

async function loadBrowserEngine(baseUrl: string, integrity: string | undefined): Promise<NeedleEngine> {
  if (typeof document === 'undefined') {
    throw new Error('ai-toolkit: NeedleWasmProvider needs a browser (or pass options.loadEngine for Node/SSR tests)');
  }
  // The emscripten glue lives under wasm/ in the pinned HF commit; it then
  // resolves needle.wasm relative to its own location.
  await injectScript(`${baseUrl}/wasm/needle.js`, integrity);
  const factory = (globalThis as Record<string, unknown>).createNeedle;
  if (typeof factory !== 'function') {
    throw new Error('ai-toolkit: createNeedle global missing after loading needle.js');
  }
  return (factory as (arg?: object) => Promise<NeedleEngine>)({});
}

/**
 * Load the emscripten glue. This executes third-party script in the host page,
 * so `integrity` is offered for consumers who want the bytes verified rather
 * than merely commit-pinned; SRI needs CORS, hence `crossOrigin`.
 */
function injectScript(src: string, integrity: string | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    if (integrity !== undefined) {
      script.integrity = integrity;
      script.crossOrigin = 'anonymous';
    }
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`ai-toolkit: failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Delete artifact caches from earlier `ARTIFACT_CACHE` generations. Bumping
 * the constant would otherwise strand the old weights in the origin's quota
 * forever. Best-effort and never fatal — the caller only wants the current
 * cache. The emscripten glue/wasm stay on the browser HTTP cache deliberately:
 * intercepting their load would risk breaking the glue's relative
 * `needle.wasm` resolution.
 */
async function sweepStaleCaches(): Promise<void> {
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key !== ARTIFACT_CACHE && ARTIFACT_CACHE_PATTERN.test(key)).map((key) => caches.delete(key)),
    );
  } catch {
    // Enumeration unsupported or blocked — leaving stale caches is harmless.
  }
}

/** Normalise one raw engine response into an `AiProviderResult`. */
function parseCompletion(raw: string): AiProviderResult {
  let parsed: {
    type?: string;
    function_calls?: { name: string; arguments?: Record<string, unknown> }[];
    confidence?: number;
    reasoning?: string;
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch (e) {
    throw new Error(`ai-toolkit: malformed Needle response: ${(e as Error).message}`);
  }
  return {
    calls: (parsed.function_calls ?? []).map((c) => ({ name: c.name, arguments: c.arguments ?? {} })),
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    ...(parsed.reasoning !== undefined ? { reasoning: parsed.reasoning } : {}),
  };
}

/**
 * Opt-in remote fallback (ADR 0006): any OpenAI-compatible chat-completions
 * endpoint with tool calling. Disabled unless a consumer constructs it —
 * never the default. Remote results carry `confidence: 1` by design (the
 * consumer chose to trust this endpoint); they therefore satisfy any gate.
 */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = 'openai-compatible' as const;

  private readonly endpoint: string;
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: { endpoint: string; model: string; apiKey?: string; fetchImpl?: typeof fetch }) {
    this.endpoint = options.endpoint;
    this.model = options.model;
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async complete(request: AiRequest): Promise<AiProviderResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: request.context },
          { role: 'user', content: request.prompt },
        ],
        tools: request.tools.map((t) => ({ type: 'function', function: t })),
      }),
    });
    if (!response.ok) throw new Error(`ai-toolkit: remote provider failed (${response.status})`);

    const body = (await response.json()) as {
      choices?: { message?: { tool_calls?: ToolCallWire[] } }[];
    };
    const toolCalls: ToolCallWire[] = body.choices?.[0]?.message?.tool_calls ?? [];
    return {
      calls: toolCalls.map((tc) => ({
        name: tc.function?.name ?? '',
        arguments: parseArguments(tc.function?.arguments),
      })),
      confidence: 1,
    };
  }
}

function parseArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
