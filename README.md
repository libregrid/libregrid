# LibreGrid

> **Enterprise-grade features for AG Grid Community**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

LibreGrid adds AG Grid Enterprise-equivalent features to **stock, unmodified [`ag-grid-community`](https://www.npmjs.com/package/ag-grid-community)** by registering into its module system.

> LibreGrid is an independent open-source project. It is not affiliated with, endorsed by, or sponsored by AG Grid Ltd. "AG Grid" is a trademark of AG Grid Ltd.

---

## Status: pre-release (Phase 0 complete)

Nothing is published to npm yet. The foundation is in place; feature work begins at Phase 1.

`0.1.0` will ship **Phases 0–3**: row grouping, aggregation, columns tool panel, menus, side bar, and a Material theme bridge. See [`LIBREGRID-PLAN.md`](./LIBREGRID-PLAN.md).

**LibreGrid is not a drop-in replacement for AG Grid Enterprise today.** The roadmap and honest gap list live in [`docs/parity/`](./docs/parity/).

---

## How it works

AG Grid Community is MIT, but grouping, pivot, SSRM, tool panels, selection, clipboard, Excel export and charts are gated behind the commercial `ag-grid-enterprise`.

Community, however, **publishes the Enterprise contracts under MIT** — ~110 interface files, DI bean slots reserved for enterprise beans, and every Enterprise module name in its `ModuleName` union. Registration performs no licence check.

So LibreGrid is not a fork and not a reimplementation of the grid. It is a set of **plug-in modules** that register into seams the core already declares:

```ts
import { createGrid, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';

ModuleRegistry.registerModules([AllCommunityModule, EnterpriseCoreModule]);
```

This was verified empirically before any code was written — see [`docs/reference/spike-results.md`](./docs/reference/spike-results.md).

---

## Development

```bash
npm install
npm run gen:version      # derive VERSION from installed ag-grid-community
npm test                 # vitest — unit + integration
npm run build            # build all packages
npm run verify           # lint + test + build + guardrail checks
```

### Guardrails

Two checks run in CI and **must** pass:

```bash
npm run check:contamination   # G1 — no ag-grid-enterprise, ever
npm run check:versions        # version drift + @libregrid/core singleton
```

⚠️ **Read [`docs/reference/guardrails.md`](./docs/reference/guardrails.md) before contributing.** LibreGrid's legal standing depends on never reading, installing or referencing `ag-grid-enterprise`. This is not negotiable and it is enforced mechanically.

---

## Documentation

| Document | Purpose |
|---|---|
| [`LIBREGRID-PLAN.md`](./LIBREGRID-PLAN.md) | Start here — context and the master phase list |
| [`docs/reference/guardrails.md`](./docs/reference/guardrails.md) | **Must read.** Legal and safety rules G1–G5 |
| [`docs/reference/api-seams.md`](./docs/reference/api-seams.md) | **Must read.** Exact imports, bean pattern, CSRM stage slots |
| [`docs/reference/standards.md`](./docs/reference/standards.md) | Scaffolding, coding rules, test tiers, Definition of Done |
| [`docs/reference/package-architecture.md`](./docs/reference/package-architecture.md) | Sharding, dependencies, tree-shaking, CSS, singleton rule |
| [`docs/phases/`](./docs/phases/) | One self-contained file per phase |
| [`docs/parity/`](./docs/parity/) | Living feature checklists vs. AG Grid Enterprise |

---

## Licence

MIT — see [`LICENSE`](./LICENSE).

LibreGrid consumes MIT-licensed code and type definitions authored by AG Grid Ltd; their copyright notice is preserved in each package's `NOTICE` file.
