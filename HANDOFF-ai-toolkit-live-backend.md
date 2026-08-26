# Handoff — AI Toolkit live backend (local dev + hosted demo)

**Date:** 2026-08-26
**Branch:** `feature/ai-toolkit-apply-command` (34 commits ahead of `main`, nothing pushed, no PR)
**Plan:** [`docs/plans/ai-toolkit-live-backend.md`](docs/plans/ai-toolkit-live-backend.md)
**Execution ledger (git-ignored, may be deleted):** `.superpowers/sdd/ai-toolkit-live-backend/progress.md`

This document is written for an agent orchestrator picking the work up cold.
Read the "Blocking decisions" section first — two of them change what you build.

---

## 1. What this work set out to do

Let a developer drive the docs `/ai-toolkit` demo from a real model on their own
machine, and let the deployed docs site do the same through a small protected
backend, using OpenRouter's free tier.

Three things blocked that at the start, all now fixed:

1. The only provider adapter spoke OpenAI's **Responses** API (`{baseUrl}/responses`,
   schema at `text.format`). OpenRouter speaks **Chat Completions**
   (`/api/v1/chat/completions`, schema at `response_format.json_schema`).
2. The gateway ships **no CORS** and never will, by design — so every browser path
   had to be made same-origin instead.
3. The docs dev server had no proxy, so nothing could reach a local gateway.

## 2. Status by task

All seven plan tasks are **code-complete, reviewed, and committed**. Every task
went through implement → independent review → fix loop → scoped re-review.

| # | Task | Commits | Review outcome |
|---|---|---|---|
| 1 | Chat Completions provider | `0d999d4`, `5b756ce` | Spec ✅; 1 Important fixed (test nesting) |
| 2 | `AI_PROVIDER` env switch | `c5b8d4b`, `0e63554` | Spec ✅; 1 Critical fixed (silent budget overage) |
| 3 | Docs dev-server proxy | `80646adf` | Spec ✅, approved; 2 Minor |
| 4 | OpenRouter live battery | `2fe07cb`, `60f1022` | Spec ✅; 1 Important fixed (tautological assertion) |
| 5 | Cloud Run + Firebase rewrite | `d9bb1dd`, `64b6583` | Spec ✅, approved; 2 Minor |
| 6 | Turnstile guard | `29f23e3`, `ed5e669` | Spec ✅; 1 Important fixed (undocumented secret) |
| 7 | Release records + deferred minors | `4438d5c` | — (final review not yet run) |

Plus `f5eca8b` (plan correction) and `a119fe4` (gitignore).

**Final whole-branch review: partially done.** The dispatched reviewer died on a
Claude spend limit. A targeted inline review was done instead, covering the
integration seams, the security surfaces, and release correctness. It found one
substantive issue (§3.3). **A full adversarial review has still not been run**
and remains worth doing — the inline pass deliberately did not read all 612 KB
of the branch diff.

What the inline review *did* verify:

- **Seams compose.** Tasks 2 and 6 both edited `server.ts`; Tasks 1 and 6 both
  edited `index.ts`. Both files carry all edits, nothing clobbered.
- **Prompt injection is contained.** `buildProviderPrompt`
  (`packages/ai-protocol/src/providerSchema.ts:64`) embeds the user command via
  `JSON.stringify` as a JSON string value, not concatenated prose. More
  importantly the output is schema-validated, so a successful injection can still
  only produce a schema-valid grid state built from real column ids.
- **The protected-state baseline genuinely holds.**
  `packages/ai-client/src/assistant.ts:190` force-adds every `GRID_STATE_KEY` not
  present in the locally generated schema to the ignore set, *after* reading the
  model's `propertiesToIgnore`. A hostile or broken model cannot widen the blast
  radius; `propertiesToIgnore` can only ever shrink what is applied. The safety
  property the docs claim is real and enforced client-side.
- **Staleness is checked at apply time**, not just at response time
  (`assistant.ts:187`).

### 3.3 `@libregrid/all` loses public exports under a minor bump

**This is the one substantive finding, and it is a release-correctness problem.**

`@libregrid/all` is published, public, and currently at 1.2.3. On `main` it
re-exports fourteen symbols from `@libregrid/ai-toolkit`
(`packages/all/src/index.ts:230-240`):

```
AiToolkitModule, NeedleWasmProvider, OpenAiCompatibleProvider, buildGridTools,
getStructuredSchema, runToolkit, toolCallToStatePatch, validateToolCall
+ types AiProvider, AiRequest, RawToolCall, ValidatedCall
```

On this branch it re-exports **only `AiToolkitModule`**. Seven named exports and
four exported types disappear from a published package's public surface.

Both changesets release `@libregrid/all` as **`minor`**.

The recorded rationale for choosing minor over major was that
`@libregrid/ai-toolkit` was never published to npm, so removing its APIs breaks
nobody. That reasoning is sound **for `@libregrid/ai-toolkit` itself**. It does
not transfer to `@libregrid/all`, which *was* published and *did* re-export those
APIs. Anyone who wrote `import { runToolkit } from '@libregrid/all'` against
1.x has their build broken by a minor upgrade.

**Decide before publishing.** Either bump `@libregrid/all` major, or confirm
deliberately that the 1.x `all` surface had no real consumers and accept it.
This is a judgement call for the owner — it was not made in this session.

## 3. Blocking decisions for whoever picks this up

### 3.1 The free tier does not clear the plan's own bar

This is the most important finding and it invalidates an assumption the plan
was built on.

The plan's Task 4 gate says: **9 of 11 commands must pass** to use a free model
for the hosted demo. Measured against the live deployed gateway:

| Model | Result | Notes |
|---|---|---|
| `nvidia/nemotron-3-ultra-550b-a55b:free` | **cannot be used at all** | OpenRouter: `No endpoints found that can handle the requested parameters` — no provider serving it supports strict structured outputs |
| `nvidia/nemotron-3-super-120b-a12b:free` | 3/6, then 4/6 | two 30 s timeouts both runs |
| `openrouter/free` (auto-router) | 4/6 | two 30 s timeouts |

Only **five** free models on OpenRouter support structured outputs at all:
`dots-studio/dots-3-note-preview:free`, `liquid/lfm-2.5-2.6b:free`,
`z-ai/glm-5.2:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `openrouter/free`.
Query them yourself with:

```sh
curl -s https://openrouter.ai/api/v1/models \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('\n'.join(m['id'] for m in d['data'] if str(m.get('pricing',{}).get('prompt','1')) in ('0','0.0') and 'structured_outputs' in (m.get('supported_parameters') or [])))"
```

Two distinct failure modes, and they need different fixes:

- **Timeouts dominate.** `createGridCommandHandler` defaults to `timeoutMs: 30_000`
  and `packages/ai-gateway/src/server.ts` **does not expose it as an env var**.
  Free models routinely exceed 30 s. Adding e.g. `GATEWAY_TIMEOUT_MS` is a small,
  high-value change and is the single most likely way to move these numbers.
- **Semantic errors that are schema-valid.** "Hide internal notes" returned
  `{"columnVisibility": null}` — valid against the schema, but it did nothing.
  Raising the timeout will not fix this.

**Read the eventual numbers carefully.** `openrouter.live.spec.ts` asserts only
`status === 'ok'`, which means "the output validated against the generated
schema" — *not* "the model did the right thing". The sibling
`openai.live.spec.ts` additionally asserts semantics (sort direction, filter
values). Do not report an OpenRouter pass rate as "correctly executes commands".

**Recommendation:** add the timeout env var, re-measure, and if the free tier
still fails the bar, use a cheap paid model for the hosted demo and document
free models as local-development-only. That fallback is already written into
the plan.

### 3.2 The deployed endpoint is currently unguarded and holds a real key

Right now: real OpenRouter key installed, `--allow-unauthenticated`, and
**`TURNSTILE_SECRET_KEY` is not set, so the guard is OFF**. Spend exposure is
limited because the model is `:free`, but the endpoint is an open LLM proxy that
consumes the owner's OpenRouter rate limits.

Closing it needs two Cloudflare Turnstile values that **cannot be self-issued**:

```sh
gcloud secrets create libregrid-turnstile-secret --replication-policy=automatic --project=libregrid
printf '%s' 'YOUR-TURNSTILE-SECRET' | gcloud secrets versions add libregrid-turnstile-secret --project=libregrid --data-file=-
gcloud secrets add-iam-policy-binding libregrid-turnstile-secret --project=libregrid \
  --member="serviceAccount:libregrid-ai-gateway@libregrid.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
gcloud run services update libregrid-ai-gateway --project=libregrid --region=us-central1 \
  --update-secrets TURNSTILE_SECRET_KEY=libregrid-turnstile-secret:latest
```

The **site** key (public, safe to commit) goes into `TURNSTILE_SITE_KEY` in
`apps/docs/src/app/routes/ai-toolkit.ts`. It is deliberately `''` today — that
empty value is what keeps the local dev loop working without a Turnstile
account, and it is a designed behaviour, not an oversight (ruling C1 below).

Verify the guard is live: `curl -X POST .../v1/grid-command -d '{}'` → **401**.

## 4. Deployment state (real, live)

| Thing | Value |
|---|---|
| Cloud Run service | `libregrid-ai-gateway`, region `us-central1` |
| URL | `https://libregrid-ai-gateway-930129144043.us-central1.run.app` |
| Serving revision | `libregrid-ai-gateway-00007-q49` |
| Runtime identity | `libregrid-ai-gateway@libregrid.iam.gserviceaccount.com` — **zero project roles**, `secretAccessor` on one secret only |
| Secret | `libregrid-openrouter-key`, version 2 = real key, version 1 = placeholder (disabled) |
| Image | `us-central1-docker.pkg.dev/libregrid/libregrid/ai-gateway:v1` |
| Firebase | **preview channel only** — `https://libregrid--preview-g04ztv7z.web.app`. Production Hosting untouched. |
| GCP project | `libregrid` / `930129144043`, billing active |

APIs enabled during this work: `cloudbilling`, `run`, `secretmanager`,
`cloudbuild`, `artifactregistry`.

**Full gate, last run 2026-08-26 23:05, all green:** `npm run test:all` →
152 files passed / 1 skipped, 1152 tests passed / 12 skipped, 0 failed.
`npm run lint` clean. `check:contamination`, `check:versions`, `check:budgets`
all pass.

Verified working: `/health` → 200; conformance CLI → `{"ok": true}`; the
Firebase preview routes `/v1/grid-command` to the gateway (a real gateway JSON
error, not Angular's `index.html`) with no CORS headers.

**Security note left deliberately unresolved:** the default compute SA
(`930129144043-compute@developer.gserviceaccount.com`) still holds
`roles/editor` project-wide. It is no longer used by this service, but stripping
it has project-wide blast radius affecting other workloads. That is the project
owner's call, and it is recorded as open action B5.

## 5. Findings that cost real effort to discover

Re-discovering these is expensive. They are why several things look the way they do.

1. **`nx build` restores from cache even after `rm -rf dist`.** Two bundle
   measurements in this plan were silently wrong before this was caught. **Always
   use `npx nx build <target> --skip-nx-cache`** before measuring size.
2. **The published ESM packages do not load in plain Node.** `dist/index.js`
   uses extensionless relative specifiers (`export … from './types'`) in a
   `"type": "module"` package. Node ESM requires explicit extensions.
   `import('@libregrid/core')` and `import('@libregrid/ai-gateway')` both fail
   with `ERR_MODULE_NOT_FOUND`. Bundlers (vite/webpack/esbuild) resolve it
   fine, which is why the esbuild-based consumer fixtures never caught it, and
   why the bundled CLIs still work. **This is pre-existing and repo-wide — not
   introduced by this plan — but it breaks `@libregrid/ai-gateway`'s primary
   documented use case** ("wrap its framework-neutral handler" from your own Node
   server). `@libregrid/core` is already published at 1.1.1 with this defect.
   Not fixed here: it is a build-config change across 24+ published packages and
   needs its own plan.
3. **The Dockerfile had two independent bugs.** `--source packages/ai-gateway`
   cannot work (the Dockerfile COPYs from the context *root*), and `COPY tools ./tools`
   was missing entirely (both `project.json` build targets invoke
   `tools/clean-package-dist.mjs`). Build from the repo root via `cloudbuild.yaml`.
4. **`.gcloudignore` is mandatory.** The repo is 383 MB excluding `node_modules`;
   `node_modules` is another 825 MB. A source upload does **not** honour
   `.gitignore`, so `.secrets` must be excluded explicitly. It is.
5. **Vite's dev server reflects `Access-Control-Allow-Origin`.** It bundles the
   `cors` package as global middleware. The LibreGrid gateway ships zero CORS
   code. A developer inspecting local traffic can wrongly conclude the gateway
   supports cross-origin calls. Documented in `docs/firebase-hosting.md`.
6. **The conformance CLI takes a positional URL, not `--endpoint`**, and crashes
   with a raw stack trace on bad input. Minor UX defect, unfixed.

## 6. Rulings made on the owner's behalf

Each of these was a judgement call. Reverse any that are wrong.

- **C1 — Turnstile site key is config, not a constant, and its absence disables
  the widget.** The plan hardcoded a placeholder site key and always requested a
  token, which would have broken the Task 3 local dev loop for anyone without a
  Turnstile account — while protecting nothing, since the local gateway leaves
  the secret unset and never checks the token.
- **C2 — render the Turnstile widget once.** The plan's `turnstileToken()` called
  `api.render()` twice, leaking a widget per invocation.
- **Task 4 response discriminator.** The plan's snippet used `body.ok`; the real
  `GridCommandResponse` discriminates on `status: 'ok' | 'error'`
  (`packages/ai-protocol/src/types.ts:81,99`). The plan would not have compiled.
  Plan corrected in `f5eca8b`.
- **Task 4 unsupported-intent assertion.** The plan's version was a tautology
  (`body.ok === false || body.ok === true`) that passed regardless of outcome and
  would have inflated the 9-of-11 gate by one guaranteed pass.
- **Deploy with a placeholder key first.** Proved the whole path without an
  unguarded spending endpoint. (Superseded once the owner installed the real key.)
- **Dedicated least-privilege runtime SA** instead of granting the default
  compute SA more. Detail in §4.
- **Steps needing third-party credentials were deferred, not faked.** No
  OpenRouter or Turnstile credential was ever invented.

## 7. What to do next, in order

1. **Resolve the `@libregrid/all` semver question (§3.3)** before any publish.
   Then run a full adversarial whole-branch review
   (`git merge-base main HEAD`..`HEAD`) — only a targeted inline pass was done.
   Point it at the deferred-minor list in the ledger.
2. **Add `GATEWAY_TIMEOUT_MS` to `server.ts`** and re-measure the free models.
   This is the highest-value small change available.
3. **Run the real 11-command battery** — it has never been executed. It needs
   `OPENROUTER_API_KEY` in the environment and owner egress approval (the B4
   precedent). Note this session was *blocked by a permission classifier* from
   writing the key to `.secrets`; a human should run it:
   ```sh
   node --env-file=.secrets node_modules/vitest/vitest.mjs run \
     packages/ai-gateway/src/openrouter.live.spec.ts
   ```
   Then fill in the plan's Verification record and make the §3.1 model decision.
4. **Install the Turnstile secrets** (§3.2) before anything else points at this
   endpoint.
5. **Decide on the ESM packaging defect** (§5.2). It affects published packages
   beyond this work.
6. **Open the PR.** Nothing has been pushed. `main` requires PRs, 0 approvals,
   4 checks, no admin bypass.

## 8. Things deliberately NOT done

- No push, no PR, no production Firebase deploy, no npm publish.
- No `roles/editor` change on the default compute SA.
- No fix for the repo-wide ESM packaging defect.
- No invented credentials of any kind.
- Deferred minor: no typecheck target covers `*.live.spec.ts`; a
  `revisionFor(JsonValue)` vs `JsonSchema` strictness gap exists in both
  `openai.live.spec.ts:124` and `openrouter.live.spec.ts:113`. Pre-existing.
