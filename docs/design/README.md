# Design — UI/UX pass (1.1.0)

> Goal: LibreGrid's UI surfaces must look and feel as good as, or better than, the
> native AG Grid enterprise experience. This directory holds the research and design
> notes that drive that pass.

## File map

| File | Contents |
| ---- | -------- |
| `ux-1-tool-panel-toolbar.md` | Deep-dive: tool panel + quick access toolbar |
| `ux-2-menus.md`              | Deep-dive: column menu + context menu |
| `ux-3-menu-items-status-bar.md` | Deep-dive: custom menu item components + status bar |
| `ux-4-current-state-audit.md` | Current-state visual audit of LibreGrid's own surfaces |

Each deep-dive derives behavior from the public docs at ag-grid.com (per guardrail G2)
and visual tokens from the MIT Quartz theme CSS shipped in `ag-grid-community`
(`node_modules/ag-grid-community/styles/ag-theme-quartz.css`). Enterprise source is
never read (G1).

## Quartz design tokens (MIT, from `ag-theme-quartz.css`)

Light values shown; the theme defines dark-mode overrides for the same variables.
All spacing derives from one base unit, so our CSS must keep using `calc()` on
`--ag-grid-size` rather than hardcoded pixels.

| Token | Light value | Use |
| ----- | ----------- | --- |
| `--ag-grid-size` | `8px` | Base spacing unit — multiply for gaps and padding |
| `--ag-font-size` | `14px` | Body text |
| `--ag-icon-size` | `16px` | Icon glyphs |
| `--ag-header-height` | `calc(var(--ag-font-size) + var(--ag-grid-size) * 4.25)` (48px) | Header row and toolbar min-height |
| `--ag-row-height` | `calc(var(--ag-font-size) + var(--ag-grid-size) * 3.5)` (42px) | Row-sized controls |
| `--ag-cell-horizontal-padding` | `calc(var(--ag-grid-size) * 2)` (16px) | Horizontal inset |
| `--ag-border-radius` | `4px` | Controls, chips, small surfaces |
| `--ag-wrapper-border-radius` | `8px` | Cards, dialogs, panels |
| `--ag-popup-shadow` | `0 0 16px 0 rgba(0, 0, 0, 0.15)` | Menus, popups |
| `--ag-card-shadow` | `0 1px 4px 1px rgba(186, 191, 199, 0.4)` | Cards |
| `--ag-menu-background-color` | `color-mix(in srgb, var(--ag-background-color), var(--ag-foreground-color) 3%)` | Menu surface (slightly off the page background) |
| `--ag-menu-border-color` | `color-mix(in srgb, transparent, var(--ag-foreground-color) 20%)` | Menu outline |
| `--ag-input-focus-box-shadow` | `0 0 0 3px color-mix(in srgb, transparent, var(--ag-input-focus-border-color) 47%)` | Focus ring |
| `--ag-toolbar-background-color` | `var(--ag-header-background-color)` | Toolbar surface |
| `--ag-widget-container-vertical-padding` | `calc(var(--ag-grid-size) * 1.5)` (12px) | Widget/filter padding |
| `--ag-chip-border-color` | `color-mix(in srgb, var(--ag-header-background-color), var(--ag-foreground-color) 13%)` | Drop-zone chips |
| `--ag-side-button-selected-background-color` | `transparent` | Selected side-bar button |

## Design principles for the pass

1. **Theme-native first.** Every color, radius, shadow, and gap comes from an
   `--ag-*` variable (or a `color-mix` over one). No hardcoded colors, no
   hardcoded px spacing. This inherits Quartz light/dark automatically.
2. **`lgr-` prefix only.** We never emit `ag-` hyphenated CSS classes of our own (G4).
3. **States are mandatory.** Every interactive surface gets default, hover,
   focus-visible (visible ring using `--ag-input-focus-box-shadow`), active,
   selected, and disabled treatments.
4. **Stable test selectors.** E2E specs assert `.lgr-menu-item`,
   `.lgr-context-menu`, `.lgr-side-bar`, `.lgr-tool-panel` and friends.
   `.lgr-context-menu` and `.lgr-column-menu` identify root menus only;
   submenus use `.lgr-sub-menu`. Enrich the DOM; keep those classes and roles
   (`role=menu`/`menuitem`, `role=complementary`) intact.
5. **Icons, labels, hierarchy.** Enterprise surfaces lead with icons and
   label/value structure (status bar name-value pairs, iconed menu items,
   iconed side-bar buttons). Our pass adds that hierarchy, not just paint.
6. **STE100** for any user-facing text added or changed (standards §10).

## Scope notes

- The Quick Access Toolbar shipped as `@libregrid/toolbar` in this pass: the
  shell renders via the AG-TOOLBAR selector seam; quick filter and find items
  ship in the package; row group / pivot panel / menu items are contributed by
  their owning packages through the Symbol.for registry.
- Custom menu item components (`MenuItemDef.menuItem`) are implemented in the
  shared menu renderer with the full agInit/configureDefaults/setActive/
  setExpanded/select contract.
- Status of the four deep-dive files: ux-1..ux-4 drove the implementation
  above. Remaining noted gaps are the legacy tabbed column menu
  (`columnMenu='legacy'`) and right-click on empty header space, both tracked
  in docs/parity/column-menu.md.
