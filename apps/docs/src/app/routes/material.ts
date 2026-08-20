import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

const THEME_CODE = `bootstrapApplication(AppComponent, {
  providers: [provideLibreGridMaterialTheme()],
});`;

@Component({
  selector: 'lgr-material-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  styles: `pre { overflow:auto; padding:1rem; border-radius:12px; background:var(--mat-sys-surface-container); border:1px solid var(--mat-sys-outline-variant); } pre code { padding:0; border:0; background:transparent; } .buttons { display:flex; flex-wrap:wrap; gap:.75rem; align-items:center; }`,
  template: `
    <div class="lgr-page"><p class="lgr-eyebrow">Angular Material integration</p><h1>One theme, one coherent workspace</h1><p>The Material bridge maps your Angular Material color tokens to LibreGrid, so application surfaces, controls, and grid chrome reflect the same brand and light/dark setting.</p>
      <mat-card appearance="outlined"><mat-card-content><h2>Install at bootstrap</h2><pre><code>{{ themeCode }}</code></pre><p>Keep feature modules in <code>provideLibreGrid(...)</code>; the theme bridge only provides visual integration.</p></mat-card-content></mat-card>
      <h2>Control hierarchy used across these docs</h2><div class="buttons"><button matButton="filled"><mat-icon>play_arrow</mat-icon> Primary action</button><button matButton="tonal"><mat-icon>tune</mat-icon> Safe secondary</button><button matButton="outlined">Alternative</button><button matButton="text">Reset</button></div>
    </div>
  `,
})
export class MaterialDemo { protected readonly themeCode = THEME_CODE; }
