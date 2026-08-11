# Phase 0 — Foundation & Guardrails

**Status:** 🟡 Mostly complete — repo is public and CI is green. Outstanding: 0.3, 0.7, 0.10, 0.10a, 0.12
**Depends on:** nothing
**Blocks:** every other phase

---

## Context

This phase builds no features. It exists to make every later phase safe and verifiable, and to answer one question before any effort is sunk: **does the additive-module strategy actually work against the published npm package?**

Three things here are load-bearing:

1. **Task 0.8 (seam verification).** The whole project depends on `main.ts` re-exporting `main-internal.ts`, which makes `BeanStub`, `_ModuleWithApi` and the stage interfaces importable. If those symbols are missing from the *published build*, the strategy is dead and we must re-plan. Find out now, not in Phase 2.

2. **Task 0.5 (contamination guard).** G1 is the project's legal foundation. A rule enforced by discipline will eventually be broken by a tired engineer or an agent that decides looking "just once" is fine. It must be mechanical, and it must be *proven* to fire.

3. **Task 0.10 (benchmark baseline).** Performance is an acceptance criterion in later phases. Without a baseline captured before any feature code exists, "no regression" is unmeasurable.

Everything else is ordinary scaffolding, but do not compress it — every later phase assumes it is present.

**Do not skip ahead.** No feature work begins until the acceptance criteria below are all met.

---

## Todo

- [x] **0.1 — Init workspace** ✅
  npm workspaces + Nx, `git init` on `main`. Root `package.json`, `nx.json`, `.gitignore`.
  Added `@nx/angular` / `@nx/playwright` **when their phases need them**, not up front.
  **Directory name:** the local folder is `open-grid`; this is deliberate and resolved — the correct name arrives via `git clone` after the public push ([OPEN-ACTIONS](../OPEN-ACTIONS.md) C1). The folder name appears in no artifact.
  Remote: [github.com/libregrid](https://github.com/libregrid) (org claimed 2026-08-11).

- [x] **0.2 — Root configuration**
  `tsconfig.base.json` (standards §4), root `package.json` (standards §3), `.editorconfig`, `.prettierrc`, `eslint.config.mjs`, MIT `LICENSE`.

- [ ] **0.3 — Nx module boundaries**
  Tag every package `type:framework-neutral` or `type:angular` in its `project.json`. Add `@nx/enforce-module-dependencies` so framework-neutral cannot depend on Angular.

- [x] **0.4 — Version single-source**
  `tools/version/generate.mjs` reads the version from the **installed** `ag-grid-community/package.json` and writes `src/version.ts` per package. `tools/version/check.mjs` fails on drift, and also enforces the `@libregrid/core` singleton (no two workspace packages on different core ranges).
  *Deviation from the original spec:* deriving from the installed package removes hand-maintained drift entirely, which a `AG_GRID_TARGET` constant could not. `VERSION` is **not** exported by `ag-grid-community` — see standards.md §5.

- [x] **0.5 — G1 contamination guard** ⚠️
  `tools/check-contamination/`:
  - Fail if `ag-grid-enterprise` appears in any `package.json`, lockfile, or source file
  - Fail if `node_modules/ag-grid-enterprise` exists
  - **Deliberate fixture** `__fixtures__/violation.ts.txt` with an offending import, plus a test asserting the guard flags it — **verified firing**
  - Wire in as a **required, blocking** CI job — done; it gates every other job
  - ESLint `no-restricted-imports` — **verified firing** on both `ag-grid-enterprise` and `ag-grid-community/dist/*` deep imports
  - *Design note:* prose (`.md`) is exempt from the term scan — documentation must be free to name what it forbids, and prose cannot import anything. Manifests, lockfiles, source and CI config **are** scanned. A YAML step *label* containing the term will fail the build; keep it out of labels.
  - ⬜ **Outstanding:** `tools/sync-community-source/` sparse-checkout helper (only needed when someone actually needs to read MIT upstream source)

- [x] **0.6 — `@libregrid/core` skeleton**
  - `EnterpriseCoreModule` — a `Module` with `moduleName: 'EnterpriseCore'`, no beans
  - `testing/makeBeanHarness.ts` (standards §7.1) — exported via the `./testing` subpath, **never** the main entry
  - `untyped-beans.ts` — local interfaces for the `UntypedBeanNames` slots
  - **Duplicate-instance guard** — the `Symbol.for('libregrid.core.instance')` check from [`package-architecture.md`](../reference/package-architecture.md) §7, with a test proving it warns
  - `NOTICE` + `README.md` with G3 attribution
  - Scope boundary is fixed by `package-architecture.md` §3: **core holds only what ≥3 feature packages need, and nothing user-facing.** Resist every temptation to grow it.

- [ ] **0.7 — Conformance matrix**
  `tools/conformance/` runs the full suite against each supported `ag-grid-community` version (start: `36.1.0`). Nightly CI schedule plus an on-demand target.

- [x] **0.8 — SEAM VERIFICATION** ✅ *already proven — see [`../reference/spike-results.md`](../reference/spike-results.md)*
  A throwaway spike on 2026-08-11 confirmed all 18 runtime symbols, all type-only exports, live module registration, and CSRM invoking a custom `aggStage` bean against `ag-grid-community@36.1.0`. **Build it here as a permanent CI regression test** — it is the tripwire for G5 seam churn, so it must run on every commit and in the conformance matrix, not once.
  A test importing, **from the published npm package**, every symbol in `api-seams.md` §1:
  ```ts
  import * as ag from 'ag-grid-community';
  for (const s of ['BeanStub','Component','ModuleRegistry','createGrid','createTheme','themeQuartz'])
    expect(ag[s], `${s} missing from ag-grid-community`).toBeDefined();
  ```
  Plus `expectTypeOf` assertions for the type-only exports.
  **If this fails: STOP and report. Do not work around it.**

- [x] **0.9 — Docs app**
  `apps/docs` — Angular 22 standalone, **zoneless** (`provideZonelessChangeDetection`), Material 3 via `mat.theme()`, lazy-loaded routes, `@angular/build` application builder.
  Routes: **Overview** (positioning, roadmap, G3 attribution) and **Grid** (a live `ag-grid-community` grid with `EnterpriseCoreModule` registered, listing the registered modules and naming what is not yet available).
  Toolbar carries a **light/dark toggle** so Phase 1's theme-bridge acceptance criterion has somewhere to be demonstrated.
  Grid modules are registered **once in `main.ts`**, never inside a package — a package that self-registers can never be tree-shaken out (package-architecture.md §5 rule 3).
  *Verified in a real browser:* both routes render, the grid sorts/filters/selects, dark mode restyles the grid without reload, **zero console errors or warnings**.
  Add a route here for every feature — a working docs route is part of the Definition of Done.

- [ ] **0.10 — Benchmark harness**
  `apps/bench` measuring initial render, scroll FPS, sort, filter at 10k/100k/1M rows. Commit `bench/baseline.json`.

- [ ] **0.10a — Bundle budget & tree-shaking harness** *(see [`package-architecture.md`](../reference/package-architecture.md) §5)*
  A fixture app importing exactly **one** LibreGrid package, built and asserted to (a) stay under its budget in `bundle-budgets.json`, and (b) contain **no other** `@libregrid/*` code.
  Every package gets a budget when it is created. **This runs from Phase 0 onward — tree-shaking is not a Phase 13 cleanup**, because the choices that destroy it are made in Phase 1.
  Also add the CI check that no two workspace packages resolve different `@libregrid/core` versions (§7).

- [x] **0.11 — CI**
  `.github/workflows/ci.yml` — the **contamination job runs first and blocks every other job**, and it also runs the guard's own tests so the fixture proof is enforced, not assumed. Then lint → version checks → test (with coverage) → build → `git diff --exit-code` (catches drifted generated files). `nightly.yml` runs seam verification against `ag-grid-community@latest` as the G5 tripwire.
  ⬜ **Outstanding:** E2E job (nothing to E2E until Phase 1) and the Changesets release workflow with npm provenance (needed before the first publish, not before the first feature).

- [ ] **0.12 — ADRs**
  `docs/adr/0001-additive-strategy.md`, `0002-material-token-bridge.md`, `0003-version-compat-policy.md`, `0004-contamination-controls.md`. (`0005-project-name.md` already exists.)

- [x] **0.13 — Open-source governance files** *(required — the repo is public from this phase)*
  - `CONTRIBUTING.md` — dev setup, the phase/sub-PR workflow, Definition of Done, Changeset requirement, and a prominent pointer to **guardrail G1** (contributors must never introduce `ag-grid-enterprise`)
  - `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
  - `SECURITY.md` — private disclosure route and response expectations. Matters disproportionately for a library others depend on
  - `.github/ISSUE_TEMPLATE/` (bug, feature, parity-gap) and `PULL_REQUEST_TEMPLATE.md` (links the phase file, ticks todo items, confirms parity checklist updated, and carries explicit G1/G4 attestations)
  - Root `README.md` — tagline **"Enterprise-grade features for AG Grid Community"**, the G3 attribution disclaimer, and an MIT badge. State the licence plainly as "MIT licensed" — the badge and `LICENSE` carry the rest, and elaborating on the `Libre` name only draws attention to a concern most readers do not have
  - Root `LICENSE` (MIT) and `NOTICE` preserving `Copyright (c) 2015-2026 AG GRID LTD`; `NOTICE` also copied into `packages/core/`

- [x] **0.14 — Publish the repository publicly**
  Push to [github.com/libregrid](https://github.com/libregrid). Set the **org and repo descriptions to the official tagline** — per **G4.3** these are governed public surfaces; do not improvise wording.
  Do this **after** 0.13, so the first outside visitor finds a contribution path.
  ⚠️ Confirm `tools:check-contamination` is green **before** the first public push.

---

## Test plan

| What | How |
|---|---|
| Seam availability | Task 0.8 runtime + type assertions against the published package |
| Module registration | Integration test: register `EnterpriseCoreModule`, assert it appears in `ModuleRegistry` and the grid boots |
| Contamination guard | Run the guard against `__fixtures__/violation.ts.txt`; assert **non-zero exit**. Then assert clean exit on the real tree |
| Version drift | Unit test comparing generated `version.ts` against installed `ag-grid-community` |
| Bean harness | Self-test: a trivial bean constructed via `makeBeanHarness` receives `postConstruct()` and can read `gos` |
| Module boundaries | Lint test: a fixture importing `@angular/core` from a framework-neutral package fails lint |
| Benchmarks | Run twice; confirm variance <5% so the baseline is meaningful |
| Docs app | Playwright smoke: route loads, grid renders rows, no console errors |

---

## Acceptance criteria

- [ ] **Task 0.8 passes** — every documented symbol resolves from `'ag-grid-community'`
- [ ] `EnterpriseCoreModule` registers into a live grid in `apps/docs` and appears in `ModuleRegistry`
- [ ] Contamination guard **proven to fire** on the deliberate fixture, and green on the real tree
- [ ] `bench/baseline.json` committed, with run-to-run variance under 5%
- [ ] Conformance matrix runs green against `36.1.0`
- [ ] Module-boundary lint rejects an Angular import from a framework-neutral package
- [ ] `npx nx run-many -t lint test build` green
- [ ] CI pipeline green end to end, with contamination as a blocking job
- [ ] Four ADRs written
- [ ] `NOTICE` + attribution present in `@libregrid/core` (G3)
- [ ] Governance files present: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue/PR templates, root `README.md`
- [ ] **Repository is public** at [github.com/libregrid](https://github.com/libregrid), with org and repo descriptions set to the official tagline (G4.2/G4.3)
- [ ] Contamination guard verified green **before** the first public push

> ⚠️ If Task 0.8 fails, **stop**. Report the specific missing symbols and await a re-plan. Do not patch `node_modules`, vendor the source, or monkey-patch at runtime.
