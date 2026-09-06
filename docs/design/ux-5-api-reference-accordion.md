# Design Note — API Reference Package Accordion (`/api`)

> Status: shipped. Documents the accordion interaction on the API Reference page
> (`apps/docs/src/app/routes/api.ts`, selector `lgr-api-reference`) and the contract
> its tests enforce (`apps/docs-e2e/src/e2e/api.spec.ts`).
> Origin: reviewer feedback that the package detail box "is still just lost on the
> page" when rendered in a detached side column.

---

## 1. Problem

The `/api` page listed 36 packages as selectable bars and rendered the selected
package's integration details (modules, public surface, boundary, code examples,
guide links) in a separate detail column below the list. Reviewers twice reported
the detail box as visually disconnected: the eye had to jump from the clicked bar
to a distant panel, and the panel's owner was unclear.

## 2. Chosen interaction: single-expansion accordion

Each package bar is the toggle for its own detail panel, which expands from the
bottom of the bar inside the shared bordered list.

Rules:

1. **One open at a time.** Opening bar B collapses bar A. Clicking the open bar
   collapses it, so an all-collapsed state is allowed.
2. **Panel placement.** The panel renders inside the same `<li>` as its bar,
   full width of the list, directly beneath the bar.
3. **Initial state.** All panels collapsed. The page shows no detail box until a
   reader asks for one.
4. **Filtering.** Search and category filters behave as before; if the expanded
   package no longer matches, its panel disappears with its row and returns when
   the filter clears (expansion state persists by package name).
5. **No memory.** Expansion is component-local UI state; nothing persists across
   navigation or reloads.

## 3. Implementation contract

All in `apps/docs/src/app/routes/api.ts`:

| Concern | Decision |
| --- | --- |
| State | One signal, `expandedName = signal<string \| null>(null)`. `toggle()` swaps or clears it. |
| Toggle semantics | `(click)` on the bar button calls `toggle(entry)`; `is-expanded` drives `aria-expanded`, the `is-selected` tint, and the chevron rotation. |
| Animation | CSS-only `grid-template-rows: 0fr ↔ 1fr` transition on a `.detail-wrap` wrapper with an `overflow:hidden` `.detail-clip` inner. Content-height agnostic, no timers, respects the component's OnPush change detection. |
| Panel surface | `.detail` gets `border-top` and `--mat-sys-surface-container` background so it reads as hanging from the bar within the list. |
| Examples | `examplesFor(entry)` is memoized per package in a `Map`, because the `@if` block re-renders on any signal change and must not rebuild example arrays. |
| Selectors | Bars: `.package`; panels: `.detail` (test-only classes; no `ag-` prefixed classes per G4). |

## 4. Accessibility contract

- Each bar is a native `<button>` (keyboard operable) with:
  - `aria-expanded` reflecting the panel state;
  - `aria-controls` pointing at the panel id (`api-detail-<slug>`);
  - its own stable id (`api-bar-<slug>`) used as the panel's `aria-labelledby`.
- The panel is `role="region"` labelled by its bar, so screen readers announce
  which package a panel belongs to.
- The rotating `expand_more` chevron is `aria-hidden`; state is conveyed by
  `aria-expanded`, not decoration.
- No `aria-live` region: expansion is a direct user action with visible result.
- The axe suite (`api.spec.ts`, light and dark, with a panel expanded) must stay
  violation-free.

## 5. Test mapping

`apps/docs-e2e/src/e2e/api.spec.ts`:

- collapsed default for every bar;
- expand-on-click places the panel inside the clicked bar's row with correct
  `aria-expanded` / `role="region"` / `aria-labelledby` wiring;
- single-expansion rule (previous panel closes);
- click-again collapses;
- keyboard activation (Enter on a focused bar);
- filter-out removes the open panel, clearing the filter restores it;
- axe light/dark with a panel expanded.

## 6. Deliberate non-goals

- No deep-link or query-param sync of the expanded package (`/api?pkg=...`):
  the page is a reference surface, and the accordion is browsing state.
- No multi-expansion mode: reviewers explicitly asked for toggle behavior where
  "only one bar can be expanded at a time".
- No persisted expansion across visits.
