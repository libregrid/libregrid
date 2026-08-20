/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgColumn, AgProvidedColumnGroup, type ColDef, type ColGroupDef } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { ColumnHeaderEditService } from './columnHeaderEditService';

function makeColumn(colDef: Partial<ColDef> = {}): AgColumn {
  return new AgColumn({ field: 'f', ...colDef } as ColDef, null, 'f', true, 'user');
}

function makeGroup(colGroupDef: Partial<ColGroupDef> = {}): AgProvidedColumnGroup {
  return new AgProvidedColumnGroup({ headerName: 'Group', ...colGroupDef } as ColGroupDef, 'grp', false, 0);
}

interface ApiMock {
  getDisplayNameForColumn: ReturnType<typeof vi.fn>;
  getDisplayNameForColumnGroup: ReturnType<typeof vi.fn>;
  getColumnGroupState: ReturnType<typeof vi.fn>;
  setColumnGroupState: ReturnType<typeof vi.fn>;
}

function makeApi(): ApiMock {
  return {
    getDisplayNameForColumn: vi.fn(() => 'Current'),
    getDisplayNameForColumnGroup: vi.fn(() => 'Current Group'),
    getColumnGroupState: vi.fn(() => [] as { groupId: string; open: boolean }[]),
    setColumnGroupState: vi.fn(),
  };
}

interface Harness {
  bean: ColumnHeaderEditService;
  eRootDiv: HTMLDivElement;
  gridApi: ApiMock;
  destroy(): void;
}

function makeService(gridOptions: Record<string, unknown> = {}, extraBeans: Record<string, unknown> = {}): Harness {
  const eRootDiv = document.createElement('div');
  document.body.appendChild(eRootDiv);
  const gridApi = makeApi();
  const harness = makeBeanHarness(ColumnHeaderEditService, {
    gridOptions: gridOptions as never,
    beans: { eRootDiv, gridApi, ...extraBeans },
  });
  return { bean: harness.bean, eRootDiv, gridApi, destroy: harness.destroy };
}

/** A standalone column is not wired, so the real setter (which dispatches via
 * `this.beans.eventSvc`) is stubbed to just store the override. */
function stubSetOverride(column: AgColumn): ReturnType<typeof vi.spyOn> {
  return vi
    .spyOn(column, 'setHeaderNameOverride')
    .mockImplementation(function (this: AgColumn, name: string | null) {
      this.headerNameOverride = name;
    });
}

function editorInput(eRootDiv: HTMLElement): HTMLInputElement {
  const input = eRootDiv.querySelector<HTMLInputElement>('.lgr-header-name-editor-input');
  if (!input) throw new Error('editor input not found');
  return input;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('ColumnHeaderEditService (unit)', () => {
  it('only accepts columns/groups with headerNameEditable and no calculated expression', () => {
    const { bean, destroy } = makeService();
    expect(bean.isEditable(makeColumn({ headerNameEditable: true }))).toBe(true);
    expect(bean.isEditable(makeColumn())).toBe(false);
    expect(bean.isEditable(makeColumn({ headerNameEditable: false }))).toBe(false);

    const calculated = makeColumn({ headerNameEditable: true });
    calculated.calculatedExpression = 'SUM(f)';
    expect(bean.isEditable(calculated)).toBe(false);

    expect(bean.isEditable(makeGroup({ headerNameEditable: true }))).toBe(true);
    expect(bean.isEditable(makeGroup())).toBe(false);
    destroy();
  });

  it('returns the Edit Column Name item only for editable targets, and the action opens the editor', () => {
    const { bean, eRootDiv, destroy } = makeService();
    expect(bean.getEditColumnNameMenuItem(makeColumn())).toBeNull();

    const item = bean.getEditColumnNameMenuItem(makeColumn({ headerNameEditable: true }));
    expect(item?.name).toBe('Edit Column Name');
    item?.action?.();
    expect(eRootDiv.querySelector('.lgr-header-name-editor')).not.toBeNull();
    destroy();
  });

  it('applies keystrokes immediately in the default live mode and closes on Enter', () => {
    const { bean, eRootDiv, gridApi, destroy } = makeService();
    const column = makeColumn({ headerNameEditable: true });
    const setOverride = stubSetOverride(column);

    bean.showHeaderNameEditor(column);
    const input = editorInput(eRootDiv);
    expect(input.value).toBe('Current');
    expect(gridApi.getDisplayNameForColumn).toHaveBeenCalledWith(column, 'header');

    input.value = '  Renamed  ';
    input.dispatchEvent(new Event('input'));
    expect(setOverride).toHaveBeenCalledWith('Renamed', 'uiColumnHeaderEdit');
    expect(column.headerNameOverride).toBe('Renamed');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(eRootDiv.querySelector('.lgr-header-name-editor')).toBeNull();
    destroy();
  });

  it('clears the override when the input is committed empty', () => {
    const { bean, eRootDiv, destroy } = makeService();
    const column = makeColumn({ headerNameEditable: true });
    stubSetOverride(column);
    column.headerNameOverride = 'Prev';

    bean.showHeaderNameEditor(column);
    const input = editorInput(eRootDiv);
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    expect(column.headerNameOverride).toBeNull();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    destroy();
  });

  it('restores the previous override on Escape in live mode', () => {
    const { bean, eRootDiv, destroy } = makeService();
    const column = makeColumn({ headerNameEditable: true });
    stubSetOverride(column);
    column.headerNameOverride = 'Orig';

    bean.showHeaderNameEditor(column);
    const input = editorInput(eRootDiv);
    input.value = 'Changed';
    input.dispatchEvent(new Event('input'));
    expect(column.headerNameOverride).toBe('Changed');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(eRootDiv.querySelector('.lgr-header-name-editor')).toBeNull();
    expect(column.headerNameOverride).toBe('Orig');
    destroy();
  });

  it('waits for Apply in deferred mode and discards on Cancel or Escape', () => {
    const { bean, eRootDiv, destroy } = makeService({ columnHeaderEdit: { applyMode: 'deferred' } });
    const column = makeColumn({ headerNameEditable: true });
    stubSetOverride(column);

    bean.showHeaderNameEditor(column);
    const input = editorInput(eRootDiv);
    expect(eRootDiv.querySelector('.lgr-header-name-editor-apply')).not.toBeNull();
    expect(eRootDiv.querySelector('.lgr-header-name-editor-cancel')).not.toBeNull();

    input.value = 'Typed';
    input.dispatchEvent(new Event('input'));
    expect(column.headerNameOverride).toBeNull(); // not applied yet

    eRootDiv.querySelector<HTMLElement>('.lgr-header-name-editor-cancel')?.click();
    expect(eRootDiv.querySelector('.lgr-header-name-editor')).toBeNull();
    expect(column.headerNameOverride).toBeNull();

    bean.showHeaderNameEditor(column);
    const input2 = editorInput(eRootDiv);
    input2.value = 'Typed';
    input2.dispatchEvent(new Event('input'));
    input2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(column.headerNameOverride).toBeNull();

    bean.showHeaderNameEditor(column);
    const input3 = editorInput(eRootDiv);
    input3.value = 'Applied';
    input3.dispatchEvent(new Event('input'));
    eRootDiv.querySelector<HTMLElement>('.lgr-header-name-editor-apply')?.click();
    expect(eRootDiv.querySelector('.lgr-header-name-editor')).toBeNull();
    expect(column.headerNameOverride).toBe('Applied');
    destroy();
  });

  it('commits deferred input on Enter as well', () => {
    const { bean, eRootDiv, destroy } = makeService({ columnHeaderEdit: { applyMode: 'deferred' } });
    const column = makeColumn({ headerNameEditable: true });
    stubSetOverride(column);

    bean.showHeaderNameEditor(column);
    const input = editorInput(eRootDiv);
    input.value = 'Enter';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(column.headerNameOverride).toBe('Enter');
    expect(eRootDiv.querySelector('.lgr-header-name-editor')).toBeNull();
    destroy();
  });

  it('edits group headers through setColumnGroupState (keeping expansion state)', () => {
    const { bean, eRootDiv, gridApi, destroy } = makeService();
    const group = makeGroup({ headerNameEditable: true });
    const displayInstance = { colIdSanitised: 'grp_0' } as never;
    group.displayInstances = [displayInstance];
    const isExpanded = vi.spyOn(group, 'isExpanded').mockReturnValue(true);

    bean.showHeaderNameEditor(group);
    expect(gridApi.getDisplayNameForColumnGroup).toHaveBeenCalledWith(displayInstance, 'header');
    const input = editorInput(eRootDiv);
    expect(input.value).toBe('Current Group');

    input.value = 'New Group';
    input.dispatchEvent(new Event('input'));
    expect(gridApi.setColumnGroupState).toHaveBeenCalledWith([{ groupId: 'grp', open: true, headerName: 'New Group' }]);
    isExpanded.mockRestore();
    destroy();
  });

  it('restores the captured group override on Escape in live mode', () => {
    const { bean, eRootDiv, gridApi, destroy } = makeService();
    const group = makeGroup({ headerNameEditable: true });
    gridApi.getColumnGroupState.mockReturnValue([{ groupId: 'grp', open: true, headerName: 'Prev' }]);

    bean.showHeaderNameEditor(group);
    const input = editorInput(eRootDiv);
    input.value = 'Changed';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(gridApi.setColumnGroupState).toHaveBeenLastCalledWith([{ groupId: 'grp', open: false, headerName: 'Prev' }]);
    destroy();
  });

  it('tracks the highlighted column/group while the editor is open', () => {
    const { bean, destroy } = makeService();
    const column = makeColumn({ headerNameEditable: true });
    const group = makeGroup({ headerNameEditable: true });
    const other = makeColumn({ headerNameEditable: true });

    expect(bean.isHighlightedColumn(column)).toBe(false);
    bean.showHeaderNameEditor(column);
    expect(bean.isHighlightedColumn(column)).toBe(true);
    expect(bean.isHighlightedColumn(other)).toBe(false);
    expect(bean.isHighlightedGroup(group)).toBe(false);

    bean.showHeaderNameEditor(group);
    expect(bean.isHighlightedColumn(column)).toBe(false);
    expect(bean.isHighlightedGroup(group)).toBe(true);
    destroy();
  });

  it('suppresses highlighting via the columnHeaderEdit option', () => {
    const { bean, destroy } = makeService({ columnHeaderEdit: { suppressColumnHighlighting: true } });
    const column = makeColumn({ headerNameEditable: true });
    bean.showHeaderNameEditor(column);
    expect(bean.isHighlightedColumn(column)).toBe(false);
    destroy();
  });

  it('registers the editColumnName menu contribution in postConstruct (overriding the stub)', () => {
    const register = vi.fn();
    const { bean, eRootDiv, destroy } = makeService({}, { menuItemMapper: { registry: { register } } });

    expect(register).toHaveBeenCalledOnce();
    const contribution = register.mock.calls[0]?.[0] as { name: string; order: number; factory: (p: unknown) => unknown };
    expect(contribution.name).toBe('editColumnName');
    expect(contribution.order).toBe(41);

    const params = (column: AgColumn | null) => ({ column, node: null, value: null, api: null });
    const item = contribution.factory(params(makeColumn({ headerNameEditable: true }))) as { name: string; action?: () => void };
    expect(item.name).toBe('Edit Column Name');
    item.action?.();
    expect(eRootDiv.querySelector('.lgr-header-name-editor')).not.toBeNull();
    expect(contribution.factory(params(makeColumn()))).toBeNull();
    expect(contribution.factory(params(null))).toBeNull();
    void bean;
    destroy();
  });

  it('skips menu registration when the menu module is not present and destroy closes the editor', () => {
    const { bean, eRootDiv, destroy } = makeService();
    const column = makeColumn({ headerNameEditable: true });
    bean.showHeaderNameEditor(column);
    expect(eRootDiv.querySelector('.lgr-header-name-editor')).not.toBeNull();
    destroy();
    expect(eRootDiv.querySelector('.lgr-header-name-editor')).toBeNull();
  });
});
