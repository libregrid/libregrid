import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import {
  createGrid,
  ModuleRegistry,
  AllCommunityModule,
  BeanStub,
  type GridApi,
  type NamedBean,
  type Module,
} from 'ag-grid-community';

import { EnterpriseCoreModule } from './enterpriseCoreModule';
import { VERSION } from './version';

/**
 * INTEGRATION — a real grid, a real module (standards.md §7.2).
 *
 * This is the Phase 0 gate: EnterpriseCoreModule registers into a live grid
 * and its beans are constructed. Unit tests cannot prove this; only booting
 * the grid can.
 */

const registered: string[] = [];

/** A bean written exactly as api-seams.md §5 prescribes. */
class ProbeService extends BeanStub implements NamedBean {
  beanName = 'libregridProbe' as const;
  public postConstruct(): void {
    registered.push('probe.postConstruct');
  }
}

/**
 * NOTE the distinct `moduleName`.
 *
 * `_registerModule` stores modules KEYED BY `moduleName`:
 *     moduleStore[rowModel][module.moduleName] = module
 *
 * so two modules sharing a name silently overwrite each other — the later
 * registration wins and the earlier module's beans are never constructed.
 * There is no warning. This test file originally used 'EnterpriseCore' here
 * and the probe's beans vanished; see the regression test at the bottom.
 *
 * Consequence for LibreGrid: every package MUST claim a distinct `moduleName`
 * from Community's closed union (api-seams.md §3). Never share one.
 */
const ProbeModule: Module = {
  moduleName: 'SharedAggregation',
  version: VERSION,
  beans: [ProbeService],
};

let api: GridApi | undefined;

beforeAll(() => {
  ModuleRegistry.registerModules([AllCommunityModule, EnterpriseCoreModule, ProbeModule]);
});

afterEach(() => {
  api?.destroy();
  api = undefined;
});

function mountGrid(): GridApi {
  const el = document.createElement('div');
  el.style.width = '600px';
  el.style.height = '400px';
  document.body.appendChild(el);
  return createGrid(el, {
    columnDefs: [{ field: 'country' }, { field: 'sales' }],
    rowData: [
      { country: 'US', sales: 1 },
      { country: 'US', sales: 2 },
      { country: 'FR', sales: 5 },
    ],
  });
}

describe('EnterpriseCoreModule in a live grid', () => {
  it('registers without throwing', () => {
    expect(() => ModuleRegistry.registerModules([EnterpriseCoreModule])).not.toThrow();
  });

  it('declares a version matching the installed ag-grid-community major.minor', () => {
    const [ourMajor, ourMinor] = VERSION.split('.');
    const [agMajor, agMinor] = AllCommunityModule.version.split('.');
    expect(`${ourMajor}.${ourMinor}`).toBe(`${agMajor}.${agMinor}`);
  });

  it('boots a grid and renders rows', () => {
    api = mountGrid();
    expect(api).toBeDefined();
    expect(api.getDisplayedRowCount()).toBe(3);
  });

  it('constructs beans supplied by a LibreGrid module', () => {
    registered.length = 0;
    api = mountGrid();
    expect(registered).toContain('probe.postConstruct');
  });

  it('REGRESSION: modules sharing a moduleName silently overwrite each other', () => {
    // Documents the hazard behind package-architecture.md §7 and api-seams.md §3.
    // Two modules, same name, different beans — only the last registered survives.
    const calls: string[] = [];
    class FirstBean extends BeanStub implements NamedBean {
      beanName = 'libregridDupeA' as const;
      public postConstruct(): void {
        calls.push('first');
      }
    }
    class SecondBean extends BeanStub implements NamedBean {
      beanName = 'libregridDupeB' as const;
      public postConstruct(): void {
        calls.push('second');
      }
    }
    const first: Module = { moduleName: 'SharedPivot', version: VERSION, beans: [FirstBean] };
    const second: Module = { moduleName: 'SharedPivot', version: VERSION, beans: [SecondBean] };

    ModuleRegistry.registerModules([first, second]);
    api = mountGrid();

    // The second registration won; the first module's bean never ran.
    expect(calls).toContain('second');
    expect(calls).not.toContain('first');
  });

  it('confirms Community has no grouping of its own (our groupStage is required)', () => {
    // rowGroup is set, but no groupStage bean is registered — so no grouping
    // happens and all three leaf rows display. This is the premise of Phase 2.
    const el = document.createElement('div');
    document.body.appendChild(el);
    api = createGrid(el, {
      columnDefs: [{ field: 'country', rowGroup: true }, { field: 'sales' }],
      rowData: [
        { country: 'US', sales: 1 },
        { country: 'US', sales: 2 },
        { country: 'FR', sales: 5 },
      ],
    });
    expect(api.getDisplayedRowCount()).toBe(3);
  });
});
