# Open Actions

Items that are **not phase work** but must not be lost. Unlike the phase files, these have no gate — they need an owner and a date.

Legend: ⬜ open · ✅ done · ⚠️ time-sensitive

---

## Time-sensitive — do these first

| # | Action | Status | Notes |
|---|---|---|---|
| A8 | **Publish 1.0.0** with npm provenance | ⚠️ externally owned | Phase 13 is complete; the release changeset (.changeset/phase-thirteen-100-release.md) bumps every package to 1.0.0. Requires an owner with npm auth and a GitHub Actions run of the changesets release workflow with --provenance. Also completes the verbatim quick-start check (phase-13 acceptance). |
| A9 | Phase 4 external spreadsheet check | ⚠️ externally owned | The only remaining Phase 4 gate: manually copy a range out of the live docs grid and paste into Excel, LibreOffice, and Google Sheets to confirm row/column shape. Requires a machine with one of those applications. |
| A1 | Claim GitHub org `libregrid` | ✅ **done 2026-08-11** | [github.com/libregrid](https://github.com/libregrid) — Organization, 0 repos |
| A2 | Claim npm org `libregrid` | ✅ **done 2026-08-11** | Scope `@libregrid/*` secured. No public packages yet (expected — first publish is Phase 0/1). Verify membership with `npm org ls libregrid` when you next authenticate. |
| A3 | Register `libregrid.dev` | ⬜ open | `.io` also available. `libregrid.org` is held by a third party. Not blocking, but cheap insurance. |
| A4 | Set the **GitHub** org description | ✅ **done 2026-08-11** | Verified via API: `"Enterprise-grade features for AG Grid Community"` — exact match to the official tagline (G4.2/G4.3). |
| A6 | GitHub org profile polish | ⬜ open (minor) | Two optional fields still empty: **display name** → `LibreGrid` (org currently renders as its login, `libregrid`), and **website** → `https://libregrid.dev` once A3 completes. Cosmetic, not governed. |
| A5 | npm org description | ✅ **N/A — no such field** | npm organizations have **no** description/bio field; the only npm-visible text comes from each package's `package.json` `description` and rendered `README.md`. Nothing to set until the first publish. Governed by **G4.2** — see the template and wording pattern in [`reference/standards.md`](reference/standards.md) §2. |
| A7 | **Repository public** | ✅ **done 2026-08-11** | [github.com/libregrid/libregrid](https://github.com/libregrid/libregrid) — public, description = official tagline (G4.2/G4.3), `main` tracked, **CI green**. Pushing `.github/workflows/**` required `gh auth refresh -h github.com -s workflow`; GitHub blocks OAuth apps from writing workflow files without it. |

---

## Before the repo goes public

| # | Action | Status | Notes |
|---|---|---|---|
| B1 | Legal counsel review | ⬜ open | Review the trademark position in **G4** — specifically G4.1a (`agXxx` identifiers required for interoperability) and G4.2 (tagline wording). Cheap relative to the exposure. Recorded as guidance in G4; this is the tracked action. |
| B2 | Open-source governance files | ✅ **scheduled** | Now **Phase 0 Task 0.13**, and a Phase 0 acceptance criterion. Must land before Task 0.14 (public push). |
| B3 | Verify G3 attribution present | ✅ **done 2026-08-14** | Every package has `NOTICE` + README with the independence disclaimer; now **enforced by CI** (`tools/bundle-budgets/check.mjs`) so it cannot regress. |

---

## Decided but unscheduled

| # | Decision | Status | Notes |
|---|---|---|---|
| C1 | Working directory named `open-grid` | ✅ **done 2026-08-11** | Resolved by **cloning, not renaming**. Canonical working copy is `~/projects/libregrid`; the old directory is deleted, and memory + `.remember` were migrated to the new project key. The fresh clone was verified green (lint, G1, versions, tests+coverage, both builds) **before** anything was deleted — which doubles as the real test of Task 0.13: a clone must build with no undocumented steps. |
| C2 | Cerious Widgets retained as a **design reference** | ⬜ open | Rejected as a foundation (see overview), but its signal-based/zoneless plugin host and `--cw-*` runtime token theming are worth studying when building `@libregrid/material` in Phase 1. Reading it is permitted — MIT. |

---

## Strategic decisions — RESOLVED 2026-08-11

| # | Question | Decision |
|---|---|---|
| D1 | What is the first shipped release? | ✅ **`0.1.0` = Phases 0–3.** Grouping, aggregation, columns tool panel, menus, side bar, Material theme bridge. Target ~2–3 months. Later phases ship as 0.2 / 0.3 / 0.4. Release criteria live at the end of [`phases/phase-03-columns-tool-panel.md`](phases/phase-03-columns-tool-panel.md). |
| D2 | When does the repo go public? | ✅ **Public from Phase 0** — [github.com/libregrid](https://github.com/libregrid). Phase 0 Task 0.14 performs the push. G3 and G4 apply to every public surface from the first commit. |
| D3 | Does Phase 0 produce governance files? | ✅ **Yes** — Phase 0 Task 0.13: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue/PR templates, root `README.md`. Must land **before** the public push. |

---

## Effort context

Not a decision, but anyone picking this up should know the scale:

- **Phase 0:** 1–3 days · **Phase 1:** 1–2 weeks · **Phase 2:** 3–6 weeks (largest)
- **Phases 3–6:** 2–4 weeks each · **Phases 7+9 (SSRM):** 4–8 weeks combined
- **Phase 5 (Excel):** 2–4 weeks · **Phase 12 (charts):** 3–6 weeks · **Phase 13:** 3–4 weeks
- **Full 1.0: realistically 9–18 months of sustained effort**, agent assistance included. AG Grid has a funded team and 15 years on this.

These are rough estimates, not commitments — they exist to inform D1, not to schedule anyone.

---

## Recommended execution model

| Practice | Rationale |
|---|---|
| **One agent per phase, fresh context**, pointed at its phase file | The doc set is built for this — each phase file is self-contained with its own context, todo, test plan and acceptance criteria |
| **Never run phases in parallel** | The dependency graph is real: Phase 3 without Phase 2's grouping has nothing to drag into a drop zone |
| **Sub-PRs within a phase are sequential too** | Phase 2 has five, Phase 5 has nine — ordered deliberately |
| **Human review at every gate** | Acceptance criteria are written to be checkable by someone who didn't write the code |
| **Review the parity checklists hardest** | An agent marking its own homework ✅ is the primary failure mode of this plan |
| **Phase 0 deserves your own eyes** | The contamination guard and conformance harness protect everything after them |
