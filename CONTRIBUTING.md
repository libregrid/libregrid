# Contributing to LibreGrid

Thanks for your interest. Read this in full before your first PR. LibreGrid has one non-negotiable legal rule that is unusual. It matters more than anything else here.

---

## ⚠️ Rule zero: never touch `ag-grid-enterprise`

LibreGrid is a **clean-room implementation**. We build against the MIT-licensed *interfaces* that `ag-grid-community` publishes. We never read the commercially-licensed *implementation*.

**Prohibited, without exception:**

- `npm install ag-grid-enterprise` — even transitively, even as a devDependency, even "just to look"
- Reading its source, `dist`, `.d.ts`, or decompiled bundles
- Cloning `github.com/ag-grid/ag-grid` without path exclusions (the enterprise package sits beside the community one)
- Copying from blog posts, Stack Overflow answers or AI output that quotes Enterprise source
- Installing a trial Enterprise build to compare behavior — its EULA restricts reverse engineering

**Permitted sources, exclusively:** MIT source under `packages/ag-grid-community/`, `packages/ag-stack/`, `packages/ag-grid-angular/`, `community-modules/`; public documentation at ag-grid.com; `ag-charts-community`; `write-excel-file` (OOXML reference only).

`npm run check:contamination` enforces this rule on every commit. If you are unsure whether something is allowed, **ask before doing it**. A contaminated contribution cannot be merged and may require rewriting history.

Full detail: [`docs/reference/guardrails.md`](./docs/reference/guardrails.md).

---

## Getting started

```bash
git clone https://github.com/libregrid/libregrid.git
cd libregrid
npm install
npm run gen:version
npm run verify          # lint + test + build + contamination/version/budget checks
```

Requires Node.js `>=20.19.0`.

---

## Before writing code

Read, in order:

1. [`LIBREGRID-PLAN.md`](./LIBREGRID-PLAN.md) — what we're building and why
2. [`docs/reference/guardrails.md`](./docs/reference/guardrails.md) — the rules
3. [`docs/reference/api-seams.md`](./docs/reference/api-seams.md) — how modules attach to the grid
4. [`docs/reference/standards.md`](./docs/reference/standards.md) — coding and test conventions
5. [`docs/reference/package-architecture.md`](./docs/reference/package-architecture.md) — package boundaries and tree-shaking
6. The relevant file in [`docs/parity/`](./docs/parity/) for the feature you are changing

Historical phase files live in [`docs/phases/`](./docs/phases/) for reference. New work is not gated on them.

---

## How work is organized

Work is organized around features, fixes, and chores. Prefer small, reviewable PRs over large ones.

- Open or claim a GitHub issue when the change is non-trivial.
- Update the matching [`docs/parity/<domain>.md`](./docs/parity/) checklist when behavior changes.
- Follow the Definition of Done below on every PR.

---

## Branching and versioning

### Branches (GitHub Flow)

`main` is the only long-lived branch. Open a short-lived branch from `main`, open a PR back to `main`, and delete the branch after merge.

| Prefix | Use | Example |
| --- | --- | --- |
| `feat/<slug>` | New feature or package | `feat/toolbar-find-item` |
| `fix/<slug>` | Bug fix | `fix/find-dark-contrast` |
| `chore/<slug>` | Tooling, docs, refactors, deps | `chore/update-deps` |

Do not push directly to `main`. Do not keep long-lived feature branches.

### Versioning (lockstep SemVer)

All `@libregrid/*` packages share one version (lockstep). That keeps `@libregrid/core` a singleton at runtime.

| Bump | When |
| --- | --- |
| **Major** (`x.0.0`) | Breaking API or bean change; removed option; peer-dep bump that needs user action |
| **Minor** (`1.x.0`) | New feature, new package, or new option with backward compatibility |
| **Patch** (`1.1.x`) | Bug fix, internal refactor, docs, tests, dependency update |

Add a Changeset on every PR that affects published packages:

```bash
npx changeset
```

Pick the bump type from the table above. Docs-only PRs that must not publish can use an empty changeset (`npx changeset add --empty`) or omit one when the PR template allows it.

### Releases

Release is automatic from `main`:

1. Merge a PR that includes a Changeset.
2. CI on `main` must pass (lint/test/build — e2e already ran on the feature PR).
3. The release workflow opens or updates a **Version Packages** PR.
4. Merge that PR to publish every `@libregrid/*` package at the new lockstep version.

**CI e2e runs once per change** — on the feature PR only. It is skipped on
`main` pushes (already covered by the PR) and on the Changesets version PR
(package.json/CHANGELOG only). Playwright browsers are cached between runs.

You can also run the release workflow manually via `workflow_dispatch` on `main`.

Full detail: [`docs/guides/publishing.md`](./docs/guides/publishing.md).

---

## Definition of Done

A change is complete when **all** of these hold — see [`standards.md`](./docs/reference/standards.md) §9:

- [ ] Unit tests pass, coverage thresholds met (85% statements, 75% branches — see [`standards.md`](./docs/reference/standards.md) §7.4)
- [ ] At least one **integration test against a real grid** per feature — unit tests do not prove the seam works
- [ ] Playwright E2E for anything mouse-driven
- [ ] A working route in `apps/docs`
- [ ] `docs/parity/<domain>.md` updated with ✅ / 🟡 / ❌ **and a rationale for every ❌**
- [ ] `npm run verify` green
- [ ] Bundle budgets met; tree-shaking fixture shows no other `@libregrid/*` package leaking in
- [ ] axe-core: 0 violations, light and dark
- [ ] `NOTICE` + README attribution present in any new package
- [ ] A Changeset added (unless the change does not affect published packages)

**Never mark a parity item ✅ without a passing test.** An option that exists in a type definition but the grid does not honor at runtime is ⬜, not ✅.

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

## Writing style

All writing a user reads follows the sentence-construction rules of
**ASD-STE100** (Simplified Technical English). This covers READMEs,
`docs/guides/`, the docs site, TSDoc on public exports, and error messages.
The rules: one idea per sentence, active voice, short sentences, imperative
instructions, one term per concept, no idioms. Defined technical and API
terms (`bean`, `pivot`, `module`) are always allowed — the rule is about
sentence construction, not a fixed word list. Internal-only writing (ADRs,
code comments, historical phase files) is exempt.

See [`standards.md`](./docs/reference/standards.md) §10 for the full rules
with examples.

---

## Pull requests

- Branch from `main` using `feat/`, `fix/`, or `chore/` (see above)
- Link the issue and/or parity doc your PR touches
- Include a Changeset when published packages change (`npx changeset`)
- Keep PRs reviewable — split large work into sequential PRs

## Reporting bugs

Use the issue templates. For **security** issues, do not open a public issue — see [`SECURITY.md`](./SECURITY.md).
