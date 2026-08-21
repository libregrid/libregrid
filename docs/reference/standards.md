# Standards — scaffolding, code, tests, Definition of Done

Applies to every change. Read once; refer back constantly.

---

## 1. Repository layout

```
libregrid/
  packages/
    core/  menu/  side-bar/  material/  row-grouping/  columns-tool-panel/
    cell-selection/  clipboard/  status-bar/  excel-export/
    set-filter/  multi-filter/  filters-tool-panel/
    server-side-row-model/  pivot/  viewport-row-model/
    tree-data/  master-detail/  advanced-filter/  find/  rich-select/
    integrated-charts/  sparklines/  angular/  all/
  apps/
    docs/            Angular demo/docs site — one route per feature
    docs-e2e/        Playwright
    bench/           performance harness
  tools/
    check-contamination/    G1 guard
    conformance/            version-matrix runner
    sync-community-source/  sparse-checkout, MIT paths only
    version/                single-source AG Grid target version
  docs/
    reference/  phases/  parity/  adr/
```

---

## 2. Package `package.json` template

Every feature package uses exactly this shape:

```json
{
  "name": "@libregrid/row-grouping",
  "version": "0.1.0",
  "description": "Row grouping and aggregation for AG Grid Community — part of LibreGrid",
  "keywords": ["libregrid", "ag-grid", "data-grid", "row-grouping", "aggregation"],
  "homepage": "https://github.com/libregrid/libregrid#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/libregrid/libregrid.git",
    "directory": "packages/row-grouping"
  },
  "bugs": { "url": "https://github.com/libregrid/libregrid/issues" },
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "peerDependencies": { "ag-grid-community": ">=36.1.0 <37" },
  "dependencies": { "@libregrid/core": "^0.1.0" },
  "files": ["dist", "NOTICE", "README.md"],
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }
}
```

### npm-facing metadata — read before writing a `description`

npm **organizations have no description field.** The only text npm displays for `@libregrid/*` comes from each package's own `description` and rendered `README.md`. There is nothing to configure at the org level.

That makes `description` a **governed public surface under G4.2**. Follow the pattern:

> `"<what this package does> for AG Grid Community — part of LibreGrid"`

✅ `"Row grouping and aggregation for AG Grid Community — part of LibreGrid"`
✅ `"Excel (xlsx) export for AG Grid Community — part of LibreGrid"`
❌ `"Open-source AG Grid Enterprise row grouping"` — prohibited by G4.2

`repository.directory` is required in a monorepo so npm links to the right subfolder. `homepage` and `bugs` give every package a support path — important once the repo is public from Phase 0.

> ⚠️ **`keywords` containing `ag-grid`** is a deliberate discovery choice: it is how someone looking for AG Grid-compatible packages finds us, and it is nominative use. It is nonetheless the most contestable trademark surface in this file — trademark-as-search-keyword has more contested case law than descriptive text. **Flag it explicitly for the [B1 legal review](../OPEN-ACTIONS.md).** If counsel objects, drop the keyword; discovery is not worth a dispute.

Angular packages (`material`, `angular`) additionally declare:

```json
"peerDependencies": {
  "@angular/core": ">=20.0.0", "@angular/common": ">=20.0.0",
  "@angular/material": ">=20.0.0", "@angular/cdk": ">=20.0.0",
  "ag-grid-community": ">=36.1.0 <37", "ag-grid-angular": ">=36.1.0 <37"
}
```

> `ag-grid-community` is **always** a peer dependency, **never** a direct dependency.

> ⚠️ **`"sideEffects": false` is correct ONLY if the package ships no `.css` files.** Community itself uses an *array* of CSS paths, because CSS imports are side effects — declaring `false` while shipping stylesheets makes bundlers silently drop them, and the feature renders unstyled in production while working in dev. LibreGrid's preferred approach is inline CSS strings via `Module.css`, which keeps `false` valid. **See [`package-architecture.md`](package-architecture.md) §6 before shipping any CSS.**

**Permitted runtime dependencies outside `@libregrid/*`:** `fflate` (excel-export) and `ag-charts-community` (integrated-charts, sparklines). Anything else requires explicit sign-off.

> 📦 **Package sharding, cross-package dependencies, tree-shaking rules and the `@libregrid/core` singleton requirement are specified in [`package-architecture.md`](package-architecture.md). Read it before creating any package.**

---

## 3. Root dev dependencies (pinned)

Key versions in the root `package.json` (current as of 2026-08-18 — the root
manifest is the source of truth; it may drift forward within the ranges):

```json
"devDependencies": {
  "ag-grid-community": "36.1.0",
  "nx": "^21.0.0",
  "vitest": "^4.1.10",
  "@vitest/coverage-v8": "^4.1.10",
  "@playwright/test": "^1.62.1",
  "@axe-core/playwright": "^4.13.0",
  "@changesets/cli": "^3.0.0",
  "typescript": "~6.0.3",
  "eslint": "^9.39.5",
  "prettier": "^3.9.6"
}
```

`ag-grid-angular` (pinned to `36.1.0`) is a dev dependency of `apps/docs`,
not of the root workspace. Angular packages (`material`, `angular`) declare
their own `@angular/*` peer dependencies.

---

## 4. TypeScript baseline (`tsconfig.base.json`)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "module": "esnext",
    "target": "es2022",
    "lib": ["es2022", "dom"],
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": {
      "@libregrid/core": ["./packages/core/src/index.ts"],
      "@libregrid/core/testing": ["./packages/core/src/testing/index.ts"],
      "@libregrid/row-grouping": ["./packages/row-grouping/src/index.ts"]
    }
  }
}
```

Paths are listed **explicitly per package** in `tsconfig.base.json` — not as a
wildcard — so the `@libregrid/core/testing` subpath resolves to its own entry.

`exactOptionalPropertyTypes` is deliberate: the CSRM stage-bean slots are optional properties, and this catches accidental `undefined` assignment that would silently disable a stage.

---

## 5. Version single-source

> ⚠️ **`VERSION` is not exported from `ag-grid-community`** (verified empirically — no version export exists). Do not try to import it.

`tools/version/` contains a generator that reads the version from **the installed package** at build time:

```ts
// tools/version/generate.ts
import agGridPkg from 'ag-grid-community/package.json' with { type: 'json' };
export const AG_GRID_VERSION = agGridPkg.version;   // e.g. '36.1.0'
```

It writes `src/version.ts` into every package:

```ts
export const VERSION = '36.1.0';
```

Deriving from the installed package rather than a hand-maintained constant removes drift as a possible failure. Keep a CI check that fails if any generated `version.ts` differs from the installed `ag-grid-community` version.

**Why it matters:** `moduleRegistry` compares our `version` against Community's **major.minor**. The spike confirmed a mismatch logs

> `AG Grid: You are using incompatible versions of AG Grid modules… Please update all modules to the same version.`

but **still registers the module and constructs its beans**. So version drift fails *loudly in the console yet silently in behaviour* — exactly the kind of bug that survives to production. Do not rely on the warning; rely on the CI check.

At runtime the version is also readable as `AllCommunityModule.version`, which is useful in tests.

---

## 6. Coding rules

1. **No `any`.** Use `unknown` plus narrowing. For Community internals typed `unknown` (the `UntypedBeanNames` slots), declare a local interface in `packages/core/src/untyped-beans.ts` and cast **once, there only**.
2. **No `as any` on `moduleName`.** See `api-seams.md` §3.
3. **Framework-neutral by default.** Only `@libregrid/material` and `@libregrid/angular` may import `@angular/*`. Enforced by Nx module-boundary tags: `type:framework-neutral` cannot depend on `type:angular`.
4. **CSS prefix `lgr-`.** Never emit `ag-` prefixed classes of our own (G4).
5. **One bean per file**, named for the bean: `aggFuncService.ts` → `AggFuncService`.
6. **Barrel `src/index.ts` per package** exports only the module object, public types, and public components. **Beans are not public API.**
7. **All cleanup via `addDestroyFunc` / `addManaged*`.** Never raw `addEventListener` on a bean.
8. **Every public symbol gets a TSDoc comment** with `@feature` and, where applicable, `@gridOption` — matching Community's own convention.

---

## 7. Testing

Three tiers. All three are required; they catch different failures.

### 7.1 Unit (Vitest) — bean in isolation

```ts
import { describe, it, expect } from 'vitest';
import { AggFuncService } from './aggFuncService';
import { makeBeanHarness } from '@libregrid/core/testing';

describe('AggFuncService', () => {
  it('sums numeric values ignoring null', () => {
    const { bean } = makeBeanHarness(AggFuncService, { gridOptions: {} });
    expect(bean.getAggFunc('sum')!([1, null, 2])).toBe(3);
  });
});
```

`makeBeanHarness` is a Phase 0 deliverable: it constructs a bean with a stub `BeanCollection` and `gos`, calls `postConstruct()`, and returns `{ bean, beans, destroy }`.

### 7.2 Integration — real grid, real module

```ts
import { createGrid, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);

it('groups rows by country', async () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const api = createGrid(el, {
    columnDefs: [{ field: 'country', rowGroup: true }, { field: 'sales', aggFunc: 'sum' }],
    rowData: [{ country: 'US', sales: 1 }, { country: 'US', sales: 2 }],
  });
  await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(1));
  expect(api.getDisplayedRowAtIndex(0)!.aggData.sales).toBe(3);
});
```

**Every feature must have at least one test at this tier.** Unit tests do not prove the seam works — only booting a real grid does.

### 7.3 E2E (Playwright) — anything mouse-driven

Drag-drop, fill handle, clipboard, menus, resizing. One spec per docs route.

### 7.4 Coverage

Global v8 thresholds in `vitest.config.ts`, enforced in CI across
`packages/*/src` (specs, `testing/`, `version.ts`, and `index.ts` excluded):
statements 85, branches 75, functions 85, lines 85. Coverage is a floor, not
a goal — the integration test matters more than the percentage.

---

## 8. Parity checklists

`docs/parity/<domain>.md` are **living documents**, seeded from the AG Grid docs.

Each entry is marked:
- ✅ **implemented** — done and tested
- 🟡 **partial** — with a note on what is missing
- ❌ **won't-do** — **with rationale**

Updating the relevant checklist is part of every phase's acceptance criteria. This is what "feature for feature" means in practice, and it is the artifact a reviewer checks.

Per G2, checklists are derived from public documentation, never from running the commercial build.

---

## 9. Definition of Done

A phase is complete only when **every** item is true:

- [ ] Unit tests pass, ≥85% coverage on new code
- [ ] At least one integration test per feature, against a real grid
- [ ] Playwright E2E for every interactive surface
- [ ] A working route in `apps/docs` demonstrating the feature
- [ ] `docs/parity/<domain>.md` updated with ✅/🟡/❌ and rationale
- [ ] `npx nx run-many -t lint test build` green
- [ ] `npx nx run conformance:matrix` green
- [ ] axe-core: 0 violations on the new route, light **and** dark
- [ ] `npx nx run bench:compare` shows no regression vs. Phase-0 baseline
- [ ] `npx nx run check-contamination:test` green
- [ ] **Bundle budgets met; tree-shaking fixture proves no other `@libregrid/*` package leaks in** ([`package-architecture.md`](package-architecture.md) §5)
- [ ] `NOTICE` + README attribution present in any new package (G3)
- [ ] A Changeset added

---

## 10. End-user-facing writing (Simplified Technical English)

All writing a user reads — package `README.md`s, `docs/guides/`, the docs
site (`apps/docs`), TSDoc on publicly exported symbols, and any error,
warning, or CLI message a consumer can see — follows the sentence-construction
rules of **ASD-STE100** (Simplified Technical English). Internal-only writing
— phase files, ADRs, code comments, commit messages, this file — is exempt;
write those however is clearest for maintainers.

STE100's published dictionary is a fixed ~900-word vocabulary written for
aircraft maintenance manuals. Applying it literally would reject words this
project needs — `bean`, `pivot`, `tree-shaking`, `aggregation`, `module` — so
**follow the sentence rules below, not the word list.** A defined technical
or API term is always allowed, used consistently.

1. **One idea per sentence.** Split any sentence that describes two actions
   or two facts.
   ✅ "Install the package. Then register its module."
   ❌ "Install the package and then register its module before creating the grid."

2. **Active voice.** Name what does the action.
   ✅ "The grid registers the module."
   ❌ "The module is registered by the grid."

3. **Short sentences — aim under 20 words.** If a sentence needs a comma to
   join two independent clauses, it is probably two sentences.

4. **Imperative mood for instructions.** Tell the reader what to do; don't
   describe what they could do.
   ✅ "Add `ContextMenuModule` to `registerModules`."
   ❌ "You could add `ContextMenuModule` to `registerModules`."

5. **One term per concept, used consistently.** Don't vary a word for style.
   If a doc calls something a "panel" once, don't call it a "widget" later.

6. **No idioms, metaphors, or filler.** "Under the hood," "out of the box,"
   and "at the end of the day" carry no fixed meaning for a non-native
   reader. Delete them and state the fact instead.

7. **Limit noun stacks to established terms.** Three or more nouns in a row
   are hard to parse unless the whole phrase is already a fixed term (e.g.
   "row group column" is a defined concept here). Don't invent new ones.
   ✅ "the width of the side-bar panel"
   ❌ "the side-bar panel width value"

8. **Keep articles** (`a`, `the`). Don't drop them for brevity.

Code samples, table cells, and headings are exempt from the sentence-length
rules but still use plain, consistent wording.

---

## 11. Commands

```bash
npx nx run-many -t lint test build     # unit + build, all packages
npx nx e2e docs-e2e                    # Playwright
npx nx run conformance:matrix          # version compatibility (on demand)
npx nx run bench:compare               # perf vs baseline
npx nx run check-contamination:test    # G1 guard
npx nx serve docs                      # live demo site
```

---

## 12. Git workflow

Trunk-based development on `main` (GitHub Flow). See [`CONTRIBUTING.md`](../../CONTRIBUTING.md) for the full branching and versioning guide.

- Branch per PR: `feat/<slug>`, `fix/<slug>`, or `chore/<slug>`
- Keep PRs small and sequential — never one giant PR
- Every PR that changes a published package includes a Changeset
- PR description links the issue and/or `docs/parity/<domain>.md` it updates
- All `@libregrid/*` packages share one lockstep SemVer version
  - **major** — breaking API change
  - **minor** — new feature or package
  - **patch** — bug fix, refactor, docs
- Merge to `main` with a Changeset → CI green → Version Packages PR → publish
