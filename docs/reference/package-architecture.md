# Package Architecture — sharding, dependencies & tree-shaking

**MUST READ before creating any package.** Decisions here are load-bearing and expensive to reverse once published.

Tree-shaking is not a Phase 13 concern. Choices made in Phase 1 either preserve it or quietly destroy it, and the damage is only *detected* in Phase 13. Budgets are enforced from **Phase 0**.

---

## 1. Why LibreGrid is sharded into 26 packages

**One package would be wrong.** A user who wants row grouping must not download the Excel writer, the charting adapter and the SSRM store machinery.

AG Grid Enterprise ships as one 28.8 MB package. LibreGrid's per-feature sharding is a genuine advantage over the product we're replacing — do not surrender it for convenience.

The rule: **a consumer's bundle contains exactly the features they imported, and nothing else.**

---

## 2. Three tiers

| Tier | Packages | May depend on |
|---|---|---|
| **Core** | `@libregrid/core` | nothing in LibreGrid |
| **Feature** | `row-grouping`, `pivot`, `side-bar`, `cell-selection`, `excel-export`, … (22 packages) | `core`, and *sparingly* other feature packages (§4) |
| **Integration** | `material`, `angular`, `all` | anything |

---

## 3. What belongs in `@libregrid/core` — the boundary rule

> **`@libregrid/core` contains only what ≥3 feature packages need, and nothing user-facing.**

✅ **Belongs in core**
- `EnterpriseCoreModule` (the `EnterpriseCore` module object)
- `untyped-beans.ts` — local interfaces for Community's `UntypedBeanNames` slots, cast **once, here only**
- Shared base classes and utilities used across many features
- `testing/makeBeanHarness` (exported via the `./testing` subpath, never in the main entry)
- The duplicate-instance guard (§7)

❌ **Does NOT belong in core**
- Any grid feature — no grouping, no filters, no export
- Any UI component
- Anything Angular (core is framework-neutral — enforced by Nx tags)
- Anything used by only one or two feature packages — put it in the package that needs it

**When tempted to "just put it in core": don't.** Core is loaded by every consumer, so every byte added there is paid by users who don't need it. Duplicating a 20-line helper in two packages is better than growing core.

---

## 4. Cross-feature dependencies — prefer optional runtime detection

Some features genuinely build on others. Two ways to express that, and **the default is the second**:

### Hard dependency — only when the feature cannot function without it

```json
"dependencies": { "@libregrid/core": "^0.1.0", "@libregrid/cell-selection": "^0.1.0" }
```

Use for `@libregrid/clipboard` → `cell-selection`: copying a range is meaningless without ranges.

### Optional enhancement — the default

Detect at runtime; degrade gracefully when absent:

```ts
// excel-export: outline levels only matter when row grouping is active
const groupStage = this.beans.groupStage;      // undefined if RowGrouping not registered
if (groupStage?.grouping) { /* emit outlineLevel */ }
```

Use for `excel-export` → `row-grouping`, `status-bar` → `cell-selection`, `integrated-charts` → `pivot`.

> **This is the difference between a user installing Excel export and getting only Excel export, versus dragging in the entire grouping engine they never asked for.** When in doubt, choose runtime detection.

### Dependency graph

```
@libregrid/core  ← every feature package (^ range, lockstep versions)
    ├── menu, side-bar, row-grouping, cell-selection,
    │   server-side-row-model, set-filter, master-detail,
    │   advanced-filter, find, rich-select, viewport-row-model,
    │   excel-export (+ fflate), status-bar
    ├── columns-tool-panel   → side-bar          (hard)
    ├── filters-tool-panel   → side-bar          (hard)
    ├── clipboard            → cell-selection    (hard)
    ├── multi-filter         → set-filter        (optional)
    ├── pivot                → row-grouping      (hard)
    ├── tree-data            → row-grouping      (hard)
    ├── integrated-charts    → cell-selection    (hard) + ag-charts-community
    └── sparklines           → ag-charts-community
@libregrid/material → core + Angular + Material/CDK
@libregrid/angular  → core + Angular
@libregrid/all      → everything (convenience only — see §8)
```

**Only permitted non-LibreGrid runtime dependencies:** `fflate` (excel-export) and `ag-charts-community` (integrated-charts, sparklines). Anything else needs explicit sign-off.

---

## 5. Tree-shaking rules — follow from Phase 0

1. **ESM only.** `"type": "module"`, `exports` maps to `./dist/index.js`. No CJS build.
2. **`sideEffects` must be accurate.** See §6 — `false` is *wrong* for packages shipping CSS files.
3. **No side effects at module scope.** Never call `ModuleRegistry.registerModules()` on import. The consumer registers explicitly. A package that self-registers can never be shaken out.
4. **Barrel exports must be flat re-exports only.** `export { X } from './x'` — never instantiate, never run logic in `index.ts`.
5. **Beans are not public API.** Export the module object, public types, public components. Every extra export is a tree-shaking liability.
6. **No cross-package deep imports.** Always the package entry (`@libregrid/core`), never `@libregrid/core/src/...`.

### Verify from Phase 0, not Phase 13

`apps/bench` includes a **bundle fixture**: an app importing exactly one feature package, built and asserted against a size budget with a check that no other LibreGrid package appears in the output.

Each package gets a budget in `bundle-budgets.json` when it is created. Budgets are an acceptance criterion in **every** phase, not a Phase 13 cleanup.

---

## 6. ⚠️ CSS delivery — `sideEffects: false` is a trap

Community's own `package.json` does **not** use `sideEffects: false`. It uses an **array listing every CSS file**:

```json
"sideEffects": ["./styles/ag-grid.css", "./styles/ag-theme-quartz.css", …]
```

Because CSS imports *are* side effects. Declaring `false` while shipping `.css` files tells the bundler to drop your stylesheets, and the feature renders unstyled in production while working perfectly in dev.

**LibreGrid's approach — inline CSS strings, preferred:**

The `Module` interface has `css?: string[]`. Ship CSS as **strings inside the module object**; the grid injects them at runtime:

```ts
import { rowGroupingCss } from './rowGrouping.css';   // build inlines to a string
export const RowGroupingModule = { /* … */ css: [rowGroupingCss] };
```

This aligns perfectly with tree-shaking: import the module and its CSS comes along; don't import it and both disappear. **`"sideEffects": false` is then correct**, because there are no CSS files.

**If a package must ship real `.css` files** (likely only `@libregrid/material`), it **must** list them in a `sideEffects` array as Community does. Never leave `false`.

---

## 7. ⚠️ `@libregrid/core` must be a singleton

Core holds bean classes and the `EnterpriseCore` module object. Two copies in one app means two distinct class identities and two module objects registering under the same `moduleName` — the second overwrites the first in `ModuleRegistry`'s store, producing bean mismatches that are extremely hard to diagnose.

This is the same hazard the spec already flags for `ag-grid-community` ("two copies breaks the module registry"). It applies to core too.

**Mitigation, all three:**

1. **Lockstep versioning.** Changesets releases every `@libregrid/*` package at the same version; feature packages depend on `"@libregrid/core": "^<same-version>"` so package managers dedupe to one copy.
2. **Runtime duplicate guard in core** — fail loudly rather than mysteriously:
   ```ts
   const KEY = Symbol.for('libregrid.core.instance');
   const g = globalThis as Record<symbol, unknown>;
   if (g[KEY] && g[KEY] !== VERSION) {
     _warnOnce(`Two copies of @libregrid/core detected (${g[KEY]} and ${VERSION}). ` +
               `Deduplicate your install — LibreGrid will not work correctly.`);
   }
   g[KEY] = VERSION;
   ```
3. **CI check** that no two packages in the workspace resolve different core versions.

> `@libregrid/core` is a regular `dependency`, **not** a peer — users should never have to install it explicitly. The three mitigations above replace what a peer dependency would enforce.

---

## 8. `@libregrid/all` — convenience, not the default

Re-exports every module for quick starts and demos.

**Design rules:**
- Flat re-exports only; no logic, no registration
- **Never referenced in docs as the recommended install.** Quick-start examples import individual packages
- Phase 13 must verify that a consumer importing `@libregrid/row-grouping` gets no chart or Excel code — importing `all` in one place must not poison tree-shaking elsewhere

---

## 9. Checklist — creating a new package

- [ ] `package.json` matches the `standards.md` §2 template, incl. `description`, `keywords`, `repository.directory`
- [ ] `"type": "module"`, ESM-only, `exports` map
- [ ] `sideEffects` accurate — `false` only if the package ships **no** CSS files (§6)
- [ ] `@libregrid/core` at `^<current version>`; cross-feature deps justified against §4
- [ ] Nx tag `type:framework-neutral` or `type:angular`
- [ ] `index.ts` is flat re-exports only — no side effects
- [ ] No module-scope `registerModules()` call
- [ ] Budget added to `bundle-budgets.json`
- [ ] Bundle fixture proves no other LibreGrid package leaks in
- [ ] `NOTICE` + README attribution (G3)
