import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { DOCS_FEATURES, DOCS_SECTIONS } from '../docs/feature-catalog';

@Component({
  selector: 'lgr-package-catalog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatCardModule, MatChipsModule, MatIconModule],
  styles: `
    .catalog-section { margin-top: 2.5rem; } .catalog-section h2 { display:flex; align-items:center; gap:.5rem; }
    .catalog { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%, 250px),1fr)); gap:1rem; }
    .package-card { display:flex; flex-direction:column; min-height: 15rem; }
    .package-card mat-card-content { flex:1; } .package-card h3 { margin:.25rem 0 .5rem; }
    .package-card p { color:var(--mat-sys-on-surface-variant); font-size:.9rem; }
    .package-card footer { display:flex; justify-content:flex-end; padding:0 1rem 1rem; }
  `,
  template: `
    <div class="lgr-page">
      <p class="lgr-eyebrow">Product and implementation map</p>
      <h1>Choose the value your customers need</h1>
      <p>Each card connects a customer-facing outcome to its package and shows whether its implementation lives entirely in the browser or crosses into your systems.</p>
      @for (section of sections; track section.id) {
        @if (featuresFor(section.id).length) {
          <section class="catalog-section"><h2>{{ section.label }}</h2><div class="catalog">
            @for (feature of featuresFor(section.id); track feature.path) {
              <mat-card appearance="outlined" class="package-card"><mat-card-content>
                <mat-icon>{{ feature.icon }}</mat-icon><h3>{{ feature.label }}</h3><p>{{ feature.outcome }}</p>
                @if (feature.packages.length) { <mat-chip-set aria-label="Packages">@for (pkg of feature.packages; track pkg) { <mat-chip>{{ pkg }}</mat-chip> }</mat-chip-set> }
              </mat-card-content><footer><a [routerLink]="'/' + feature.path" [attr.aria-label]="'Open ' + feature.label"><mat-icon>article_shortcut</mat-icon></a></footer></mat-card>
            }
          </div></section>
        }
      }
    </div>
  `,
})
export class PackageCatalog {
  protected readonly sections = DOCS_SECTIONS;
  protected readonly featuresFor = (section: string) =>
    DOCS_FEATURES.filter((feature) => feature.section === section && feature.path);
}
