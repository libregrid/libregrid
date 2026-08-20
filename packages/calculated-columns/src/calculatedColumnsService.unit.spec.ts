/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgColumn, type ColDef } from 'ag-grid-community';
import { makeBeanHarness, type BeanHarness } from '@libregrid/core/testing';
import { CalculatedColumnsService } from './calculatedColumnsService';
import { FormulaError } from './expression';

interface UserEntry {
  properties?: ColDef;
  created?: boolean;
  parentGroupId?: string | null;
  removed?: boolean;
}

interface FakeUserColumnSvc {
  entries: Map<string, UserEntry>;
  ownerEnabled: (() => boolean) | null;
  ownerProps: readonly string[] | null;
  isDeclared: ReturnType<typeof vi.fn>;
  getEntry: (colId: string) => UserEntry | undefined;
  forEachEntry: (cb: (entry: UserEntry, colId: string) => void) => void;
  setCreatedColumn: ReturnType<typeof vi.fn>;
  setOverride: ReturnType<typeof vi.fn>;
  removeColumn: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  setState: ReturnType<typeof vi.fn>;
  registerOwner: ReturnType<typeof vi.fn>;
}

function makeUserSvc(): FakeUserColumnSvc {
  const entries = new Map<string, UserEntry>();
  return {
    entries,
    ownerEnabled: null,
    ownerProps: null,
    isDeclared: vi.fn(() => false),
    getEntry: (colId) => entries.get(colId),
    forEachEntry: (cb) => {
      for (const [colId, entry] of entries) cb(entry, colId);
    },
    setCreatedColumn: vi.fn((colId: string, properties: ColDef, parentGroupId: string | null) => {
      entries.set(colId, { properties, created: true, parentGroupId });
    }),
    setOverride: vi.fn((colId: string, properties: ColDef) => {
      entries.set(colId, { properties });
    }),
    removeColumn: vi.fn((colId: string) => {
      entries.delete(colId);
    }),
    clear: vi.fn(() => {
      const had = entries.size > 0;
      entries.clear();
      return had;
    }),
    setState: vi.fn(),
    registerOwner: vi.fn((enabled: () => boolean, props: readonly string[]) => {
      (makeUserSvc as unknown as { __last?: FakeUserColumnSvc }).__last!.ownerEnabled = enabled;
      (makeUserSvc as unknown as { __last?: FakeUserColumnSvc }).__last!.ownerProps = props;
    }),
  };
}

interface ColumnModelLike {
  getNonPivotColById: ReturnType<typeof vi.fn>;
  colDefList: AgColumn[];
  rebuildCols: ReturnType<typeof vi.fn>;
}

function makeColumn(colId: string, calculatedExpression?: string): AgColumn {
  const col = new AgColumn({ colId, field: colId } as ColDef, null, colId, true, 'user');
  col.calculatedExpression = calculatedExpression;
  return col;
}

interface FormulaSvcLike {
  validateExpression: ReturnType<typeof vi.fn>;
  forgetColumn: ReturnType<typeof vi.fn>;
}

interface Harness {
  bean: CalculatedColumnsService;
  harness: BeanHarness<CalculatedColumnsService>;
  userSvc: FakeUserColumnSvc;
  colModel: ColumnModelLike;
  formula: FormulaSvcLike;
  registered: Array<{ name: string; factory: (params: unknown) => unknown }>;
  eRootDiv: HTMLDivElement;
  dispatched: unknown[];
}

function makeService(gridOptions: Record<string, unknown> = {}, extra: { colDefList?: AgColumn[] } = {}): Harness {
  const userSvc = makeUserSvc();
  (makeUserSvc as unknown as { __last?: FakeUserColumnSvc }).__last = userSvc;
  const colModel: ColumnModelLike = {
    getNonPivotColById: vi.fn((colId: string) =>
      colModel.colDefList.find((c) => c.colId === colId),
    ),
    colDefList: extra.colDefList ?? [],
    rebuildCols: vi.fn(),
  };
  const formula: FormulaSvcLike = {
    validateExpression: vi.fn(() => null),
    forgetColumn: vi.fn(),
  };
  const registered: Harness['registered'] = [];
  const eRootDiv = document.createElement('div');
  document.body.appendChild(eRootDiv);
  const harness = makeBeanHarness(CalculatedColumnsService, {
    gridOptions: gridOptions as never,
    beans: {
      userColumnSvc: userSvc,
      colModel,
      formula,
      eRootDiv,
      environment: { getDefaultColumnMinWidth: () => 100 },
      menuItemMapper: {
        registry: {
          register: (contribution: { name: string; factory: (params: unknown) => unknown }) => {
            registered.push(contribution);
          },
        },
      },
    },
  });
  const dispatched: unknown[] = [];
  const eventSvc = harness.beans.eventSvc as unknown as { addEventListener(t: string, fn: (e: unknown) => void): void };
  for (const type of ['calculatedColumnCreated', 'calculatedColumnExpressionChanged', 'calculatedColumnRemoved', 'calculatedColumnValidationStateChanged']) {
    eventSvc.addEventListener(type, (e) => dispatched.push(e));
  }
  return { bean: harness.bean, harness, userSvc, colModel, formula, registered, eRootDiv, dispatched };
}

function createBuild(columns: AgColumn[]): Parameters<CalculatedColumnsService['contributeTo']>[0] {
  const colsByKey = new Map<string | ColDef, AgColumn>();
  for (const col of columns) {
    colsByKey.set(col.colId, col);
    colsByKey.set(col.getColDef(), col);
    if (col.field) colsByKey.set(col.field, col);
  }
  return {
    columnTree: [...columns],
    treeDepth: 0,
    columns: [...columns],
    allGroups: [],
    marryChildren: false,
    groupsById: new Map(),
    colsByKey,
    source: 'api',
    newColDefs: false,
    buildToken: 7,
    wrapperCache: null,
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('CalculatedColumnsService (unit)', () => {
  it('registers the user-layer owner and both menu items in postConstruct', () => {
    const { userSvc, registered } = makeService({ calculatedColumns: true });
    expect(userSvc.ownerEnabled).not.toBeNull();
    expect(userSvc.ownerEnabled!()).toBe(true);
    expect(userSvc.ownerProps).toEqual(['calculatedExpression', 'cellDataType', 'columnGroupShow', 'headerName']);
    expect(registered.map((r) => r.name)).toEqual(['calculatedColumn', 'calculatedColumnRemove']);
  });

  it('enables only when the calculatedColumns option is truthy', () => {
    expect(makeService({}).bean.isEnabled()).toBe(false);
    expect(makeService({ calculatedColumns: false }).bean.isEnabled()).toBe(false);
    expect(makeService({ calculatedColumns: true }).bean.isEnabled()).toBe(true);
    expect(makeService({ calculatedColumns: { applyMode: 'deferred' } }).bean.isEnabled()).toBe(true);
  });

  it('splices created columns into the build at their anchor (reuse path)', () => {
    const a = makeColumn('a');
    const b = makeColumn('b');
    const dyn = makeColumn('lgr-calc-1');
    dyn.buildToken = 3; // already claimed by a previous build → reusable
    const build = createBuild([a, b]);
    build.colsByKey.set('lgr-calc-1', dyn);

    const h = makeService({ calculatedColumns: true }, { colDefList: [a, b, dyn] });
    (dyn as unknown as { preWireBeans?: (b: unknown) => void }).preWireBeans?.(h.harness.beans);
    // Give the reused column the exact definition the splice will pass, so
    // setColDef takes its merge-equal early return (no event dispatch on a
    // bare column).
    const dynDef = { calculatedExpression: '[a] + 1', headerName: 'Calc', colId: 'lgr-calc-1' } as ColDef;
    dyn.colDef = dynDef;
    dyn.userProvidedColDef = dynDef;
    dyn.calculatedExpression = '[a] + 1';
    h.userSvc.entries.set('lgr-calc-1', {
      created: true,
      properties: { calculatedExpression: '[a] + 1', headerName: 'Calc' },
      parentGroupId: null,
    });
    h.bean.dynamicCols?.set('lgr-calc-1', {
      properties: { calculatedExpression: '[a] + 1' },
      parentGroupId: null,
      anchorColId: 'a',
    });
    h.bean.contributeTo(build);

    expect(build.columnTree.map((c) => (c as AgColumn).colId)).toEqual(['a', 'lgr-calc-1', 'b']);
    expect(build.columns.map((c) => c.colId)).toEqual(['a', 'lgr-calc-1', 'b']);
    expect(dyn.anchoredToColId).toBe('a');
    expect(build.colsByKey.get('lgr-calc-1')).toBe(dyn);
    h.harness.destroy();
  });

  it('ignores user-layer entries without calculated expressions', () => {
    const a = makeColumn('a');
    const build = createBuild([a]);
    const h = makeService({ calculatedColumns: true }, { colDefList: [a] });
    h.userSvc.entries.set('other', { created: true, properties: { headerName: 'X' } });
    h.userSvc.entries.set('gone', { created: true, removed: true, properties: { calculatedExpression: '1' } });
    h.bean.contributeTo(build);
    expect(build.columnTree.length).toBe(1);
    h.harness.destroy();
  });

  it('skips the splice entirely when the feature is disabled', () => {
    const a = makeColumn('a');
    const build = createBuild([a]);
    const h = makeService({ calculatedColumns: false }, { colDefList: [a] });
    h.userSvc.entries.set('lgr-calc-1', {
      created: true,
      properties: { calculatedExpression: '1' },
    });
    h.bean.contributeTo(build);
    expect(build.columnTree.length).toBe(1);
    h.harness.destroy();
  });

  it('parks created columns on reset and restores them from state', () => {
    const h = makeService({ calculatedColumns: true });
    const props = { calculatedExpression: '[a] + 1' };
    h.bean.dynamicCols?.set('lgr-calc-1', { properties: props, parentGroupId: null, anchorColId: 'a' });

    expect(h.bean.resetDynamicColumnDefs(true)).toBe(true);
    expect(h.bean.dynamicCols?.size).toBe(0);

    const changed = h.bean.restoreDynamicColumnDefs([{ colId: 'lgr-calc-1' }]);
    expect(changed).toBe(true);
    expect(h.userSvc.setCreatedColumn).toHaveBeenCalledWith('lgr-calc-1', props, null);
    expect(h.bean.dynamicCols?.has('lgr-calc-1')).toBe(true);
    h.harness.destroy();
  });

  it('returns false from reset when there is nothing to reset', () => {
    const h = makeService({ calculatedColumns: true });
    expect(h.bean.resetDynamicColumnDefs()).toBe(false);
    expect(h.bean.resetDynamicColumnDefs(true)).toBe(false);
    h.harness.destroy();
  });

  it('adopts created calc columns from the user layer', () => {
    const h = makeService({ calculatedColumns: true });
    expect(h.bean.adoptUserColumns()).toBe(false);
    h.userSvc.entries.set('lgr-calc-1', {
      created: true,
      properties: { calculatedExpression: '1' },
      parentGroupId: null,
    });
    h.userSvc.entries.set('plain', { created: true, properties: { headerName: 'X' } });
    expect(h.bean.adoptUserColumns()).toBe(true);
    expect(h.bean.adoptUserColumns()).toBe(false); // idempotent
    expect(h.bean.dynamicCols?.has('lgr-calc-1')).toBe(true);
    h.harness.destroy();
  });

  it('adopts nothing when disabled', () => {
    const h = makeService({ calculatedColumns: false });
    h.userSvc.entries.set('lgr-calc-1', { created: true, properties: { calculatedExpression: '1' } });
    expect(h.bean.adoptUserColumns()).toBe(false);
    h.harness.destroy();
  });

  it('rebuilds the column model and re-validates on refreshDynamicColumns', () => {
    const calc = makeColumn('calc', '[a] +');
    calc.isCalculatedCol = true;
    const h = makeService({ calculatedColumns: true }, { colDefList: [calc] });
    h.bean.refreshDynamicColumns('api');
    expect(h.colModel.rebuildCols).toHaveBeenCalledWith('api');
    expect(h.formula.validateExpression).toHaveBeenCalledWith('[a] +', expect.anything());
    h.harness.destroy();
  });

  it('dispatches validation flip events when validity changes', () => {
    const calc = makeColumn('calc', '[a] +');
    calc.isCalculatedCol = true;
    const h = makeService({ calculatedColumns: true }, { colDefList: [calc] });
    h.bean.refreshDynamicColumns('api');
    expect(h.dispatched).toHaveLength(0); // baseline: no flip

    h.formula.validateExpression.mockReturnValue(new FormulaError('#PARSE!', 'x'));
    h.bean.refreshDynamicColumns('api');
    expect(h.dispatched).toHaveLength(1);
    expect(h.dispatched[0]).toMatchObject({ type: 'calculatedColumnValidationStateChanged', valid: false, reason: 'invalidExpression' });

    h.formula.validateExpression.mockReturnValue(null);
    h.bean.refreshDynamicColumns('api');
    expect(h.dispatched).toHaveLength(2);
    expect(h.dispatched[1]).toMatchObject({ valid: true });
    h.harness.destroy();
  });

  it('maps unknown-reference validation failures to the right reason', () => {
    const calc = makeColumn('calc', '[nope]');
    calc.isCalculatedCol = true;
    const h = makeService({ calculatedColumns: true }, { colDefList: [calc] });
    h.bean.refreshDynamicColumns('api'); // baseline: valid, no event
    h.formula.validateExpression.mockReturnValue(new FormulaError('#REF!', 'x'));
    h.bean.refreshDynamicColumns('api'); // flip to invalid
    expect(h.dispatched[0]).toMatchObject({ valid: false, reason: 'unknownReference' });
    h.formula.validateExpression.mockReturnValue(null);
    h.bean.refreshDynamicColumns('api'); // flip back to valid
    expect(h.dispatched[1]).toMatchObject({ valid: true });
    h.harness.destroy();
  });

  it('removes a created column and dispatches the removed event', () => {
    const calc = makeColumn('lgr-calc-1', '[a] + 1');
    const h = makeService({ calculatedColumns: true }, { colDefList: [calc] });
    h.bean.removeCalculatedColumn(calc);
    expect(h.userSvc.removeColumn).toHaveBeenCalledWith('lgr-calc-1', false);
    expect(h.formula.forgetColumn).toHaveBeenCalledWith(calc);
    expect(h.colModel.rebuildCols).toHaveBeenCalledWith('calculatedColumn');
    expect(h.dispatched).toHaveLength(1);
    expect(h.dispatched[0]).toMatchObject({ type: 'calculatedColumnRemoved', expression: '[a] + 1' });
    h.harness.destroy();
  });

  it('ignores removeCalculatedColumn for non-calculated columns', () => {
    const plain = makeColumn('a');
    const h = makeService({ calculatedColumns: true }, { colDefList: [plain] });
    h.bean.removeCalculatedColumn(plain);
    h.bean.removeCalculatedColumn(undefined);
    expect(h.userSvc.removeColumn).not.toHaveBeenCalled();
    h.harness.destroy();
  });

  it('menu factories offer Add for plain columns and Edit/Remove for calc columns', () => {
    const h = makeService({ calculatedColumns: true });
    const plain = makeColumn('a');
    const calc = makeColumn('calc', '1');
    calc.isCalculatedCol = true;

    const calculatedColumn = h.registered.find((r) => r.name === 'calculatedColumn')!;
    const add = calculatedColumn.factory({ column: plain }) as { name?: string; action?: () => void };
    expect(add?.name).toBe('Add Calculated Column');

    const sub = calculatedColumn.factory({ column: calc }) as { name?: string; subMenu?: Array<{ name?: string }> };
    expect(sub?.name).toBe('Calculated Column');
    expect(sub?.subMenu?.map((i) => i.name)).toEqual(['Edit Calculated Column', 'Remove Calculated Column']);

    const removeItem = h.registered.find((r) => r.name === 'calculatedColumnRemove')!;
    expect(removeItem.factory({ column: calc })).not.toBeNull();
    expect(removeItem.factory({ column: plain })).toBeNull();
    expect(removeItem.factory({ column: null })).toBeNull();
    h.harness.destroy();
  });

  it('menu factories return null when the feature is disabled', () => {
    const h = makeService({ calculatedColumns: false });
    const plain = makeColumn('a');
    expect(h.registered.find((r) => r.name === 'calculatedColumn')!.factory({ column: plain })).toBeNull();
    h.harness.destroy();
  });

  it('opens the add dialog, records the user-layer entry and dispatches created', () => {
    const a = makeColumn('a');
    const h = makeService({ calculatedColumns: true }, { colDefList: [a] });
    // The created column only resolves after the dialog has recorded it.
    const live = new Map<string, AgColumn>();
    h.userSvc.setCreatedColumn.mockImplementation((colId: string, properties: ColDef) => {
      h.userSvc.entries.set(colId, { properties, created: true, parentGroupId: null });
      const created = makeColumn(colId, '');
      created.isCalculatedCol = true;
      live.set(colId, created);
    });
    h.colModel.getNonPivotColById.mockImplementation((colId: string) => live.get(colId));

    h.bean.openCalculatedColumnDialog(a, 'add', true);

    expect(h.userSvc.setCreatedColumn).toHaveBeenCalledWith(
      'lgr-calc-1',
      { calculatedExpression: '', headerName: 'Calculated Column 1' },
      null,
    );
    expect(h.dispatched).toHaveLength(1);
    expect(h.dispatched[0]).toMatchObject({ type: 'calculatedColumnCreated', expression: '' });
    expect(document.querySelector('.lgr-calc-dialog')).not.toBeNull();
    h.harness.destroy();
  });

  it('opens an add dialog as a centered modal', () => {
    const source = makeColumn('revenue');
    const created = makeColumn('lgr-calc-1', '');
    created.isCalculatedCol = true;
    const h = makeService({ calculatedColumns: true }, { colDefList: [source] });
    h.userSvc.setCreatedColumn.mockImplementation((colId: string, properties: ColDef) => {
      h.userSvc.entries.set(colId, { properties, created: true, parentGroupId: null });
      h.colModel.colDefList.push(created);
    });

    h.bean.openCalculatedColumnDialog(source, 'add', true);

    const dialog = document.querySelector<HTMLElement>('.lgr-calc-dialog')!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.querySelector('.lgr-calc-dialog-overlay')).not.toBeNull();
    h.harness.destroy();
  });

  it('rolls back when the created column cannot be materialised', () => {
    const a = makeColumn('a');
    const h = makeService({ calculatedColumns: true }, { colDefList: [a] });
    h.colModel.getNonPivotColById.mockReturnValue(undefined);
    h.bean.openCalculatedColumnDialog(a, 'add', false);
    expect(h.userSvc.removeColumn).toHaveBeenCalledWith('lgr-calc-1', false);
    expect(h.dispatched).toHaveLength(0);
    expect(document.querySelector('.lgr-calc-dialog')).toBeNull();
    h.harness.destroy();
  });

  it('applies dialog edits through the user layer and fires expressionChanged', () => {
    const a = makeColumn('a');
    const created = makeColumn('lgr-calc-1', '');
    created.isCalculatedCol = true;
    const h = makeService({ calculatedColumns: true }, { colDefList: [a] });
    h.userSvc.entries.set('lgr-calc-1', {
      created: true,
      properties: { calculatedExpression: '' },
      parentGroupId: null,
    });
    h.bean.dynamicCols?.set('lgr-calc-1', {
      properties: { calculatedExpression: '' },
      parentGroupId: null,
      anchorColId: 'a',
    });
    h.bean.openCalculatedColumnDialog(created, 'edit', false);

    const input = document.querySelector<HTMLInputElement>('.lgr-calc-dialog-expression')!;
    input.value = '[a] * 2';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(h.userSvc.setCreatedColumn).toHaveBeenCalledWith(
      'lgr-calc-1',
      { calculatedExpression: '[a] * 2', headerName: 'lgr-calc-1', cellDataType: 'text' },
      null,
    );
    expect(h.dispatched).toHaveLength(1);
    expect(h.dispatched[0]).toMatchObject({
      type: 'calculatedColumnExpressionChanged',
      expression: '[a] * 2',
      oldExpression: '',
    });
    h.harness.destroy();
  });

  it('uses setOverride for declared calc columns', () => {
    const declared = makeColumn('sum', '[a] + [b]');
    declared.isCalculatedCol = true;
    const h = makeService({ calculatedColumns: true }, { colDefList: [declared] });
    h.userSvc.isDeclared.mockReturnValue(true);
    h.bean.openCalculatedColumnDialog(declared, 'edit', false);
    const input = document.querySelector<HTMLInputElement>('.lgr-calc-dialog-expression')!;
    input.value = '[a] + 1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(h.userSvc.setOverride).toHaveBeenCalledWith('sum', {
      calculatedExpression: '[a] + 1',
      headerName: 'sum',
      cellDataType: 'text',
    });
    h.harness.destroy();
  });

  it('closes the dialog and drops the highlight on close', () => {
    const a = makeColumn('a');
    const h = makeService({ calculatedColumns: true }, { colDefList: [a] });
    const live = new Map<string, AgColumn>();
    h.userSvc.setCreatedColumn.mockImplementation((colId: string, properties: ColDef) => {
      h.userSvc.entries.set(colId, { properties, created: true, parentGroupId: null });
      const created = makeColumn(colId, '');
      created.isCalculatedCol = true;
      live.set(colId, created);
    });
    h.colModel.getNonPivotColById.mockImplementation((colId: string) => live.get(colId));
    h.bean.openCalculatedColumnDialog(a, 'add', false);
    const created = live.get('lgr-calc-1')!;
    expect(h.bean.isHighlightedColumn(created)).toBe(true);
    document.querySelector<HTMLElement>('.lgr-calc-dialog-close')!.click();
    expect(document.querySelector('.lgr-calc-dialog')).toBeNull();
    expect(h.bean.isHighlightedColumn(created)).toBe(false);
    h.harness.destroy();
  });

  it('suppresses highlighting via the option', () => {
    const a = makeColumn('a');
    const h = makeService({ calculatedColumns: { suppressColumnHighlighting: true } }, { colDefList: [a] });
    const live = new Map<string, AgColumn>();
    h.userSvc.setCreatedColumn.mockImplementation((colId: string, properties: ColDef) => {
      h.userSvc.entries.set(colId, { properties, created: true, parentGroupId: null });
      const created = makeColumn(colId, '');
      created.isCalculatedCol = true;
      live.set(colId, created);
    });
    h.colModel.getNonPivotColById.mockImplementation((colId: string) => live.get(colId));
    h.bean.openCalculatedColumnDialog(a, 'add', false);
    expect(h.bean.isHighlightedColumn(live.get('lgr-calc-1')!)).toBe(false);
    h.harness.destroy();
  });

  it('uses dataTypes and configured palette visibility while keeping Values available', () => {
    const a = makeColumn('a');
    const h = makeService(
      { calculatedColumns: { dataTypes: ['number'], expressionPickers: ['columns'] } },
      { colDefList: [a] },
    );
    const live = new Map<string, AgColumn>();
    h.userSvc.setCreatedColumn.mockImplementation((colId: string, properties: ColDef) => {
      h.userSvc.entries.set(colId, { properties, created: true, parentGroupId: null });
      const created = makeColumn(colId, '');
      created.isCalculatedCol = true;
      live.set(colId, created);
    });
    h.colModel.getNonPivotColById.mockImplementation((colId: string) => live.get(colId));
    h.bean.openCalculatedColumnDialog(a, 'add', false);
    const type = document.querySelector<HTMLSelectElement>('.lgr-calc-dialog-type')!;
    expect(type.options.length).toBe(1);
    expect(Array.from(document.querySelectorAll('.lgr-calc-dialog-palette-tab')).map((tab) => tab.textContent))
      .toEqual(['Columns', 'Values']);
    h.harness.destroy();
  });

  it('generates unique created col ids', () => {
    const a = makeColumn('a');
    const h = makeService({ calculatedColumns: true }, { colDefList: [a] });
    // Model "columns the dialog has created so far": the probe for a
    // candidate id only resolves once the dialog actually created it.
    const live = new Map<string, AgColumn>();
    h.userSvc.setCreatedColumn.mockImplementation((colId: string, properties: ColDef) => {
      h.userSvc.entries.set(colId, { properties, created: true, parentGroupId: null });
      const created = makeColumn(colId, '');
      created.isCalculatedCol = true;
      live.set(colId, created);
    });
    h.colModel.getNonPivotColById.mockImplementation((colId: string) => live.get(colId));
    // Two sequential adds produce distinct ids via the dialog path.
    h.bean.openCalculatedColumnDialog(a, 'add', false);
    h.bean.openCalculatedColumnDialog(a, 'add', false);
    expect(h.userSvc.setCreatedColumn.mock.calls.map((c) => c[0] as string)).toEqual(['lgr-calc-1', 'lgr-calc-2']);
    h.harness.destroy();
  });
});
