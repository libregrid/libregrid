# Phase 13 — Long Tail & 1.0 Hardening

**Status:** ⬜ Not started
**Depends on:** Phases 0–12 all complete
**Blocks:** the 1.0.0 release

**Packages:** `@libregrid/angular`, `@libregrid/all`, plus long-tail additions
**Parity:** all checklists in [`../parity/`](../parity/)

---

## Context

Everything up to here built features. This phase makes the result a **product**: honest about its gaps, accessible, fast, small, documented, and installable.

Three things deserve emphasis.

**The parity audit is the headline deliverable.** "Feature for feature with AG Grid Enterprise" is a claim we will be judged on. Every checklist must be complete, and every ❌ must carry a real rationale. An honest, complete gap list is far more valuable to users — and far more defensible — than an overstated claim. Expect to find items that were quietly skipped in earlier phases; that is exactly what this audit is for.

**`@libregrid/all` is a convenience, not an excuse.** It re-exports every module for quick starts. Verify tree-shaking still works for consumers who import individual packages — a bundle that always pulls in charts because someone imported grouping is a serious regression.

**The migration guide is what makes adoption possible.** Someone leaving `ag-grid-enterprise` needs a concrete mapping: which `@libregrid/*` package replaces which Enterprise module, what is identical, what differs, and what is missing.

The long-tail features here are genuinely optional. Ship them if the audit is clean and budgets are met; otherwise document them as post-1.0.

---

## Todo

### 13A — Long tail (optional; only with a clean audit)

- [ ] `RowNumbers` module (`rowNumbers` interface)
- [ ] `Notes` module (`notes` interfaces: `INoteAccess`, `INotesFeature`, `INotesDataService`, `INotesService`)
- [ ] Column header editing (`iColumnHeaderEdit`, `IColumnHeaderEditService`)
- [ ] Toolbar (`iToolbar`, bean `toolbarMenuBuilder`) — hosts Find and pivot-panel items
- [ ] `testIdSvc` (`iTestIdService`) — test IDs for consumer test suites
- [ ] PDF export (`iPdfCreator`) — **only if warranted**; otherwise document as out of scope

### 13B — `@libregrid/angular`

- [ ] Signal-based ergonomics over the module set
- [ ] `provideLibreGrid(...modules)` for `ApplicationConfig`
- [ ] Typed helpers for common `GridOptions` patterns

### 13C — `@libregrid/all`

- [ ] Re-export every module
- [ ] Verify importing `@libregrid/all` does not defeat tree-shaking for single-package consumers

### 13D — Audit & hardening

- [ ] **Full parity audit** — every checklist complete, every ❌ justified
- [ ] Accessibility sweep to **WCAG 2.1 AA** across every docs route, light and dark
- [ ] Performance tuning against `bench/baseline.json`; investigate every regression
- [ ] Bundle-size budgets per package, enforced in CI
- [ ] Tree-shaking verification (import one module, assert others absent from the bundle)
- [ ] Cross-browser matrix: Chrome, Firefox, Safari, Edge
- [ ] Full docs site: one route per feature, API reference, live examples
- [ ] **Migration guide** from `ag-grid-enterprise` — package-by-package mapping
- [ ] `README` for every package with G3 attribution verified
- [ ] Security review of dependencies (`fflate`, `ag-charts-community` only)
- [ ] Conformance matrix extended across every supported Community patch release
- [ ] `1.0.0` release via Changesets with npm provenance

---

## Test plan

| Tier | Coverage |
|---|---|
| **Audit** | Walk every `docs/parity/*.md` against the live docs site. Every ✅ must have a demonstrable docs route and a passing integration test. Spot-check a sample of ✅ claims by re-reading the AG Grid docs page |
| **a11y** | axe-core across **every** route, light and dark. Manual keyboard traversal of each feature. Screen-reader smoke test (NVDA or VoiceOver) on grouping, menus, tool panels and charts |
| **Performance** | Full benchmark suite vs. Phase-0 baseline at 10k/100k/1M rows. Chart, group, pivot and SSRM scenarios |
| **Bundle** | Per-package size budgets. Tree-shaking: a fixture app importing only `@libregrid/row-grouping` must not contain chart or Excel code |
| **Cross-browser** | Playwright across Chrome, Firefox, Safari, Edge for core flows: grouping, menus, tool panels, selection, clipboard, export |
| **Install** | From a clean directory, `npm i ag-grid-community @libregrid/row-grouping` and run the quick-start from the README verbatim. It must work with no undocumented steps |
| **Conformance** | Matrix green across every supported `ag-grid-community` release in range |

---

## Acceptance criteria

- [ ] **Every parity checklist complete**, with each ❌ carrying a written rationale
- [ ] Gap list published in the docs — honest and prominent, not buried
- [ ] WCAG 2.1 AA met across all routes, light and dark; axe 0 violations
- [ ] All performance budgets met; no unexplained regression vs. baseline
- [ ] Bundle budgets enforced in CI; tree-shaking verified
- [ ] Cross-browser suite green on Chrome, Firefox, Safari, Edge
- [ ] Docs site complete: every feature has a live route and API reference
- [ ] Migration guide maps every Enterprise module to its LibreGrid equivalent or documented gap
- [ ] Quick-start works verbatim from a clean install
- [ ] Only runtime dependencies across all packages are `fflate` and `ag-charts-community`
- [ ] G3 attribution present in every published package
- [ ] Conformance matrix green across the full supported range
- [ ] `1.0.0` published with provenance
