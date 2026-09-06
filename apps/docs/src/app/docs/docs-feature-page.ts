import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { featureForPath } from './feature-catalog';
import { DocsFeatureHeaderComponent, type DocsFeatureValue } from './docs-feature-header';
import { DocsDemoGuideComponent } from './docs-demo-guide';
import { DocsRouteCompanionComponent, ROUTE_GUIDES } from './docs-route-guide';

/**
 * Single page model for a feature guide, driven by the feature catalog and
 * route guides so route components stay thin.
 *
 * Renders, in order: the slim feature header (title + summary + package
 * chips), the demo guide when the route defines one, the projected demo and
 * supporting content, then the companion (code example, backend boundary, and
 * the production checklist only when the guide defines one).
 */
@Component({
  selector: 'lgr-docs-feature-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocsFeatureHeaderComponent, DocsDemoGuideComponent, DocsRouteCompanionComponent],
  template: `
    <div class="lgr-page">
      @if (feature(); as feature) {
        <lgr-docs-feature-header
          [title]="feature.label"
          [summary]="feature.outcome"
          [packages]="feature.packages"
          [audiences]="audiences()"
          [values]="values()"
        />
        @if (guide(); as guide) {
          <lgr-docs-demo-guide [intro]="guide.intro" [steps]="guide.steps" />
        }
      }

      <ng-content />

      @if (feature(); as feature) {
        @if (guide(); as guide) {
          <lgr-docs-route-companion [feature]="feature" [guide]="guide" />
        }
      }
    </div>
  `,
})
export class DocsFeaturePageComponent {
  /** Route path of the feature, e.g. 'row-grouping'. */
  readonly path = input.required<string>();
  /** Opt-in audience pills; empty by default. */
  readonly audiences = input<readonly string[]>([]);
  /** Opt-in value cards; empty by default. */
  readonly values = input<readonly DocsFeatureValue[]>([]);

  protected readonly feature = computed(() => featureForPath(this.path()));
  protected readonly guide = computed(() => ROUTE_GUIDES[this.path()]);
}
