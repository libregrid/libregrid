import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

const INSTALL = 'npm install ag-grid-community @libregrid/angular @libregrid/row-grouping';
const BOOTSTRAP = `import { provideLibreGrid } from '@libregrid/angular';
import { RowGroupingModule } from '@libregrid/row-grouping';

bootstrapApplication(AppComponent, {
  providers: [provideLibreGrid(RowGroupingModule)],
});`;
const TEMPLATE = `<ag-grid-angular
  [columnDefs]="columnDefs"
  [rowData]="orders"
  [autoGroupColumnDef]="{ minWidth: 220 }"
  [groupDefaultExpanded]="1"
/>`;

@Component({
  selector: 'lgr-getting-started',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  styles: `
    .steps { display: grid; gap: 1rem; margin: 1.5rem 0; }
    .step { display: grid; grid-template-columns: auto 1fr; gap: 1rem; padding: 1.25rem; }
    .step-number { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; background: var(--mat-sys-primary); color: var(--mat-sys-on-primary); font-weight: 700; }
    .step h2 { margin: 0 0 .35rem; }
    pre { margin: .75rem 0 0; overflow: auto; padding: 1rem; border-radius: 12px; background: var(--mat-sys-surface-container); border: 1px solid var(--mat-sys-outline-variant); line-height: 1.5; }
    pre code { padding: 0; background: transparent; border: 0; }
    .next { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.5rem; }
  `,
  template: `
    <div class="lgr-page">
      <p class="lgr-eyebrow">Developer quick start</p>
      <h1>Ship one customer outcome first</h1>
      <p>LibreGrid extends AG Grid Community in your application. Choose the package that solves the job, register it once when Angular bootstraps, and keep your existing grid configuration and backend contracts.</p>
      <div class="steps">
        <mat-card appearance="outlined" class="step">
          <span class="step-number">1</span><div><h2>Install only the capability you need</h2><p>Start focused; add packages as your product requires more.</p><pre><code>{{ install }}</code></pre></div>
        </mat-card>
        <mat-card appearance="outlined" class="step">
          <span class="step-number">2</span><div><h2>Register modules in the application composition root</h2><p>This keeps bundles intentional and makes every route use the same capability set.</p><pre><code>{{ bootstrap }}</code></pre></div>
        </mat-card>
        <mat-card appearance="outlined" class="step">
          <span class="step-number">3</span><div><h2>Use familiar grid options</h2><p>Your components stay focused on row data and user behavior.</p><pre><code>{{ templateCode }}</code></pre></div>
        </mat-card>
      </div>
      <mat-card appearance="outlined"><mat-card-content><h2>Where your backend belongs</h2><p>Client-side features need only rows. Server-side features hand your existing API a typed request containing range, sorting, grouping and filters; your service applies it to the database and returns rows plus a total count. Visit SSRM Analytics for the complete request and response contract.</p></mat-card-content></mat-card>
      <div class="next"><a matButton="filled" routerLink="/packages">Choose a package <mat-icon>arrow_forward</mat-icon></a><a matButton="tonal" routerLink="/server-side-advanced">See a backend integration</a></div>
    </div>
  `,
})
export class GettingStarted {
  protected readonly install = INSTALL;
  protected readonly bootstrap = BOOTSTRAP;
  protected readonly templateCode = TEMPLATE;
}
