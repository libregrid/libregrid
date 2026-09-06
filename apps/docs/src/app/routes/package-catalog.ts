import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { DOCS_FEATURES, DOCS_SECTIONS } from '../docs/feature-catalog';

@Component({
  selector: 'lgr-package-catalog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatChipsModule],
  styles: `
    .catalog-section { margin-top: 2rem; }
    .catalog-section h2 { margin: 0 0 .75rem; }
    .catalog-list {
      list-style: none;
      margin: 0;
      padding: 0;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--lgr-radius-md);
      overflow: hidden;
    }
    .catalog-row {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: .35rem 1rem;
      padding: .75rem 1rem;
      background: var(--mat-sys-surface-container-low);
    }
    .catalog-row + .catalog-row { border-top: 1px solid var(--mat-sys-outline-variant); }
    .catalog-row a { font-weight: 600; }
    .catalog-row p {
      flex: 1 1 20rem;
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      font-size: .9rem;
    }
    .catalog-row mat-chip-set { margin-left: auto; }
  `,
  template: `
    <div class="lgr-page">
      <p class="lgr-eyebrow">Product and implementation map</p>
      <h1>Choose the value your customers need</h1>
      <p>Each row connects a customer-facing outcome to its package and shows whether its implementation lives entirely in the browser or crosses into your systems.</p>
      @for (section of sections; track section.id) {
        @if (featuresFor(section.id).length) {
          <section class="catalog-section">
            <h2>{{ section.label }}</h2>
            <ul class="catalog-list">
              @for (feature of featuresFor(section.id); track feature.path) {
                <li class="catalog-row">
                  <a [routerLink]="'/' + feature.path">{{ feature.label }}</a>
                  <p>{{ feature.outcome }}</p>
                  @if (feature.packages.length) {
                    <mat-chip-set aria-label="Packages">
                      @for (pkg of feature.packages; track pkg) {
                        <mat-chip>{{ pkg }}</mat-chip>
                      }
                    </mat-chip-set>
                  }
                </li>
              }
            </ul>
          </section>
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
