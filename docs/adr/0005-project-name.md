# ADR 0005 — Project name: LibreGrid

**Status:** Accepted
**Date:** 2026-08-11
**Supersedes:** the working name "OpenGrid" used in all pre-rename drafts

---

## Context

The specification was drafted under the working name **OpenGrid**. Before any code existed, an availability and collision audit was run across npm, GitHub and DNS. It found three problems serious enough to justify renaming while the cost was still near zero.

### Audit results

| Asset | OpenGrid | LibreGrid |
|---|---|---|
| npm bare name | free | **free** |
| npm scope | free (0 public pkgs) | **free** (0 public pkgs) |
| **GitHub org** | ❌ `/opengrid` taken (user account); `/open-grid` taken by an organisation *literally named "OpenGrid"* | ✅ **free** |
| Same-category collision | ❌ npm **`open-grid`** is an actively maintained (2026-08-08) zero-dependency data grid for React/Vue/Angular/jQuery | ✅ **zero** npm search results for "libregrid" |
| Domains | — | `libregrid.dev` ✅, `libregrid.io` ✅, `libregrid.org` registered by a third party |

### Why the npm collision was decisive

`open-grid` is not a distant namesake — it is **another data grid**, one hyphen away, in the same package registry and the same product category. That guarantees permanent user confusion and permanent loss of search results, neither of which can be fixed later by any amount of documentation.

### Naming reality encountered

Every single dictionary word checked was already taken on **both** npm and GitHub: `girder`, `joist`, `gantry`, `truss`, `heddle`, `capstone`, `trellis`, `weft`, `lattice`, `gridkit`, `gridforge`.

This mattered less than it first appeared: LibreGrid publishes **scoped** packages (`@libregrid/core`, `@libregrid/row-grouping`), so the bare npm name is close to irrelevant. The binding constraints are a free **npm scope** and a free **GitHub org**.

---

## Decision

The project is named **LibreGrid**.

| Item | Value |
|---|---|
| Name | LibreGrid |
| npm scope | `@libregrid/*` |
| GitHub org | `libregrid` |
| Domain | `libregrid.dev` |
| CSS class prefix | `lgr-` (was `og-`) |
| Tagline | "Enterprise-grade features for AG Grid Community" |

### Rationale

1. **Clean across every asset that matters** — npm name, npm scope, and critically the GitHub org, which is the primary identity of an open-source project and the one OpenGrid failed.
2. **Zero same-category collisions.** No existing npm package is named "libregrid".
3. **The `Libre*` prefix carries established meaning** — LibreOffice, LibreWolf, LibreCAD, LibreELEC all read immediately as "the free alternative to a commercial product," which is precisely LibreGrid's positioning.

### Accepted trade-offs

- **"Libre" connotes copyleft to some readers.** LibreGrid is MIT — permissive, not GPL. Mitigated by a licence badge and an explicit line in the overview.
- **"Grid" suggests a standalone grid**, whereas LibreGrid is an *extension* that requires `ag-grid-community`. Mitigated by the tagline, which is what actually appears next to the name everywhere it is used. Keeping "grid" in the name also aids discoverability.
- **`libregrid.org` is held by a third party.** `.dev` is the preferred TLD for a developer tool, so this is not blocking.

---

## Consequences

- All 41 specification files renamed: `@opengrid/` → `@libregrid/` (141 occurrences), `OpenGrid` → `LibreGrid`, CSS prefix `og-` → `lgr-`.
- `OPENGRID-PLAN.md` → `LIBREGRID-PLAN.md`.
- **Guardrail G4 was extended** beyond identifiers to cover taglines and marketing copy (new G4.2 and G4.3). The audit surfaced that trademark exposure lives in *positioning statements*, not names: "Enterprise-grade features for AG Grid Community" is nominative fair use, while "The open-source AG Grid Enterprise" is not.
- **Availability is not reservation.** The npm scope and GitHub org should be claimed promptly — a 404 today does not hold the name. A scope showing "0 public packages" may still be registered but unpublished; only attempting to claim it settles the question.
  - ✅ **GitHub org [`libregrid`](https://github.com/libregrid) claimed 2026-08-11** (Organization, under a private account).
  - ✅ **npm org `libregrid` claimed 2026-08-11**, securing the `@libregrid/*` scope.
  - **The name is now secured on both registries.** Remaining: the `libregrid.dev` domain ([open actions](../OPEN-ACTIONS.md) A3), which is not blocking.

## Alternatives considered

| Option | Outcome |
|---|---|
| Keep **OpenGrid** | Rejected — GitHub org unavailable, and a direct same-category npm collision |
| **GridMore** | Viable (all three assets free), but weaker brand signal than the `Libre*` convention |
| **GridWright / GridSmith** | Rejected — GitHub orgs taken |
| Single dictionary words | Rejected — all taken on both npm and GitHub |
| Non-grid codename + tagline | Rejected — loses discoverability for a library people find by searching "grid" |
