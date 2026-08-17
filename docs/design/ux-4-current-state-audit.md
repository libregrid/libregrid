# UX-4 — Current-State Visual Audit (LibreGrid UI surfaces)

Status: audit only — no code changed. Scope: LibreGrid's own UI shells, tool panels, menus,
popups, status bar, find highlights, and the docs demo routes. Quartz theme tokens are cited
from the MIT theme already on disk (`node_modules/ag-grid-community/styles/ag-theme-quartz.css`);
no enterprise source was consulted (G1/G2).

---

## 1. Inventory table

Legend for "Current look": every claim is traceable to the file:line references given. "Defects"
column lists only what the code makes observably wrong today.

| Surface | Files (line refs) | Current look (from CSS/DOM) | Defects |
|---|---|---|---|
| Context menu | `packages/menu/src/menuCss.ts:6-72`, `contextMenuSvc.ts:237-323`, `materialMenuRenderer.ts:14-64` | 180px-min box, 4px padding, 4px radius, `rgba(0,0,0,.15)` shadow; rows are 6/12px-padded text with a text glyph check and a `▶` sub-menu arrow; Material renderer swaps rows to `mat-menu-item` buttons. | Hardcoded radius/shadow/padding ignore `--ag-border-radius`/`--ag-popup-shadow`; icons are text glyphs (`↑ ↓ ✓ ▶`) not the Quartz icon font; two competing style systems (`.lgr-menu-item` vs `mat-menu-item`). |
| Column menu | `packages/menu/src/colMenuFactory.ts:203-244`, `defaultItems.ts:23-36,153,170` | Flat list of bare `div`s with `textContent` only; no icon, no shortcut, no arrow. Separators are stripped (`colMenuFactory.ts:55,69,78,83`). | No visual grouping (separators silently dropped); items render as raw text without the sort/↑↓ icons the native menu shows; group breaks are lost. |
| Column filter popup | `packages/menu/src/filterPopup.ts:24-73` | Fixed-position `div` appended to `document.body`, inline `minWidth:240px`, `borderRadius:6px`, `boxShadow: 0 3px 14px`, `zIndex:1000`, 8px padding. | Appended to `body` → loses `.ag-theme-quartz` scope, so `var(--ag-…)` fallbacks always win in dark mode (light popup on dark grid); no title bar, no close button, no arrow, no focus trap, naive top/left clamping (`Math.max(8, rect.left)`, no right-edge/viewport fit). |
| Side bar shell (buttons, panel, resize) | `sideBarCss.ts:6-85`, `sideBarComponent.ts:25-31,150-177,223-246`, `materialSideBarRenderer.ts:18-35` | 32×32 icon buttons in a 4px-gap vertical strip; selected = `rgba(0,0,0,.08)`; panel 100–500px, 8px padding; 6px invisible resize handle. | Buttons render `textContent` (the panel label) inside 32px — text overflows/clips; `iconKey` is parsed but never rendered as an icon; no focus-visible ring; resize handle has zero visual affordance and no hover/active state. |
| Columns tool panel | `columnsToolPanelCss.ts:2-21`, `columnsToolPanel.ts:143-425` | 8px-padding grid; h2/h3; native `<input type=search>`, native `<input type=checkbox>`, and dozens of **unstyled native `<button>`s** ("Select all columns", "Pin left", "Move up", "Remove", …). List capped at 160px. | Buttons are browser-default controls inside a Quartz-themed panel — the single largest "ugly" factor; no hover/focus/active states anywhere; 160px list is cramped; drop-zone affordance is only a dashed outline via `:has()`. |
| Column chooser overlay | `columnsToolPanelCss.ts:19-21`, `columnChooserFactory.ts:9-45` | Full-screen `rgba(0,0,0,.45)` overlay, 420px dialog, 16px padding, hardcoded `0 8px 24px` shadow, `z-index:10000`; "Close" is a bare text `<button>` floated right. | Also appended to `document.body` → loses theme scope (dark mode breaks); shadow/overlay colors hardcoded; close button is a naked text button; no `aria-labelledby` title, no click-outside-to-close. |
| Row group drop zone (header panel) | `rowGroupingPanelCss.ts:1-8`, `rowGroupDropZone.ts:41-82` | 32px strip, `border-block-end`; members are 3px-radius bordered pills with text + "Move up"/"Move down"/"Remove" **text buttons**. | Buttons are unstyled native text ("Move up" etc. as full words — noisy); no chip styling (`--ag-chip-background-color`/`--ag-chip-border-color` unused); no hover/drag-over highlight beyond `preventDefault`. |
| Pivot drop zone | `rowGroupingPanelCss.ts:7`, `pivotDropZone.ts:17-57` | Same pill members; "Remove" text buttons; empty state text "Drag columns here to pivot" at 0.75 opacity. | Inherits all drop-zone button defects; `.lgr-pivot-drop-zone` opacity 0.75 permanently dims the whole zone including its members. |
| Filters tool panel | `filtersToolPanelCss.ts:1-6`, `filtersToolPanel.ts:63-135` | 12px grid of `<details>` cards (4px radius, 1px border) with a native `<select>` and a bare "Filter active/No active filter" paragraph; buttons unstyled. | Cards render raw browser `<summary>` markers; native select looks foreign next to Quartz; no "chip" affordance for active filters; apply/cancel/clear buttons are unstyled text buttons; hardcoded English strings. |
| Status bar (grid panels) | `status-bar/src/statusPanels.ts:5-61` | Bare `<span>` with `textContent` like `"Total Rows: 42"`, `aria-live`. **No CSS file exists.** | No per-panel padding, no separators, no typography/size token; relies entirely on Community's `.ag-status-bar`; labels hardcoded English, not locale-driven; aggregation math only scans `field`-typed columns. |
| Material status bar (demo) | `material/src/materialStatusBar.ts:5-15`, `selection.ts:47-48` | `<mat-toolbar>` shell used as a *standalone* demo component below the grid, not wired into the grid's `statusBar`. | Two parallel status-bar surfaces (grid panels vs Material toolbar) with no shared token/typography; the demo one is decorative and duplicates live values manually (`selection.ts:89-97`). |
| Find match highlight | `find/src/findCss.ts:1`, `findCellRenderer.ts:7-13` | One minified CSS line: match bg `#ffe082`, active bg `#ff9800`, active `outline:1px solid currentColor`; matches are nested `<span>`s per part. | Fallback colors differ from Quartz (`#ffff00`/`#ffa500`, `ag-theme-quartz.css:28-30`); active-match outline instead of the themed token; minified one-liner is unmaintainable; no find panel/toolbar UI exists (`agFindToolbarItem` unregistered). |
| Find controls (demo only) | `advanced-filter-find.ts:21-27`, `styles.scss:96-113` | Raw `<label>` + `<input>` + "Next match" `mat-stroked-button` + `<span>` count, hand-assembled in the route template. | Find UX is demo-only HTML, not a reusable surface; `agFindToolbarItem`/find toolbar are missing, so there is no in-grid Find affordance. |
| Chart toolbar (bonus) | `integrated-charts/src/chartCss.ts:1-7`, `chartService.ts:138` | Absolute-positioned 4px-gap toolbar; buttons get minimal inline-ish styling (`background/border/color`, `padding:4px 8px`). | Text buttons ("Configure chart"/"Unlink chart"/"Download chart") instead of icon buttons; no hover/focus states; not theme-token driven. |
| Demo page shell | `apps/docs/src/styles.scss:45-165` | `.lgr-page` max 1240px; cards 16px radius; grid host 12px radius; Material 3 tokens via `mat.theme`. | Page shell is Material-styled while the grid internals are Quartz — two design languages; `.lgr-grid-host` radius (12px) vs `wrapperBorderRadius:12` coincidence is unstated; no shared spacing scale between page (rem) and panels (px). |

### Toolbar items (the four registered names)

`agFindToolbarItem`, `agQuickFilterToolbarItem`, `agPivotPanelToolbarItem`,
`agRowGroupPanelToolbarItem` are **not implemented** anywhere under `packages/*`.
The only matches are the guardrail table (`docs/reference/guardrails.md:87`) and the parity
checklist marking `agPivotPanelToolbarItem` as deferred (`docs/parity/pivoting.md:17`).
`grep` for `ToolbarItem` only finds the *chart* toolbar (`chartSeams.ts`,
`chartService.ts`) and `columnsToolPanel.ts`/`filtersToolPanel.ts` internal button rows.
Consequence: there is no in-grid find box, no quick-filter pill, and no pivot/row-group panel
toolbars — every one of those enterprise surfaces is absent, not just unstyled.

---

## 2. Defect themes

### D1 — Unstyled native controls inside themed panels (highest impact)
`columnsToolPanel.ts:418-425`, `filtersToolPanel.ts:135`, `rowGroupDropZone.ts:75-82`,
`pivotDropZone.ts:49-56` all call `document.createElement('button')` with no class and no
CSS. Inside a Quartz grid these fall back to UA default button chrome (grey bevel, system font,
no padding on hover/focus). The same is true for `<input type=search>`, `<select>`,
`<details>/<summary>`, and checkboxes in the two tool panels. This is why the tool panels
"look broken" next to the grid: everything interactive is an unstyled browser control.

### D2 — Hardcoded colors/radii/shadows instead of theme tokens
Every `*Css.ts` string hardcodes fallbacks that disagree with Quartz:

| File | Hardcoded value | Quartz token (ag-theme-quartz.css) |
|---|---|---|
| `menuCss.ts:11-12` | radius 4px; shadow `0 4px 12px rgba(0,0,0,.15)` | `--ag-border-radius:4px` (L67), `--ag-popup-shadow:0 0 16px 0 rgba(0,0,0,.15)` (L103) |
| `menuCss.ts:8,7` | padding 4px 0; min-width 180px | `--ag-grid-size:8px` (L74); native menu min-width is icon+spacing-driven |
| `sideBarCss.ts:11,48,50` | `#f8f8f8`, 32px, radius 4px | `--ag-icon-size:16px` (L75); chrome bg should use `--ag-chrome-background-color` |
| `sideBarCss.ts:57-62` | hover `rgba(0,0,0,.04)`, selected `rgba(0,0,0,.08)` | `--ag-row-hover-color` (L36), `--ag-selected-row-background-color` (L35) |
| `filterPopup.ts:36` | shadow `0 3px 14px rgba(0,0,0,.3)`, radius 6px | `--ag-popup-shadow` (L103), `--ag-wrapper-border-radius:8px` (L68) |
| `columnsToolPanelCss.ts:19-20` | overlay `rgb(0 0 0 / 45%)`, shadow `0 8px 24px` | `--ag-modal-overlay-background-color` (L61), `--ag-popup-shadow` (L103) |
| `rowGroupingPanelCss.ts:4` | pill radius 3px | `--ag-chip-border-color` (L58) unused; radius should follow `--ag-border-radius` |
| `findCss.ts:1` | `#ffe082` / `#ff9800` | `--ag-find-match-background-color:#ffff00` (L28), `--ag-find-active-match-background-color:#ffa500` (L30) |

### D3 — Missing hover / focus / active / disabled states
- `.lgr-menu-item` has hover+focus but no `active` and the `:focus` shares the hover color (no visible focus ring) — `menuCss.ts:28-31`.
- `.lgr-side-bar-button` has hover + selected, no `:focus-visible` ring — `sideBarCss.ts:57-63`.
- Tool-panel/drop-zone/chart buttons have **no** hover/focus/active/disabled styling at all (D1).
- The only "active" styling anywhere is the selected side-bar button background — nothing else in the tool panels distinguishes pressed/disabled.
- Contrast: several places use `opacity:0.6–0.75` for secondary text (`menuCss.ts:58`, `columnsToolPanelCss.ts:18`, `rowGroupingPanelCss.ts:6-7`, `sideBarCss.ts:106`) instead of `--ag-secondary-foreground-color` / `--ag-disabled-foreground-color` (L53/L56).

### D4 — Inconsistent spacing / sizes / typography
- Menu rows: 6px 12px (`menuCss.ts:22`); side-bar buttons: 32px (`sideBarCss.ts:48`); columns panel: 8px gaps and 160px list (`columnsToolPanelCss.ts:2,8`); filters panel: 12px padding, 10px gaps (`filtersToolPanelCss.ts:2`); chart toolbar: 4px 8px (`chartCss.ts:4`). No shared `--lgr-space-*` scale; everything derives from ad-hoc px.
- Typography: tool-panel headings use `font:inherit; font-weight:600` (`columnsToolPanelCss.ts:3`) but `.lgr-tool-panel-body` uses `font-size:0.9em` (`sideBarCss.ts:99`) and status text inherits `14px`; no `--ag-font-size`/`--ag-secondary-font-size` discipline.
- Side bar default width 200px (`sideBarComponent.ts:20`) vs Quartz `--ag-side-bar-panel-width:250px` (L104); panel max 500px vs no token.

### D5 — Unpolished / inconsistent demo routes
- `side-bar-demo.ts:100-110` declares `iconKey:'columns'` but the shell renders the **text** "Stub Panel" in a 32px button (icon ignored).
- `side-bar-demo.ts:43-44` still says "the real panels … arrive in Phases 3 and 6" — stale copy now that the columns/filters panels exist.
- `selection.ts:47-48` uses `MaterialStatusBarComponent` as a standalone widget below the grid while also configuring a real grid `statusBar` (`selection.ts:66-72`) — two different status bars showing overlapping info.
- `advanced-filter-find.ts:21-27` hand-rolls find controls; no reusable find toolbar surface exists.
- `filters.ts:9-14` uses a 4-row dataset, so the Filters panel demo barely shows card/expansion behavior.
- `menus-demo.ts:107-117` `getContextMenuItems` replaces (not extends) the defaults, so the demo never shows the default items the package ships.

### D6 — Popups appended to `document.body` lose theme scope (dark-mode breakage)
`filterPopup.ts:49` and `columnChooserFactory.ts:38` append to `document.body`.
`--ag-background-color`, `--ag-foreground-color`, etc. are defined on the
`.ag-theme-quartz` grid root (`ag-theme-quartz.css:7-110`) and are **not** on `:root`.
Because the fallbacks in our CSS are light values (`#fff`/`#000`), the filter popup and column
chooser render as light panels even when the grid is dark. Community's menus avoid this by
attaching via `popupSvc.addPopup` inside the grid wrapper (`contextMenuSvc.ts:211`), which is
why the menus are fine but our two body-level popups are not.

### D7 — Raw HTML strings with weak styling / no framework
- `sideBarComponent.ts:169-174` injects an `innerHTML` fallback panel ("Panel content for '<key>'") that is unstyled beyond `.lgr-tool-panel`.
- `statusPanels.ts` emits bare spans with no wrapper class or structure.
- `findCss.ts` is a single minified string with no comments or formatting.

### D8 — A11y gaps
- No `:focus-visible` rings anywhere (`menuCss.ts:25` sets `outline:none` on items and never restores a focus indicator).
- Filter popup (`filterPopup.ts`) has `role=dialog` but no focus trap, no `aria-modal`, and no close button; Escape works only via a window listener added on a 0ms timeout (L66-70).
- Column chooser (`columnChooserFactory.ts`) has `aria-modal` and Escape but no focus trap and no labelled-by heading; the close control is a text "Close" button.
- `columnsToolPanel.ts` declares `role=tree`/`treeitem` (L208,257,284) but the rows contain checkboxes/buttons and are not keyboard-navigable as a tree (no roving focus, no arrow-key traversal).
- Status panels use `aria-live=polite` (good) but are unlabeled; find match counts rely on demo-level `aria-live`.

---

## 3. Recommendations (ranked by visual impact, 1 = highest)

1. **Build one `lgr-` control stylesheet and apply it to every bare `button`/`input`/`select`/checkbox in the tool panels and drop zones.** Add classes (e.g. `lgr-button`, `lgr-text-button`, `lgr-input`, `lgr-checkbox`) in `columnsToolPanel.ts:418`, `filtersToolPanel.ts:135`, `rowGroupDropZone.ts:75`, `pivotDropZone.ts:49`, and the chart toolbar, with hover/focus-visible/active/disabled states driven by `--ag-active-color`, `--ag-row-hover-color`, `--ag-icon-button-hover-background-color`, `--ag-input-focus-border-color`/`--ag-input-focus-box-shadow` (`ag-theme-quartz.css:10,36,38,39-41`). This single change removes the "browser-default inside Quartz" look.
2. **Route every hardcoded color/radius/shadow through Quartz tokens** — replace the D2 table's literals with `var(--ag-*)` and align fallbacks with `ag-theme-quartz.css:67-68,102-103`. Specifically: menu radius→`--ag-border-radius`, menu/filter-popup/chooser shadow→`--ag-popup-shadow`, side-bar hover/selected→`--ag-row-hover-color`/`--ag-selected-row-background-color`, pills→`--ag-chip-*` (L57-58).
3. **Fix body-level popup theming (dark mode).** Either attach `filterPopup.ts` and `columnChooserFactory.ts` popups inside the grid's popup/element wrapper, or copy the grid's `--ag-*` custom properties onto the popup root, or re-host them through `popupSvc.addPopup` like `contextMenuSvc.ts:211`. Until then, the filter popup and chooser are light-on-dark.
4. **Add real icons.** Replace the text glyphs `↑ ↓ ✓ ▶` in `defaultItems.ts:153,170` and `contextMenuSvc.ts:310` and the word-buttons "Move up/down/Remove"/"Pin left" with `ag-theme-quartz` icon-font glyphs (size `--ag-icon-size:16px`, L75) or an `lgr-icon` span. Side bar buttons must render `iconKey` as an icon instead of the label (`sideBarComponent.ts:235`, `materialSideBarRenderer.ts:32`), with `aria-label` + `title` for the label.
5. **Fix the column menu's lost separators.** `colMenuFactory.ts:55,69,78,83` strips `'separator'`; preserve and render them (as `.lgr-menu-separator`) so the sort/pin/auto-size/reset/chooser/filter groups are visually delimited.
6. **Add focus-visible rings and active states** on menu items (`menuCss.ts:25` removes `outline` without a replacement), side-bar buttons, and all tool-panel controls; use `--ag-input-focus-box-shadow` (L41) as the ring recipe.
7. **Restyle the drop-zone pills as chips** (`rowGroupingPanelCss.ts:4`, `pivotDropZone.ts`): `--ag-chip-background-color`/`--ag-chip-border-color`, radius `--ag-border-radius`, icon-only remove (`×`) with `aria-label`, and a proper drag-over highlight state instead of the permanent 0.75 opacity on `.lgr-pivot-drop-zone`.
8. **Promote find to a real surface.** Split `findCss.ts` into readable rules and use the exact `--ag-find-*-background-color` tokens (already correct in Quartz, L28-30); implement `agFindToolbarItem`/find controls as a reusable component so `advanced-filter-find.ts:21-27` stops hand-rolling HTML.
9. **Normalize the status bar.** Give `statusPanels.ts` a wrapper class (e.g. `.lgr-status-panel`) with padding/separators/typography and locale-aware labels; decide whether the grid `statusBar` or the Material toolbar is canonical and remove the duplicate demo surface (`selection.ts:47-48` vs `66-72`).
10. **Clean the demo shell and copy.** Update stale copy (`side-bar-demo.ts:43-44`), use `defaultItems`-extending context menus in `menus-demo.ts`, and align the page/grid radii (`styles.scss:64-74`) with `themeParams.ts:21-22` (`wrapperBorderRadius:12`, `borderRadius:8`) so page and grid share one radius scale.
11. **Adopt an `lgr-*` spacing + radius scale.** Define `--lgr-space-1…4` and `--lgr-radius-sm/md/lg` (G4: `lgr-` prefix only) derived from `--ag-grid-size`/`--ag-border-radius`/`--ag-wrapper-border-radius` and replace the ad-hoc 4/6/8/10/12/16px values across `menuCss.ts`, `sideBarCss.ts`, `columnsToolPanelCss.ts`, `filtersToolPanelCss.ts`, `chartCss.ts`.

---

## 4. Citations

Quartz theme tokens — `node_modules/ag-grid-community/styles/ag-theme-quartz.css`:
`--ag-active-color:#2196f3` (L10); `--ag-background-color:#fff` (L11);
`--ag-foreground-color:#181d1f` (L12); `--ag-find-match-background-color:#ffff00` (L28);
`--ag-find-active-match-background-color:#ffa500` (L30); `--ag-panel-background-color` (L31);
`--ag-menu-background-color`/ `--ag-menu-border-color` (L33-34);
`--ag-selected-row-background-color` (L35); `--ag-row-hover-color` (L36);
`--ag-icon-button-hover-background-color` (L38); `--ag-input-focus-border-color` (L39);
`--ag-input-focus-box-shadow` (L41); `--ag-disabled-foreground-color` (L56);
`--ag-chip-background-color`/ `--ag-chip-border-color` (L57-58);
`--ag-modal-overlay-background-color` (L61); `--ag-borders:solid 1px` (L66);
`--ag-border-radius:4px` (L67); `--ag-wrapper-border-radius:8px` (L68);
`--ag-grid-size:8px` (L74); `--ag-icon-size:16px` (L75); `--ag-header-height` (L76);
`--ag-row-height` (L77); `--ag-list-item-height` (L79); `--ag-font-family` (L95);
`--ag-font-size:14px` (L98); `--ag-tab-min-width:290px` (L100);
`--ag-card-shadow` (L102); `--ag-popup-shadow:0 0 16px 0 rgba(0,0,0,.15)` (L103);
`--ag-side-bar-panel-width:250px` (L104); `--ag-filter-panel-apply-button-*` (L105-106);
`--ag-column-panel-apply-button-*` (L107-108).

Material theme bridge — `packages/material/src/themeParams.ts:6-27` (`themeQuartz.withParams`,
`wrapperBorderRadius:12`, `borderRadius:8`, accent→`--mat-sys-primary`).

Guardrails obeyed: G1 (no enterprise source read), G2 (no behavioral probing; this is a
code-only audit), G4 (all proposed CSS uses `lgr-`; `ag-` only read from Community DOM/theme).
No external web research was required for this task.
