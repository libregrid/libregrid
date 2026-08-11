# Guardrails — G1 to G5

**MUST READ before writing any code.** These are not style preferences. G1 and G2 protect the project's legal standing; violating them can make the entire codebase unusable.

---

## G1 — Contamination ban (hard stop)

**Never read, download, decompile, or reference `ag-grid-enterprise` in any form.**

The `ag-grid/ag-grid` monorepo contains `packages/ag-grid-enterprise/` sitting directly beside the MIT community package. It is commercially licensed. Our defence is that LibreGrid is a clean-room implementation written against MIT-published interfaces. Reading the commercial implementation destroys that defence.

### Specifically prohibited

- Cloning `ag-grid/ag-grid` without path exclusions
- `npm install ag-grid-enterprise` — including transitively, including as a devDependency, including "just to look"
- Reading its `src`, `dist`, `.d.ts`, or minified/decompiled bundles
- Copying from blog posts, Stack Overflow answers, or AI output that quotes Enterprise source

### Permitted sources of truth, exclusively

- MIT source: `packages/ag-grid-community/`, `packages/ag-stack/`, `packages/ag-grid-angular/`, `community-modules/locale/`, `community-modules/styles/`
- Public documentation at `ag-grid.com` — for **behavior** specs
- `ag-charts-community` (MIT)
- `write-excel-file` (MIT) — as an OOXML reference for Phase 5 only

### Fetching MIT source safely

Use `tools/sync-community-source/` (Phase 0 Task 0.5), which sparse-checks-out only the permitted paths. Never `git clone` the monorepo wholesale.

### Enforcement

Phase 0 Task 0.5 builds a mechanical guard: a CI job, an ESLint rule, and a deliberate failing fixture proving the guard fires. **A guard never proven to fire is not a guard.** Discipline alone is not acceptable here.

---

## G2 — Behavior specs come from documentation, not observation

Derive expected behavior from public docs and the parity checklists in `docs/parity/`.

**Do not install a trial `ag-grid-enterprise` build to compare behavior.** Its EULA restricts reverse engineering. Implementing against the MIT interfaces is fine; probing the commercial binary is not.

This means: when a parity checklist says an option exists but the docs don't specify an edge case, **ask** — do not resolve it by observing the commercial product.

---

## G3 — Attribution

We consume MIT code and MIT type definitions authored by AG Grid Ltd. The MIT licence requires preserving the copyright notice.

Every published package ships a `NOTICE` file containing:

```
Copyright (c) 2015-2026 AG GRID LTD

[full MIT licence text]
```

Every package `README.md` contains, verbatim:

> LibreGrid is an independent open-source project. It is not affiliated with, endorsed by, or sponsored by AG Grid Ltd. "AG Grid" is a trademark of AG Grid Ltd.

This is checked as part of every phase's acceptance criteria.

---

## G4 — Trademark

"AG Grid" is a trademark of AG Grid Ltd.

### G4.1 — Identifiers

- No "AG Grid" in package names, class names, CSS class prefixes, logos, or domain names
- **Our CSS prefix is `lgr-`.** Never emit `ag-` **hyphenated** CSS classes of our own. (You will *read* `ag-` classes from the core DOM; that is unavoidable and fine.)

### G4.1a — `agXxx` API identifiers are REQUIRED — do not "fix" them

> ⚠️ **Do not confuse this with the CSS rule above.** The distinction is:
> **`ag-` hyphenated CSS classes → never emit.** **`agXxx` camelCase API identifiers → you MUST use them.**

Community resolves components by **exact string** against **closed TypeScript unions**. There is no aliasing mechanism. These are mandatory:

| Union | Identifiers we must register |
|---|---|
| `UserComponentName` | `agGroupCellRenderer`, `agSetColumnFilter`, `agMultiColumnFilter`, `agColumnsToolPanel`, `agFiltersToolPanel`, `agNewFiltersToolPanel`, `agRichSelectCellEditor`, `agDetailCellRenderer`, `agSparklineCellRenderer` |
| `StatusPanelComponentName` | `agAggregationComponent`, `agTotalRowCountComponent`, `agFilteredRowCountComponent`, `agSelectedRowCountComponent`, `agTotalAndFilteredRowCountComponent` |
| `ToolbarItemComponentName` | `agFindToolbarItem`, `agPivotPanelToolbarItem`, `agRowGroupPanelToolbarItem`, `agQuickFilterToolbarItem` |
| `DynamicBeanName` (partial) | `agSetColumnFilterHandler`, `agMultiColumnFilterHandler`, `agGroupColumnFilterHandler` |

**Renaming these breaks the product.** They are also what users already have in their own column definitions (`filter: 'agSetColumnFilter'`), so accepting them *is* drop-in compatibility.

**Why this is safe:** the trademark is the word mark **"AG Grid"**, used to identify product source. `agGroupCellRenderer` is a config key — functionally required for interoperability, not source-identifying, and never appearing in LibreGrid's name, logo, docs title or marketing. That is functional/interoperability use, and it is exactly the line this guardrail draws: `ag` appears **only** where compatibility compels it, and **nowhere** in our identity.

**These identifiers do NOT require `ag`** and must use Community's actual (unprefixed) names — verified against `ag-grid-community@36.1.0`:

- `ModuleName` — **zero** `ag` literals (`RowGrouping`, `Pivot`, `CellSelection`, `SideBar`)
- `IconName` — zero (`groupExpanded`, `columnsToolPanel`, `excelExport`)
- Singleton bean names — zero (`rangeSvc`, `clipboardSvc`, `ssrmStoreFactory`, `statusBarSvc`)
- Grid options / ColDef properties — zero (`rowGroup`, `pivotMode`, `aggFunc`)

*(`aggFuncSvc` is **agg**regation, not **AG** — it is not an exception.)*

> **Not legal advice.** This reflects the type system and the general shape of the interoperability doctrine. Obtain counsel review before public launch.

### G4.2 — Taglines and marketing copy

**This is where trademark complaints actually originate — not the name.** The distinction is *nominative fair use*: you may state what you are compatible with; you may not position LibreGrid as AG Grid's own product.

**The official tagline is:**

> **Enterprise-grade features for AG Grid Community**

✅ **Approved phrasings**
- "Enterprise-grade features for AG Grid Community"
- "Compatible with `ag-grid-community`"
- "Adds row grouping, pivot and SSRM to AG Grid Community"
- "An independent open-source project"

❌ **Prohibited phrasings**
- "The open-source AG Grid Enterprise" — positions LibreGrid *as* their product
- "AG Grid Enterprise, free" / "Free AG Grid Enterprise"
- "AG Grid Enterprise alternative" **as a product name or title** (acceptable only as descriptive body text)
- Anything implying affiliation, endorsement, partnership or sponsorship
- Any use of AG Grid's logo, wordmark styling, or brand colours

### G4.3 — Where these rules apply

G4.2 and the G3 attribution disclaimer apply to **every** public surface, not just the code:

- package `README.md` files and npm `description` fields — **these are the only npm-visible text**, as npm orgs have no description field. Follow the wording pattern in `standards.md` §2
- npm `keywords` — `ag-grid` is included deliberately for discovery, but flagged for legal review (see `standards.md` §2)
- the documentation site (including page titles and meta descriptions)
- the GitHub org and repository descriptions
- blog posts, social media, conference talks, and any launch announcement

If you are unsure whether a phrasing is acceptable: **use the official tagline and move on.**

---

## G5 — `@internal` seam risk

The seams we build on are marked in Community's source:

> `@internal AG_GRID_INTERNAL - Not for public use. Can change / be removed at any time.`

Using them is **legal** (they are MIT) but **unstable**. Three consequences, all mandatory:

1. **Narrow peer range.** Every package declares `"ag-grid-community": ">=36.1.0 <37"`. Never widen this speculatively.
2. **Version lock-step.** `moduleRegistry` enforces that our module's `version` matches Community's **major.minor**. Every Community minor release requires an LibreGrid compatibility release. See `standards.md` §Version single-source.
3. **Conformance matrix is the tripwire.** Phase 0 Task 0.7 builds it; it runs nightly. A Community release that breaks a seam must fail our CI before it reaches a user.

If a seam disappears in a future Community version, that is a known, accepted risk with a documented fallback (soft fork). Do not attempt to work around it by patching `node_modules` or monkey-patching the core at runtime.

---

## When these rules block you

Stop and ask. Every one of these rules has a reason that is more important than any individual feature. There is no deadline that justifies breaking G1.
