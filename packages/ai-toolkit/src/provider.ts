import type { RawToolCall } from './tools';

/** One completed request as normalised by a provider. */
export interface AiProviderResult {
  /** Tool calls to apply (empty = off-topic / nothing actionable). */
  calls: RawToolCall[];
  /** Calibrated confidence in the calls (Needle) or trust-by-design 1 (remote). */
  confidence: number;
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
}

function strPtr(engine: NeedleEngine, s: string): number {
  const bytes = new TextEncoder().encode(s);
  const p = engine._malloc(bytes.length + 1);
  engine.HEAPU8.set(bytes, p);
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
  private engine: NeedleEngine | null = null;
  private weightsLoaded = false;
  private initKey: string | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(options: NeedleWasmOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.loadEngine = options.loadEngine;
    this.cacheWeights = options.cacheWeights ?? true;
  }

  private get weightsUrl(): string {
    return `${this.baseUrl}/needle2.cact`;
  }

  /**
   * Whether the next `ensureEngine()` will fetch the weights from the network
   * (true) or serve them from memory / Cache Storage (false). Cheap — at most
   * one `Cache.match`. Use it to label UI accurately: only announce a model
   * download when this returns true.
   */
  async willDownloadWeights(): Promise<boolean> {
    if (this.weightsLoaded || this.loadEngine) return false;
    if (!this.cacheWeights || typeof caches === 'undefined') return true;
    try {
      const cache = await caches.open(ARTIFACT_CACHE);
      return (await cache.match(this.weightsUrl)) === undefined;
    } catch {
      // Cache unusable — fetchArtifact will fall back to the network too.
      return true;
    }
  }

  /**
   * Load the engine + weights once (lazy). With the built-in browser loader
   * the .cact weights are fetched from `baseUrl` (cache-first via Cache
   * Storage when available); a custom `loadEngine` hook is trusted to return
   * an already-loaded engine (tests, SSR, self-hosted bundles).
   */
  async ensureEngine(): Promise<NeedleEngine> {
    if (this.engine) return this.engine;
    const engine = this.loadEngine ? await this.loadEngine() : await loadBrowserEngine(this.baseUrl);
    if (!this.weightsLoaded && !this.loadEngine) {
      const cact = new Uint8Array(await fetchArtifact(this.weightsUrl, this.cacheWeights));
      const p = engine._malloc(cact.length);
      engine.HEAPU8.set(cact, p);
      const rc = engine._needle_load(p, BigInt(cact.length));
      engine._free(p);
      if (rc < 0) throw new Error(`ai-toolkit: needle_load failed (rc=${rc})`);
    }
    this.weightsLoaded = true;
    this.engine = engine;
    return engine;
  }

  complete(request: AiRequest): Promise<AiProviderResult> {
    // One session, one request at a time.
    const run = this.queue.then(() => this.completeOnce(request));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async completeOnce(request: AiRequest): Promise<AiProviderResult> {
    const engine = await this.ensureEngine();
    const toolsJson = JSON.stringify(request.tools);
    if (this.initKey !== toolsJson) {
      const rc = engine._needle_init(strPtr(engine, request.context), strPtr(engine, toolsJson), 0);
      if (rc < 0) throw new Error(`ai-toolkit: needle_init failed (rc=${rc})`);
      this.initKey = toolsJson;
    }

    engine._needle_reset();
    const inPtr = strPtr(engine, request.prompt);
    const capacity = 65536;
    const outPtr = engine._malloc(capacity);
    try {
      engine._needle_complete(inPtr, request.maxNewTokens ?? 256, outPtr, capacity);
      const raw = engine.UTF8ToString(outPtr);
      const parsed = JSON.parse(raw) as {
        type?: string;
        function_calls?: { name: string; arguments?: Record<string, unknown> }[];
        confidence?: number;
        reasoning?: string;
      };
      return {
        calls: (parsed.function_calls ?? []).map((c) => ({ name: c.name, arguments: c.arguments ?? {} })),
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
        ...(parsed.reasoning !== undefined ? { reasoning: parsed.reasoning } : {}),
      };
    } catch (e) {
      throw new Error(`ai-toolkit: malformed Needle response: ${(e as Error).message}`);
    } finally {
      engine._free(inPtr);
      engine._free(outPtr);
    }
  }
}

async function loadBrowserEngine(baseUrl: string): Promise<NeedleEngine> {
  if (typeof document === 'undefined') {
    throw new Error('ai-toolkit: NeedleWasmProvider needs a browser (or pass options.loadEngine for Node/SSR tests)');
  }
  // The emscripten glue lives under wasm/ in the pinned HF commit; it then
  // resolves needle.wasm relative to its own location.
  await injectScript(`${baseUrl}/wasm/needle.js`);
  const factory = (globalThis as Record<string, unknown>).createNeedle;
  if (typeof factory !== 'function') {
    throw new Error('ai-toolkit: createNeedle global missing after loading needle.js');
  }
  return (factory as (arg?: object) => Promise<NeedleEngine>)({});
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`ai-toolkit: failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Fetch an artifact cache-first. Pinned artifact URLs are immutable (the base
 * URL embeds the HF commit), so a Cache Storage hit is always valid — no
 * revalidation needed. Entries are keyed by full URL, so CDN and self-hosted
 * base URLs coexist in one versioned cache. Any Cache Storage failure
 * (insecure context, quota) degrades to a plain network fetch: caching must
 * never break loading. The emscripten glue/wasm stay on the browser HTTP
 * cache deliberately — intercepting their load would risk breaking the glue's
 * relative `needle.wasm` resolution.
 */
async function fetchArtifact(url: string, useCache: boolean): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  if (useCache && typeof caches !== 'undefined') {
    try {
      cache = await caches.open(ARTIFACT_CACHE);
    } catch {
      cache = null;
    }
  }
  if (cache) {
    const hit = await cache.match(url).catch(() => undefined);
    if (hit) return hit.arrayBuffer();
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`ai-toolkit: artifact fetch failed (${response.status}) for ${url}`);
  if (cache) {
    try {
      // Best-effort store; the original body is consumed below, so clone it.
      await cache.put(url, response.clone());
    } catch {
      // Quota exceeded or opaque response — this load still succeeds from network.
    }
  }
  return response.arrayBuffer();
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
