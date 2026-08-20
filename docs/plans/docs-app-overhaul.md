# Docs App Product, UX, and Developer-Integration Overhaul

**Status:** implementation plan
**Scope:** `apps/docs`, `apps/docs-e2e`, supporting example fixtures, and the smallest package fixes needed for truthful demos
**Primary audiences:** end users evaluating a feature, Product Managers evaluating customer value, and developers integrating LibreGrid
**Implementation rule:** preserve existing public URLs where possible; use redirects only when a feature is intentionally split into package-level pages

## 1. Outcome

The Docs app must become three things at once:

1. A product showroom that makes the customer value of each LibreGrid package obvious.
2. A task-oriented guide that teaches an end user how to use each feature.
3. A production integration guide with complete frontend code, backend seams, request/response contracts, persistence guidance, and honest limitations.

A page is not complete because a grid renders. It is complete only when a new reader can answer:

- What customer problem does this solve?
- What should I do in the live demo, and what result should I notice?
- Which package must I install?
- Which modules must I register?
- Which grid options, column definitions, events, and APIs are involved?
- Does the feature run in the browser, call my backend, or require both?
- What must my backend store, validate, authorize, query, and return?
- What production concerns apply?
- What should I use instead when this feature is not the right fit?

## 2. Current-state evidence

The audit covered the route source, package READMEs, E2E suites, installed Angular Material 22.1 APIs, and rendered desktop pages.

### 2.1 Structural gaps

- The navigation exposes 25 public entries. `/benchmark` is a hidden internal route.
- The workspace contains 32 `@libregrid/*` packages, while the API Reference lists only 24.
- The API Reference is missing `batch-edit`, `calculated-columns`, `column-header-edit`, `excel-export`, `notes`, `row-numbers`, `server-side-selection`, and `toolbar`.
- `PackageEntry.notes` is populated in `api.ts`, but the table never renders it.
- `calculated-columns.ts` and its Playwright suite exist, but `/calculated-columns` is absent from `NAV`, `routes`, global registration, and Docs dependencies. The wildcard currently redirects that test URL to the Overview.
- `apps/docs/package.json` omits direct dependencies that the app imports: `@libregrid/angular`, `@libregrid/excel-export`, `@libregrid/toolbar`, and `@libregrid/calculated-columns`.
- The overview promotes `@libregrid/all` as the default install even though the package architecture defines it as a quick-start/prototype convenience rather than the recommended production path.
- The overview hardcodes shipped-phase, npm-version, and AG Grid-version claims that can drift.
- No route template contains a real block code example. Useful code is hidden in route implementation files or package READMEs.
- Global module registration in `main.ts` makes route source look self-contained when it is not. Copying a route component into an application would omit required module registration.
- The wildcard redirect hides broken and stale links instead of showing a not-found state.

### 2.2 UX gaps

- Most pages follow the same shallow pattern: title, technical paragraph, large grid, raw actions, and one more technical paragraph.
- Product outcomes, use cases, guided tasks, system ownership, and production guidance are inconsistent or absent.
- Blank grid space dominates short examples. Charts, Master/Detail, Advanced Filter, Tree Data, and Pivot use too little data to tell a convincing story.
- Controls frequently describe API names instead of user intent, for example `resetColumnState()` and `Toggle server pivot`.
- Noninteractive cards receive hover elevation, which falsely suggests that they are clickable.
- The flat navigation mixes getting-started content, UI controls, row models, developer integration, and reference pages in one long list.
- Internal labels such as phase numbers and R1–R7 leak into user-facing copy without first translating them into user outcomes.

### 2.3 Button and control gaps

The Docs app currently uses 59 Material buttons:

- 49 `mat-stroked-button`
- 5 `mat-flat-button`
- 5 `mat-icon-button`

Actions, alternatives, toggles, resets, and workflow states therefore look equivalent. Some ordinary buttons emulate selected state through `lgr-active`, but no matching global style exists for the current bindings in Row Numbers, Column Header Edit, and Notes.

Angular Material 22.1 already supplies the needed hierarchy:

```ts
type MatButtonAppearance =
  | 'text'
  | 'filled'
  | 'elevated'
  | 'outlined'
  | 'tonal';
```

The overhaul must use the current `matButton` API, Material button toggles, switches, chips, menus, tabs, and tooltips rather than solving every interaction with another outlined button.

### 2.4 Correctness blockers

These are implementation prerequisites, not documentation polish:

1. `packages/server-side-row-model/src/serverSideRowModel.ts` always forwards `filterManager.getFilterModel()`. When Advanced Filter is enabled, the SSRM request must forward `filterManager.getAdvFilterModel()` instead. An Advanced Filter currently refreshes SSRM, but the server receives no advanced model.
2. The Server-Side Selection demo claims accumulated filtered terms, group routes, and `selected(spec) AND filterModel`. Its in-memory provider reduces selection to one boolean, ignores the captured filter and group routes, exposes no filters, and does not apply `filterModel` in selected-only view.
3. The Viewport demo's timer always pushes indices 0–29 even after the visible range moves, contradicting the page's visible-window explanation.
4. The Material side-bar renderer can be replaced by the native `renderButtons()` path after its Angular portal attaches. The running demo shows the plain side-bar buttons, not a persistent Material renderer. The Material renderer also needs the native `id`, `aria-controls`, and selected-tab relationships.
5. Integrated Charts exposes both Docs-level chart controls and package-created native buttons. This creates duplicate Configure and Unlink actions and a mixed Material/raw-HTML experience.

## 3. Content contract for every public feature page

Create a shared page composition and require every public page to supply the following sections in this order.

### 3.1 Feature header

- Package eyebrow, for example `@libregrid/master-detail`.
- Human feature title.
- One-sentence customer outcome without API jargon.
- Badges for framework, execution boundary (`Browser`, `Backend`, or `Both`), and major dependencies.
- Links to the package README, source, parity/gap document, and migration mapping.

### 3.2 Why teams use it

Keep this short and evaluative:

- customer job;
- visible end-user benefit;
- representative applications;
- why this is better than manually building the behavior;
- when to use it;
- when not to use it and the nearest alternative.

### 3.3 Guided live demo

- Use a realistic product scenario, not generic `Alpha/Beta` rows.
- Present two to four numbered tasks beside or above the demo.
- Give the action group one clear primary action.
- Show current state, active filters/modes, and result counts without requiring DOM inspection.
- Provide a deterministic Reset action.
- Demonstrate loading, empty, error, recovery, and success where the feature has those states.
- Put instructions next to the surface they describe.
- Use human labels. Put API method names in the developer section.

### 3.4 What to notice

After the demo, state the concrete proof the reader just saw. Examples:

- only a 100-row server block crossed the network;
- a chart stayed linked after row data changed;
- a collapsed detail grid was reused from the bounded cache;
- selection survived a filter change without sending millions of IDs to the browser.

### 3.5 Add it to your app

Every page must include copyable, complete, compile-checked examples for:

1. exact package installation;
2. Angular registration with `provideLibreGrid(...)`;
3. framework-neutral registration with `ModuleRegistry.registerModules(...)`;
4. minimum complete grid/column configuration;
5. feature APIs and events used by the live scenario;
6. application-state persistence when relevant.

Do not rely silently on the Docs app's global registration.

### 3.6 Connect your backend

Every page must explicitly state one of:

- **Backend integration required** — include contracts and working adapter examples.
- **Backend integration optional** — show the common persistence/integration seam.
- **Browser-only by default** — explain that no data leaves the browser unless the host app sends it.

Pages with a backend seam must cover:

- data ownership;
- frontend adapter;
- request and response types;
- example handler/query adapter;
- authentication and authorization boundary;
- field/operator allowlists and value parameterization;
- error and retry behavior;
- lifecycle/cancellation;
- persistence and concurrency;
- performance constraints.

### 3.7 Production checklist

Use a concise checklist tailored to the feature. Topics include stable IDs, cache limits, cleanup, validation, accessible labels, keyboard behavior, sensitive-data handling, bundle cost, and known parity differences.

### 3.8 API and related features

- List the page's supported public surface, not internal beans.
- Link to prerequisites and composable packages.
- Link to the most useful next demo.
- Make tradeoffs explicit, for example SSRM versus Viewport and Master/Detail versus Tree Data.

## 4. Information architecture

### 4.1 Typed feature catalog

Create `apps/docs/src/app/docs/feature-catalog.ts` as the single source for:

- canonical path and aliases;
- public/internal visibility;
- category and sort order;
- title, short value statement, and search keywords;
- package names and module names;
- required and optional dependencies;
- browser/backend ownership;
- route loader;
- README, source, parity, and migration links;
- related features;
- presence of frontend, backend, and API examples.

Drive grouped navigation, route definitions, overview cards, package catalog, related links, page metadata, and completeness tests from this catalog. Do not maintain separate package arrays in `routes.ts`, `overview.ts`, and `api.ts`.

Add CI assertions that:

- every workspace `packages/*/package.json` is represented;
- every public catalog item resolves to a route;
- every public route has a catalog item;
- every route's packages are direct Docs dependencies;
- internal routes are excluded from public navigation and completeness totals;
- every related-feature target exists;
- every public page declares its execution boundary and example coverage.

### 4.2 Navigation groups

Replace the single `Features` list with collapsible groups:

1. **Start here** — Overview, Getting Started, Package Catalog, Grid baseline.
2. **Explore and analyze** — Row Grouping, Pivot, Columns, Filters, Set Filter, Multi Filter, Advanced Filter, Find.
3. **Work with server and live data** — Server-Side Rows, SSRM Analytics, Server-Side Selection, Viewport Rows.
4. **Organize and inspect data** — Tree Data, Master/Detail, Calculated Columns, Rich Select.
5. **Edit and collaborate** — Cell Selection, Clipboard, Row Numbers, Header Edit, Notes, Batch Edit.
6. **Customize the workspace** — Menus, Side Bar, Toolbar, Status Bar.
7. **Visualize and export** — Integrated Charts, Sparklines, Excel Export.
8. **Integrate and reference** — Angular, Material, API Reference, Migration/Gap links.

Search must match feature names, package names, aliases such as SSRM, and use-case terms such as `large data`, `saved filters`, `bulk edit`, and `live feed`.

### 4.3 Package-level discoverability

Combined demos currently hide package boundaries. Give every public package a unique catalog entry and a stable documentation target.

- Keep `/filters` as a suite overview, and add package-level sections or routes for Set Filter, Multi Filter, and Filters Tool Panel.
- Split `/advanced-filter-find` into discoverable targets for Advanced Filter, Find, and Rich Select. Preserve the old path as a suite overview or redirect.
- Split `/selection` into discoverable targets for Cell Selection, Clipboard, and Status Bar. Preserve the old path as a workflow overview.
- Split `/charts` and `/sparklines`. Preserve `/charts` for Integrated Charts.
- Restore `/calculated-columns` as a public route.
- Add a Material integration page; `@libregrid/material` must not be represented only by the toolbar palette button.
- Keep `@libregrid/core` and `@libregrid/all` in the developer catalog with explicit guidance, not as end-user demo pages.
- Keep `/benchmark` internal, non-indexed, and outside pager/search/catalog counts.
- Add a real not-found page that offers search and likely destinations.

## 5. Shared Docs UI system

Build small standalone Angular components under `apps/docs/src/app/docs/`. Do not build a page-content DSL; route components should compose these primitives directly.

### 5.1 Components

- `feature-page-shell` — header, content column, sticky on-this-page navigation, responsive behavior.
- `feature-header` — package badges, value statement, audience/boundary metadata, source links.
- `value-summary` — customer job, outcomes, use/avoid guidance.
- `guided-demo` — numbered tasks, active step, reset, completion state.
- `demo-workbench` — consistent demo card, action bar, status/live region, optional inspector split pane.
- `demo-action-bar` — primary/secondary/overflow slots with mobile rules.
- `code-example` — language/file label, tabs, copy action, syntax styles, internal horizontal scroll.
- `package-install` — exact install command, peer dependency note, copy action.
- `request-inspector` — request history, request/response tabs, readable JSON, copy, clear trace.
- `backend-boundary` — browser/backend ownership diagram and explanatory callouts.
- `production-checklist` — reusable visual treatment for feature-specific risks.
- `package-card` — purpose, footprint, execution boundary, dependencies, demo/reference links.
- `related-features` — curated next steps and comparisons.
- `docs-callout` — note, warning, limitation, browser-only, or backend-required state.

### 5.2 Global layout and shell

- Add a skip link to main content.
- Group navigation and expose category labels to assistive technology.
- Add package-name context to search results.
- Preserve the navigation search query while moving between pages.
- Add an on-this-page rail on wide screens and an anchor menu on mobile.
- Remove hover elevation from noninteractive cards.
- Use `cursor: pointer` and elevation only for genuine links/controls.
- Keep demo controls sticky only within their own workbench when useful.
- At narrow widths, move tertiary controls into a Material menu or bottom sheet.
- Ensure the page itself never scrolls horizontally; only code/JSON panes may scroll internally.

## 6. Material control system

### 6.1 Button hierarchy

Use the current Angular Material 22 API everywhere in the Docs app:

- `matButton="filled"` — exactly one primary action per action group.
- `matButton="tonal"` — frequent safe secondary action; default replacement for most current outlined actions.
- `matButton="outlined"` — true peer alternative or boundary action.
- `matButton="text"` — clear, reset, cancel, close, unlink, and tertiary actions.
- `matButton="elevated"` — sparingly on a busy/gradient surface.
- `matIconButton` — compact, universally recognizable actions with both tooltip and accessible name.
- Extended FAB — only for a genuine page-level create action. Do not use it as the default demo toolbar button.

Do not rely on `color="primary"`; it has no effect in the installed M3 theme.

### 6.2 Use controls that represent state

- `MatButtonToggleModule` for mutually exclusive values: Left/Right, Live/Deferred, chart type, detail refresh strategy.
- `MatSlideToggleModule` for independent booleans: pivot enabled, keep detail rows, row numbers, row resize, chart linked.
- `MatChipListbox` for filter presets and compact scenario choices.
- `MatSelect` for long option sets such as latency and pivot field.
- `MatMenu` for infrequent Save/Restore/Download/Advanced actions.
- Disable actions whose prerequisites do not exist, and explain the reason through adjacent text or tooltip.
- Do not emulate selected state with ordinary buttons plus `lgr-active`.

### 6.3 Visual shape

Retain Material behavior while replacing the generic full-pill silhouette through supported token overrides in `styles.scss`:

```scss
html {
  @include mat.button-overrides((
    filled-container-shape: 12px,
    tonal-container-shape: 12px,
    protected-container-shape: 12px,
    outlined-container-shape: 12px,
    text-container-shape: 10px,
  ));
}
```

This keeps ripples, focus handling, disabled behavior, touch targets, density, and theme integration.

### 6.4 Button-system acceptance

- No legacy `mat-flat-button`, `mat-stroked-button`, `mat-raised-button`, or `mat-button` remains in `apps/docs`.
- No `lgr-active` state emulation remains.
- Every action group has at most one filled action.
- Destructive and clearing actions do not compete with the primary action.
- All icon-only controls have an accessible name and tooltip.
- Effective targets are at least 44 by 44 CSS pixels.
- Focus order matches the visual workflow.
- Status changes use stable `aria-live` regions without moving controls.
- Action bars work at 375, 768, and 1280 pixels.
- Light, dark, and all accent themes retain WCAG AA contrast.

## 7. Flagship redesigns

### 7.1 Basic Server-Side Row Model

**Target story:** Browse and sort a million-row dataset while the browser only loads the blocks it needs.

#### Demo

- Use a coherent trade/order dataset shared with the two other server-side pages.
- Show logical rows, current page/range, loaded rows, blocks in cache, total requests, and last latency.
- Show a live request/response inspector.
- Add latency selection, `Fail next request`, Retry, and Reset controls.
- Make sorting and page/range navigation visibly append bounded requests.
- Show block eviction when `maxBlocksInCache` is exceeded.
- Label the mock as an HTTP-shaped simulated backend.

#### Developer guide

- Install and register `ServerSideRowModelModule`.
- Show `rowModelType`, datasource, `cacheBlockSize`, `maxBlocksInCache`, `getRowId`, and pagination.
- Show an async `fetch('/api/trades/query')` datasource with `params.success` and `params.fail`.
- Explain authoritative `rowCount`, stable IDs, concurrent requests, stale responses, cleanup, retry, and server-owned sorting/filtering.

#### Acceptance

- Page navigation and sorting create visible, range-bounded requests.
- Failure creates a recoverable error and Retry succeeds.
- Cache telemetry matches loaded/evicted blocks.
- Copying the frontend example produces a compile-checked datasource.

### 7.2 SSRM Analytics plus Advanced Filter

**Target story:** Investigate a large operational dataset without downloading it. Apply a compound filter, group results, expand only the route of interest, aggregate, sort, and pivot while the backend returns only requested rows and aggregates.

#### Prerequisite package fix

- In SSRM request creation, use `getAdvFilterModel()` when `isAdvFilterEnabled()` is true; otherwise use `getFilterModel()`.
- Type the request as the public `FilterModel | AdvancedFilterModel | null` union.
- Add focused package tests for ordinary and advanced filter request propagation.
- Add an integration test that registers `AdvancedFilterModule`, applies an AST, and asserts the datasource receives the same AST.
- Do not ship the combined demo until these tests pass.

#### Demo data and layout

- Represent at least one million logical trades/orders with desk, strategy, region, instrument, trade date, status, quantity, and notional.
- Use deterministic generation or a compact indexed fixture; do not allocate one million browser rows.
- Add KPI cards for logical rows, matching rows, loaded rows, request count, and last server time.
- Add meaningful presets such as `High-value equity exceptions`, `March commodity exposure`, and `Momentum trades over threshold`.
- Keep the advanced expression input and visual builder editable.
- Show active filter chips with text/set, number, and date conditions.
- Add Group By choices: None, Desk, Desk then Strategy.
- Add visible Pivot toggle and pivot-field selector.
- Use a responsive grid/inspector split view.
- Inspector tabs: SSRM request, transport payload, parameterized query plan, and server response.
- Network controls: latency, fail next request, retry, clear trace.
- Guided task: apply preset, expand a group, sort aggregate, enable pivot.

#### Simulated backend requirements

Create one shared request interpreter that supports:

- `startRow` and `endRow`;
- classic column models and the Advanced Filter AST;
- multiple sort entries;
- `rowGroupCols` and `groupKeys`;
- `valueCols` and supported aggregations;
- `pivotCols`, `pivotMode`, and `pivotResultFields`;
- authoritative matching count;
- request cancellation/generation handling;
- injected latency and one-shot failures.

Label it as a simulation. Keep the semantics faithful enough that the UI copy never claims behavior the interpreter does not perform.

#### Backend guide

Use one clear system flow:

```text
Grid
  -> POST /api/trades/query
  -> authorize tenant and user
  -> validate requested fields, operators, aggregations, and sort directions
  -> compile filters to parameterized predicates
  -> apply group route
  -> aggregate and pivot
  -> apply stable multi-column sort
  -> apply requested range and count
  <- { rows, rowCount, pivotResultFields? }
```

Include request/response DTOs, a framework-neutral handler/query planner, and one complete Express plus SQL-shaped example. Warn explicitly against interpolating column IDs, operators, directions, or values into SQL.

#### Acceptance

- A compound advanced filter changes matching count and group aggregates.
- Expanding a group sends the correct `groupKeys`.
- Sorting sends the complete server sort model.
- Pivot renders server-supplied fields and values.
- Every response honors the requested range.
- Fail/Retry is visible and recovers.
- Playwright verifies Advanced Filter, group expansion, sort, and pivot in one journey.
- The live inspector proves the exact Advanced Filter AST reached the datasource.

### 7.3 Server-Side Selection

**Target story:** Build a durable working set across pages, filters, and sessions without loading or transmitting millions of selected row IDs.

#### Demo

- Use 100,000 or more logical rows with real filters.
- Show total selected, visible selected, terms, additions, and exceptions.
- Render a human summary such as `All Equities under the active filter, plus 3 rows, minus 1 exception`.
- Guided journey: filter Equities, select all filtered, switch to Fixed Income and add rows, deselect one exception, clear/change filter, show all selected.
- Show provider-call history for `getSpec`, `applyOps`, and `resolveSelected`.
- Show selected-view SSRM requests applying `selected(spec) AND activeFilter`.
- Add a session/tab selector and demonstrate isolated specs.
- Add a destroy/recreate or cache-eviction action that proves provider rehydration.

#### Provider and backend

- Replace the one-boolean provider with a faithful implementation of terms, additions, exceptions, group routes, selected count, and atomic op batches.
- Key storage by tenant/user/grid/tab.
- Document GET spec, POST ops, POST resolve, and the selected-view query.
- Include a Redis/DB-shaped provider example, TTL/session policy, authorization, concurrency, and debouncing.
- Explain why only cache-sized ID batches cross the network.

#### Acceptance

- Filter terms accumulate.
- Filter changes do not erase selection.
- Exceptions override terms.
- Group routes resolve correctly if the page demonstrates groups.
- Selected-only mode keeps the current filter active.
- Evicted/reloaded rows rehydrate from the provider.
- Two tab IDs remain independent.
- No R1–R7 claim appears without a human explanation and a matching test.

### 7.4 Master / Detail

**Target story:** Let a user stay in context while inspecting and acting on child records fetched only when a parent is expanded.

#### Demo

- Remove `treeData` from the primary demo. Link to a separate composition example if both features are useful together.
- Use 10–20 realistic accounts/customers with order count, open cases, value, last activity, and risk.
- Fetch orders/calls from `/api/accounts/:id/orders` when a row expands.
- Start mostly collapsed. Use one highlighted sample row or a clear `Expand an account` task.
- Include one empty detail result and one retryable error.
- Detail grids must sort/filter independently.
- Controls: Expand Sample (`filled`), Refresh Detail (`tonal`), Collapse All (`text`), Keep Details (`slide-toggle`), and refresh strategy (`button-toggle-group`).
- Show mounted detail count, cache count, fetch count, last fetch, and eviction.

#### Developer guide

- Show module registration, `masterDetail`, `isRowMaster`, stable parent/detail IDs, `detailGridOptions`, and async `getDetailRowData`.
- Explain `keepDetailRows`, `keepDetailRowsCount`, refresh strategies, cancellation, error recovery, and focus restoration.
- Include the detail endpoint contract and a cancellation-safe fetch example.

#### Acceptance

- Expand visibly transitions loading to success, empty, or error.
- Error retry succeeds.
- Collapse destroys or caches according to the current control.
- Reopening a cached detail does not refetch.
- Cache never exceeds `keepDetailRowsCount`.
- Refresh strategy effects are observable.
- Keyboard users can expand, sort in the detail grid, collapse, and recover focus.

### 7.5 Integrated Charts

**Target story:** Turn selected grid data into a linked analysis without exporting or rebuilding chart state manually.

#### Demo

- Split Sparklines into its own route.
- Use a responsive two-column workbench: source grid and chart.
- Seed a meaningful linked chart on load, or use a designed empty state with one Create Chart action.
- Use enough time-series/category data to make charting meaningful.
- Use a chart-type selector or button-toggle group.
- Primary action: Create/Recreate Chart.
- Secondary actions: Update Data and Configure.
- Move Save, Restore, Download, and Unlink into an overflow menu.
- Disable actions until their prerequisites exist.
- Show linked/unlinked state, saved-state availability, and visible-row counts as chips/status.
- Demonstrate cross-filtering in a dedicated tab/section, with active-filter feedback and Clear.
- Destroy the prior chart before replacing it.

#### Package-toolbar decision

Choose one owner for chart controls:

- either suppress the package toolbar and let the Docs Material controls own the demo;
- or keep the product toolbar, remove duplicate Docs controls, add a renderer seam in Integrated Charts, and add a Material adapter in `@libregrid/material`.

Do not ship both control sets.

#### Developer guide

- Show `ag-charts-community`, Integrated Charts package installation, provider/module registration, container ownership, create/update/unlink, cross-filtering, `ChartModel` persistence, and `destroyChart` cleanup.
- State that charts use data already available to the grid and do not directly query a backend.
- Link supported-chart and parity limitations.

#### Acceptance

- A meaningful chart is visible without discovering an eight-button sequence.
- Recreate replaces rather than stacks charts.
- Updating grid data updates a linked chart; unlinking stops the update.
- Save/Restore survives chart destruction.
- Cross-filtering visibly changes grid rows and can be cleared.
- Invalid actions are disabled and explained.

### 7.6 Sparklines

**Target story:** Add scan-friendly trends to dense operational tables without opening a full chart.

- Use a separate 30–100-row grid.
- Include Line, Area, Column, and Bar examples controlled by a button-toggle group.
- Include positive, negative, flat, missing, and threshold-crossing trends.
- Keep tooltip and axis explanations next to the grid.
- Add accessible textual summaries or labels for trend meaning.
- Explain virtualization, cell renderer cost, tooltip configuration, and browser-only data ownership.
- Provide a standalone package install/registration/column-definition example.

Acceptance: each type renders through a labeled stateful control; scrolling demonstrates virtualization; keyboard/focus behavior and accessible summaries are verified.

## 8. Page-by-page work for all remaining routes

| Page | Product and live-demo work | Developer and integration work |
| --- | --- | --- |
| Overview | Replace roadmap emphasis with three paths: Evaluate, Integrate, Migrate. Add categorized package catalog and decision cards. Show customer outcome, package, dependencies, execution boundary, demo, and known gaps. Make SSRM discoverable within two actions. | Replace `@libregrid/all` as the default production install. Offer `Choose packages` first and label `all` as prototype convenience. Derive versions and package totals. |
| Grid baseline | Add theme/density controls and a five-minute starter. Explain what remains stock Community and what LibreGrid adds. | Show complete Angular and vanilla examples that recreate the visible grid. |
| Menus | Use a realistic application action, a visible right-click/menu cue, keyboard steps, and meaningful action feedback. Replace Suppress/Enable buttons with a switch. | Show default items, custom items/components, the registry seam, application command dispatch, and browser-only ownership. |
| Side Bar | Frame it as user workspace customization. Replace eight buttons with Show switch, panel choice, position toggle, and Show Buttons switch. Keep controls synchronized with grid state. | Show Side Bar registration, contributed panels, state persistence, and the Material renderer integration. Fix renderer persistence and accessibility first. |
| Toolbar | Frame quick filter, Find, group, pivot, and export as end-user tasks. Put Clear beside its input and disable it when empty. | Show toolbar item configuration and exact module dependencies for every built-in item. |
| Row Grouping | Use sales analysis, visible totals/KPIs, expand/collapse task, and reset. Make percent-of-total verifiable from visible values. | Show install, registration, `rowGroup`, aggregation, totals, and browser-owned limits. Link SSRM for server-owned grouping. |
| Pivot | Use richer data and a guided `build a quarterly report` task. Show group, pivot, and value chips plus pivot state. | Show pivot configuration, generated-column cap, result-column lookup, persistence, and SSRM alternative. |
| Columns | Demonstrate hide, reorder, group, Save Layout, Restore Layout, and Reset. Show serialized column state. | Show column-state persistence and an optional per-user preferences endpoint. |
| Filters suite | Add active chips, before/after counts, combined presets, serialized model, Reset, and an SSRM handoff link. | Show Set/Multi/Tool Panel package composition, async distinct-value endpoint, filter-model persistence, and model forwarding. |
| Set Filter | Give large distinct-value search/select its own discoverable package target. | Show static and async values, refresh, model, key/value handling, and server distinct-values seam. |
| Multi Filter | Demonstrate composing text/set/number filters for one column. | Show child-filter order, display modes, serialized nested model, and package dependencies. |
| Advanced Filter | Separate it from Find/Rich Select. Show expression, visual builder, validation errors, saved presets, AST/model view, and Reset. | Show parse/serialize/evaluate APIs, persistence, allowlists, and the SSRM Analytics link. |
| Find | Show previous/next, match index, wrap behavior, and rendered-cell highlighting. | Explain `getFindText` and that Find is rendered-cell search, not database/server search. |
| Rich Select | Demonstrate 10,000 options, typing, match highlighting, keyboard commit/cancel, and async loading/empty/error. | Show cell editor params and application option-service/backend seam. |
| Cell Selection | Use a spreadsheet planning scenario with range selection, fill series, visible aggregation, Reset, and guided keyboard/pointer paths. | Show module/configuration, range APIs/events, fill behavior, and browser-only ownership. |
| Clipboard | Add copy, paste, TSV preview, validation failure, and deterministic Reset. Disable Copy without a range. | Show package dependency, clipboard permissions, parsing, sanitization, validation, and event integration. |
| Status Bar | Give the package a discoverable example with range aggregation, filtered count, selected count, and custom panel. | Show panel registration and the Material status panel adapter. |
| Excel Export | Use a realistic financial/invoice report with grouping, totals, currency/date styles, and a meaningful second sheet. Show filenames and sheet count after export. | Show single/multi-sheet APIs, browser memory/privacy limits, no-backend default, and when full SSRM export must become a server job. |
| Viewport | Show connected/paused state, subscribed range, update rate, and updated-cell highlights. Push only the buffered range. | Show WebSocket/SSE subscribe/unsubscribe, `setViewportRange`, reconnect, cleanup, and comparison with SSRM. |
| Tree Data | Use a realistic file/catalog hierarchy, explicit drag handle, valid/invalid drop feedback, and emitted path payload. | Show path data, filler groups, stable IDs, reparent endpoint, validation, and Master/Detail comparison. |
| Batch Edit | Use bulk pricing or planning. Show staged diff, validation, commit payload, save failure, retry, and discard. Editing state should expose Commit plus Discard, not three peer buttons. | Map `batchEditingStopped.changes` to one transactional endpoint. Explain atomic versus partial failure and optimistic concurrency. |
| Row Numbers | Replace three buttons with switches. Disable Row Resize when Row Numbers is off and show resize feedback. | Show options, export behavior, RTL, row-selection interaction, and accessibility. |
| Column Header Edit | Add a visible cue to the header menu, edited-state badge, live column-state JSON, Save, and Reset Names. Use Live/Deferred toggle group. | Show state persistence and restoration, group headers, editable restrictions, and naming validation. |
| Notes | Break the long paragraph into guided scenarios for editable, read-only, suppressed, and full-width notes. Show author/time/permission, loading, error, and activity state. | Show REST-backed `NotesDataSource`, stable row/column keys, authorization, conflict policy, and remote refresh. |
| Calculated Columns | Restore route/dependency/registration. Use pricing/margin formulas, formula builder, validation, edited/persisted expressions, and security warning. | Show declaration and runtime creation, expression API/events, persistence, allowed functions, and read-only guarantees. |
| Angular | Show complete setup code rather than only describing it. Keep the signal demo and add a troubleshooting section. | Cover `provideLibreGrid`, module selection, typed helpers, signals, zoneless behavior, theme provider, cleanup, and version compatibility. |
| Material | Add an explicit theme/renderers page with live light/dark/accent/density and side-bar/status/rich-select examples. | Show provider setup, optional renderer installers, token bridge, button terminology, and renderer lifecycle. |
| API Reference | Replace the wide stale table with searchable package cards and package detail drawers/pages. | Include all 32 packages, purpose, install, modules, public exports, dependencies, execution boundary, demo, README/source, and known gaps. Generate or validate against package metadata. |
| Not Found | Show requested path, search, suggested pages, and Overview link. | Add an E2E assertion that unknown routes no longer silently redirect. |

## 9. Compile-checked example system

Do not store large unverified code strings in route templates.

### 9.1 Proposed files

```text
apps/docs/src/examples/
  getting-started/
  server-side-row-model/
  server-side-analytics/
  server-side-selection/
  master-detail/
  charts/
  ...
apps/docs/src/app/docs/generated/examples.generated.ts
apps/docs/tsconfig.examples.json
tools/docs/generate-examples.mjs
```

Each example set can contain:

- `install.txt`;
- `angular-registration.example.ts`;
- `vanilla-registration.example.ts`;
- `grid-options.example.ts`;
- `frontend-adapter.example.ts`;
- `contracts.example.ts`;
- `backend-handler.example.ts` where applicable.

### 9.2 Rules

- Examples must be complete enough to copy and adapt.
- Type-check frontend and framework-neutral TypeScript against workspace versions.
- Keep backend contracts framework-neutral where possible; use one complete Express/SQL example for the SSRM family.
- Generate escaped display strings from example files.
- Add a CI check that regeneration leaves no diff.
- Every code panel shows file name, language, Copy, and a short `Replace this with...` note.
- Copy must reproduce the exact tested source.
- Snippets must list every required module; no hidden dependency on `main.ts`.

## 10. Backend example coverage

### 10.1 Concrete backend examples required

- Basic/Advanced SSRM — query endpoint, validation, data adapter, range/count, aggregation/pivot, failure/retry.
- Server-Side Selection — spec store, atomic operations, cache-sized resolution, selected-view query.
- Viewport — range subscription over WebSocket/SSE and cleanup.
- Master/Detail — per-master fetch, cancellation, cache, empty/error/retry.
- Advanced Filter — serialization, AST validation, field/operator allowlist, query translation.
- Notes — read/write/delete, author, permissions, conflict handling.
- Batch Edit — bulk transaction, validation, optimistic concurrency, atomic/partial policy.
- Tree Data — reparent/path mutation and validation.
- Columns/Header Edit — optional user-preference persistence.
- Excel Export — explain when a full-server-data export must be a backend job.

### 10.2 Explicit browser-only statement required

Menus, Side Bar, Toolbar, client-side Grouping/Pivot, Cell Selection, Clipboard, Row Numbers, Integrated Charts, Sparklines, and Angular helpers should state that LibreGrid does not contact a backend by itself.

## 11. Multi-agent execution plan

Only the Foundation agent edits `app.ts`, `routes.ts`, `main.ts`, `styles.scss`, the feature catalog, or shared Docs primitives during parallel page work. Page agents submit catalog/route-registration requirements to Foundation to avoid repeated conflicts.

### Wave 0 — baseline and contracts

#### Agent F — Foundation, catalog, and UI primitives

**Owns:**

- `apps/docs/src/app/app.ts`
- `apps/docs/src/app/routes.ts`
- `apps/docs/src/app/styles.scss` or the current global `apps/docs/src/styles.scss`
- `apps/docs/src/main.ts`
- `apps/docs/package.json`
- new `apps/docs/src/app/docs/**`
- route/catalog completeness tests

**Tasks:**

1. Add the typed feature catalog and grouped navigation.
2. Restore Calculated Columns and declare all direct dependencies.
3. Mark Benchmark internal and add Not Found.
4. Build the shared page, demo, code, install, inspector, boundary, checklist, and related-feature primitives.
5. Add Material button token overrides and the shared action-bar pattern.
6. Add button toggle, slide toggle, tabs, expansion, chips, menu, tooltip, and snackbar dependencies used by primitives.
7. Add skip link, on-this-page navigation, responsive behavior, and correct card affordances.
8. Create a migration checklist for page agents with exact component inputs and control rules.

**Acceptance:** catalog checks pass; all current routes still load; `/calculated-columns` resolves; unknown paths show Not Found; shared components are axe-clean and responsive; no page agent needs to edit shell files.

#### Agent X — Example pipeline and docs test infrastructure

**Owns:**

- `apps/docs/src/examples/**`
- `tools/docs/**`
- `apps/docs/tsconfig.examples.json`
- generation/compilation tests and scripts

**Tasks:** implement example extraction/generation, type-checking, code-copy fixtures, broken-link checker, and public-page content-contract tests.

**Acceptance:** generated snippets are deterministic; CI fails on stale generated text or TypeScript errors; one starter example renders and copies byte-for-byte.

#### Agent S0 — SSRM Advanced Filter contract fix

**Owns:**

- `packages/server-side-row-model/src/serverSideRowModel.ts`
- focused SSRM tests
- any required public typing adjustment

**Tasks:** forward the correct classic or Advanced Filter model; add unit/integration coverage; document the behavior in SSRM README/parity if needed.

**Acceptance:** both model kinds reach `IServerSideDatasource` unchanged; no regression in ordinary column filtering; package tests pass.

#### Agent M0 — Material side-bar renderer correctness

**Owns:**

- `packages/side-bar/src/sideBarComponent.ts`
- `packages/material/src/materialSideBarRenderer.ts`
- focused package tests and Material README wording

**Tasks:** prevent native renderer overwrite, restore/retain Angular portal, mirror native tab IDs and ARIA relationships, use the current Material button API, and add integration coverage for the default open panel.

**Acceptance:** Material host remains connected after refresh/open/close; tab/tabpanel IDs and selected state are correct; native fallback still works when no renderer is registered.

### Wave 1 — flagship work, after Wave 0 contracts land

#### Agent S — Server-data experience

**Owns:** Basic SSRM, SSRM Analytics, Server-Side Selection, Viewport routes; shared simulated server/query engine; server-data E2E; corresponding examples.

**Tasks:** implement sections 7.1–7.3 plus Viewport in section 8. Keep one dataset and request contract across the SSRM family. Make every product claim observable in telemetry and tested.

**Acceptance:** the four guided journeys pass, Advanced Filter request is visible, Selection semantics are faithful, Viewport only pushes the subscribed range, and backend examples compile.

#### Agent H — Hierarchy and data organization

**Owns:** Row Grouping, Pivot, Tree Data, Master/Detail, Calculated Columns routes and E2E; corresponding examples.

**Tasks:** rebuild Master/Detail first; then align the other pages with the page contract and realistic scenarios. Keep Master/Detail distinct from Tree Data.

**Acceptance:** every page has outcome, guided task, reset, code, ownership statement, production notes, and primary-journey test.

#### Agent V — Visualization and export

**Owns:** Integrated Charts, Sparklines, Excel Export routes/E2E/examples; chart-control ownership decision; any scoped chart renderer seam if approved.

**Tasks:** implement sections 7.5 and 7.6, eliminate duplicated chart controls, and rebuild export as a realistic report workflow.

**Acceptance:** chart state transitions are valid and tested; sparklines have a separate package target; exports show meaningful formatting and accurately state data limits.

#### Agent I — Filters and input experiences

**Owns:** Filters suite, Set Filter, Multi Filter, Advanced Filter, Find, Rich Select routes/E2E/examples.

**Tasks:** separate package identities, add serialized model/state inspectors, saved presets, reset, async option/distinct-value seams, and SSRM links.

**Acceptance:** each package is independently discoverable and testable; no page confuses Find with server search; Advanced Filter model round-trips visibly.

### Wave 2 — remaining client and developer surfaces

#### Agent W — Workspace customization

**Owns:** Menus, Side Bar demo, Toolbar, Columns, Column Header Edit routes/E2E/examples.

**Tasks:** replace API button walls with stateful controls, add user-personalization stories, application extension points, and optional preference persistence.

#### Agent E — Editing and collaboration

**Owns:** Cell Selection, Clipboard, Status Bar, Row Numbers, Notes, Batch Edit routes/E2E/examples.

**Tasks:** add task-oriented editing scenarios, state/diff/payload feedback, truthful backend seams, and switches/toggles for state.

#### Agent D — Developer entry and reference

**Owns:** Overview, Getting Started, Grid baseline, Angular, Material, Package Catalog/API Reference, migration/gap entry points.

**Tasks:** make package choice and integration paths clear, remove stale hardcoded claims, render complete setup code, and ensure all 32 packages are represented from catalog metadata.

### Wave 3 — independent QA and reconciliation

#### Agent Q — Docs QA

**Owns:** cross-page Playwright suites, visual snapshots, responsive/a11y checks, link/catalog checks; no product implementation unless a minimal test hook is required.

**Tasks:**

1. Run every public route at 375, 768, and 1440 pixels.
2. Run axe in light/dark and representative accent themes.
3. Verify keyboard-only guided paths for flagship pages.
4. Verify no page-level horizontal overflow.
5. Verify code and JSON panes scroll internally.
6. Verify every Copy button matches its tested source.
7. Verify package/route/catalog completeness.
8. Verify loading, empty, error, retry, reset, and status live regions.
9. Add screenshots for Overview, SSRM Analytics, Server-Side Selection, Master/Detail, Charts, Side Bar, and Row Numbers in desktop/mobile light/dark.
10. Verify button hierarchy, toggle state, disabled prerequisites, and Material renderer persistence.

#### Agent R — Editorial and technical reconciliation

**Owns:** cross-page terminology, links, final content review, and issues returned to owning agents.

**Tasks:** apply Simplified Technical English rules, remove internal phase language, ensure claims match demos/tests, confirm package names and dependencies, and align package READMEs with the new examples.

## 12. Suggested commit sequence

Keep commits reviewable and avoid mixing platform, package fixes, and page redesigns.

1. `test(docs): add package, route, and content-contract baselines`
2. `feat(docs): add feature catalog and grouped navigation`
3. `feat(docs): add shared feature-page and code-example primitives`
4. `style(docs): introduce Material 3 action hierarchy and tokens`
5. `fix(docs): restore calculated columns and direct dependencies`
6. `fix(ssrm): forward Advanced Filter models to the datasource`
7. `fix(material): preserve the Material side-bar renderer`
8. `feat(docs): add compile-checked example pipeline`
9. `feat(docs): rebuild basic and analytical SSRM guides`
10. `feat(docs): rebuild server-side selection guide`
11. `feat(docs): rebuild viewport guide`
12. `feat(docs): rebuild master-detail and hierarchy guides`
13. `feat(docs): split and rebuild charts and sparklines`
14. `feat(docs): rebuild filters, search, and rich-select guides`
15. `feat(docs): rebuild workspace customization guides`
16. `feat(docs): rebuild editing and collaboration guides`
17. `feat(docs): rebuild overview, Angular, Material, and API catalog`
18. `test(docs): add responsive, visual, keyboard, and cross-page coverage`
19. `docs: reconcile READMEs, links, terminology, and production guidance`

## 13. Release-level acceptance criteria

### Product and end-user experience

- Every public feature starts with a customer outcome and a realistic use case.
- Every live demo has a short guided task, one clear primary action, visible state/result, and deterministic reset.
- The flagship demos show loading, error, recovery, and success where applicable.
- Internal labels and raw API method names do not lead the end-user UI.
- A Product Manager can identify value, target users, execution boundary, dependencies, and limitations from the top half of a page.

### Developer experience

- Every public package has a discoverable Docs target or intentional developer-reference entry.
- Every feature page has exact install, complete registration, minimal configuration, and copyable API/event examples.
- Every displayed TypeScript example type-checks against workspace versions.
- No snippet relies on hidden Docs-app registration.
- Pages with backend seams include contracts, adapter, handler/query plan, security, errors, persistence, and lifecycle.
- Pages without a backend seam say so explicitly.
- API/package catalog represents all 32 workspace packages and cannot drift silently.

### Correctness

- SSRM forwards both classic and Advanced Filter models correctly.
- SSRM Analytics demonstrates filtering, grouping, range, multi-sort, aggregation, and pivot together.
- Server-Side Selection visibly proves accumulated terms, exceptions, filter preservation, selected-only view, session isolation, and rehydration.
- Viewport pushes only the requested buffered range.
- Master/Detail cache and refresh behavior matches its controls and copy.
- Chart controls have one owner and valid state transitions.
- Material side-bar renderer remains mounted and accessible.
- No page claims behavior that its live demo and tests do not execute.

### Visual and interaction quality

- No legacy Material button directive remains in `apps/docs`.
- Each action group has at most one filled action; tonal is the normal secondary appearance.
- Toggles and switches represent state instead of pairs of commands.
- Desktop and mobile layouts have intentional control grouping and no page-level horizontal overflow.
- Empty chart/detail/data states are designed and instructive.
- Noninteractive surfaces do not advertise click behavior.

### Quality gates

- Docs build succeeds.
- Package unit/integration tests for SSRM and Material fixes pass.
- All Docs E2E suites pass.
- Every public route is axe-clean in light and dark mode.
- Flagship keyboard journeys pass.
- Screenshot baselines cover the agreed flagship surfaces and breakpoints.
- Catalog, link, example generation, example type-check, and code-copy checks pass.

## 14. Handoff rule

Before an agent starts a page, it must read:

1. this plan;
2. the page's package README;
3. the relevant parity document;
4. the shared component contract produced by Agent F;
5. the example-writing rules produced by Agent X;
6. the existing Playwright spec.

The agent must finish the page's content, interaction, examples, and primary-journey tests together. Do not leave code examples, backend ownership, responsive behavior, or accessibility for an unspecified later cleanup.
