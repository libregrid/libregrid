# @libregrid/material

Match a LibreGrid grid to an Angular Material 3 application. The theme bridge
maps Material color tokens to Quartz and follows theme changes. Optional
renderers provide Material controls for selected grid UI elements.

[Documentation and examples](https://libregrid.dev/material)

## Install

In an Angular application with a configured Material 3 theme:

```bash
npm install "ag-grid-community@^36.1.0" "ag-grid-angular@^36.1.0" @libregrid/angular @libregrid/material
```

The bridge requires Angular core, common, Material, and CDK `>=20`, plus
`ag-grid-community >=36.1.0 <37`. Install Material and CDK at versions compatible
with the rest of your Angular application if they are not already present.
Match `ag-grid-angular` to the AG Grid Community version.

## Usage

Add the theme provider and grid module registration to `app.config.ts`:

```ts
import type { ApplicationConfig } from '@angular/core';
import { AllCommunityModule } from 'ag-grid-community';
import { provideLibreGrid } from '@libregrid/angular';
import { provideLibreGridMaterialTheme } from '@libregrid/material';

export const appConfig: ApplicationConfig = {
  providers: [provideLibreGrid(AllCommunityModule), provideLibreGridMaterialTheme()],
};
```

Bind the grid's theme to the service in a standalone component:

```ts
import { Component, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';

interface Row {
  name: string;
  quantity: number;
}

@Component({
  selector: 'app-material-grid',
  standalone: true,
  imports: [AgGridAngular],
  template: `
    <ag-grid-angular
      style="display: block; height: 400px"
      [theme]="theme.gridTheme()"
      [rowData]="rowData"
      [columnDefs]="columnDefs"
    />
  `,
})
export class MaterialGridComponent {
  protected readonly theme = inject(LibreGridThemeService);
  readonly rowData: Row[] = [{ name: 'Notebook', quantity: 12 }];
  readonly columnDefs: ColDef<Row>[] = [{ field: 'name' }, { field: 'quantity' }];
}
```

Bootstrap your application with that configuration as shown in the
[Angular quick start](../angular/README.md). Keep your Material theme styles in
the application stylesheet; the bridge reads the tokens, it does not create the
application's Material theme. By default it observes the document root. Use
the provider's `root` option if another element carries your theme tokens.

## Theme and renderer behavior

`gridTheme()` is a signal containing the Quartz theme built from the current
Material tokens. The service observes changes to the theme root and exposes
`setMode`, `toggle`, `setAccent`, and `setDensity` controls.

When instantiated, the service also installs the Material menu renderer,
side-bar renderer, and columns-panel drag adapter. Register the corresponding
LibreGrid feature modules to use those surfaces. You do not need to install
those renderers a second time.

The rich-select editor is a separate opt-in. Register `RichSelectModule` from
[`@libregrid/rich-select`](../rich-select/README.md), then pass your grid options
to `installMaterialRichSelectCellEditor(options)` before creating the grid.

`MaterialStatusBarComponent` is a standalone Angular presentation component
with a required `text` input. Render it in your own template with
`<lgr-material-status-bar [text]="summary" />`; it is not an AG Grid status-panel
implementation. Your component supplies the summary string.

## API

| Export                                                       | Purpose                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `provideLibreGridMaterialTheme(options?)`                    | Configure the injectable bridge; supports root, density, and accent |
| `LibreGridThemeService`                                      | Reactive theme and mode, accent, and density controls               |
| `buildGridTheme(root?, density?)`                            | Build a theme without the reactive service                          |
| `installMaterialSideBarRenderer(appRef, envInjector)`        | Install the side-bar renderer without using the theme service       |
| `installMaterialRichSelectCellEditor(options)`               | Add the Material cell editor to grid options                        |
| `MaterialStatusBarComponent`                                 | Angular status-text component                                       |
| `createMaterialColumnsToolPanelDragDropAdapter(envInjector)` | Create a custom panel drag adapter                                  |
| `installMaterialColumnsToolPanelDragDrop(envInjector)`       | Install that adapter outside the theme service                      |

These integrations use Angular and Material; for a plain TypeScript grid, use
the standard Quartz theme and framework-independent feature packages.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
