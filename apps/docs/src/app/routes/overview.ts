import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'lgr-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatChipsModule],
  styles: `
    .phases { display: grid; gap: 0.5rem; margin: 1rem 0; }
    .phase { display: flex; align-items: center; gap: 0.75rem; }
    .phase .num { font-variant-numeric: tabular-nums; opacity: 0.6; min-width: 4.5rem; }
    .done { color: var(--mat-sys-primary); }
    .note { border-left: 3px solid var(--mat-sys-primary);
            padding: 0.5rem 0 0.5rem 1rem; margin: 1.5rem 0; }
  `,
  template: `
    <div class="lgr-page">
      <h1>LibreGrid</h1>
      <p><strong>Enterprise-grade features for AG Grid Community</strong></p>

      <mat-chip-set aria-label="Project status">
        <mat-chip>MIT licensed</mat-chip>
        <mat-chip>Pre-release</mat-chip>
        <mat-chip>ag-grid-community 36.1</mat-chip>
      </mat-chip-set>

      <div class="note">
        <p>
          LibreGrid adds AG Grid Enterprise-equivalent features to <em>stock, unmodified</em>
          <code>ag-grid-community</code> by registering into its module system. It is
          <strong>not a fork</strong> — you install both packages.
        </p>
        <p>
          It is also <strong>not yet a drop-in replacement</strong> for AG Grid Enterprise. See the
          roadmap below and the parity checklists in the repository.
        </p>
      </div>

      <h2>Why this works</h2>
      <p>
        AG Grid Community publishes the Enterprise <em>contracts</em> under MIT — roughly 110
        interface files, DI bean slots reserved for enterprise beans, and every Enterprise module
        name in its closed <code>ModuleName</code> union. Registration performs no licence check.
        So the features can be implemented as plug-ins against seams the core already declares.
      </p>

      <h2>Roadmap</h2>
      <div class="phases">
        <div class="phase"><span class="num done">Phase 0</span><span class="done">✅ Foundation &amp; guardrails</span></div>
        <div class="phase"><span class="num">Phase 1</span><span>Menus &amp; side bar</span></div>
        <div class="phase"><span class="num">Phase 2</span><span>Row grouping &amp; aggregation</span></div>
        <div class="phase"><span class="num">Phase 3</span><span>Columns tool panel → <strong>0.1.0 ships here</strong></span></div>
        <div class="phase"><span class="num">Phase 4+</span><span>Selection, clipboard, Excel, filters, SSRM, pivot, charts…</span></div>
      </div>

      <a mat-flat-button routerLink="/grid">See the grid</a>

      <h2>Licence &amp; attribution</h2>
      <p>MIT licensed.</p>
      <p>
        <small>
          LibreGrid is an independent open-source project. It is not affiliated with, endorsed by,
          or sponsored by AG Grid Ltd. "AG Grid" is a trademark of AG Grid Ltd.
        </small>
      </p>
    </div>
  `,
})
export class Overview {}
