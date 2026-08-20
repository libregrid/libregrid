import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DocsFeatureHeaderComponent, type DocsFeatureValue } from './docs-feature-header';

/**
 * Consistent information architecture for a feature guide.
 *
 * Route components provide content through the following projection markers:
 * `[featureDemo]`, `[featureGuide]`, `[featureImplementation]`,
 * `[featureIntegration]`, and `[featureProduction]`. Unmarked content is
 * appended as supporting material, which keeps the shell extensible.
 */
@Component({
  selector: 'lgr-docs-feature-page-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocsFeatureHeaderComponent],
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .page {
      width: 100%;
      min-width: 0;
      max-width: 1280px;
      margin: 0 auto;
      padding: clamp(1rem, 3vw, 2.5rem);
    }

    .section {
      min-width: 0;
      margin-block: 1.5rem;
      scroll-margin-block-start: 5rem;
    }

    .demo-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .implementation,
    .integration,
    .production {
      padding-block-start: 0.25rem;
      border-block-start: 1px solid var(--mat-sys-outline-variant);
    }

    @media (min-width: 1080px) {
      .demo-layout:has(.guide:not(:empty)) {
        grid-template-columns: minmax(0, 2fr) minmax(17rem, 0.8fr);
      }
    }
  `,
  template: `
    <article class="page">
      <lgr-docs-feature-header
        [eyebrow]="eyebrow()"
        [title]="title()"
        [summary]="summary()"
        [packages]="packages()"
        [audiences]="audiences()"
        [values]="values()"
      />

      <div class="section demo-layout">
        <div class="demo"><ng-content select="[featureDemo]" /></div>
        <aside class="guide"><ng-content select="[featureGuide]" /></aside>
      </div>

      <section class="section implementation">
        <ng-content select="[featureImplementation]" />
      </section>

      <section class="section integration">
        <ng-content select="[featureIntegration]" />
      </section>

      <section class="section production">
        <ng-content select="[featureProduction]" />
      </section>

      <div class="section supporting"><ng-content /></div>
    </article>
  `,
})
export class DocsFeaturePageShellComponent {
  readonly eyebrow = input('Feature guide');
  readonly title = input.required<string>();
  readonly summary = input.required<string>();
  readonly packages = input<readonly string[]>([]);
  readonly audiences = input<readonly string[]>(['Product teams', 'Application developers']);
  readonly values = input<readonly DocsFeatureValue[]>([]);
}
