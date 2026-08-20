import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type DocsChecklistPriority = 'required' | 'recommended' | 'optional';

export interface DocsChecklistItem {
  title: string;
  description: string;
  priority?: DocsChecklistPriority;
}

let nextProductionChecklistId = 0;

/** Reusable production-readiness checklist for feature guides. */
@Component({
  selector: 'lgr-docs-production-checklist',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  styles: `
    :host {
      display: block;
      margin-block: 1.5rem;
    }

    .checklist {
      padding: 1rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 16px;
      background: var(--mat-sys-surface-container-low);
    }

    h2 {
      margin: 0;
      font-size: 1.2rem;
    }

    .intro {
      margin: 0.3rem 0 0;
      color: var(--mat-sys-on-surface-variant);
    }

    ul {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
      gap: 0.65rem;
      margin: 1rem 0 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.7rem;
      padding: 0.85rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background: var(--mat-sys-surface);
    }

    mat-icon {
      color: var(--mat-sys-primary);
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
    }

    .item-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
    }

    strong {
      font-size: 0.9rem;
    }

    .priority {
      flex: 0 0 auto;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      color: var(--mat-sys-on-secondary-container);
      background: var(--mat-sys-secondary-container);
      font-size: 0.64rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    p {
      margin: 0.25rem 0 0;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.82rem;
      line-height: 1.5;
    }
  `,
  template: `
    <section class="checklist" [attr.aria-labelledby]="headingId">
      <h2 [id]="headingId">{{ heading() }}</h2>
      @if (intro()) {
        <p class="intro">{{ intro() }}</p>
      }
      <ul>
        @for (item of items(); track item.title) {
          <li>
            <mat-icon aria-hidden="true">{{ iconFor(item.priority) }}</mat-icon>
            <div>
              <div class="item-heading">
                <strong>{{ item.title }}</strong>
                <span class="priority">{{ item.priority ?? 'recommended' }}</span>
              </div>
              <p>{{ item.description }}</p>
            </div>
          </li>
        }
      </ul>
    </section>
  `,
})
export class DocsProductionChecklistComponent {
  readonly heading = input('Production checklist');
  readonly intro = input('Confirm these details before shipping the feature to customers.');
  readonly items = input.required<readonly DocsChecklistItem[]>();

  protected readonly headingId = `lgr-production-checklist-${nextProductionChecklistId++}`;

  protected iconFor(priority: DocsChecklistPriority | undefined): string {
    if (priority === 'required') return 'verified';
    if (priority === 'optional') return 'add_circle_outline';
    return 'check_circle';
  }
}
