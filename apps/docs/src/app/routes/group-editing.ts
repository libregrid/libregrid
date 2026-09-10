import { DocsDemoComponent } from '../docs/docs-demo';
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import type {
  ColDef,
  GridApi,
  GridOptions,
  GroupRowValueSetterDistribution,
  GroupRowValueSetterParams,
  IAggFuncParams,
} from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';
import { distributeGroupValue } from '@libregrid/row-grouping';
import { DocsFeaturePageComponent } from '../docs';
import { DocsCodeExampleComponent, type DocsCodeExample } from '../docs/docs-code-example';

interface Workshop {
  id: string;
  venue: string;
  craft: string;
  session: string;
  shift: string;
  seats: number;
  minutes: number;
  stations: number;
  priority: number;
  kits: number;
  briefing: string;
}

// Fictional weekend programme. Every example gets its own records.
const workshops = (): Workshop[] => [
  {
    id: 'carve',
    venue: 'Foundry',
    craft: 'Wood',
    session: 'Spoon carving',
    shift: 'Morning',
    seats: 8,
    minutes: 45,
    stations: 2,
    priority: 2,
    kits: 12,
    briefing: 'Bring gloves',
  },
  {
    id: 'print',
    venue: 'Foundry',
    craft: 'Paper',
    session: 'Block printing',
    shift: 'Morning',
    seats: 16,
    minutes: 60,
    stations: 1,
    priority: 1,
    kits: 18,
    briefing: 'Wear an apron',
  },
  {
    id: 'bind',
    venue: 'Foundry',
    craft: 'Paper',
    session: 'Bookbinding',
    shift: 'Evening',
    seats: 24,
    minutes: 75,
    stations: 3,
    priority: 3,
    kits: 6,
    briefing: 'Tools provided',
  },
  {
    id: 'clay',
    venue: 'Orchard',
    craft: 'Clay',
    session: 'Pinch pots',
    shift: 'Morning',
    seats: 10,
    minutes: 60,
    stations: 2,
    priority: 1,
    kits: 6,
    briefing: 'Tools provided',
  },
  {
    id: 'weave',
    venue: 'Orchard',
    craft: 'Fibre',
    session: 'Loom weaving',
    shift: 'Evening',
    seats: 14,
    minutes: 90,
    stations: 2,
    priority: 2,
    kits: 12,
    briefing: 'Bring yarn',
  },
];

const groupColumn: ColDef<Workshop> = { field: 'venue', rowGroup: true, hide: true };
const sessionColumn: ColDef<Workshop> = { field: 'session', minWidth: 170 };
const seatsColumn: ColDef<Workshop> = {
  field: 'seats',
  aggFunc: 'sum',
  editable: true,
  groupRowEditable: true,
  cellEditor: 'agNumberCellEditor',
  cellEditorParams: { min: 0, precision: 0 },
};

function programme(options: GridOptions<Workshop>): GridOptions<Workshop> {
  return {
    rowData: workshops(),
    getRowId: ({ data }) => data.id,
    defaultColDef: { flex: 1, minWidth: 110 },
    autoGroupColumnDef: { headerName: 'Venue / session', minWidth: 190 },
    groupDefaultExpanded: -1,
    animateRows: false,
    ...options,
  };
}

/** Business-named aggregate: the longest session determines the room booking. */
function roomWindow({ values }: IAggFuncParams): number | null {
  const durations = values.filter((value): value is number => typeof value === 'number');
  return durations.length ? Math.max(...durations) : null;
}

/** Reserve seats in booking-priority order, with twelve places per work station. */
function allocateByPriority(
  params: GroupRowValueSetterParams<Workshop>,
  reject: (message: string) => void,
): boolean {
  const leaves = params.node.getAggregatedChildren(params.column, true);
  const ordered = [...leaves].sort((a, b) => a.data!.priority - b.data!.priority);
  const requested = Number(params.newValue);
  const capacity = ordered.reduce((total, leaf) => total + leaf.data!.stations * 12, 0);
  if (!Number.isInteger(requested) || requested < 0 || requested > capacity) {
    reject(`Allocation unchanged. Enter a whole number from 0 to ${capacity} places.`);
    return false;
  }
  let remaining = requested;
  let changed = false;
  for (const leaf of ordered) {
    const allocation = Math.min(remaining, leaf.data!.stations * 12);
    remaining -= allocation;
    if (leaf.setDataValue(params.column, allocation, 'data')) changed = true;
  }
  return changed;
}

function orderWholePacks(params: GroupRowValueSetterParams<Workshop>): boolean {
  const requested = Number(params.newValue);
  if (!Number.isFinite(requested) || requested < 0) return false;
  const sessions = params.aggregatedChildren.length;
  if (!sessions) return false;
  // Each session receives complete packs of six kits.
  const order = Math.ceil(requested / (sessions * 6)) * sessions * 6;
  return distributeGroupValue(
    { ...params, newValue: order },
    { distribution: 'uniform', precision: 0 },
  );
}

@Component({
  selector: 'lgr-group-editing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocsDemoComponent, AgGridAngular, MatButtonModule, DocsFeaturePageComponent, DocsCodeExampleComponent],
  styles: `
    section {
      margin-block: 2.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--mat-sys-outline-variant);
      scroll-margin-top: 5rem;
    }
    p,
    li {
      max-width: 75ch;
      line-height: 1.65;
    }
    p {
      margin-block: 0.75rem 1rem;
    }
    li + li {
      margin-top: 0.5rem;
    }
    h2 {
      margin-block: 0 0.75rem;
      line-height: 1.3;
    }
    h3 {
      margin-block: 2rem 0.75rem;
      line-height: 1.4;
    }
    .demo {
      height: 380px;
      width: 100%;
      display: block;
      margin-block: 1.25rem;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.5rem;
    }
    .controls label {
      font-weight: 600;
    }
    .controls button,
    select {
      min-height: 44px;
    }
    select {
      padding: 0.6rem 0.75rem;
      max-width: 100%;
      color: var(--mat-sys-on-surface);
      background: var(--mat-sys-surface);
      border: 1px solid var(--mat-sys-outline);
      border-radius: 0.35rem;
      font: inherit;
    }
    .exercise {
      box-sizing: border-box;
      max-width: none;
      margin-block: 1.25rem;
      padding: 1rem 1.25rem;
      border-left: 3px solid var(--mat-sys-primary);
      border-radius: 0 0.5rem 0.5rem 0;
      background: var(--mat-sys-surface-container);
    }
    [role='status'] {
      padding: 0.75rem 1rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.5rem;
      font-size: 0.9rem;
    }
    .table-scroll {
      overflow-x: auto;
      margin-block: 1.25rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }
    th,
    td {
      text-align: left;
      padding: 0.9rem 1rem;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      vertical-align: top;
    }
    thead {
      background: var(--mat-sys-surface-container);
    }
    td:nth-child(n + 2) {
      white-space: nowrap;
    }
    caption {
      text-align: left;
      padding-block: 0 0.75rem;
      font-weight: 600;
    }
    nav ul {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1rem;
      list-style: none;
      margin-block: 1.5rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      background: var(--mat-sys-surface-container);
    }
    nav li {
      margin: 0;
    }
    nav a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      text-underline-offset: 0.2em;
    }
    a {
      color: var(--mat-sys-primary);
    }
    code {
      overflow-wrap: anywhere;
    }
    @media (max-width: 600px) {
      section {
        margin-block: 2rem;
      }
      .controls {
        align-items: stretch;
        flex-direction: column;
      }
      .exercise {
        padding: 0.875rem 1rem;
      }
      nav ul {
        flex-direction: column;
      }
    }
  `,
  template: `
    <lgr-docs-feature-page path="group-editing" [audiences]="['Developers', 'Product managers']">
      <p>
        Group editing turns a summary cell into an input that updates its underlying records. In
        this workshop programme, coordinators allocate places across sessions. Choose the allocation
        rule, who can edit and which records receive the change.
      </p>
      <p>
        Double-click an editable cell, enter a value, then press Enter to apply or Escape to cancel.
        Each example has independent data; edits are not saved. Reload to reset all examples, or use
        Reset allocation in the first grid.
      </p>
      <nav aria-label="Group editing guide sections">
        <ul>
          <li><a href="/group-editing#allocation">Choose an allocation rule</a></li>
          <li><a href="/group-editing#permissions">Define editable measures</a></li>
          <li><a href="/group-editing#constraints">Respect capacity</a></li>
          <li><a href="/group-editing#scope">Choose the affected records</a></li>
          <li><a href="/group-editing#integration">Connect your application</a></li>
        </ul>
      </nav>

      <section id="allocation">
        <h2>1. Decide what a new total means</h2>
        <p>
          Foundry starts with 8, 16 and 24 places: 48 in total. Choose how a new total should be
          shared. Changing the rule resets the data for comparison. Orchard is a separate group and
          stays unchanged.
        </p>

        <p class="exercise">
          <strong>Try it:</strong> change Foundry's Seats total to 72. Under Equal shares, every
          session becomes 24. Change one session afterwards: its venue total follows the leaf edit
          too.
        </p>
        <lgr-docs-demo demoId="group-edit-allocation-grid">
<div class="controls">
          <label for="allocation-rule">Allocation rule</label>
          <select id="allocation-rule" (change)="changeStrategy($any($event.target).value)">
            <option value="uniform">Equal shares</option>
            <option value="percentage">Keep proportions</option>
            <option value="increment">Equal additions</option>
            <option value="overwrite">Same value per session</option>
          </select>
          <button matButton="outlined" type="button" (click)="resetAllocation()">
            Reset allocation
          </button>
        </div>
<ag-grid-angular
          class="demo"
          [theme]="theme.gridTheme()"
          [gridOptions]="allocationOptions"
          (gridReady)="allocationApi = $event.api"
          data-testid="group-edit-allocation-grid"
        />
</lgr-docs-demo>
        <div class="table-scroll">
          <table>
            <caption>
              Editing the initial Foundry total to 72
            </caption>
            <thead>
              <tr>
                <th scope="col">Product intent</th>
                <th scope="col">Strategy</th>
                <th scope="col">Session places</th>
                <th scope="col">Resulting total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Give every session an equal share</td>
                <td><code>uniform</code></td>
                <td>24, 24, 24</td>
                <td>72</td>
              </tr>
              <tr>
                <td>Keep the existing 1:2:3 proportions</td>
                <td><code>percentage</code></td>
                <td>12, 24, 36</td>
                <td>72</td>
              </tr>
              <tr>
                <td>Add eight places to each session</td>
                <td><code>increment</code></td>
                <td>16, 24, 32</td>
                <td>72</td>
              </tr>
              <tr>
                <td>Assign 72 to every session</td>
                <td><code>overwrite</code></td>
                <td>72, 72, 72</td>
                <td>216</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <code>overwrite</code> sets individual values, so a sum can exceed the number entered. For
          an average, the built-in rules target the edited average instead.
          <code>percentage</code> uses an equal allocation when the existing total is zero. None of
          these strategies enforces physical capacity; section 3 adds that policy.
        </p>

        <h3>Choose a rounding rule before shipping</h3>
        <p>
          Use <code>precision: 0</code> for whole places. Rounding is balanced across children:
          allocating 73 equally gives 25, 24 and 24. Use <code>precision: 2</code> for hundredths or
          <code>false</code> for unrounded values. If omitted, precision follows the editor; an
          integer step implies zero decimals. Bigint allocations use integers. Display formatting is
          separate: averaging rounded integers can still produce a fraction.
        </p>
      </section>

      <section id="permissions">
        <h2>2. Make editing a deliberate policy</h2>
        <p>
          A session duration and a venue's total places need different rules. Here the shared
          definition adds equal increments to Seats, while Minutes uses the default average rule.
          Briefing has no aggregate: its group cell is empty, but entering text there assigns the
          same instruction to every session. Orchard's group cells are locked by a callback; its
          leaf cells remain editable.
        </p>
        <p class="exercise">
          <strong>Try it:</strong> set Foundry's Minutes to 90. All three sessions become 90
          minutes. Set its Briefing to “Arrive early” and inspect each session. The Minimum stations
          summary deliberately refuses editing.
        </p>
        <lgr-docs-demo demoId="group-edit-policy-grid">
<ag-grid-angular
          class="demo"
          [theme]="theme.gridTheme()"
          [gridOptions]="policyOptions"
          data-testid="group-edit-policy-grid"
        />
</lgr-docs-demo>
        <p>
          <code>groupRowEditable</code> controls group cells; <code>editable</code>
          controls leaves. A group callback can inspect the node and application context.
          <code>groupRowValueSetter</code> chooses what happens to descendants and also applies to
          API writes, even when the group editor is disabled. Editability is a UI rule, so enforce
          permissions separately when accepting saved changes.
        </p>
        <p>
          With no setter specified, <code>sum</code> uses equal shares and <code>avg</code> or an
          unaggregated field uses overwrite. Setting the setter to <code>true</code> selects
          built-in handling; <code>false</code> disables group editing. An options object can
          disable distribution with <code>false</code> or <code>null</code>, overriding an otherwise
          editable group cell.
        </p>
        <lgr-docs-code-example
          heading="Share rules and override one measure"
          [examples]="policyCode"
        />
        <p>
          The two options objects are merged, including entries inside the distribution record. The
          column's value wins; omitted values inherit. A callback replaces the entire default
          setter. A record entry may be a strategy, an options object, a callback,
          <code>true</code>, or <code>false</code>/<code>null</code>.
        </p>
        <h3>Do not promise that every summary can be edited</h3>
        <p>
          A count does not describe which values to write, and changing a minimum does not identify
          which records should change. By default, <code>count</code>, <code>min</code>,
          <code>max</code>, <code>first</code>, <code>last</code> and custom aggregates therefore
          have no group editor. An explicit overwrite strategy or a named record entry can enable
          them. Writing a value into counted records still does not create or delete records: the
          count may stay unchanged.
        </p>
        <p>
          Room window uses our registered <code>roomWindow</code> function: the longest session
          determines the booking length. In this example, editing that summary intentionally makes
          all session durations equal. The <code>default</code> fallback supplies this overwrite
          rule for the custom aggregate. A fallback does not unlock the disabled built-ins; those
          require explicit selection. Top-level <code>distribution: true</code> enables custom
          functions, but also leaves those disabled built-ins locked.
        </p>
      </section>

      <section id="constraints">
        <h2>3. Translate operational constraints into writes</h2>
        <h3>Allocate by equipment rather than current bookings</h3>
        <p>
          Allocate places in proportion to work stations, not existing bookings.
          <code>getValue</code> reads the station count; <code>setValue</code> writes the new seat
          count. Both columns stay visible so planners can check the result.
        </p>
        <p class="exercise">
          <strong>Try it:</strong> enter 60 for Foundry's Seats. Its 2:1:3 station counts produce
          20, 10 and 30 places. Existing seat counts do not influence this calculation.
        </p>
        <lgr-docs-demo demoId="group-edit-equipment-grid">
<ag-grid-angular
          class="demo"
          [theme]="theme.gridTheme()"
          [gridOptions]="equipmentOptions"
          data-testid="group-edit-equipment-grid"
        />
</lgr-docs-demo>
        <lgr-docs-code-example heading="Change the allocation basis" [examples]="equipmentCode" />
        <h3>Fill priority sessions without exceeding capacity</h3>
        <p>
          Fill priority 1 first, then 2, then 3, allowing twelve places per station. The custom
          callback validates the whole request before writing: an over-capacity request leaves all
          sessions unchanged. The status below the grid explains a rejection.
        </p>
        <p class="exercise">
          <strong>Try it:</strong> enter 50 for Foundry's Seats. Spoon carving receives 24, Block
          printing 12 and Bookbinding 14. A request for 90 is rejected because the venue has only 72
          places. Separately, enter 50 in Kits: ordering whole packs of six for each session raises
          the order to 54, giving each session 18 kits.
        </p>
        <lgr-docs-demo demoId="group-edit-capacity-grid">
<ag-grid-angular
          class="demo"
          [theme]="theme.gridTheme()"
          [gridOptions]="capacityOptions"
          data-testid="group-edit-capacity-grid"
        />
        <p role="status" data-testid="capacity-status">{{ capacityMessage() }}</p>
</lgr-docs-demo>
        <lgr-docs-code-example
          heading="Implement a business allocation"
          [examples]="capacityCode"
        />
        <p>
          A setter callback receives the edited node, column, old and new values,
          <code>valueChanged</code>, <code>eventSource</code>, API and context. Group data may be
          absent; use the supplied children or the node API. Return <code>true</code> when records
          changed and <code>false</code> otherwise. A callback-only column needs neither a field nor
          a regular value setter.
        </p>
      </section>

      <section id="scope">
        <h2>4. Be precise about who receives the change</h2>
        <h3>An equal share at each level is not an equal share per session</h3>
        <p>
          Foundry has two craft groups: Wood contains one session, Paper contains two. The built-in
          allocator visits immediate children and repeats the rule when a child is another group.
          Setting Foundry to 80 gives each craft 40: Spoon carving gets 40, while the two Paper
          sessions get 20 each. A product that promises equal shares per session should instead
          select all descendant leaves in its custom callback, as the capacity example does.
        </p>
        <lgr-docs-demo demoId="group-edit-nested-grid">
<ag-grid-angular
          class="demo"
          [theme]="theme.gridTheme()"
          [gridOptions]="nestedOptions"
          data-testid="group-edit-nested-grid"
        />
</lgr-docs-demo>
        <h3>A pivot cell is an allocation boundary</h3>
        <p class="exercise">
          <strong>Try it:</strong> change Foundry's Morning pivot total from 24 to 40. Only Spoon
          carving and Block printing receive 20 each. Foundry's Evening total stays 24, and Orchard
          is unaffected.
        </p>
        <lgr-docs-demo demoId="group-edit-pivot-grid">
<ag-grid-angular
          class="demo"
          [theme]="theme.gridTheme()"
          [gridOptions]="pivotOptions"
          data-testid="group-edit-pivot-grid"
        />
</lgr-docs-demo>
        <p>
          This view groups sessions by venue and craft. Register <code>PivotModule</code>
          in addition to the grouping modules, set
          <code>pivotMode: true</code> and mark Shift with <code>pivot: true</code>. The result
          column identifies the matching records for distribution. Custom callbacks should keep that
          column when obtaining children; selecting every row in the venue would spill an edit into
          the other shift.
        </p>
        <h3>Use an existing programme hierarchy</h3>
        <p>
          This tree uses event → activity → station paths instead of grouping fields. Register
          <code>TreeDataModule</code>, provide <code>getDataPath</code> and stable row IDs, and use
          the same group-editing column configuration. This example supplies leaf records only; the
          intermediate rows are generated.
        </p>
        <p class="exercise">
          <strong>Try it:</strong> change Open studio's Places to 64. Carving and Printing each
          receive 32. The two printing stations receive 16 each, while the single carving station
          receives 32.
        </p>
        <lgr-docs-demo demoId="group-edit-tree-grid">
<ag-grid-angular
          class="demo"
          [theme]="theme.gridTheme()"
          [gridOptions]="treeOptions"
          data-testid="group-edit-tree-grid"
        />
</lgr-docs-demo>
        <p>
          <code>params.aggregatedChildren</code> contains immediate contributors.
          <code>node.getAggregatedChildren(column, true)</code> reaches descendant leaves. The scope
          follows aggregation, including filtering configuration;
          <code>suppressAggFilteredOnly: true</code> includes filtered-out records. Collapsing a
          group does not exclude its children. These child APIs require the Client-Side Row Model;
          other row models return an empty collection.
        </p>
      </section>

      <section id="integration">
        <h2>5. Keep allocations, regrouping and saving distinct</h2>
        <p>
          Changing a session's venue is a different operation from changing its allocation. Here,
          <code>refreshAfterGroupEdit: true</code> rebuilds the grouping after a committed venue
          edit. Stable <code>getRowId</code> values identify sessions independently of the venue
          they belong to.
        </p>
        <p class="exercise">
          <strong>Try it:</strong> change Spoon carving's Venue to Orchard. The row moves there;
          Foundry's total becomes 40 and Orchard's becomes 32. Without this option, the record
          changes but waits for a later grouping refresh to move.
        </p>
        <lgr-docs-demo demoId="group-edit-move-grid">
<ag-grid-angular
          class="demo"
          [theme]="theme.gridTheme()"
          [gridOptions]="moveOptions"
          data-testid="group-edit-move-grid"
        />
</lgr-docs-demo>
        <h3>Agree on the application contract</h3>
        <ul>
          <li>
            <strong>Scope:</strong> tell users whether an edit includes collapsed or filtered-out
            sessions. Preview the affected records when that distinction matters.
          </li>
          <li>
            <strong>Persistence:</strong> these demos mutate browser records. Collect changed leaves
            by stable ID and save them through your application's API. A group edit can emit several
            leaf change events; do not assume it is one server request.
          </li>
          <li>
            <strong>Validation:</strong> check authorisation, capacity and concurrent updates on the
            server too. The grid cannot guarantee a business constraint against another planner's
            edits.
          </li>
          <li>
            <strong>Recovery:</strong> define cancel, save failure and undo behaviour. Do not assume
            a distributed edit is a single undo operation; verify that interaction with your chosen
            editing and persistence configuration.
          </li>
          <li>
            <strong>Scale:</strong> group and leaf edits refresh summaries automatically. LibreGrid
            currently recomputes all aggregate columns; test large programmes before promising a
            latency target.
          </li>
        </ul>
      </section>
    </lgr-docs-feature-page>
  `,
})
export class GroupEditingDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly capacityMessage = signal('Capacity is checked before any session is changed.');
  protected allocationApi: GridApi<Workshop> | undefined;
  private strategy: GroupRowValueSetterDistribution = 'uniform';

  private allocationColumns(): ColDef<Workshop>[] {
    return [
      groupColumn,
      sessionColumn,
      { ...seatsColumn, groupRowValueSetter: { distribution: this.strategy, precision: 0 } },
    ];
  }

  protected changeStrategy(strategy: GroupRowValueSetterDistribution): void {
    this.strategy = strategy;
    this.allocationApi?.setGridOption('columnDefs', this.allocationColumns());
    this.resetAllocation();
  }

  protected resetAllocation(): void {
    this.allocationApi?.stopEditing(true);
    this.allocationApi?.setGridOption('rowData', workshops());
  }

  protected readonly allocationOptions = programme({ columnDefs: this.allocationColumns() });
  protected readonly policyOptions = programme({
    aggFuncs: { roomWindow },
    defaultColDef: {
      flex: 1,
      minWidth: 110,
      editable: true,
      groupRowEditable: ({ node }) => node.key === 'Foundry',
      groupRowValueSetter: {
        precision: 0,
        distribution: { sum: 'increment', min: false },
        default: 'overwrite',
      },
    },
    columnDefs: [
      { ...groupColumn, editable: false },
      { ...sessionColumn, editable: false },
      { field: 'seats', aggFunc: 'sum' },
      {
        field: 'minutes',
        aggFunc: 'avg',
        groupRowValueSetter: { distribution: { avg: 'overwrite' } },
      },
      { field: 'briefing', minWidth: 150 },
      { field: 'stations', headerName: 'Minimum stations', aggFunc: 'min', minWidth: 160 },
      {
        field: 'minutes',
        colId: 'roomWindow',
        headerName: 'Room window',
        aggFunc: 'roomWindow',
        minWidth: 145,
      },
    ],
  });
  protected readonly equipmentOptions = programme({
    columnDefs: [
      groupColumn,
      sessionColumn,
      { field: 'stations' },
      {
        ...seatsColumn,
        groupRowValueSetter: {
          distribution: 'percentage',
          precision: 0,
          getValue: ({ data }) => data?.stations ?? 0,
          setValue: ({ node, value }) => node.setDataValue('seats', value, 'data'),
        },
      },
    ],
  });
  protected readonly capacityOptions = programme({
    rowData: workshops().map((session) => ({
      ...session,
      seats: Math.min(session.seats, session.stations * 12),
    })),
    columnDefs: [
      groupColumn,
      sessionColumn,
      { field: 'stations' },
      { field: 'priority' },
      {
        ...seatsColumn,
        editable: false,
        groupRowValueSetter: (params) => {
          this.capacityMessage.set('Capacity is checked before any session is changed.');
          return allocateByPriority(params, (message) => this.capacityMessage.set(message));
        },
      },
      {
        field: 'kits',
        aggFunc: 'sum',
        groupRowEditable: true,
        groupRowValueSetter: orderWholePacks,
      },
    ],
  });
  protected readonly nestedOptions = programme({
    columnDefs: [
      groupColumn,
      { field: 'craft', rowGroup: true, hide: true },
      sessionColumn,
      seatsColumn,
    ],
  });
  protected readonly pivotOptions = programme({
    pivotMode: true,
    columnDefs: [
      groupColumn,
      { field: 'craft', rowGroup: true, hide: true },
      { field: 'shift', pivot: true },
      seatsColumn,
    ],
  });
  protected readonly treeOptions: GridOptions<{ id: string; path: string[]; places: number }> = {
    treeData: true,
    getDataPath: ({ path }) => path,
    getRowId: ({ data }) => data.id,
    rowData: [
      { id: 'bench', path: ['Open studio', 'Carving', 'Bench'], places: 12 },
      { id: 'press', path: ['Open studio', 'Printing', 'Press'], places: 8 },
      { id: 'rollers', path: ['Open studio', 'Printing', 'Rollers'], places: 16 },
    ],
    columnDefs: [
      {
        field: 'places',
        aggFunc: 'sum',
        groupRowEditable: true,
        groupRowValueSetter: { precision: 0 },
        flex: 1,
      },
    ],
    groupDefaultExpanded: -1,
    autoGroupColumnDef: { headerName: 'Event / activity / station', minWidth: 300 },
  };
  protected readonly moveOptions = programme({
    refreshAfterGroupEdit: true,
    columnDefs: [{ ...groupColumn, hide: false, editable: true }, sessionColumn, seatsColumn],
  });

  protected readonly policyCode: DocsCodeExample[] = [
    {
      id: 'policy',
      label: 'Column policy',
      language: 'TypeScript',
      description:
        'Add these options to the grid setup. The custom aggregate models a room booking window.',
      code: `import type { GridOptions } from 'ag-grid-community';

export const bookingPolicy: GridOptions = {
  aggFuncs: {
    roomWindow: ({ values }) => {
      const durations = values.filter(v => typeof v === 'number');
      return durations.length ? Math.max(...durations) : null;
    },
  },
  defaultColDef: {
    editable: true,
    groupRowEditable: ({ node }) => node.key === 'Foundry',
    groupRowValueSetter: {
      precision: 0,
      distribution: { sum: 'increment', min: false },
      default: 'overwrite',
    },
  },
  columnDefs: [
    { field: 'venue', rowGroup: true, hide: true, editable: false },
    { field: 'seats', aggFunc: 'sum' },
    { field: 'minutes', aggFunc: 'avg',
      groupRowValueSetter: { distribution: { avg: 'overwrite' } } },
    { field: 'briefing' },
    { field: 'stations', aggFunc: 'min' },
    { field: 'minutes', colId: 'roomWindow', aggFunc: 'roomWindow' },
  ],
};`,
    },
  ];
  protected readonly equipmentCode: DocsCodeExample[] = [
    {
      id: 'equipment',
      label: 'Allocation adapter',
      language: 'TypeScript',
      description:
        'Use this column in a single-level venue group. Stations provide weights; seats receive the result.',
      code: `import type { ColDef } from 'ag-grid-community';

export const equipmentAllocation: ColDef = {
  field: 'seats', aggFunc: 'sum', groupRowEditable: true,
  groupRowValueSetter: {
    distribution: 'percentage', precision: 0,
    getValue: ({ data }) => data?.stations ?? 0,
    setValue: ({ node, value }) => node.setDataValue('seats', value, 'data'),
  },
};`,
    },
  ];
  protected readonly capacityCode: DocsCodeExample[] = [
    {
      id: 'priority',
      label: 'Priority and capacity',
      language: 'TypeScript',
      description:
        'Assign this function to the Seats column’s groupRowValueSetter. Lower priority numbers are served first.',
      code: `import type { GroupRowValueSetterParams } from 'ag-grid-community';

export function reservePlaces(params: GroupRowValueSetterParams) {
  const sessions = [...params.node.getAggregatedChildren(params.column, true)]
    .sort((a, b) => a.data.priority - b.data.priority);
  const requested = Number(params.newValue);
  const capacity = sessions.reduce((n, row) => n + row.data.stations * 12, 0);
  if (!Number.isInteger(requested) || requested < 0 || requested > capacity) return false;

  let remaining = requested;
  let changed = false;
  for (const row of sessions) {
    const seats = Math.min(remaining, row.data.stations * 12);
    remaining -= seats;
    if (row.setDataValue(params.column, seats, 'data')) changed = true;
  }
  return changed;
}`,
    },
    {
      id: 'packs',
      label: 'Reuse the distributor',
      language: 'TypeScript',
      description:
        'Assign this callback to Kits in a single-level group. Every session receives whole packs of six.',
      code: `import type { GroupRowValueSetterParams } from 'ag-grid-community';
import { distributeGroupValue } from '@libregrid/row-grouping';

export function orderPacks(params: GroupRowValueSetterParams) {
  const requested = Number(params.newValue);
  const sessions = params.aggregatedChildren.length;
  if (!sessions || !Number.isFinite(requested) || requested < 0) return false;
  const order = Math.ceil(requested / (sessions * 6)) * sessions * 6;
  return distributeGroupValue(
    { ...params, newValue: order },
    { distribution: 'uniform', precision: 0 },
  );
}`,
    },
  ];
}
