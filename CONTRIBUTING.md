# Contributing to LibreGrid

Thanks for your interest. Please read this in full before your first PR — LibreGrid has one non-negotiable legal rule that is unusual, and it matters more than anything else here.

---

## ⚠️ Rule zero: never touch `ag-grid-enterprise`

LibreGrid is a **clean-room implementation**. We build against the MIT-licensed *interfaces* that `ag-grid-community` publishes. We never read the commercially-licensed *implementation*.

**Prohibited, without exception:**

- `npm install ag-grid-enterprise` — even transitively, even as a devDependency, even "just to look"
- Reading its source, `dist`, `.d.ts`, or decompiled bundles
- Cloning `github.com/ag-grid/ag-grid` without path exclusions (the enterprise package sits beside the community one)
- Copying from blog posts, Stack Overflow answers or AI output that quotes Enterprise source
- Installing a trial Enterprise build to compare behaviour — its EULA restricts reverse engineering

**Permitted sources, exclusively:** MIT source under `packages/ag-grid-community/`, `packages/ag-stack/`, `packages/ag-grid-angular/`, `community-modules/`; public documentation at ag-grid.com; `ag-charts-community`; `write-excel-file` (Phase 5 OOXML reference only).

This is enforced by `npm run check:contamination`, which runs on every commit. If you are unsure whether something is allowed, **ask before doing it**. A contaminated contribution cannot be merged and may require rewriting history.

Full detail: [`docs/reference/guardrails.md`](./docs/reference/guardrails.md).

---

## Getting started

```bash
git clone https://github.com/libregrid/libregrid.git
cd libregrid
npm install
npm run gen:version
npm run verify          # lint + test + build + guardrails
```

Requires Node ≥ 20.19.

---

## Before writing code

Read, in order:

1. [`LIBREGRID-PLAN.md`](./LIBREGRID-PLAN.md) — what we're building and why
2. [`docs/reference/guardrails.md`](./docs/reference/guardrails.md) — the rules
3. [`docs/reference/api-seams.md`](./docs/reference/api-seams.md) — how modules attach to the grid
4. [`docs/reference/standards.md`](./docs/reference/standards.md) — coding and test conventions
5. [`docs/reference/package-architecture.md`](./docs/reference/package-architecture.md) — package boundaries and tree-shaking
6. The relevant file in [`docs/phases/`](./docs/phases/)

---

## How work is organised

Development proceeds in **phases**, each with its own file carrying context, a todo list, a test plan and acceptance criteria. Phases are ordered by dependency.

- **Do not start a phase until the previous one's acceptance criteria are met.**
- Large phases ship as **sequential sub-PRs** (Phase 2 has five, Phase 5 has nine). Never one giant PR.
- Pick up work by claiming a task in the relevant phase file.

---

## Definition of Done

A change is complete when **all** of these hold — see [`standards.md`](./docs/reference/standards.md) §9:

- [ ] Unit tests pass, ≥85% coverage on new code
- [ ] At least one **integration test against a real grid** per feature — unit tests do not prove the seam works
- [ ] Playwright E2E for anything mouse-driven
- [ ] A working route in `apps/docs`
- [ ] `docs/parity/<domain>.md` updated with ✅ / 🟡 / ❌ **and a rationale for every ❌**
- [ ] `npm run verify` green
- [ ] Bundle budgets met; tree-shaking fixture shows no other `@libregrid/*` package leaking in
- [ ] axe-core: 0 violations, light and dark
- [ ] `NOTICE` + README attribution present in any new package
- [ ] A Changeset added

**Never mark a parity item ✅ without a passing test.** An option that exists in a type definition but is not honoured at runtime is ⬜, not ✅.

---

## Coding rules (summary)

1. No `any` — use `unknown` plus narrowing
2. Never `as any` on `moduleName`; it is a closed union and inventing names is a bug
3. **`agXxx` API identifiers are required** (`agGroupCellRenderer`, `agSetColumnFilter`) — do not "fix" them. Our own CSS classes use the `lgr-` prefix
4. Only `@libregrid/material` and `@libregrid/angular` may import from `@angular/*`
5. One bean per file; beans are not public API
6. Barrels are flat re-exports only — no side effects, never call `registerModules()` at module scope
7. All cleanup via `addDestroyFunc` / `addManaged*`

---

## Trademark and wording

"AG Grid" is a trademark of AG Grid Ltd. In READMEs, package descriptions, docs and announcements:

✅ "Enterprise-grade features for AG Grid Community" · "Compatible with `ag-grid-community`"
❌ "The open-source AG Grid Enterprise" · anything implying affiliation or endorsement

See [`guardrails.md`](./docs/reference/guardrails.md) G4.

---

## Pull requests

- Branch: `phase-N/short-description`
- Reference the phase file and tick the todo items your PR completes
- Include a Changeset (`npx changeset`)
- Keep PRs reviewable — split large work into the sub-PRs the phase file defines

## Reporting bugs

Use the issue templates. For **security** issues, do not open a public issue — see [`SECURITY.md`](./SECURITY.md).
