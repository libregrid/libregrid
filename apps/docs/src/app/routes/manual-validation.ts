import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

interface ValidationScenario {
  readonly id: string;
  readonly route: string;
  readonly feature: string;
  readonly instruction: string;
}

const STORAGE_KEY = 'libregrid-manual-validation-v1';

const SCENARIOS: readonly ValidationScenario[] = [
  {
    id: 'community',
    route: '/grid',
    feature: 'Community integration',
    instruction: 'Sort, resize, select rows, and switch the Material theme.',
  },
  {
    id: 'menus',
    route: '/menus',
    feature: 'Menus and side bar',
    instruction: 'Open the column and context menus; open and close each side-bar panel.',
  },
  {
    id: 'grouping',
    route: '/row-grouping',
    feature: 'Row grouping and aggregation',
    instruction: 'Group, expand, sort a group, and confirm aggregate totals update.',
  },
  {
    id: 'pivot',
    route: '/pivot',
    feature: 'Pivot',
    instruction: 'Enable pivot mode, move a column to Pivot, and inspect generated result columns.',
  },
  {
    id: 'columns',
    route: '/columns',
    feature: 'Columns tool panel',
    instruction: 'Show, hide, reorder, and group columns through the panel.',
  },
  {
    id: 'filters',
    route: '/filters',
    feature: 'Set, multi, and panel filters',
    instruction: 'Apply a Set Filter and a Multi Filter, then clear them from the Filters panel.',
  },
  {
    id: 'selection',
    route: '/selection',
    feature: 'Selection, clipboard, and status bar',
    instruction: 'Drag a cell range, fill it, copy it, and confirm the status bar changes.',
  },
  {
    id: 'ssrm',
    route: '/server-side',
    feature: 'Server-side row model and pagination',
    instruction:
      'Use the pager to jump pages and change page size, then sort a column; verify each request loads cleanly.',
  },
  {
    id: 'ssrm-advanced',
    route: '/server-side-advanced',
    feature: 'SSRM grouping, filtering, and pivot',
    instruction: 'Group server rows, filter, pivot, and expand a server-side group.',
  },
  {
    id: 'viewport',
    route: '/viewport',
    feature: 'Viewport row model',
    instruction: 'Scroll the viewport grid and verify rows update as the visible window changes.',
  },
  {
    id: 'tree',
    route: '/tree-data',
    feature: 'Tree data',
    instruction: 'Expand and collapse branches, then verify leaf names and hierarchy values.',
  },
  {
    id: 'detail',
    route: '/master-detail',
    feature: 'Master / detail',
    instruction: 'Expand a master row and interact with the nested detail grid.',
  },
  {
    id: 'advanced',
    route: '/advanced-filter-find',
    feature: 'Advanced Filter, Find, and Rich Select',
    instruction:
      'Build an expression, search matching cells, and edit with the rich-select editor.',
  },
  {
    id: 'charts',
    route: '/charts',
    feature: 'Integrated charts and sparklines',
    instruction: 'Create a range chart, update grid data, then save and restore the chart.',
  },
  {
    id: 'angular',
    route: '/angular',
    feature: 'Angular consumer API',
    instruction: 'Use the signal-backed API examples and confirm their displayed state updates.',
  },
];

@Component({
  selector: 'lgr-manual-validation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatCardModule],
  styles: `
    .summary {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin: 1.5rem 0;
      padding: 1rem 1.25rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 16px;
      background: var(--mat-sys-surface-container-low);
    }
    progress {
      width: min(28rem, 100%);
      height: 1rem;
    }
    .scenario {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 1rem;
      align-items: start;
      margin: 0.75rem 0;
      padding: 1.1rem;
      border-radius: 16px;
      transition:
        border-color 160ms ease,
        box-shadow 160ms ease,
        transform 160ms ease;
    }
    .scenario:hover {
      border-color: var(--mat-sys-primary);
      box-shadow: 0 5px 16px color-mix(in srgb, var(--mat-sys-primary) 14%, transparent);
      transform: translateY(-1px);
    }
    .scenario input {
      inline-size: 1.2rem;
      block-size: 1.2rem;
      margin-top: 0.25rem;
      accent-color: var(--mat-sys-primary);
    }
    .scenario h2 {
      font-size: 1.05rem;
      margin: 0;
    }
    .scenario p {
      margin: 0.35rem 0 0;
    }
    .complete {
      opacity: 0.65;
    }
    .complete h2 {
      text-decoration: line-through;
    }
    @media (max-width: 700px) {
      .summary {
        align-items: flex-start;
      }
      .scenario {
        grid-template-columns: auto 1fr;
      }
      .scenario a {
        grid-column: 2;
        justify-self: start;
      }
    }
  `,
  template: `
    <div class="lgr-page">
      <h1>Manual validation</h1>
      <p>
        This is a guided smoke test for the completed LibreGrid phases. Each link opens a focused,
        deterministic scenario in this app. Your checklist is stored only in this browser.
      </p>
      <div class="summary" aria-live="polite">
        <progress [value]="completedCount()" [max]="scenarios.length">
          {{ completedCount() }} / {{ scenarios.length }}
        </progress>
        <span>{{ completedCount() }} of {{ scenarios.length }} scenarios complete</span>
        @if (completedCount() > 0) {
          <button mat-button (click)="reset()">Reset</button>
        }
      </div>
      @for (scenario of scenarios; track scenario.id) {
        <mat-card appearance="outlined" class="scenario" [class.complete]="isComplete(scenario.id)">
          <input
            type="checkbox"
            [id]="scenario.id"
            [checked]="isComplete(scenario.id)"
            (change)="toggle(scenario.id)"
            [attr.aria-label]="'Mark ' + scenario.feature + ' complete'"
          />
          <div>
            <h2>
              <label [for]="scenario.id">{{ scenario.feature }}</label>
            </h2>
            <p>{{ scenario.instruction }}</p>
          </div>
          <a mat-stroked-button [routerLink]="scenario.route">Open scenario</a>
        </mat-card>
      }
    </div>
  `,
})
export class ManualValidation {
  protected readonly scenarios = SCENARIOS;
  private readonly completed = signal<ReadonlySet<string>>(this.readCompleted());
  protected readonly completedCount = computed(() => this.completed().size);

  protected isComplete(id: string): boolean {
    return this.completed().has(id);
  }

  protected toggle(id: string): void {
    const next = new Set(this.completed());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.save(next);
    this.completed.set(next);
  }

  protected reset(): void {
    window.localStorage.removeItem(STORAGE_KEY);
    this.completed.set(new Set());
  }

  private readCompleted(): ReadonlySet<string> {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
      return Array.isArray(saved)
        ? new Set(saved.filter((id): id is string => typeof id === 'string'))
        : new Set();
    } catch {
      return new Set();
    }
  }

  private save(completed: ReadonlySet<string>): void {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
  }
}
