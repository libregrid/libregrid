# ADR 0006 — Local-first AI inference for the AI Toolkit

**Status:** Superseded by [ADR 0007](./0007-pure-ai-schema-and-byom-gateway.md) on 2026-08-25
**Date:** 2026-08-23

---

## Context

> Historical record only. No local model, provider, or fallback described by
> this ADR is present in the active AI Toolkit architecture.

Gap-plan A6 (AI Toolkit) needs an LLM to turn natural language into grid-state
changes. Ag-Grid's own toolkit assumes a consumer-configured **hosted** LLM —
the public docs' example calls `gpt-5-mini` — so the default data flow sends
grid context to a third party.

Cactus Needle 2 (a ~45M-parameter agentic model, ~14 MB WASM binary, ~28 MB
RAM, browser-runnable, tool-calling-first) makes a **browser-local** default
feasible for constrained schema-aware tool calls. Its limits are real: ~256
tokens of context, top-5 tool retrieval, and a quality ceiling below frontier
models on complex multi-step requests.

## Decision

1. **Local-first.** The default provider (`NeedleWasmProvider`) runs in the
   browser via WASM. No network traffic by default; row values are never part
   of the model context (schema + current grid state only).
2. **Remote fallback is opt-in.** An `OpenAiCompatibleProvider` accepts a
   consumer-supplied endpoint and is disabled unless explicitly configured.
3. **Confidence gating.** Providers return a confidence score; below threshold
   the toolkit escalates to the remote provider (if enabled) or returns a
   clarification instead of applying a guessed state change.
4. **Stateless requests in v1.** No conversation memory, matching Ag-Grid's
   module contract.

## Alternatives considered

- **Hosted-only** (mirror the Ag-Grid docs): rejected — makes third-party data
  transmission the default, which is the privacy property this project exists
  to remove.
- **Local-only**: rejected — the quality ceiling leaves complex requests with
  no escape hatch; an opt-in fallback costs little and covers them.
- **Consumer-provided provider only** (no default): rejected — a working
  default is what distinguishes LibreGrid's AI Toolkit from "wire up your own
  LLM".

## Consequences

- Privacy by default: nothing leaves the browser unless the consumer opts in.
- A ~14 MB lazy-loaded asset on first use (never bundled; self-hostable).
- Documented quality ceiling for complex requests; the remote fallback is the
  documented remedy, and Needle fine-tuning on domain data is a recommended
  (not required) improvement path.
- No new runtime dependencies; no conversation state to persist in v1.
