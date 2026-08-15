# @libregrid/material

Angular Material 3 theme bridge for LibreGrid. It maps your app's Material
color tokens onto the grid's Quartz theme. It follows light/dark mode
changes live. It provides Material-styled renderers for the side bar,
status bar, and rich-select editor.

This package has no AG Grid Enterprise equivalent. LibreGrid's UI shells
(menus, side bar, tool panels, status bar) are framework-neutral by default.
This package gives them a Material look.

## Install

```bash
npm install ag-grid-community @angular/core @angular/common @angular/material @angular/cdk @libregrid/material
```

Requires `ag-grid-community`, `@angular/core`, `@angular/common`,
`@angular/material`, and `@angular/cdk` as peer dependencies.

## Usage

### Theme bridge

Add `provideLibreGridMaterialTheme()` to your application providers. Then
bind the grid's `[theme]` input to `LibreGridThemeService.gridTheme()`. The
service watches your app's Material tokens (including `light-dark()`
values). It rebuilds the grid theme whenever they change. No manual
light/dark configuration is needed.

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideLibreGridMaterialTheme } from '@libregrid/material';

export const appConfig: ApplicationConfig = {
  providers: [provideLibreGridMaterialTheme()],
};
```

```ts
// grid.component.ts
import { Component, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { LibreGridThemeService } from '@libregrid/material';

@Component({
  selector: 'app-grid',
  imports: [AgGridAngular],
  template: `<ag-grid-angular [theme]="theme.gridTheme()" [rowData]="rowData" [columnDefs]="columnDefs" />`,
})
export class GridComponent {
  protected readonly theme = inject(LibreGridThemeService);
  rowData = [{ name: 'Widget' }];
  columnDefs = [{ field: 'name' }];
}
```

### Material-styled renderers

Each renderer opts in independently. Call the matching installer once
during setup for the pieces you're using:

```ts
import { Component, inject, ApplicationRef, EnvironmentInjector } from '@angular/core';
import { installMaterialSideBarRenderer, installMaterialRichSelectCellEditor } from '@libregrid/material';

// Side bar tool-panel buttons rendered with mat-button:
installMaterialSideBarRenderer(inject(ApplicationRef), inject(EnvironmentInjector));

// Rich-select cell editor registered under AG Grid's standard component name:
const gridOptions: import('ag-grid-community').GridOptions = {};
installMaterialRichSelectCellEditor(gridOptions);
```

`MaterialStatusBarComponent` is a ready-made Material status-bar panel you
register through `@libregrid/status-bar`'s panel API. Use
`createMaterialColumnsToolPanelDragDropAdapter()` to get Material-styled drag
handles in the columns tool panel.

## API

| Export | Purpose |
| --- | --- |
| `LibreGridThemeService` | Injectable service exposing `mode` and `gridTheme` signals. |
| `provideLibreGridMaterialTheme(options?)` | Registers the theme service as an environment provider. |
| `buildGridTheme(root?, density?)` | Builds a `Theme` from the current Material tokens without the reactive service. |
| `installMaterialSideBarRenderer(appRef, envInjector)` | Renders side-bar tool-panel buttons with `mat-button`. |
| `installMaterialRichSelectCellEditor(options)` | Registers the Material rich-select cell editor under AG Grid's standard component name. |
| `MaterialStatusBarComponent` | Material-styled status-bar panel component. |
| `createMaterialColumnsToolPanelDragDropAdapter()` / `installMaterialColumnsToolPanelDragDrop(...)` | Material-styled drag handles for the columns tool panel. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/angular`](https://github.com/libregrid/libregrid/blob/main/packages/angular/README.md) — module registration and signal ergonomics

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
