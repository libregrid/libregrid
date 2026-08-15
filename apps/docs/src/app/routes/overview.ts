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
        <mat-chip>Phases 0–12 complete</mat-chip>
        <mat-chip>1.0 hardening</mat-chip>
        <mat-chip>ag-grid-community 36.1</mat-chip>
      </mat-chip-set>

      <div class="note">
        <p>
          LibreGrid adds AG Grid Enterprise-equivalent features to <em>stock, unmodified</em>
          <code>ag-grid-community</code> by registering into its module system. It is
          <strong>not a fork</strong> — you install both packages.
        </p>
        <p>
          Every feature on the roadmap below ships in this repository. Read the
          <a href="https://github.com/libregrid/libregrid/blob/main/docs/guides/migration-guide.md">migration guide</a>
          and the
          <a href="https://github.com/libregrid/libregrid/blob/main/docs/parity/gap-list.md">honest gap list</a>
          before adopting — they state exactly what is identical, what differs, and what is missing.
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
        <div class="phase"><span class="num done">Phase 1</span><span class="done">✅ Menus &amp; side bar</span></div>
        <div class="phase"><span class="num done">Phase 2</span><span class="done">✅ Row grouping &amp; aggregation</span></div>
        <div class="phase"><span class="num done">Phase 3</span><span class="done">✅ Columns tool panel</span></div>
        <div class="phase"><span class="num done">Phase 4</span><span class="done">✅ Selection, clipboard &amp; status bar</span></div>
        <div class="phase"><span class="num done">Phase 5</span><span>⏸️ Excel export — deferred, does not block 1.0</span></div>
        <div class="phase"><span class="num done">Phase 6</span><span class="done">✅ Set/Multi filter &amp; filters tool panel</span></div>
        <div class="phase"><span class="num done">Phase 7</span><span class="done">✅ Server-Side Row Model (core)</span></div>
        <div class="phase"><span class="num done">Phase 8</span><span class="done">✅ Pivot</span></div>
        <div class="phase"><span class="num done">Phase 9</span><span class="done">✅ SSRM grouping/pivot &amp; viewport model</span></div>
        <div class="phase"><span class="num done">Phase 10</span><span class="done">✅ Tree data &amp; master/detail</span></div>
        <div class="phase"><span class="num done">Phase 11</span><span class="done">✅ Advanced filter, find &amp; rich select</span></div>
        <div class="phase"><span class="num done">Phase 12</span><span class="done">✅ Integrated charts &amp; sparklines</span></div>
        <div class="phase"><span class="num">Phase 13</span><span>🟡 Long tail &amp; 1.0 hardening — in progress</span></div>
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
